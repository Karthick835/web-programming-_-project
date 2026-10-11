import React, { useState, useEffect } from 'react';
import {
  Users,
  Eye,
  TrendingUp,
  Zap,
  Activity,
  ArrowDownRight,
  RefreshCw,
  Sparkles,
  Trash2,
  AlertCircle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { analyticsAPI } from '../../services/api';

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [pages, setPages] = useState([]);
  const [deviceData, setDeviceData] = useState(null);
  const [funnel, setFunnel] = useState([]);
  const [realtimeStream, setRealtimeStream] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timelineDays, setTimelineDays] = useState(7);
  const [includeSimulated, setIncludeSimulated] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [
        overRes,
        timeRes,
        pageRes,
        devRes,
        funRes,
        streamRes
      ] = await Promise.all([
        analyticsAPI.getOverview(includeSimulated),
        analyticsAPI.getTimeline(timelineDays, includeSimulated),
        analyticsAPI.getPages(includeSimulated),
        analyticsAPI.getDevices(includeSimulated),
        analyticsAPI.getFunnel(includeSimulated),
        analyticsAPI.getRealtimeStream(includeSimulated)
      ]);

      setOverview(overRes.data);
      setTimeline(timeRes.data.timeline || []);
      setPages(pageRes.data.pages || []);
      setDeviceData(devRes.data);
      setFunnel(funRes.data.funnel || []);
      setRealtimeStream(streamRes.data.events || []);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000); // 15s auto-refresh
    return () => clearInterval(interval);
  }, [timelineDays, includeSimulated]);

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      await analyticsAPI.simulateTraffic(30);
      setIncludeSimulated(true);
      await fetchDashboardData();
    } catch (err) {
      alert('Failed to simulate traffic: ' + err.message);
    } finally {
      setSimulating(false);
    }
  };

  const handleClearSimulated = async () => {
    if (!window.confirm('Purge all simulated demo events from the database?')) return;
    setClearing(true);
    try {
      await analyticsAPI.clearSimulatedTraffic();
      await fetchDashboardData();
    } catch (err) {
      alert('Failed to clear simulated traffic: ' + err.message);
    } finally {
      setClearing(false);
    }
  };

  const hasTimelineData = timeline.some(t => (t.pageviews || 0) > 0 || (t.unique_visitors || 0) > 0);

  return (
    <div className="space-y-8">
      
      {/* 1. Header & Live Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="font-pixel text-xs text-cyan-400">TELEMETRY & VISITOR INTELLIGENCE</div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white">
            ANALYTICS MISSION CONTROL
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-900/90 rounded-full border border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                (overview?.liveVisitors || 0) > 0 ? 'animate-ping bg-emerald-400' : 'bg-slate-500'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                (overview?.liveVisitors || 0) > 0 ? 'bg-emerald-500' : 'bg-slate-500'
              }`}></span>
            </span>
            <span className={`font-mono text-xs font-bold ${
              (overview?.liveVisitors || 0) > 0 ? 'text-emerald-300' : 'text-slate-400'
            }`}>
              {overview?.liveVisitors || 0} ACTIVE NOW
            </span>
          </div>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            aria-label="Refresh dashboard data"
            className="p-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-400 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Demo Traffic Simulator Panel */}
      <div className="bg-[#0b0e1e] p-4 rounded-xl border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[10px] text-amber-400">DEMO TRAFFIC SIMULATOR</span>
            {overview?.hasSimulatedData && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Simulated Data Active ({overview.simulatedEventsCount} events)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-sans">
            Simulate realistic visitor journeys across routes and devices. Events are marked with <code className="text-cyan-300 font-mono">is_simulated = true</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeSimulated}
              onChange={(e) => setIncludeSimulated(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
            />
            Include Demo Data in Stats
          </label>

          <button
            onClick={handleSimulate}
            disabled={simulating}
            className="cyber-btn cyber-btn-cyan text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {simulating ? 'SIMULATING...' : 'SIMULATE TRAFFIC (DEMO ONLY)'}
          </button>

          {overview?.hasSimulatedData && (
            <button
              onClick={handleClearSimulated}
              disabled={clearing}
              className="cyber-btn cyber-btn-outline text-xs py-1.5 px-3 text-red-400 hover:text-red-300 border-red-500/40 hover:border-red-400 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {clearing ? 'CLEARING...' : 'CLEAR DEMO DATA'}
            </button>
          )}
        </div>
      </div>


      {/* 2. Key Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="cyber-card p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Unique Visitors</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-bold text-white">
            {overview?.uniqueVisitors || 0}
          </div>
          <div className="text-[11px] text-cyan-400/80 font-mono">
            {overview?.uniqueSessions || 0} Total Sessions Logged
          </div>
        </div>

        <div className="cyber-card p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Total Page Views</span>
            <Eye className="w-4 h-4 text-pink-400" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-bold text-white">
            {overview?.totalPageviews || 0}
          </div>
          <div className="text-[11px] text-pink-400/80 font-mono">
            {overview?.totalEvents || 0} Ingested Telemetry Events
          </div>
        </div>

        <div className="cyber-card p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Bounce Rate</span>
            <TrendingUp className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-bold text-white">
            {overview?.bounceRate || 0}%
          </div>
          <div className="text-[11px] text-yellow-400/80 font-mono">
            Avg Dwell: {overview?.avgDwellTime || '0s'}
          </div>
        </div>

        <div className="cyber-card p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Goal Conversions</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-bold text-white">
            {overview?.totalConversions || 0}
          </div>
          <div className="text-[11px] text-emerald-400/80 font-mono">
            {overview?.formSubmissions || 0} Form Transmissions
          </div>
        </div>

      </div>


      {/* 3. Interactive Visitor & Pageview Timeline Chart */}
      <div className="cyber-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="font-pixel text-[10px] text-cyan-400">TRAFFIC VELOCITY</span>
            <h3 className="font-heading text-lg font-bold text-white">
              Visitors & Pageviews Over Time
            </h3>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded border border-slate-800">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setTimelineDays(d)}
                className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                  timelineDays === d
                    ? 'bg-cyan-500 text-black font-bold shadow-[0_0_10px_#00f0ff]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>

        {hasTimelineData ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorVis" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff007f" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ff007f" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090b14', borderColor: '#00f0ff', borderRadius: '6px', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="pageviews" stroke="#00f0ff" fillOpacity={1} fill="url(#colorPv)" name="Page Views" />
                <Area type="monotone" dataKey="unique_visitors" stroke="#ff007f" fillOpacity={1} fill="url(#colorVis)" name="Unique Visitors" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-16 text-center rounded border border-slate-800/80 bg-slate-900/30 space-y-2">
            <AlertCircle className="w-8 h-8 text-cyan-400/60 mx-auto" />
            <h4 className="text-sm font-heading font-bold text-slate-300">No Traffic Recorded Yet</h4>
            <p className="text-xs text-slate-500 font-mono max-w-sm mx-auto">
              Open the live public site to generate real visitor telemetry, or click "SIMULATE TRAFFIC" above to preview charts.
            </p>
          </div>
        )}
      </div>


      {/* 4. Multi-Stage Funnel & Drop-Off Visualizer */}
      <div className="cyber-card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-pixel text-[10px] text-pink-400">CONVERSION PIPELINE</span>
            <h3 className="font-heading text-lg font-bold text-white">
              Visitor Journey & Drop-Off Funnel
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">Stage by stage progression</span>
        </div>

        {funnel.length > 0 && funnel[0].count > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {funnel.map((step, idx) => (
              <div key={idx} className="bg-slate-900/80 p-4 rounded border border-slate-800 space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-cyan-400 font-bold">{step.stage}</span>
                  <span className="font-pixel text-[10px] text-pink-400">{step.pctOfTotal}%</span>
                </div>

                <div className="space-y-1">
                  <div className="text-xl font-heading font-extrabold text-white">
                    {step.count}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    Target: {step.page}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-pink-500 rounded-full"
                    style={{ width: `${Math.max(6, step.pctOfTotal)}%` }}
                  />
                </div>

                {step.dropOffRate > 0 && (
                  <div className="text-[10px] font-mono text-red-400 flex items-center gap-1 pt-1">
                    <ArrowDownRight className="w-3 h-3" />
                    <span>{step.dropOffRate}% drop-off to next step</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center rounded border border-slate-800/80 bg-slate-900/30 text-xs font-mono text-slate-500">
            Funnel empty. Navigate the public site to record multi-step journey telemetry.
          </div>
        )}
      </div>


      {/* 5. Top Pages & Device/Browser Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Top Visited Pages */}
        <div className="cyber-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-base font-bold text-white">
              Most Visited Routes
            </h3>
            <span className="text-xs font-mono text-slate-400">Total Views</span>
          </div>

          <div className="space-y-2">
            {pages.length > 0 ? (
              pages.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded border border-slate-800 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10px]">#{idx + 1}</span>
                    <span className="text-cyan-300 font-bold">{p.page_url}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-400">{p.unique_visitors} unique</span>
                    <span className="text-white font-bold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                      {p.views} views
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs font-mono text-slate-500">
                No route telemetry logged yet.
              </div>
            )}
          </div>
        </div>

        {/* Device & Browser Breakdown */}
        <div className="cyber-card p-6 space-y-6">
          <h3 className="font-heading text-base font-bold text-white">
            Hardware & Client Diagnostics
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Device breakdown */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase">Device Matrix</span>
              {(deviceData?.devices || []).length > 0 ? (
                deviceData.devices.map((d, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-900/80 rounded border border-slate-800 text-xs font-mono">
                    <span className="text-slate-300 uppercase">{d.device}</span>
                    <span className="text-cyan-400 font-bold">{d.count}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-600 text-[11px] font-mono">No device data.</div>
              )}
            </div>

            {/* Browser breakdown */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase">Browser Engine</span>
              {(deviceData?.browsers || []).length > 0 ? (
                deviceData.browsers.map((b, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-900/80 rounded border border-slate-800 text-xs font-mono">
                    <span className="text-slate-300">{b.browser}</span>
                    <span className="text-pink-400 font-bold">{b.count}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-600 text-[11px] font-mono">No browser data.</div>
              )}
            </div>
          </div>

          {/* Traffic Sources */}
          <div className="pt-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase block mb-2">Top Referrers / Traffic Sources</span>
            <div className="flex flex-wrap gap-2">
              {(deviceData?.referrers || []).length > 0 ? (
                deviceData.referrers.map((ref, idx) => (
                  <span key={idx} className="text-xs bg-slate-900 px-3 py-1 rounded border border-slate-700 font-mono text-slate-300">
                    {ref.source}: <strong className="text-emerald-400">{ref.count}</strong>
                  </span>
                ))
              ) : (
                <span className="text-slate-600 text-xs font-mono">No referrer traffic detected.</span>
              )}
            </div>
          </div>
        </div>

      </div>


      {/* 6. Raw Event Telemetry Stream */}
      <div className="cyber-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="font-heading text-base font-bold text-white">
              Raw Event Ingestion Feed (Real-Time)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400">Streaming Live</span>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-1.5 font-mono text-[11px]">
          {realtimeStream.length > 0 ? (
            realtimeStream.map((evt) => (
              <div key={evt.id} className="p-2 bg-black/50 rounded border border-slate-900 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase ${
                    evt.event_type === 'form_submit' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                    evt.event_type === 'cta_click_games' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40' :
                    evt.event_type === 'click' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' :
                    'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  }`}>
                    {evt.event_type}
                  </span>
                  <span className="text-slate-300 truncate max-w-[200px]">{evt.page_url}</span>
                  <span className="text-slate-600 text-[10px]">ID: {evt.visitor_id.substring(0, 10)}...</span>
                </div>
                <div className="text-slate-500 text-[10px] flex-shrink-0">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs font-mono text-slate-500">
              No recent event telemetry recorded.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
