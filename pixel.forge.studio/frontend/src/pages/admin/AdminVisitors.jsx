import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Search,
  Filter,
  Eye,
  Clock,
  Laptop,
  Smartphone,
  Tablet,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { visitorAPI } from '../../services/api';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';

export default function AdminVisitors() {
  const [profiles, setProfiles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [includeSimulated, setIncludeSimulated] = useState(false);
  const [page, setPage] = useState(1);

  // Selected profile for journey modal
  const [selectedVisitorId, setSelectedVisitorId] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const res = await visitorAPI.getProfiles({
        search,
        status: statusFilter,
        page,
        limit: 15,
        include_simulated: includeSimulated
      });
      setProfiles(res.data.profiles || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load visitor profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [search, statusFilter, includeSimulated, page]);

  const handleOpenTimeline = async (visitorId) => {
    setSelectedVisitorId(visitorId);
    setLoadingTimeline(true);
    try {
      const res = await visitorAPI.getProfileTimeline(visitorId);
      setTimelineData(res.data);
    } catch (err) {
      console.error('Failed to load visitor timeline:', err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const getDeviceIcon = (device = '') => {
    if (device.toLowerCase() === 'mobile') return <Smartphone className="w-4 h-4 text-pink-400" />;
    if (device.toLowerCase() === 'tablet') return <Tablet className="w-4 h-4 text-purple-400" />;
    return <Laptop className="w-4 h-4 text-cyan-400" />;
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="font-pixel text-xs text-cyan-400">IDENTITY & LIFETIME SESSIONS</div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white">
            VISITOR PROFILES & JOURNEYS
          </h1>
        </div>

        <button
          onClick={fetchProfiles}
          className="cyber-btn cyber-btn-outline text-xs py-2 px-4 flex items-center gap-2 self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          REFRESH PROFILES
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Visitor ID, Browser, Device, or OS..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-400 font-mono"
          >
            <option value="">All Statuses</option>
            <option value="new">New Visitors</option>
            <option value="returning">Returning Visitors</option>
            <option value="converted">Converted Visitors</option>
          </select>

          <label className="flex items-center gap-2 text-xs font-mono text-slate-400 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={includeSimulated}
              onChange={(e) => setIncludeSimulated(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
            />
            Include Demo Data
          </label>
        </div>
      </div>

      {/* Profiles Table */}
      {loading ? (
        <div className="text-center py-20 text-slate-500 text-xs font-mono">
          Loading visitor telemetry...
        </div>
      ) : profiles.length === 0 ? (
        <EmptyState
          title="No Visitor Profiles Recorded"
          description={
            search || statusFilter
              ? "No visitor profiles match your current search criteria."
              : "No real visitors have connected to the studio yet. Visit the public site or trigger the Demo Traffic Simulator."
          }
          icon={UserCheck}
        />
      ) : (
        <div className="bg-[#0b0e1b] rounded-lg border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Visitor / Callsign</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Devices</th>
                  <th className="py-3 px-4">Visits</th>
                  <th className="py-3 px-4">Converted</th>
                  <th className="py-3 px-4">First Seen</th>
                  <th className="py-3 px-4">Last Seen</th>
                  <th className="py-3 px-4 text-right">Journey</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {profiles.map((p) => {
                  const isConverted = p.status === 'converted' || (p.goals_completed && p.goals_completed.length > 0);
                  const isSim = Boolean(p.is_simulated);

                  return (
                    <tr key={p.visitor_id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            {p.callsign ? (
                              <span className="font-bold text-pink-400 font-mono">
                                🚀 {p.callsign}
                              </span>
                            ) : (
                              <span className="font-bold text-cyan-300">
                                {p.visitor_id.substring(0, 16)}…
                              </span>
                            )}
                            {isSim && (
                              <span className="text-[9px] font-pixel px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                SIM
                              </span>
                            )}
                          </div>
                          {p.callsign && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              id: {p.visitor_id.substring(0, 12)}…
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`pixel-badge text-[9px] ${
                          isConverted ? 'badge-emerald' : p.status === 'returning' ? 'badge-pink' : 'badge-cyan'
                        }`}>
                          {p.status ? p.status.toUpperCase() : 'NEW'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          {getDeviceIcon(p.device_type)}
                          <span>{p.devices_count > 1 ? `${p.devices_count} devices` : '1 device'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-300 font-bold">
                        <span className="text-white">{p.total_visits}</span>
                        <span className="text-slate-500 font-normal text-[10px] ml-1">({p.total_page_views} views)</span>
                      </td>

                      <td className="py-3 px-4">
                        {isConverted ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> YES
                          </span>
                        ) : (
                          <span className="text-slate-500">NO</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(p.first_seen).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(p.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenTimeline(p.visitor_id)}
                          className="cyber-btn cyber-btn-outline text-[11px] py-1 px-3 inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3 h-3" />
                          Timeline
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <div>
              Showing {profiles.length} of {total} profiles
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={profiles.length < 15}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visitor Timeline / Journey Modal */}
      <Modal
        isOpen={Boolean(selectedVisitorId)}
        onClose={() => {
          setSelectedVisitorId(null);
          setTimelineData(null);
        }}
        title={`Visitor Journey: ${selectedVisitorId || ''}`}
        size="xl"
      >
        {loadingTimeline || !timelineData ? (
          <div className="py-12 text-center text-xs font-mono text-slate-400">
            Reconstructing visitor journey telemetry...
          </div>
        ) : (
          <div className="space-y-6 text-xs">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Total Sessions</span>
                <span className="text-lg font-bold text-white">{timelineData.profile.total_visits}</span>
              </div>
              <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Total Pageviews</span>
                <span className="text-lg font-bold text-cyan-400">{timelineData.profile.total_page_views}</span>
              </div>
              <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">First Referrer</span>
                <span className="text-xs font-bold text-pink-400 truncate block">{timelineData.profile.first_referrer || 'Direct'}</span>
              </div>
              <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Status</span>
                <span className="text-xs font-bold text-emerald-400 uppercase">{timelineData.profile.status}</span>
              </div>
            </div>

            {/* A/B Test Variant lock */}
            {Object.keys(timelineData.profile.assigned_variants || {}).length > 0 && (
              <div className="bg-slate-900/40 p-3 rounded border border-slate-800 space-y-1">
                <span className="font-pixel text-[10px] text-cyan-400">LOCKED A/B ASSIGNMENTS</span>
                <div className="flex flex-wrap gap-2 pt-1 font-mono text-xs">
                  {Object.entries(timelineData.profile.assigned_variants).map(([exp, v]) => (
                    <span key={exp} className="px-2 py-1 rounded bg-black/60 border border-cyan-500/30 text-white">
                      {exp}: <strong className="text-pink-400">Variant {v}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Event Timeline */}
            <div>
              <h3 className="font-heading font-bold text-sm text-white mb-3">Chronological Event Timeline</h3>
              <div className="space-y-3 font-mono">
                {timelineData.events.length === 0 ? (
                  <div className="text-slate-500 text-xs py-4 text-center">No raw events recorded for this profile.</div>
                ) : (
                  timelineData.events.map((evt, idx) => (
                    <div key={evt.id || idx} className="flex items-start gap-3 bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
                      <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-[11px]">{evt.event_type.toUpperCase()}</span>
                          <span className="text-[10px] text-slate-500">{new Date(evt.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          Route: <span className="text-cyan-300">{evt.page_url}</span>
                        </div>
                        {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                          <pre className="text-[10px] bg-black/50 p-1.5 rounded text-slate-400 overflow-x-auto">
                            {JSON.stringify(evt.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
