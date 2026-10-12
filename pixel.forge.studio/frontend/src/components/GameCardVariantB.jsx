/**
 * GameCardVariantB.jsx
 * ---------------------------------------------------------------------------
 * Feature 2: A/B Game Card — Variant B ("Steam-First" layout)
 *
 * Differences from Variant A (GameCard.jsx):
 *  1. Bold "PLAY ON STEAM" CTA button is ALWAYS visible at the bottom
 *     (not just on hover). This is the primary change being tested.
 *  2. A cyan gradient banner strip highlights the top of the card.
 *  3. Bottom shows a real Steam button, not just a "VIEW ->" text link.
 *
 * Goal metric: 'steam_click' events.
 * If Variant B produces more steam_clicks per game_opened, it wins.
 */

import React from 'react';
import { Star, Heart, ExternalLink } from 'lucide-react';
import { trackEvent } from '../services/tracker';

export default function GameCardVariantB({
  game,
  onSelect,
  isWishlisted = false,
  onToggleWishlist,
  variant = 'B',
  onSteamClick
}) {
  /**
   * handleCardClick - opens the game dossier AND fires game_opened event.
   * fire-and-forget: we don't await the tracking call so the UI stays snappy.
   */
  const handleCardClick = () => {
    trackEvent('game_opened', window.location.pathname, {
      game_id: game.id,
      game_title: game.title,
      variant
    });
    onSelect(game);
  };

  /**
   * handleSteamClick - fires steam_click event then opens Steam in new tab.
   * Does NOT block or delay the tab open: event fires asynchronously.
   */
  const handleSteamClick = (e) => {
    e.stopPropagation();
    trackEvent('steam_click', window.location.pathname, {
      game_id: game.id,
      game_title: game.title,
      steam_url: game.play_url || '',
      variant
    });
    if (game.play_url) {
      window.open(game.play_url, '_blank', 'noopener,noreferrer');
    }
    if (onSteamClick) onSteamClick(game);
  };

  const statusBadge =
    game.status === 'Released' ? 'badge-emerald' :
    game.status === 'In Beta'  ? 'badge-cyan'    : 'badge-yellow';

  return (
    <div
      onClick={handleCardClick}
      className="cyber-card group cursor-pointer h-full flex flex-col justify-between overflow-hidden relative"
      style={{ borderColor: 'rgba(0,240,255,0.35)' }}
    >
      {/* Variant B: Gradient highlight strip at top */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 z-10"
        style={{ background: 'linear-gradient(90deg, #00f0ff, #ff007f, #00f0ff)' }}
      />

      {/* Game Banner */}
      <div className="relative h-52 sm:h-60 -mx-6 -mt-6 mb-4 overflow-hidden bg-slate-950">
        <img
          src={game.banner_img}
          alt={game.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1224] via-transparent to-black/40" />

        <div className="absolute top-3.5 left-3.5">
          <span className={`pixel-badge ${statusBadge}`}>{game.status}</span>
        </div>

        <div className="absolute top-3.5 right-3.5 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (onToggleWishlist) onToggleWishlist(game.id); }}
            className={`p-1.5 rounded-full backdrop-blur transition-all ${
              isWishlisted
                ? 'bg-pink-600 text-white shadow-[0_0_10px_#ff0a78]'
                : 'bg-black/75 text-slate-400 hover:text-pink-400 border border-slate-700/60'
            }`}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
          <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur px-2.5 py-1 rounded border border-yellow-500/40">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" strokeWidth={2} />
            <span className="text-xs font-mono font-bold text-yellow-300">{game.rating}</span>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="text-[11px] font-retro text-[#00f0ff] tracking-wider mb-1">{game.genre}</div>
          <h3 className="font-heading font-bold text-xl text-[#e8ecff] group-hover:text-[#00f0ff] transition-colors line-clamp-1">
            {game.title}
          </h3>
          <p className="text-xs text-[#8a93b8] mt-1.5 line-clamp-2 leading-relaxed font-sans">
            {game.tagline || game.description}
          </p>
        </div>

        {/* VARIANT B: Always-visible PLAY ON STEAM button */}
        <div className="pt-3 border-t border-[rgba(0,240,255,0.15)] space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {(game.platforms || []).slice(0, 3).map((plat, idx) => (
              <span key={idx} className="text-[10px] bg-[#07080f] text-[#8a93b8] px-2 py-0.5 rounded border border-slate-800 font-mono">
                {plat}
              </span>
            ))}
          </div>
          <button
            onClick={handleSteamClick}
            className="w-full cyber-btn cyber-btn-cyan text-xs py-2.5 flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(0,240,255,0.3)]"
            title={`View ${game.title} on Steam`}
          >
            <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
            PLAY ON STEAM
          </button>
        </div>
      </div>

      {/* Dev label (tiny, invisible to real users) */}
      <div className="absolute bottom-1 left-1 text-[8px] font-mono text-pink-400 opacity-20" aria-hidden="true">B</div>
    </div>
  );
}
