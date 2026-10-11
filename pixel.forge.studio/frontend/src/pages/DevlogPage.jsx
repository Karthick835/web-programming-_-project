import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, X, Calendar, Clock, Tag, Gamepad2, Share2 } from 'lucide-react';
import { contentAPI } from '../services/api';
import { trackEvent } from '../services/tracker';

// Simple reading time
function readingTime(text = '') {
  return Math.max(1, Math.round(text.trim().split(/\s+/).length / 200));
}

// Minimal Markdown → HTML converter (safe subset)
function renderMarkdown(text = '') {
  if (!text) return '';
  let html = text
    // Headings
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-heading font-bold text-[#e8ecff] mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-heading font-bold text-[#00f0ff] mt-8 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-heading font-extrabold text-[#e8ecff] mt-6 mb-4">$1</h1>')
    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#e8ecff]">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-[#8a93b8]">$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-[#07080f] border border-slate-800 rounded px-1.5 py-0.5 text-[#00ff88] text-[11px] font-mono">$1</code>')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-[#00f0ff]/50 pl-4 text-[#8a93b8] italic my-4">$1</blockquote>')
    // Unordered list items
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-[#8a93b8] my-1">$1</li>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="border-slate-800 my-6" />')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#00f0ff] hover:underline">$1</a>')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p class="text-[#8a93b8] leading-relaxed font-sans my-3">')
    // Single newlines to <br>
    .replace(/\n/g, '<br />');

  return `<p class="text-[#8a93b8] leading-relaxed font-sans my-3">${html}</p>`;
}

export default function DevlogPage({ slug, onNavigate }) {
  const [devlog, setDevlog] = useState(null);
  const [prev, setPrev] = useState(null);
  const [next, setNext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    contentAPI.getDevlog(slug)
      .then(res => {
        setDevlog(res.data.devlog);
        setPrev(res.data.prev);
        setNext(res.data.next);
        trackEvent('page_view', `/devlog/${slug}`, { devlog_title: res.data.devlog?.title });
      })
      .catch(err => {
        if (err?.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setToast('Link copied!');
      setTimeout(() => setToast(''), 2500);
    });
  };

  if (loading) {
    return (
      <div className="page-container py-20 text-center text-slate-500 text-xs font-mono animate-pulse">
        Loading transmission...
      </div>
    );
  }

  if (notFound || !devlog) {
    return (
      <div className="page-container py-20 text-center space-y-6">
        <div className="font-pixel text-xs text-[#ff0a78]">404 — NOT FOUND</div>
        <h1 className="font-heading text-4xl font-extrabold text-[#e8ecff]">Devlog Not Found</h1>
        <p className="text-[#8a93b8] font-sans text-sm">This transmission doesn't exist or has been unpublished.</p>
        <button
          onClick={() => onNavigate('devlogs')}
          className="cyber-btn cyber-btn-cyan text-xs py-2.5 px-6 inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Devlogs
        </button>
      </div>
    );
  }

  const rt = readingTime(devlog.content);
  const pubDate = devlog.published_at ? new Date(devlog.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <div className="page-container py-12 max-w-3xl mx-auto space-y-8">
      
      {/* Navigation bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('devlogs')}
          className="flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Devlogs
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors"
          title="Copy link"
        >
          <Share2 className="w-3.5 h-3.5" />
          Share
        </button>
      </div>

      {/* Cover image */}
      {devlog.cover_image && (
        <div className="rounded-xl overflow-hidden border border-slate-800 h-64 sm:h-80">
          <img src={devlog.cover_image} alt={devlog.title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Meta */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-500">
          <span className="pixel-badge badge-cyan text-[9px]">{devlog.category}</span>
          {devlog.version && (
            <span className="pixel-badge badge-yellow text-[9px]">v{devlog.version}</span>
          )}
          {pubDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {pubDate}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {rt} min read
          </span>
          {devlog.game_title && (
            <span className="flex items-center gap-1 text-[#ff0a78]">
              <Gamepad2 className="w-3.5 h-3.5" /> {devlog.game_title}
            </span>
          )}
        </div>

        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#e8ecff] leading-tight">
          {devlog.title}
        </h1>
        <p className="text-[#8a93b8] font-sans text-sm leading-relaxed">{devlog.excerpt}</p>
        <div className="text-[11px] font-mono text-slate-500">
          By <span className="text-cyan-300">{devlog.author}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-800" />

      {/* Content */}
      <article
        className="text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(devlog.content) }}
      />

      {/* Divider */}
      <div className="border-t border-slate-800" />

      {/* Prev / Next navigation */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          {prev && (
            <button
              onClick={() => onNavigate('devlog', prev.slug)}
              className="text-left group w-full"
            >
              <div className="text-[10px] font-mono text-slate-600 flex items-center gap-1 mb-1">
                <ArrowLeft className="w-3 h-3" /> Previous
              </div>
              <div className="text-xs font-heading font-bold text-slate-400 group-hover:text-cyan-400 transition-colors line-clamp-2">
                {prev.title}
              </div>
            </button>
          )}
        </div>
        <div className="text-right">
          {next && (
            <button
              onClick={() => onNavigate('devlog', next.slug)}
              className="text-right group w-full"
            >
              <div className="text-[10px] font-mono text-slate-600 flex items-center gap-1 justify-end mb-1">
                Next <ArrowRight className="w-3 h-3" />
              </div>
              <div className="text-xs font-heading font-bold text-slate-400 group-hover:text-cyan-400 transition-colors line-clamp-2">
                {next.title}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Share toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0a0d18] border border-cyan-400/60 text-cyan-300 text-xs font-mono px-5 py-2.5 rounded shadow-[0_0_20px_rgba(0,240,255,0.3)]">
          {toast}
        </div>
      )}

    </div>
  );
}
