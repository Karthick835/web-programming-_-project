const express = require('express');
const router = express.Router();
const { runAsync, getAsync, allAsync } = require('../database');
const { requireAuth } = require('../middleware/auth');

// ==========================================
// STATISTICAL SIGNIFICANCE HELPERS (Z-TEST)
// ==========================================

// Standard normal cumulative distribution approximation (erf)
function normalCdf(z) {
  const t = 1.0 / (1.0 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-z * z / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1.0 - p : p;
}

// Compute 2-proportion Z-test statistics
function calculateZTest(nA, cA, nB, cB) {
  if (nA <= 0 || nB <= 0) {
    return {
      zScore: 0,
      pValue: 1,
      confidence: 0,
      isSignificant: false,
      uplift: 0,
      message: 'Insufficient sample size.'
    };
  }

  const pA = cA / nA;
  const pB = cB / nB;
  const uplift = pA > 0 ? ((pB - pA) / pA) * 100 : 0;

  const poolP = (cA + cB) / (nA + nB);
  if (poolP === 0 || poolP === 1) {
    return {
      zScore: 0,
      pValue: 1,
      confidence: 0,
      isSignificant: false,
      uplift: Number(uplift.toFixed(2)),
      message: 'No variance in conversions yet.'
    };
  }

  const standardError = Math.sqrt(poolP * (1 - poolP) * ((1 / nA) + (1 / nB)));
  if (standardError === 0) {
    return {
      zScore: 0,
      pValue: 1,
      confidence: 0,
      isSignificant: false,
      uplift: Number(uplift.toFixed(2)),
      message: 'Zero standard error.'
    };
  }

  const zScore = (pB - pA) / standardError;
  const pValue = 2 * (1 - normalCdf(Math.abs(zScore)));
  const confidence = Math.max(0, Math.min(99.9, (1 - pValue) * 100));
  const isSignificant = pValue < 0.05 && (nA >= 20 && nB >= 20);

  let recommendation = 'Keep testing to gather more sample data.';
  if (isSignificant) {
    recommendation = zScore > 0
      ? 'Variant B is performing statistically significantly better! (p < 0.05)'
      : 'Variant A (Control) is performing statistically significantly better! (p < 0.05)';
  } else if (nA >= 50 && nB >= 50) {
    recommendation = 'No statistically significant difference detected between variants yet.';
  }

  return {
    zScore: Number(zScore.toFixed(3)),
    pValue: Number(pValue.toFixed(4)),
    confidence: Number(confidence.toFixed(1)),
    isSignificant,
    uplift: Number(uplift.toFixed(2)),
    recommendation
  };
}


// ==========================================
// 1. PUBLIC VISITOR ASSIGNMENT & CONVERSION
// ==========================================

// GET /api/ab/assignment/:expKey?visitorId=xyz&force=A
router.get('/assignment/:expKey', async (req, res) => {
  try {
    const { expKey } = req.params;
    const { visitorId, force } = req.query;

    if (!visitorId) {
      return res.status(400).json({ error: 'visitorId is required.' });
    }

    const experiment = await getAsync(`SELECT * FROM experiments WHERE exp_key = ?`, [expKey]);
    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found.' });
    }

    // If experiment is concluded and has winner, always return winner
    if (experiment.status === 'concluded' && experiment.winner_variant) {
      const config = experiment.winner_variant === 'A'
        ? JSON.parse(experiment.variant_a_config)
        : JSON.parse(experiment.variant_b_config);

      return res.json({
        experimentId: experiment.id,
        expKey: experiment.exp_key,
        variant: experiment.winner_variant,
        isWinner: true,
        config
      });
    }

    // Check existing assignment
    let assignment = await getAsync(
      `SELECT * FROM experiment_assignments WHERE visitor_id = ? AND experiment_id = ?`,
      [visitorId, experiment.id]
    );

    let variant;
    let isForced = 0;

    if (force && (force === 'A' || force === 'B')) {
      variant = force;
      isForced = 1;
      if (assignment) {
        await runAsync(
          `UPDATE experiment_assignments SET variant = ?, is_forced = 1 WHERE visitor_id = ? AND experiment_id = ?`,
          [variant, visitorId, experiment.id]
        );
      } else {
        await runAsync(
          `INSERT INTO experiment_assignments (visitor_id, experiment_id, variant, is_forced) VALUES (?, ?, ?, 1)`,
          [visitorId, experiment.id, variant]
        );
      }
    } else if (assignment) {
      variant = assignment.variant;
      isForced = assignment.is_forced || 0;
    } else {
      // 50/50 allocation
      variant = Math.random() < 0.5 ? 'A' : 'B';
      await runAsync(
        `INSERT OR IGNORE INTO experiment_assignments (visitor_id, experiment_id, variant, is_forced) VALUES (?, ?, ?, 0)`,
        [visitorId, experiment.id, variant]
      );
    }

    // Lock variant to visitor profile
    try {
      const profile = await getAsync(`SELECT assigned_variants FROM visitor_profiles WHERE visitor_id = ?`, [visitorId]);
      if (profile) {
        let currentAssigned = {};
        try { currentAssigned = JSON.parse(profile.assigned_variants || '{}'); } catch (_) {}
        currentAssigned[experiment.exp_key] = variant;
        await runAsync(
          `UPDATE visitor_profiles SET assigned_variants = ? WHERE visitor_id = ?`,
          [JSON.stringify(currentAssigned), visitorId]
        );
      }
    } catch (_) {}

    const config = variant === 'A'
      ? JSON.parse(experiment.variant_a_config)
      : JSON.parse(experiment.variant_b_config);

    res.json({
      experimentId: experiment.id,
      expKey: experiment.exp_key,
      variant,
      isForced: Boolean(isForced),
      status: experiment.status,
      config
    });
  } catch (err) {
    console.error('A/B assignment error:', err);
    res.status(500).json({ error: 'Failed to assign experiment variant.' });
  }
});

