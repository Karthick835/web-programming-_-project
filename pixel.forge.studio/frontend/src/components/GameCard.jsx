import React from 'react';
import { Star, Play, Heart, Layers, ExternalLink, ArrowRight } from 'lucide-react';
import { trackEvent } from '../services/tracker';

export default function GameCard({ game, onSelect, isWishlisted = false, onToggleWishlist }) {
  const handlePlayClick = (e) => {
    e.stopPropagation();
    trackEvent('click', window.location.pathname, { action: 'play_demo', game: game.title });
    onSelect(game);
  };

  const statusBadge = 
    game.status === 'Released' ? 'badge-emerald' :
    game.status === 'In Beta' ? 'badge-cyan' : 'badge-yellow';

  return (
    <div
      onClick={() => onSelect(game)}
      className="cyber-card group cursor-pointer h-full flex flex-col justify-between overflow-hidden relative"
    >
      {/* Top Banner Image with overlay */}
      <div className="relative h-56 sm:h-64 -mx-6 -mt-6 mb-5 overflow-hidden bg-slate-950">
        <img
          src={game.banner_img}
          alt={game.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1224] via-transparent to-black/50" />

        {/* Status Badge */}
        <div className="absolute top-3.5 left-3.5">
          <span className={`pixel-badge ${statusBadge}`}>
            {game.status}
          </span>
        </div>

        {/* Rating & Wishlist */}
        <div className="absolute top-3.5 right-3.5 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleWishlist) onToggleWishlist(game.id);
            }}
            className={`p-1.5 rounded-full backdrop-blur transition-all ${
              isWishlisted
                ? 'bg-pink-600 text-white shadow-[0_0_10px_#ff0a78]'
                : 'bg-black/75 text-slate-400 hover:text-pink-400 border border-slate-700/60'
            }`}
            title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>

          <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur px-2.5 py-1 rounded border border-yellow-500/40">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" strokeWidth={2} />
            <span className="text-xs font-mono font-bold text-yellow-300">{game.rating}</span>
          </div>
        </div>

        {/* Hover Quick Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-xs">
          <button
            onClick={handlePlayClick}
            className="cyber-btn cyber-btn-cyan text-xs py-2.5 px-5 shadow-[0_0_20px_#00f0ff]"
          >
            <Play className="w-4 h-4 fill-current" strokeWidth={2} />
            EXPAND DOSSIER
          </button>
        </div>
      </div>

      {/* Content Info */}
      <div className="flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="text-[11px] font-retro text-[#00f0ff] tracking-wider mb-1.5">
            {game.genre}
          </div>
          <h3 className="font-heading font-bold text-xl text-[#e8ecff] group-hover:text-[#00f0ff] transition-colors line-clamp-1">
            {game.title}
          </h3>
          <p className="text-xs text-[#8a93b8] mt-2 line-clamp-2 leading-relaxed font-sans">
            {game.tagline || game.description}
          </p>
        </div>

        {/* Platforms & Footer Link */}
        <div className="pt-4 border-t border-[rgba(0,240,255,0.15)] flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {(game.platforms || []).slice(0, 3).map((plat, idx) => (
              <span key={idx} className="text-[10px] bg-[#07080f] text-[#8a93b8] px-2 py-0.5 rounded border border-slate-800 font-mono">
                {plat}
              </span>
            ))}
          </div>

          <span className="text-xs text-[#00f0ff] font-pixel flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
            VIEW <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
          </span>
        </div>
      </div>
    </div>
  );
}
