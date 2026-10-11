import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Trash2, CheckCircle2, Reply, RefreshCw, Search, FlaskConical, X, Download } from 'lucide-react';
import { contentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sampleLoading, setSampleLoading] = useState(false);
  const { isAdmin } = useAuth();

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search };
      if (filter !== 'all') params.status = filter;
      const res = await contentAPI.getMessages(params);
      setMessages(res.data.messages || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleStatusToggle = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'read' ? 'unread' : 'read';
    try {
      await contentAPI.updateMessageStatus(id, nextStatus);
      fetchMessages();
    } catch {
      alert('Failed to update status.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete message from "${name}"? This cannot be undone.`)) return;
    try {
      await contentAPI.deleteMessage(id);
      fetchMessages();
    } catch {
      alert('Failed to delete message.');
    }
  };

  const handleLoadSamples = async () => {
    setSampleLoading(true);
    try {
      await contentAPI.loadSampleMessages();
      fetchMessages();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to load sample messages.');
    } finally {
      setSampleLoading(false);
    }
  };

  const handleClearSamples = async () => {
    if (!window.confirm('Clear all sample/demo messages?')) return;
    setSampleLoading(true);
    try {
      await contentAPI.clearSampleMessages();
      fetchMessages();
    } catch {
      alert('Failed to clear sample messages.');
    } finally {
      setSampleLoading(false);
    }
  };

  const hasSamples = messages.some(m => m.is_sample);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="font-pixel text-xs text-cyan-400">SIGNAL INBOX</div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white">
            CONTACT TRANSMISSIONS
          </h1>
          {unreadCount > 0 && (
            <p className="text-xs font-mono text-pink-400 mt-1">
              {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Tabs */}
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-xs font-mono ${filter === 'all' ? 'bg-cyan-500 text-black font-bold' : 'bg-slate-900 text-slate-400'}`}
          >
            All ({messages.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1 rounded text-xs font-mono ${filter === 'unread' ? 'bg-pink-500 text-white font-bold' : 'bg-slate-900 text-slate-400'}`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-3 py-1 rounded text-xs font-mono ${filter === 'read' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-900 text-slate-400'}`}
          >
            Read
          </button>

          {/* Export CSV */}
          <a
            href="http://localhost:5555/api/content/messages/export/csv"
            download="contact_messages.csv"
            className="px-3 py-1 rounded bg-[#0f1224] hover:bg-slate-800 text-[#00f0ff] border border-[#00f0ff]/40 text-xs font-mono flex items-center gap-1"
            title="Export as CSV"
          >
            <Download className="w-3 h-3" />
            CSV
          </a>

          {/* Refresh */}
          <button
            onClick={fetchMessages}
            className="p-1.5 rounded bg-slate-900 text-slate-400 hover:text-cyan-400 border border-slate-700"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search by name, email, subject, or message..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Admin: Sample Data Controls */}
      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500">
          <span>DEMO DATA:</span>
          <button
            onClick={handleLoadSamples}
            disabled={sampleLoading}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/30 flex items-center gap-1"
          >
            <FlaskConical className="w-3 h-3" />
            Load Samples
          </button>
          {hasSamples && (
            <button
              onClick={handleClearSamples}
              disabled={sampleLoading}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-red-950 text-red-400 border border-red-800/40 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear Samples
            </button>
          )}
        </div>
      )}

      {/* Message Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-16 text-slate-500 text-xs font-mono animate-pulse">
            Loading transmissions...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/30 rounded border border-slate-800 space-y-3">
            <Mail className="w-10 h-10 text-slate-700 mx-auto" />
            <div className="text-slate-400 text-sm font-heading font-bold">
              {search || filter !== 'all' ? 'No messages match your filters.' : 'No messages yet.'}
            </div>
            <div className="text-slate-600 text-xs font-mono max-w-xs mx-auto">
              {search || filter !== 'all'
                ? 'Try adjusting your search or clearing the filter.'
                : 'Messages from the Contact page will appear here.'}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`cyber-card p-6 space-y-3 transition-all ${
              m.status === 'unread' ? 'border-pink-500/50 bg-slate-900/90' : 'bg-slate-950/60 opacity-90'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`pixel-badge ${m.status === 'unread' ? 'badge-pink' : 'badge-emerald'}`}>
                    {m.status.toUpperCase()}
                  </span>
                  {m.is_sample ? (
                    <span className="pixel-badge badge-yellow text-[8px]">SAMPLE</span>
                  ) : null}
                  <span className="font-mono text-xs text-cyan-300 font-bold">{m.name}</span>
                  <span className="text-slate-500 text-xs font-mono">&lt;{m.email}&gt;</span>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
                  <span>{new Date(m.created_at).toLocaleString()}</span>
                  <button
                    onClick={() => handleStatusToggle(m.id, m.status)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300"
                    title={m.status === 'read' ? 'Mark as Unread' : 'Mark as Read'}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(m.id, m.name)}
                      className="p-1 rounded hover:bg-red-950 text-slate-400 hover:text-red-400"
                      title="Delete Message"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-mono text-pink-400 uppercase tracking-wider block">
                  Subject: {m.subject}
                </span>
                <p className="text-xs text-slate-200 mt-2 bg-black/40 p-3 rounded border border-slate-900 leading-relaxed font-mono whitespace-pre-wrap">
                  {m.message}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <a
                  href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}&body=Hi ${encodeURIComponent(m.name)},%0A%0A`}
                  className="cyber-btn cyber-btn-outline text-[11px] py-1.5 px-3 flex items-center gap-1.5"
                >
                  <Reply className="w-3 h-3" />
                  Reply via Email
                </a>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
