import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Star, Play, Heart, BookOpen, Calendar, ArrowRight,
  ExternalLink, Film, ChevronLeft, ChevronRight, Gamepad2
} from 'lucide-react';
import Modal from './ui/Modal';
import { contentAPI } from '../services/api';
import { trackEvent } from '../services/tracker';

// Themed SVG Fallback image for broken links
const THEMED_FALLBACK_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'><rect width='800' height='450' fill='%230b0f19'/><rect x='20' y='20' width='760' height='410' rx='8' fill='none' stroke='%2300f0ff' stroke-opacity='0.3' stroke-width='2'/><text x='400' y='210' font-family='monospace' font-size='22' font-weight='bold' fill='%2300f0ff' text-anchor='middle'>PIXEL FORGE STUDIO</text><text x='400' y='250' font-family='monospace' font-size='14' fill='%2394a3b8' text-anchor='middle'>[TACTICAL PREVIEW RESTRICTED]</text></svg>";

function getYouTubeEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2] && match[2].length === 11) {
      return `https://www.youtube-nocookie.com/embed/${match[2]}?autoplay=0&rel=0`;
    }
  } catch (_) {}
  return null;
}

export default function GameModal({
  game,
  onClose,
  isWishlisted = false,
  onToggleWishlist,
  onNavigateDevlog
}) {
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [updates, setUpdates] = useState([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const touchStartXRef = useRef(null);

  // Parse gallery items: Trailer (if available) + Cover + Screenshots
  const trailerEmbed = game ? getYouTubeEmbedUrl(game.trailer_url) : null;

  const galleryItems = React.useMemo(() => {
    if (!game) return [];
    const items = [];

    // 1. Trailer as item #0 if set
    if (trailerEmbed) {
      items.push({
        type: 'trailer',
        embedUrl: trailerEmbed,
        alt: `${game.title} Official Trailer`
      });
    }

    // 2. Cover / Banner
    const primaryImg = game.cover_image || game.banner_img;
    if (primaryImg) {
      items.push({
        type: 'image',
        url: primaryImg,
        alt: `${game.title} Official Dossier Cover`
      });
    }

    // 3. Screenshots list
    const rawShots = Array.isArray(game.screenshots) ? game.screenshots : [];
    rawShots.forEach((s, idx) => {
      const src = typeof s === 'string' ? s : s.value;
      const alt = typeof s === 'object' && s.alt ? s.alt : `${game.title} Screenshot ${idx + 1}`;
      if (src && src !== primaryImg) {
        items.push({
          type: 'image',
          url: src,
          alt
        });
      }
    });

    return items;
  }, [game, trailerEmbed]);

  // Reset active gallery item when game changes
  useEffect(() => {
    setActiveItemIndex(0);
    if (!game?.id) return;

    setLoadingUpdates(true);
    contentAPI.getDevlogs({ game_id: game.id })
      .then(res => setUpdates(res.data.devlogs || []))
      .catch(err => console.error('Failed to load game updates:', err))
      .finally(() => setLoadingUpdates(false));
  }, [game?.id]);

  // Gallery Navigation: next/prev
  const goToNext = useCallback(() => {
    if (galleryItems.length <= 1) return;
    setActiveItemIndex(i => (i + 1) % galleryItems.length);
  }, [galleryItems.length]);

  const goToPrev = useCallback(() => {
    if (galleryItems.length <= 1) return;
    setActiveItemIndex(i => (i - 1 + galleryItems.length) % galleryItems.length);
  }, [galleryItems.length]);

  // Keyboard navigation: Left / Right arrows
  useEffect(() => {
    if (!game) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game, goToNext, goToPrev]);

  // Touch swipe support for mobile
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartXRef.current - touchEndX;
    if (Math.abs(diffX) > 40) {
      if (diffX > 0) goToNext();
      else goToPrev();
    }
    touchStartXRef.current = null;
  };

  if (!game) return null;

  // Store links resolution
  const storeLinks = Array.isArray(game.store_links) ? game.store_links : [];
  const primaryStore = storeLinks.find(s => s.isPrimary) || (storeLinks.length > 0 ? storeLinks[0] : null);
  const otherStores = storeLinks.filter(s => s !== primaryStore);

  // Track store click
  const handleStoreClick = (storeLink, sourceContext = 'primary_cta') => {
    if (!storeLink || !storeLink.url) return;

    // Track general store_click event
    trackEvent('store_click', window.location.pathname, {
      game_id: game.id,
      game_title: game.title,
      platform: storeLink.platform,
      store_url: storeLink.url,
      source: sourceContext,
      variant: game.variant || 'A'
    });

    // Also track steam_click if on Steam for existing funnel metrics
    if (storeLink.platform === 'Steam' || storeLink.url.includes('store.steampowered.com')) {
      trackEvent('steam_click', window.location.pathname, {
        game_id: game.id,
        game_title: game.title,
        steam_url: storeLink.url,
        variant: game.variant || 'A'
      });
    }

    trackEvent('click', window.location.pathname, {
      action: 'launch_store_link',
      game: game.title,
      platform: storeLink.platform
    });

    window.open(storeLink.url, '_blank', 'noopener,noreferrer');
  };

  const handleDevlogClick = (slug) => {
    onClose();
    if (onNavigateDevlog) {
      onNavigateDevlog(slug);
    } else {
      window.location.href = `/devlog/${slug}`;
    }
  };

  const currentItem = galleryItems[activeItemIndex] || galleryItems[0];

  return (
    <Modal isOpen={!!game} onClose={onClose} title={null} size="xl">
      {/* Hero Showcase (Video or Image) */}
      <div
        className="relative h-64 sm:h-80 md:h-96 bg-black overflow-hidden rounded-lg -m-6 mb-0 select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {currentItem?.type === 'trailer' ? (
          <div className="w-full h-full relative">
            <iframe
              src={currentItem.embedUrl}
              title={currentItem.alt}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <img
            src={currentItem?.url || THEMED_FALLBACK_SVG}
            alt={currentItem?.alt || game.title}
            loading="lazy"
            onError={(e) => {
              if (e.target.src !== THEMED_FALLBACK_SVG) {
                e.target.src = THEMED_FALLBACK_SVG;
              }
            }}
            className="w-full h-full object-cover transition-all duration-300"
          />
        )}

        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#0c0f1c] via-transparent to-black/40" />

        {/* Arrow Navigation controls */}
        {galleryItems.length > 1 && (
          <div className="absolute inset-y-0 inset-x-2 flex items-center justify-between pointer-events-none">
            <button
              onClick={goToPrev}
              aria-label="Previous gallery item"
              className="pointer-events-auto p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-cyan-400 border border-slate-700/60 backdrop-blur-sm transition-all shadow-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNext}
              aria-label="Next gallery item"
              className="pointer-events-auto p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-cyan-400 border border-slate-700/60 backdrop-blur-sm transition-all shadow-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Title overlay */}
        <div className="absolute bottom-4 left-6 right-6 pointer-events-none">
          <div className="flex items-center gap-2 mb-2 flex-wrap pointer-events-auto">
            <span className="pixel-badge badge-cyan">{game.genre}</span>
            <span className="pixel-badge badge-emerald">{game.status}</span>
            <div className="flex items-center gap-1 bg-black/70 px-2 py-0.5 rounded border border-yellow-500/40 text-xs text-yellow-300 backdrop-blur-sm font-mono">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span>{game.rating} / 5.0</span>
            </div>
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-wide drop-shadow-md">
            {game.title}
          </h2>
        </div>
      </div>

      {/* Thumbnail Gallery Carousel */}
      {galleryItems.length > 1 && (
        <div className="flex gap-2 py-3.5 overflow-x-auto border-b border-slate-800 scrollbar-thin scrollbar-thumb-slate-800">
          {galleryItems.map((item, idx) => {
            const isActive = activeItemIndex === idx;
            return (
              <button
                key={idx}
                onClick={() => setActiveItemIndex(idx)}
                aria-label={`View item ${idx + 1}`}
                className={`relative w-20 h-14 rounded overflow-hidden flex-shrink-0 border-2 transition-all group ${
                  isActive
                    ? 'border-cyan-400 scale-105 shadow-[0_0_10px_#00f0ff]'
                    : 'border-slate-800 opacity-60 hover:opacity-100'
                }`}
              >
                {item.type === 'trailer' ? (
                  <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-pink-400 group-hover:text-cyan-300">
                    <Film className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px] font-mono font-bold tracking-wider">TRAILER</span>
                  </div>
                ) : (
                  <img
                    src={item.url}
                    alt={item.alt}
                    loading="lazy"
                    onError={(e) => {
                      if (e.target.src !== THEMED_FALLBACK_SVG) {
                        e.target.src = THEMED_FALLBACK_SVG;
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Modal Body */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {/* Left (2 cols): Description, Tags, and Updates Timeline */}
        <div className="md:col-span-2 space-y-6">
          <div className="space-y-3">
            <h4 className="font-pixel text-xs text-cyan-400 tracking-wider">PROJECT DOSSIER</h4>
            <p className="text-sm text-slate-300 leading-relaxed font-sans">{game.description}</p>

            {(game.tags || []).length > 0 && (
              <div className="pt-1">
                <h5 className="text-xs font-mono text-slate-400 mb-2">TACTICAL KEYWORDS</h5>
                <div className="flex flex-wrap gap-1.5">
                  {(game.tags || []).map((t, idx) => (
                    <span key={idx} className="text-xs bg-cyan-950/40 text-cyan-300 px-2.5 py-1 rounded border border-cyan-500/30 font-mono">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Transmissions & Patch Notes Timeline */}
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
              <div className="p-4 bg-slate-900/40 rounded border border-slate-800/80 text-xs text-slate-400 font-mono">
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
                      <p className="text-[11px] text-slate-400 line-clamp-1 font-sans">
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

          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-slate-500 block font-mono">Release Window:</span>
              <span className="text-slate-200 font-mono font-semibold">{game.release_date || 'TBA'}</span>
            </div>

            <div>
              <span className="text-slate-500 block font-mono mb-1">Target Platforms:</span>
              <div className="flex flex-wrap gap-1">
                {(game.platforms || []).map((p, idx) => {
                  // Check if a store link exists for this platform
                  const matchedLink = storeLinks.find(
                    l => l.platform?.toLowerCase() === p.toLowerCase() ||
                         (p.toLowerCase().includes('steam') && l.platform === 'Steam') ||
                         (p.toLowerCase().includes('playstation') && l.platform === 'PlayStation Store') ||
                         (p.toLowerCase().includes('xbox') && l.platform === 'Xbox') ||
                         (p.toLowerCase().includes('switch') && l.platform === 'Nintendo eShop')
                  );

                  if (matchedLink && matchedLink.url) {
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleStoreClick(matchedLink, 'platform_chip')}
                        className="bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 transition-all group cursor-pointer"
                        title={`View on ${matchedLink.platform}`}
                      >
                        <span>{p}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-70 group-hover:opacity-100" />
                      </button>
                    );
                  }

                  return (
                    <span key={idx} className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px] font-mono">
                      {p}
                    </span>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="text-slate-500 block font-mono">Engine:</span>
              <span className="text-cyan-400 font-mono">{game.engine || 'PixelForge Engine v4.2'}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-3">
            {/* Primary Action Button */}
            {primaryStore && primaryStore.url ? (
              <button
                onClick={() => handleStoreClick(primaryStore, 'primary_cta')}
                className="w-full cyber-btn cyber-btn-cyan text-xs py-3 flex items-center justify-center gap-2 font-mono font-bold"
              >
                <Play className="w-4 h-4 fill-current" />
                {primaryStore.label || `VIEW ON ${primaryStore.platform?.toUpperCase()}`}
              </button>
            ) : (
              <div className="w-full py-3 px-3 bg-slate-950/70 border border-slate-800 rounded text-center text-xs font-mono text-slate-500">
                Not available on any store yet
              </div>
            )}

            {/* "Also available on" row */}
            {otherStores.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                  Also available on:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {otherStores.map((store, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => handleStoreClick(store, 'secondary_store')}
                      className="px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/50 text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Gamepad2 className="w-3 h-3 text-pink-400" />
                      <span>{store.platform}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Wishlist Button */}
            {onToggleWishlist && (
              <button
                type="button"
                onClick={() => onToggleWishlist(game.id)}
                className={`w-full py-2.5 px-3 rounded text-xs font-mono flex items-center justify-center gap-2 border transition-all ${
                  isWishlisted
                    ? 'bg-pink-950/60 border-pink-500 text-pink-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
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