// POST /api/ab/convert
router.post('/convert', async (req, res) => {
  try {
    const { visitorId, expKey, goalEvent, is_forced, is_simulated } = req.body;
    if (!visitorId || !expKey) {
      return res.status(400).json({ error: 'visitorId and expKey are required.' });
    }

    const experiment = await getAsync(`SELECT * FROM experiments WHERE exp_key = ?`, [expKey]);
    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found.' });
    }

    const assignment = await getAsync(
      `SELECT * FROM experiment_assignments WHERE visitor_id = ? AND experiment_id = ?`,
      [visitorId, experiment.id]
    );

    if (!assignment) {
      return res.status(400).json({ error: 'No assignment found for this visitor.' });
    }

    const goal = goalEvent || experiment.goal_event;
    const forcedFlag = is_forced || assignment.is_forced ? 1 : 0;
    const simFlag = is_simulated || assignment.is_simulated ? 1 : 0;

    // Insert conversion
    await runAsync(
      `INSERT INTO experiment_conversions (visitor_id, experiment_id, variant, goal_event, is_forced, is_simulated)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [visitorId, experiment.id, assignment.variant, goal, forcedFlag, simFlag]
    );

    // Update visitor profile goals and status
    try {
      const profile = await getAsync(`SELECT goals_completed FROM visitor_profiles WHERE visitor_id = ?`, [visitorId]);
      if (profile) {
        let goals = [];
        try { goals = JSON.parse(profile.goals_completed || '[]'); } catch (_) {}
        if (!goals.includes(goal)) goals.push(goal);
        await runAsync(
          `UPDATE visitor_profiles SET goals_completed = ?, status = 'converted' WHERE visitor_id = ?`,
          [JSON.stringify(goals), visitorId]
        );
      }
    } catch (_) {}

    res.json({
      success: true,
      variant: assignment.variant,
      goal,
      isForced: Boolean(forcedFlag)
    });
  } catch (err) {
    console.error('A/B conversion error:', err);
    res.status(500).json({ error: 'Failed to log conversion.' });
  }
});


// ==========================================
// 2. ADMIN EXPERIMENTS & STATISTICAL DASHBOARD
// ==========================================

// GET /api/ab/experiments (Excludes forced variants from statistical analysis)
router.get('/experiments', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const includeSimulated = req.query.include_simulated === 'true';
    const simFilter = includeSimulated ? '' : 'AND (is_simulated = 0 OR is_simulated IS NULL)';

    const experiments = await allAsync(`SELECT * FROM experiments ORDER BY id DESC`);

    const detailedExperiments = [];

    for (const exp of experiments) {
      // Get visitor count per variant (Excluding forced variants)
      const exposuresA = await getAsync(
        `SELECT COUNT(DISTINCT visitor_id) as count 
         FROM experiment_assignments 
         WHERE experiment_id = ? AND variant = 'A' AND is_forced = 0 ${simFilter}`,
        [exp.id]
      );
      const exposuresB = await getAsync(
        `SELECT COUNT(DISTINCT visitor_id) as count 
         FROM experiment_assignments 
         WHERE experiment_id = ? AND variant = 'B' AND is_forced = 0 ${simFilter}`,
        [exp.id]
      );

      // Get conversions per variant (Excluding forced conversions)
      const conversionsA = await getAsync(
        `SELECT COUNT(DISTINCT visitor_id) as count 
         FROM experiment_conversions 
         WHERE experiment_id = ? AND variant = 'A' AND is_forced = 0 ${simFilter}`,
        [exp.id]
      );
      const conversionsB = await getAsync(
        `SELECT COUNT(DISTINCT visitor_id) as count 
         FROM experiment_conversions 
         WHERE experiment_id = ? AND variant = 'B' AND is_forced = 0 ${simFilter}`,
        [exp.id]
      );

      const nA = exposuresA?.count || 0;
      const nB = exposuresB?.count || 0;
      const cA = conversionsA?.count || 0;
      const cB = conversionsB?.count || 0;

      const rateA = nA > 0 ? Number(((cA / nA) * 100).toFixed(2)) : 0;
      const rateB = nB > 0 ? Number(((cB / nB) * 100).toFixed(2)) : 0;

      const stats = calculateZTest(nA, cA, nB, cB);

      detailedExperiments.push({
        ...exp,
        variant_a_config: JSON.parse(exp.variant_a_config),
        variant_b_config: JSON.parse(exp.variant_b_config),
        metrics: {
          variantA: {
            label: exp.variant_a_label,
            visitors: nA,
            conversions: cA,
            conversionRate: rateA
          },
          variantB: {
            label: exp.variant_b_label,
            visitors: nB,
            conversions: cB,
            conversionRate: rateB
          },
          totalVisitors: nA + nB,
          totalConversions: cA + cB,
          stats
        }
      });
    }

    res.json({ experiments: detailedExperiments });
  } catch (err) {
    console.error('Fetch experiments error:', err);
    res.status(500).json({ error: 'Failed to retrieve experiments.' });
  }
});

// POST /api/ab/experiments (Create new experiment)
router.post('/experiments', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const {
      exp_key,
      name,
      description = '',
      goal_event,
      target_page = '/',
      variant_a_label = 'Variant A (Control)',
      variant_a_config,
      variant_b_label = 'Variant B',
      variant_b_config
    } = req.body;

    if (!exp_key || !name || !goal_event || !variant_a_config || !variant_b_config) {
      return res.status(400).json({ error: 'Key, name, goal event, and both variant configurations are required.' });
    }

    const cfgAStr = typeof variant_a_config === 'string' ? variant_a_config : JSON.stringify(variant_a_config);
    const cfgBStr = typeof variant_b_config === 'string' ? variant_b_config : JSON.stringify(variant_b_config);

    const result = await runAsync(
      `INSERT INTO experiments (
        exp_key, name, description, goal_event, target_page, status,
        variant_a_label, variant_a_config, variant_b_label, variant_b_config
      ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
      [exp_key, name, description, goal_event, target_page, variant_a_label, cfgAStr, variant_b_label, cfgBStr]
    );

    res.status(201).json({ message: 'Experiment created', experimentId: result.lastID });
  } catch (err) {
    console.error('Create experiment error:', err);
    res.status(500).json({ error: 'Failed to create experiment. Key might already exist.' });
  }
});

// PUT /api/ab/experiments/:id/status (Toggle pause/active or conclude)
router.put('/experiments/:id/status', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, winner_variant } = req.body;

    await runAsync(
      `UPDATE experiments SET status = ?, winner_variant = COALESCE(?, winner_variant) WHERE id = ?`,
      [status, winner_variant || null, id]
    );

    res.json({ message: 'Experiment status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update experiment status.' });
  }
});

// DELETE /api/ab/experiments/:id (Admin only)
router.delete('/experiments/:id', requireAuth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync(`DELETE FROM experiment_assignments WHERE experiment_id = ?`, [id]);
    await runAsync(`DELETE FROM experiment_conversions WHERE experiment_id = ?`, [id]);
    await runAsync(`DELETE FROM experiments WHERE id = ?`, [id]);
    res.json({ message: 'Experiment and related tracking data deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete experiment.' });
  }
});

module.exports = router;
