import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Gamepad2, ArrowRight } from 'lucide-react';
import SectionHeading from '../components/ui/SectionHeading';
import { contentAPI } from '../services/api';
import { trackEvent } from '../services/tracker';

const CATEGORIES = ['All', 'ENGINEERING', 'GAME UPDATE', 'SOUND & MUSIC', 'ART & DESIGN', 'COMMUNITY', 'STUDIO NEWS', 'PATCH NOTES'];
const PAGE_SIZE = 9;

function readingTime(text = '') {
  return Math.max(1, Math.round(text.trim().split(/\s+/).length / 200));
}

export default function DevlogsPage({ onNavigate }) {
  const [devlogs, setDevlogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(0);

  useEffect(() => {
    setLoading(true);
    const params = {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    };
    if (category !== 'All') params.category = category;

    contentAPI.getDevlogs(params)
      .then(res => {
        setDevlogs(res.data.devlogs || []);
        setTotal(res.data.total || 0);
      })
      .catch(err => console.error('Failed to load devlogs:', err))
      .finally(() => setLoading(false));
  }, [category, page]);

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    setPage(0);
    trackEvent('click', '/devlogs', { filter_category: cat });
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="page-container py-12 md:py-16 space-y-12">
      
      <SectionHeading
        badge="DEVLOGS & INSIGHTS"
        title="FROM THE FORGE"
        subtitle="Behind-the-scenes deep dives into graphics shaders, modular synthesis, game updates, and level architecture."
        align="center"
      />

      {/* Category filter */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={`px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-all ${
              category === cat
                ? 'bg-gradient-to-r from-[#00f0ff] to-blue-600 text-black font-bold shadow-[0_0_12px_rgba(0,240,255,0.35)]'
                : 'bg-[#0f1224] text-[#8a93b8] hover:text-[#00f0ff] border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Devlog grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="cyber-card h-64 animate-pulse bg-slate-900/40" />
          ))}
        </div>
      ) : devlogs.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <div className="text-[#8a93b8] text-sm font-heading font-bold">No devlogs in this category yet.</div>
          <button onClick={() => handleCategoryChange('All')} className="text-xs font-mono text-cyan-400 hover:underline">
            View all devlogs →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {devlogs.map(log => (
            <div
              key={log.id}
              className="cyber-card flex flex-col justify-between space-y-4 cursor-pointer hover:border-cyan-500/50 transition-all group"
              onClick={() => {
                trackEvent('click', '/devlogs', { action: 'read_devlog', slug: log.slug });
                onNavigate('devlog', log.slug);
              }}
            >
              {log.cover_image && (
                <div className="rounded-lg overflow-hidden h-36 -m-6 mb-0">
                  <img src={log.cover_image} alt={log.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              )}
              <div className="space-y-2.5 flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="pixel-badge badge-cyan text-[9px]">{log.category}</span>
                  <span className="text-[10px] font-mono text-[#8a93b8] flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {log.published_at ? new Date(log.published_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Draft'}
                  </span>
                </div>
                <h3 className="font-heading font-bold text-base text-[#e8ecff] group-hover:text-[#00f0ff] transition-colors line-clamp-2">
                  {log.title}
                </h3>
                <p className="text-xs text-[#8a93b8] leading-relaxed line-clamp-3 font-sans">
                  {log.excerpt}
                </p>
              </div>

              <div className="pt-3 border-t border-[rgba(0,240,255,0.15)] flex items-center justify-between">
                <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {readingTime(log.content)} min
                  </span>
                  {log.game_title && (
                    <span className="flex items-center gap-1 text-[#ff0a78]">
                      <Gamepad2 className="w-3 h-3" /> {log.game_title}
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono text-[#00f0ff] font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                  Read <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 rounded text-xs font-mono bg-slate-900 text-slate-400 hover:text-cyan-400 border border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span className="text-xs font-mono text-slate-500">
            Page {page + 1} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 rounded text-xs font-mono bg-slate-900 text-slate-400 hover:text-cyan-400 border border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}

    </div>
  );
}
