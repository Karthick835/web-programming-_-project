import React, { useState, useEffect } from 'react';
import {
  Split,
  Plus,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Zap,
  TrendingUp,
  RotateCcw,
  Sliders,
  Sparkles,
  Info,
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Modal from '../../components/ui/Modal';
import { abAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminExperiments() {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [includeSimulated, setIncludeSimulated] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const { isAdmin } = useAuth();

  // Create form state
  const [newExp, setNewExp] = useState({
    exp_key: '',
    name: '',
    description: '',
    goal_event: 'cta_click_games',
    target_page: '/',
    variant_a_label: 'Variant A (Control)',
    variant_a_ctaText: 'PLAY OUR GAMES',
    variant_a_subtitle: 'Crafting transcendent pixel-art masterpieces.',
    variant_b_label: 'Variant B (Challenger)',
    variant_b_ctaText: 'EXPLORE THE STUDIO',
    variant_b_subtitle: 'Where retro arcade passion meets next-gen indie gaming.'
  });

  const fetchExperiments = async (incSim = includeSimulated) => {
    setLoading(true);
    try {
      const res = await abAPI.getExperiments({ include_simulated: incSim });
      setExperiments(res.data.experiments || []);
    } catch (err) {
      console.error('Failed to load experiments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiments(includeSimulated);
  }, [includeSimulated]);

  const handleSimulateGameCard = async () => {
    setSimulating(true);
    try {
      const res = await abAPI.simulateGameCardTraffic(200);
      setIncludeSimulated(true);
      await fetchExperiments(true);
      alert(res.data.message || 'Simulated 200 visitors for Game Card experiment (Variant A ~8%, Variant B ~14%)!');
    } catch (err) {
      alert('Failed to simulate game card traffic: ' + (err.response?.data?.error || err.message));
    } finally {
      setSimulating(false);
    }
  };

  const handleDeclareWinner = async (expId, winnerVariant) => {
    if (!window.confirm(`Are you sure you want to conclude this experiment and declare Variant ${winnerVariant} the permanent winner?`)) return;

    try {
      await abAPI.updateStatus(expId, 'concluded', winnerVariant);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      fetchExperiments();
    } catch (err) {
      alert('Failed to update experiment status.');
    }
  };

  const handleResume = async (expId) => {
    try {
      await abAPI.updateStatus(expId, 'active', null);
      fetchExperiments();
    } catch (err) {
      alert('Failed to resume experiment.');
    }
  };

  const handleDelete = async (expId) => {
    if (!window.confirm('Delete this experiment and all associated visitor assignments?')) return;
    try {
      await abAPI.deleteExperiment(expId);
      fetchExperiments();
    } catch (err) {
      alert('Failed to delete experiment.');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await abAPI.createExperiment({
        exp_key: newExp.exp_key,
        name: newExp.name,
        description: newExp.description,
        goal_event: newExp.goal_event,
        target_page: newExp.target_page,
        variant_a_label: newExp.variant_a_label,
        variant_a_config: {
          ctaText: newExp.variant_a_ctaText,
          heroSubtitle: newExp.variant_a_subtitle,
          accentColor: 'cyan'
        },
        variant_b_label: newExp.variant_b_label,
        variant_b_config: {
          ctaText: newExp.variant_b_ctaText,
          heroSubtitle: newExp.variant_b_subtitle,
          accentColor: 'magenta'
        }
      });

      setCreateModalOpen(false);
      fetchExperiments();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create experiment.');
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="font-pixel text-xs text-pink-400">HYPOTHESIS & OPTIMIZATION ENGINE</div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white">
            A/B TESTING STUDIO
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-900/80 px-3 py-2 rounded border border-slate-800 cursor-pointer hover:border-slate-700">
            <input
              type="checkbox"
              checked={includeSimulated}
              onChange={(e) => setIncludeSimulated(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
            />
            Include Simulated Data
          </label>

          <button
            onClick={handleSimulateGameCard}
            disabled={simulating}
            className="cyber-btn bg-amber-500/10 border border-amber-500/40 text-amber-400 hover:bg-amber-500/20 text-xs py-2.5 px-4 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {simulating ? 'SIMULATING (200)...' : 'SIMULATE GAME CARD (200)'}
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="cyber-btn cyber-btn-cyan text-xs py-2.5 px-5 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            CREATE EXPERIMENT
          </button>
        </div>
      </div>

      {/* Experiments List */}
      <div className="space-y-8">
        {experiments.map((exp) => {
          const stats = exp.metrics?.stats || {};
          const isConcluded = exp.status === 'concluded';
          const winner = exp.winner_variant;

          return (
            <div key={exp.id} className="cyber-card p-6 sm:p-8 space-y-6 hud-corner">
              
              {/* Exp Meta Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`pixel-badge ${isConcluded ? 'badge-gold' : 'badge-emerald'}`}>
                      {isConcluded ? '🏆 CONCLUDED' : '● ACTIVE EXPERIMENT'}
                    </span>
                    <span className="text-xs font-mono text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-cyan-500/30">
                      key: {exp.exp_key}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Target: {exp.target_page} • Goal: <strong className="text-pink-400">{exp.goal_event}</strong>
                    </span>
                  </div>
                  <h3 className="font-heading text-xl sm:text-2xl font-bold text-white">
                    {exp.name}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                    {exp.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
                  {isConcluded ? (
                    <button
                      onClick={() => handleResume(exp.id)}
                      className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Re-Open Test
                    </button>
                  ) : null}

                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="p-2 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-400 text-xs transition-all"
                      title="Delete Experiment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Variant Performance Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Variant A Card */}
                <div className={`p-5 rounded-lg border transition-all ${
                  winner === 'A'
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.3)]'
                    : 'bg-slate-900/80 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-pixel text-xs text-cyan-400 flex items-center gap-1.5">
                      {winner === 'A' && <Trophy className="w-4 h-4 text-yellow-400" />}
                      {exp.variant_a_label}
                    </span>
                    <span className="text-xs font-mono text-slate-400">Control</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center py-2 bg-black/40 rounded border border-slate-800 mb-4">
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Visitors</div>
                      <div className="font-heading text-lg font-bold text-white">{exp.metrics?.variantA.visitors || 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Conversions</div>
                      <div className="font-heading text-lg font-bold text-cyan-400">{exp.metrics?.variantA.conversions || 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Conv. Rate</div>
                      <div className="font-heading text-lg font-bold text-white">{exp.metrics?.variantA.conversionRate || 0}%</div>
                    </div>
                  </div>

                  {/* Config payload preview */}
                  <div className="p-3 bg-slate-950 rounded border border-slate-900 text-xs font-mono space-y-1 text-slate-300">
                    <div><strong>Button/Action:</strong> "{exp.variant_a_config?.buttonText || exp.variant_a_config?.ctaText || 'Default'}"</div>
                    <div className="truncate text-slate-400 text-[11px]">"{exp.variant_a_config?.layout ? `Layout: ${exp.variant_a_config.layout}` : exp.variant_a_config?.heroSubtitle || ''}"</div>
                  </div>

                  {!isConcluded && (
                    <button
                      onClick={() => handleDeclareWinner(exp.id, 'A')}
                      className="w-full mt-4 py-2 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold rounded flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      Promote Variant A as Winner
                    </button>
                  )}
                </div>

                {/* Variant B Card */}
                <div className={`p-5 rounded-lg border transition-all ${
                  winner === 'B'
                    ? 'bg-pink-950/40 border-pink-400 shadow-[0_0_20px_rgba(255,0,127,0.3)]'
                    : 'bg-slate-900/80 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-pixel text-xs text-pink-400 flex items-center gap-1.5">
                      {winner === 'B' && <Trophy className="w-4 h-4 text-yellow-400" />}
                      {exp.variant_b_label}
                    </span>
                    <span className="text-xs font-mono text-pink-400 font-bold">
                      {stats.uplift > 0 ? `+${stats.uplift}% Uplift` : `${stats.uplift}% Uplift`}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center py-2 bg-black/40 rounded border border-slate-800 mb-4">
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Visitors</div>
                      <div className="font-heading text-lg font-bold text-white">{exp.metrics?.variantB.visitors || 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Conversions</div>
                      <div className="font-heading text-lg font-bold text-pink-400">{exp.metrics?.variantB.conversions || 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Conv. Rate</div>
                      <div className="font-heading text-lg font-bold text-white">{exp.metrics?.variantB.conversionRate || 0}%</div>
                    </div>
                  </div>

                  {/* Config payload preview */}
                  <div className="p-3 bg-slate-950 rounded border border-slate-900 text-xs font-mono space-y-1 text-slate-300">
                    <div><strong>Button/Action:</strong> "{exp.variant_b_config?.buttonText || exp.variant_b_config?.ctaText || 'Default'}"</div>
                    <div className="truncate text-slate-400 text-[11px]">"{exp.variant_b_config?.layout ? `Layout: ${exp.variant_b_config.layout}` : exp.variant_b_config?.heroSubtitle || ''}"</div>
                  </div>

                  {!isConcluded && (
                    <button
                      onClick={() => handleDeclareWinner(exp.id, 'B')}
                      className="w-full mt-4 py-2 bg-pink-950/60 hover:bg-pink-900/80 text-pink-300 border border-pink-500/40 text-xs font-mono font-bold rounded flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      Promote Variant B as Winner
                    </button>
                  )}
                </div>

              </div>

              {/* Statistical Significance & Z-Test Indicator */}
              <div className="bg-slate-950/90 p-5 rounded-lg border border-cyan-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                      Statistical Significance Analysis (2-Proportion Z-Test)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                      stats.isSignificant
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_10px_rgba(0,255,136,0.3)]'
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                    }`}>
                      {stats.isSignificant ? '✓ STATISTICALLY SIGNIFICANT (p < 0.05)' : '● GATHERING DATA'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-1">
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Confidence Level:</span>
                    <strong className="text-cyan-400 text-sm">{stats.confidence}%</strong>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Two-Tailed p-value:</span>
                    <strong className="text-white text-sm">{stats.pValue}</strong>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Calculated Z-Score:</span>
                    <strong className="text-white text-sm">{stats.zScore}</strong>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Total Exposures:</span>
                    <strong className="text-pink-400 text-sm">{exp.metrics?.totalVisitors}</strong>
                  </div>
                </div>

                <div className="text-xs text-slate-300 font-sans flex items-center gap-2 pt-1">
                  <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span>Recommendation: <strong>{stats.recommendation}</strong></span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Create Experiment Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New A/B Test"
        size="xl"
        isDirty={Boolean(newExp.exp_key || newExp.name || newExp.goal_event)}
      >
        <div className="space-y-4">
          <span className="pixel-badge badge-cyan text-[9px] inline-block">EXPERIMENT WIZARD</span>

          <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-sans">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-1 font-mono">Experiment Key (Unique slug) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. navbar_cta_button"
                  value={newExp.exp_key}
                  onChange={(e) => setNewExp({ ...newExp, exp_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-mono">Target Page Route *</label>
                <input
                  type="text"
                  required
                  placeholder="/"
                  value={newExp.target_page}
                  onChange={(e) => setNewExp({ ...newExp, target_page: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-mono">Experiment Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Homepage Hero CTA & Subtitle Copy Test"
                value={newExp.name}
                onChange={(e) => setNewExp({ ...newExp, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-mono">Conversion Goal Event Identifier *</label>
              <input
                type="text"
                required
                placeholder="e.g. cta_click_games"
                value={newExp.goal_event}
                onChange={(e) => setNewExp({ ...newExp, goal_event: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            {/* Variant Configs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              <div className="space-y-3 bg-slate-900/60 p-4 rounded border border-slate-800">
                <span className="font-pixel text-[10px] text-cyan-400">VARIANT A (CONTROL)</span>
                <div>
                  <label className="block text-slate-400 mb-1 font-mono text-[11px]">CTA Label</label>
                  <input
                    type="text"
                    required
                    value={newExp.variant_a_ctaText}
                    onChange={(e) => setNewExp({ ...newExp, variant_a_ctaText: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-mono text-[11px]">Hero Subtitle</label>
                  <input
                    type="text"
                    required
                    value={newExp.variant_a_subtitle}
                    onChange={(e) => setNewExp({ ...newExp, variant_a_subtitle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-3 bg-slate-900/60 p-4 rounded border border-slate-800">
                <span className="font-pixel text-[10px] text-pink-400">VARIANT B (CHALLENGER)</span>
                <div>
                  <label className="block text-slate-400 mb-1 font-mono text-[11px]">CTA Label</label>
                  <input
                    type="text"
                    required
                    value={newExp.variant_b_ctaText}
                    onChange={(e) => setNewExp({ ...newExp, variant_b_ctaText: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-mono text-[11px]">Hero Subtitle</label>
                  <input
                    type="text"
                    required
                    value={newExp.variant_b_subtitle}
                    onChange={(e) => setNewExp({ ...newExp, variant_b_subtitle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full cyber-btn cyber-btn-cyan py-3 text-xs flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              LAUNCH LIVE EXPERIMENT
            </button>
          </form>
        </div>
      </Modal>

    </div>
  );
}
