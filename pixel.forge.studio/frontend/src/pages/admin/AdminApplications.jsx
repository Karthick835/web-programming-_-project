import React, { useState, useEffect } from 'react';
import { FileText, ExternalLink, RefreshCw, CheckCircle2, XCircle, Clock, User } from 'lucide-react';
import { contentAPI } from '../../services/api';

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await contentAPI.getApplications();
      setApplications(res.data.applications || []);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      await contentAPI.updateApplicationStatus(id, status);
      fetchApplications();
    } catch (err) {
      alert('Failed to update application status.');
    }
  };

  const statusBadge = (s) => {
    switch (s) {
      case 'interviewing': return 'badge-cyan';
      case 'offered': return 'badge-emerald';
      case 'rejected': return 'badge-pink';
      default: return 'badge-gold';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-pixel text-xs text-emerald-400">CANDIDATE PIPELINE</div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white">
            JOB APPLICATIONS ({applications.length})
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="http://localhost:5555/api/content/applications/export/csv"
            download="job_applications.csv"
            className="px-3 py-1.5 rounded bg-[#0f1224] hover:bg-slate-800 text-[#00ff88] border border-[#00ff88]/40 text-xs font-mono"
          >
            Export CSV
          </a>
          <button
            onClick={fetchApplications}
            className="p-1.5 rounded bg-slate-900 text-slate-400 hover:text-cyan-400 border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {applications.length > 0 ? (
          applications.map((app) => (
            <div key={app.id} className="cyber-card p-6 space-y-4 hud-corner">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`pixel-badge ${statusBadge(app.status)}`}>
                      {app.status.toUpperCase()}
                    </span>
                    <span className="text-xs font-mono text-cyan-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-cyan-500/30">
                      Target: {app.job_title}
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-xl text-white">
                    {app.applicant_name}
                  </h3>
                  <div className="text-xs font-mono text-slate-400">
                    Contact: <span className="text-slate-200">{app.email}</span> • Applied on {new Date(app.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Status selector */}
                <div className="flex items-center gap-2 self-start md:self-auto flex-shrink-0">
                  <span className="text-xs font-mono text-slate-400">Pipeline State:</span>
                  <select
                    value={app.status}
                    onChange={(e) => handleStatusChange(app.id, e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="pending">Pending Review</option>
                    <option value="interviewing">Interviewing</option>
                    <option value="offered">Offer Extended</option>
                    <option value="rejected">Archive / Reject</option>
                  </select>
                </div>
              </div>

              {/* Cover Note & Portfolio Link */}
              <div className="p-4 bg-slate-950/80 rounded border border-slate-900 space-y-3 text-xs font-sans">
                {app.portfolio_url && (
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-500">Portfolio Dossier:</span>
                    <a
                      href={app.portfolio_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      {app.portfolio_url}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {app.cover_note && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-slate-500">Applicant Note:</span>
                    <p className="text-slate-300 leading-relaxed italic bg-black/40 p-3 rounded border border-slate-900">
                      "{app.cover_note}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16 bg-slate-900/30 rounded border border-slate-800 text-slate-500 text-xs font-mono">
            No applicant submissions logged yet.
          </div>
        )}
      </div>

    </div>
  );
}
