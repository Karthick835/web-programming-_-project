import React, { useState, useEffect } from 'react';
import { Star, Play, Heart, BookOpen, Calendar, ArrowRight } from 'lucide-react';
import Modal from './ui/Modal';
import { contentAPI } from '../services/api';
import { trackEvent } from '../services/tracker';

export default function GameModal({
  game,
  onClose,
  isWishlisted = false,
  onToggleWishlist,
  onNavigateDevlog
}) {
  const [activeImg, setActiveImg] = useState(game?.banner_img || '');
  const [updates, setUpdates] = useState([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);

  useEffect(() => {
    if (!game) return;
    setActiveImg(game.banner_img || '');
    if (!game.id) return;
    setLoadingUpdates(true);
    contentAPI.getDevlogs({ game_id: game.id })
      .then(res => setUpdates(res.data.devlogs || []))
      .catch(err => console.error('Failed to load game updates:', err))
      .finally(() => setLoadingUpdates(false));
  }, [game?.id, game?.banner_img]);

  if (!game) return null;

  const handleLaunch = () => {
    trackEvent('click', window.location.pathname, { action: 'launch_game_store', game: game.title });
    if (game.play_url && game.play_url !== '#') {
      window.open(game.play_url, '_blank');
    } else {
      alert(`🚀 ${game.title} demo launching — Connecting to Pixel Forge Cloud Servers!`);
    }
  };

  const handleDevlogClick = (slug) => {
    onClose();
    if (onNavigateDevlog) {
      onNavigateDevlog(slug);
    } else {
      window.location.href = `/devlog/${slug}`;
    }
  };

  const screenshots = [game.banner_img, ...(game.screenshots || [])].filter(Boolean);

  return (
    <Modal isOpen={!!game} onClose={onClose} title={null} size="xl">
      {/* Hero Image Showcase */}
      <div className="relative h-64 sm:h-80 bg-black overflow-hidden rounded-lg -m-6 mb-0">
        <img
          src={activeImg}
          alt={game.title}
          className="w-full h-full object-cover transition-all duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0f1c] via-transparent to-black/50" />

        {/* Title overlay */}
        <div className="absolute bottom-5 left-6 right-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="pixel-badge badge-cyan">{game.genre}</span>
            <span className="pixel-badge badge-emerald">{game.status}</span>
            <div className="flex items-center gap-1 bg-black/70 px-2 py-0.5 rounded border border-yellow-500/40 text-xs text-yellow-300">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span>{game.rating} / 5.0</span>
            </div>
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
            {game.title}
          </h2>
        </div>
      </div>

      {/* Thumbnail Carousel */}
      {screenshots.length > 1 && (
        <div className="flex gap-2 py-4 overflow-x-auto border-b border-slate-800">
          {screenshots.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveImg(img)}
              aria-label={`View screenshot ${idx + 1}`}
              className={`relative w-20 h-14 rounded overflow-hidden flex-shrink-0 border-2 transition-all ${
                activeImg === img
                  ? 'border-cyan-400 scale-105 shadow-[0_0_10px_#00f0ff]'
                  : 'border-slate-800 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Modal Body */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {/* Left (2 cols): Description, Tags, and Updates Timeline */}
        <div className="md:col-span-2 space-y-6">
          <div className="space-y-3">
            <h4 className="font-pixel text-xs text-cyan-400 tracking-wider">PROJECT DOSSIER</h4>
            <p className="text-sm text-slate-300 leading-relaxed">{game.description}</p>

            {(game.tags || []).length > 0 && (
              <div className="pt-1">
                <h5 className="text-xs font-mono text-slate-400 mb-2">TACTICAL KEYWORDS</h5>
                <div className="flex flex-wrap gap-1.5">
                  {(game.tags || []).map((t, idx) => (
                    <span key={idx} className="text-xs bg-cyan-950/40 text-cyan-300 px-2.5 py-1 rounded border border-cyan-500/30">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Updates & Patch Notes Timeline */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <h4 className="font-pixel text-xs text-cyan-400 tracking-wider">
                TRANSMISSIONS & PATCH NOTES
              </h4>
            </div>

            {loadingUpdates ? (
              <p className="text-xs font-mono text-slate-500">Querying devlog logs...</p>
            ) : updates.length === 0 ? (
              <div className="p-4 bg-slate-900/40 rounded border border-slate-800/80 text-xs text-slate-400">
                No public patch notes released for this game yet. Watch for future development transmissions.
              </div>
            ) : (
              <div className="space-y-2.5">
                {updates.map(u => (
                  <div
                    key={u.id}
                    onClick={() => handleDevlogClick(u.slug)}
                    className="p-3 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-lg cursor-pointer transition-all group flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {u.version && (
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                            {u.version}
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-pink-400 font-bold">
                          {u.category}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(u.published_at || u.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h5 className="font-heading font-bold text-xs text-white group-hover:text-cyan-300 transition-colors truncate">
                        {u.title}
                      </h5>
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {u.excerpt}
                      </p>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right (1 col): Specs & Action */}
        <div className="space-y-4 bg-slate-900/60 p-5 rounded border border-slate-800 h-fit">
          <h4 className="font-pixel text-xs text-pink-400 tracking-wider">SPECS</h4>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-500 block">Release Window:</span>
              <span className="text-slate-200 font-mono font-semibold">{game.release_date || 'TBA'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Target Platforms:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {(game.platforms || []).map((p, idx) => (
                  <span key={idx} className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px]">{p}</span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-slate-500 block">Engine:</span>
              <span className="text-cyan-400 font-mono">PixelForge Engine v4.2</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-2">
            <button
              onClick={handleLaunch}
              className="w-full cyber-btn cyber-btn-cyan text-xs py-3"
            >
              <Play className="w-4 h-4 fill-current" />
              PLAY DEMO / STEAM
            </button>

            {onToggleWishlist && (
              <button
                type="button"
                onClick={() => onToggleWishlist(game.id)}
                className={`w-full py-2.5 px-3 rounded text-xs font-mono flex items-center justify-center gap-2 border transition-all ${
                  isWishlisted
                    ? 'bg-pink-950/60 border-pink-500 text-pink-300'
                    : 'bg-slate-900/80 border-slate-700 hover:border-pink-500/50 text-slate-300 hover:text-pink-300'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-pink-500 text-pink-500' : ''}`} />
                {isWishlisted ? 'IN YOUR WISHLIST' : 'ADD TO WISHLIST'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
