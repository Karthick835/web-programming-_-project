/**
 * SteamFunnelPage.jsx
 * ---------------------------------------------------------------------------
 * Feature 1: Steam Click Tracking Dashboard
 *
 * Shows the 3-step Steam conversion funnel:
 *   Site Visit → Game Opened → Steam Click
 *
 * Also shows a per-game table ranked by CTR (Steam clicks / game opens).
 *
 * Auto-refreshes every 10 seconds so you can watch numbers update in
 * real-time as visitors browse the site.
 *
 * Accessible to ADMINS only (requires admin login).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  MousePointerClick,
  Users,
  Gamepad2,
  RefreshCw,
  ArrowDown,
  Trophy,
  Zap,
  BarChart3,
  Sparkles,
  Trash2
} from 'lucide-react';
import { analyticsAPI } from '../../services/api';

// ── Helper: colour a percentage as green/yellow/red ────────────────────────
function DropBadge({ pct }) {
  const colour =
    pct > 70 ? 'text-red-400 bg-red-900/30 border-red-500/40' :
    pct > 40 ? 'text-yellow-400 bg-yellow-900/30 border-yellow-500/40' :
               'text-emerald-400 bg-emerald-900/30 border-emerald-500/40';
  return (
    <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${colour}`}>
      -{pct}%
    </span>
  );
}

// ── Funnel Step Card ────────────────────────────────────────────────────────
function FunnelStep({ step, isLast }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <div className="w-full bg-[#0f1224] border border-[rgba(0,240,255,0.18)] rounded-lg p-5 text-center space-y-2">
        <p className="text-xs font-mono text-[#8a93b8]">{step.stage}</p>
        <p className="text-4xl font-heading font-extrabold text-[#00f0ff]">
          {step.count.toLocaleString()}
        </p>
        <p className="text-[11px] text-slate-400 leading-tight">{step.description}</p>
        <p className="text-xs font-mono text-slate-500">
          {step.pctOfTotal}% of all visitors
        </p>
      </div>

      {/* Arrow + drop-off between steps */}
      {!isLast && (
        <div className="flex flex-col items-center py-1">
          <ArrowDown className="w-5 h-5 text-slate-600" />
          {step.dropOffToNext > 0 && (
            <DropBadge pct={step.dropOffToNext} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function SteamFunnelPage() {
  const [funnel, setFunnel]     = useState([]);
  const [games, setGames]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [includeSimulated, setIncludeSimulated] = useState(false);

  // ── Fetch all data ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [funnelRes, gamesRes] = await Promise.all([
        analyticsAPI.getSteamFunnel(includeSimulated),
        analyticsAPI.getGamesSteamStats(includeSimulated)
      ]);
      setFunnel(funnelRes.data.funnel || []);
      setGames(gamesRes.data.games || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Steam funnel fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [includeSimulated]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Simulate ~200 demo visitors ─────────────────────────────────────────
  const handleSimulate = async () => {
    setSimulating(true);
    try {
      await analyticsAPI.simulateSteamTraffic();
      setIncludeSimulated(true); // auto-show simulated data after generating
      await fetchData();
    } catch (err) {
      alert('Simulation failed. Is the backend running?');
    } finally {
      setSimulating(false);
    }
  };

  // ── Clear simulated data ─────────────────────────────────────────────────
  const handleClear = async () => {
    if (!window.confirm('Clear all simulated Steam traffic? Real visitor data is safe.')) return;
    setClearing(true);
    try {
      await analyticsAPI.clearSimulatedTraffic();
      setIncludeSimulated(false);
      await fetchData();
    } catch (err) {
      alert('Clear failed. Is the backend running?');
    } finally {
      setClearing(false);
    }
  };

  // ── Overall conversion rate (visit → steam click) ────────────────────────
  const overallConv = funnel.length >= 3 && funnel[0].count > 0
    ? ((funnel[2].count / funnel[0].count) * 100).toFixed(1)
    : '0.0';

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
          <p className="text-slate-400 font-mono text-sm">Loading Steam funnel data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <h2 className="font-heading text-2xl font-extrabold text-white">Steam Conversion Funnel</h2>
          </div>
          <p className="text-sm text-slate-400">
            How many visitors actually click through to Steam? Unique visitors only — no double-counting.
          </p>
          {lastRefresh && (
            <p className="text-[11px] font-mono text-slate-600 mt-1">
              Last refresh: {lastRefresh.toLocaleTimeString()} · auto-refreshes every 10s
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2 text-xs text-slate-400 font-mono cursor-pointer">
            <input
              type="checkbox"
              checked={includeSimulated}
              onChange={e => setIncludeSimulated(e.target.checked)}
              className="accent-cyan-400"
            />
            Include simulated data
          </label>

          <button
            onClick={handleSimulate}
            disabled={simulating}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono bg-cyan-900/30 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900/50 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {simulating ? 'Simulating...' : 'Simulate ~200 Visitors'}
          </button>

          <button
            onClick={handleClear}
            disabled={clearing}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono bg-red-900/20 text-red-400 border border-red-500/30 hover:bg-red-900/40 transition-all disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {clearing ? 'Clearing...' : 'Reset Simulated'}
          </button>

          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700 hover:border-cyan-500/50 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Quick Stats Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Visitors',
            value: funnel[0]?.count?.toLocaleString() || '0',
            icon: Users,
            color: 'text-cyan-400'
          },
          {
            label: 'Opened a Game',
            value: funnel[1]?.count?.toLocaleString() || '0',
            icon: Gamepad2,
            color: 'text-blue-400'
          },
          {
            label: 'Steam Clicks',
            value: funnel[2]?.count?.toLocaleString() || '0',
            icon: MousePointerClick,
            color: 'text-pink-400'
          },
          {
            label: 'Overall Conv.',
            value: `${overallConv}%`,
            icon: TrendingUp,
            color: 'text-emerald-400'
          }
        ].map(stat => (
          <div key={stat.label} className="bg-[#0f1224] border border-[rgba(0,240,255,0.15)] rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs font-mono text-slate-400">{stat.label}</span>
            </div>
            <p className={`text-3xl font-heading font-extrabold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Funnel Visualization ─────────────────────────────────────────── */}
      <div className="bg-[#0c0e1a] border border-[rgba(0,240,255,0.15)] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <h3 className="font-pixel text-xs text-cyan-400 tracking-widest">FUNNEL STAGES</h3>
        </div>

        {funnel.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">
            No data yet. Simulate visitors above or wait for real traffic.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {funnel.map((step, idx) => (
              <FunnelStep key={idx} step={step} isLast={idx === funnel.length - 1} />
            ))}
          </div>
        )}

        {/* Visual bar chart */}
        {funnel.length > 0 && funnel[0].count > 0 && (
          <div className="mt-6 space-y-3">
            {funnel.map((step, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>{step.stage}</span>
                  <span>{step.pctOfTotal}%</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${step.pctOfTotal}%`,
                      background: idx === 0 ? '#00f0ff' : idx === 1 ? '#818cf8' : '#f472b6'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Per-Game Table ───────────────────────────────────────────────── */}
      <div className="bg-[#0c0e1a] border border-[rgba(0,240,255,0.15)] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <h3 className="font-pixel text-xs text-yellow-400 tracking-widest">GAMES RANKED BY STEAM CTR</h3>
          <span className="text-[11px] font-mono text-slate-500">(Steam Clicks ÷ Game Opens)</span>
        </div>

        {games.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">
            No game-level data yet. Visitors need to open a game dossier first.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-xs font-mono text-slate-400">#</th>
                  <th className="text-left py-3 px-4 text-xs font-mono text-slate-400">Game</th>
                  <th className="text-right py-3 px-4 text-xs font-mono text-slate-400">Opens</th>
                  <th className="text-right py-3 px-4 text-xs font-mono text-slate-400">Steam Clicks</th>
                  <th className="text-right py-3 px-4 text-xs font-mono text-slate-400">CTR</th>
                  <th className="py-3 px-4 text-xs font-mono text-slate-400">Bar</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g, idx) => (
                  <tr key={g.game_id} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      {idx === 0 ? (
                        <Trophy className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <span className="text-slate-500 font-mono text-xs">#{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-heading font-semibold text-white">{g.title}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300">{g.unique_opens.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono text-pink-400">{g.steam_clicks.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-mono font-bold text-sm ${
                        g.ctr_pct >= 20 ? 'text-emerald-400' :
                        g.ctr_pct >= 10 ? 'text-cyan-400' : 'text-slate-400'
                      }`}>
                        {g.ctr_pct}%
                      </span>
                    </td>
                    <td className="py-3 px-4 w-32">
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-pink-500 rounded-full"
                          style={{ width: `${Math.min(100, g.ctr_pct * 3)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
