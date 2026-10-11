import React, { useState, useEffect } from 'react';
import { Play, Sparkles, Flame, Shield, Award, Users, ArrowRight, Zap, Terminal, Newspaper, Calendar, Clock, BookOpen } from 'lucide-react';
import GameCard from '../components/GameCard';
import SectionHeading from '../components/ui/SectionHeading';
import StatCounter from '../components/ui/StatCounter';
import { trackEvent } from '../services/tracker';
import { contentAPI } from '../services/api';

export default function HomePage({
  games = [],
  onSelectGame,
  setActivePage,
  abConfig,
  currentVariant,
  onABConversion,
  wishlist = [],
  onToggleWishlist,
  onSelectDevlog
}) {
  const [devlogs, setDevlogs] = useState([]);
  const [loadingDevlogs, setLoadingDevlogs] = useState(true);

  useEffect(() => {
    contentAPI.getDevlogs({ limit: 3, status: 'published' })
      .then(res => setDevlogs(res.data.devlogs || []))
      .catch(err => console.error('Failed to load homepage devlogs:', err))
      .finally(() => setLoadingDevlogs(false));
  }, []);

  const {
    ctaText = 'PLAY OUR GAMES',
    heroSubtitle = 'Crafting transcendent pixel-art masterpieces and adrenaline-fueled indie experiences.',
    badgeText = '🔥 NEW RELEASE: CYBERVANGUARD 2099',
    accentColor = 'cyan'
  } = abConfig || {};

  const handleHeroCTAClick = () => {
    if (onABConversion) onABConversion('cta_click_games');
    trackEvent('conversion', '/', { experiment: 'hero_cta_text', variant: currentVariant, goal: 'cta_click_games' });
    setActivePage('games');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const featuredGames = (games || []).filter(g => g.featured).slice(0, 3);
  const displayFeatured = featuredGames.length > 0 ? featuredGames : (games || []).slice(0, 3);

  const handleDevlogClick = (slug) => {
    trackEvent('click', '/', { action: 'read_devlog_home', slug });
    if (onSelectDevlog) {
      onSelectDevlog(slug);
    } else {
      window.location.href = `/devlog/${slug}`;
    }
  };

  return (
    <div className="space-y-16 md:space-y-24 lg:space-y-32">
      
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[85vh] flex items-center justify-center pt-8 pb-16 overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute inset-0 bg-radial from-[rgba(0,240,255,0.08)] via-transparent to-transparent opacity-80 pointer-events-none" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-gradient-to-b from-[#00f0ff]/10 via-[#ff0a78]/10 to-transparent blur-3xl pointer-events-none" />

        <div className="page-container text-center space-y-8 relative z-10">
          
          {/* A/B Dynamic Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0f1224]/90 border border-[#00f0ff]/40 shadow-[0_0_16px_rgba(0,240,255,0.25)] animate-pulse-glow">
            <Sparkles className="w-4 h-4 text-[#00f0ff]" strokeWidth={2} />
            <span className="font-pixel text-[10px] text-[#00f0ff] tracking-wider uppercase">
              {badgeText}
            </span>
          </div>

          {/* Main Title */}
          <h1 className="font-heading text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#e8ecff] leading-tight max-w-5xl mx-auto">
            FORGING WORLDS IN <br />
            <span className={`bg-clip-text text-transparent bg-gradient-to-r ${
              accentColor === 'magenta' 
                ? 'from-[#ff0a78] via-purple-300 to-[#00f0ff]' 
                : 'from-[#00f0ff] via-teal-200 to-[#ff0a78]'
            }`}>
              PIXELS & ADRENALINE
            </span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#8a93b8] leading-relaxed font-sans font-normal">
            {heroSubtitle}
          </p>

          {/* A/B Tested Call To Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={handleHeroCTAClick}
              data-ab-goal="cta_click_games"
              className={`cyber-btn ${accentColor === 'magenta' ? 'cyber-btn-magenta' : 'cyber-btn-cyan'} text-sm py-3.5 px-8 flex items-center gap-3`}
            >
              <Play className="w-4 h-4 fill-current" strokeWidth={2} />
              <span>{ctaText}</span>
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </button>

            <button
              onClick={() => {
                trackEvent('click', '/', { action: 'hero_trailer' });
                if (displayFeatured.length > 0) onSelectGame(displayFeatured[0]);
              }}
              className="cyber-btn cyber-btn-outline text-sm py-3.5 px-8"
            >
              WATCH TRAILER
            </button>
          </div>

          {/* Telemetry indicator */}
          <div className="pt-6 text-[11px] font-mono text-[#5a6488] flex items-center justify-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00ff88]"></span>
              Live Telemetry Engaged
            </span>
            <span>•</span>
            <span className="text-[#00f0ff]/80">Variant Active: {currentVariant}</span>
          </div>

        </div>
      </section>


      {/* 2. STATS TICKER */}
      <section className="page-container">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCounter value="4+" label="GAMES SHIPPED" sublabel="PC & Consoles" color="cyan" />
          <StatCounter value="1.2M+" label="PILOTS WORLDWIDE" sublabel="Active Community" color="magenta" />
          <StatCounter value="98%" label="STEAM POSITIVE" sublabel="Overwhelmingly Loved" color="emerald" />
          <StatCounter value="14" label="INDIE AWARDS" sublabel="Global Recognition" color="yellow" />
        </div>
      </section>


      {/* 3. FEATURED GAMES SHOWCASE */}
      <section className="page-container space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <SectionHeading
            badge="FLAGSHIP TITLES"
            title="FEATURED PORTFOLIO"
            subtitle="Handcrafted pixel combat, responsive controllers, and pulse-pounding synth soundscapes."
            align="left"
          />
          <button
            onClick={() => {
              setActivePage('games');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-xs font-pixel text-[#00f0ff] hover:text-[#5cffff] flex items-center gap-2 self-start md:self-auto transition-colors cursor-pointer"
          >
            VIEW FULL CATALOGUE <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayFeatured.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onSelect={onSelectGame}
              isWishlisted={wishlist.includes(game.id)}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>
      </section>


      {/* 4. STUDIO PILLARS / PHILOSOPHY */}
      <section className="page-container space-y-12">
        <SectionHeading
          badge="OUR CORE PHILOSOPHY"
          title="THE PIXEL FORGE DOCTRINE"
          subtitle="We reject cookie-cutter mechanics. Every game is forged with tactile hit-stop, handcrafted shaders, and modular gameplay depth."
          align="center"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          <div className="cyber-card space-y-4">
            <div className="w-12 h-12 rounded bg-[#00f0ff]/10 border border-[#00f0ff]/40 flex items-center justify-center text-[#00f0ff]">
              <Flame className="w-6 h-6" strokeWidth={2} />
            </div>
            <h3 className="font-heading font-bold text-xl text-[#e8ecff]">Tactile Gamefeel</h3>
            <p className="text-xs sm:text-sm text-[#8a93b8] leading-relaxed font-sans">
              Frame-precise animation buffers, juicy screen freezes, and punchy sound design. Every swing and shot reverberates.
            </p>
          </div>

          <div className="cyber-card space-y-4">
            <div className="w-12 h-12 rounded bg-[#ff0a78]/10 border border-[#ff0a78]/40 flex items-center justify-center text-[#ff0a78]">
              <Sparkles className="w-6 h-6" strokeWidth={2} />
            </div>
            <h3 className="font-heading font-bold text-xl text-[#e8ecff]">Retro Re-imagined</h3>
            <p className="text-xs sm:text-sm text-[#8a93b8] leading-relaxed font-sans">
              Classic CRT phosphor vibes layered with modern deferred lighting, volumetric smoke shaders, and high dynamic range.
            </p>
          </div>

          <div className="cyber-card space-y-4">
            <div className="w-12 h-12 rounded bg-[#00ff88]/10 border border-[#00ff88]/40 flex items-center justify-center text-[#00ff88]">
              <Users className="w-6 h-6" strokeWidth={2} />
            </div>
            <h3 className="font-heading font-bold text-xl text-[#e8ecff]">Community Driven</h3>
            <p className="text-xs sm:text-sm text-[#8a93b8] leading-relaxed font-sans">
              Transparent devlogs, regular discord playtests, and direct telemetry tuning to craft experiences players cherish for decades.
            </p>
          </div>
        </div>
      </section>


      {/* 5. LATEST DEV LOGS & TRANSMISSIONS */}
      <section className="page-container space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <SectionHeading
            badge="DEVLOGS & INSIGHTS"
            title="FROM THE FORGE"
            subtitle="Behind-the-scenes deep dives into graphics shaders, modular synthesis, and level architecture."
            align="left"
          />
          <button
            onClick={() => {
              setActivePage('devlogs');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-xs font-pixel text-[#00f0ff] hover:text-[#5cffff] flex items-center gap-2 self-start md:self-auto transition-colors cursor-pointer"
          >
            ALL DEVLOGS <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {loadingDevlogs ? (
          <div className="text-center py-12 text-slate-500 font-mono text-xs">
            Loading latest development updates...
          </div>
        ) : devlogs.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 rounded-lg border border-slate-800 text-xs text-slate-400">
            No published devlogs available. Check back soon for studio updates.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {devlogs.map((log) => (
              <div
                key={log.id}
                onClick={() => handleDevlogClick(log.slug)}
                className="cyber-card flex flex-col justify-between space-y-4 cursor-pointer group hover:border-cyan-400/60 transition-all"
              >
                <div className="space-y-3">
                  {log.cover_image && (
                    <div className="h-36 -mx-6 -mt-6 mb-3 overflow-hidden rounded-t-lg bg-black">
                      <img
                        src={log.cover_image}
                        alt={log.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="pixel-badge badge-cyan text-[9px] uppercase">{log.category}</span>
                    <span className="text-[10px] font-mono text-[#8a93b8] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" strokeWidth={2} />
                      {new Date(log.published_at || log.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-base sm:text-lg text-[#e8ecff] group-hover:text-[#00f0ff] transition-colors line-clamp-2">
                    {log.title}
                  </h3>

                  <p className="text-xs text-[#8a93b8] leading-relaxed line-clamp-3 font-sans">
                    {log.excerpt}
                  </p>
                </div>

                <div className="pt-3 border-t border-[rgba(0,240,255,0.15)] flex items-center justify-between">
                  <span className="text-xs font-mono text-[#00f0ff] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Read Devlog &rarr;
                  </span>
                  <Newspaper className="w-4 h-4 text-[#5a6488] group-hover:text-cyan-400 transition-colors" strokeWidth={2} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>


      {/* 6. CAREERS CALL TO ACTION BAND */}
      <section className="page-container">
        <div className="relative rounded-xl bg-gradient-to-r from-[#07080f] via-[#0f1224] to-[#07080f] border border-[#00f0ff]/40 p-8 sm:p-14 text-center overflow-hidden shadow-[0_0_40px_rgba(0,240,255,0.15)] hud-corner">
          <div className="max-w-2xl mx-auto space-y-6">
            <span className="pixel-badge badge-yellow">JOIN OUR CREW</span>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#e8ecff]">
              WANT TO BUILD THE FUTURE OF GAMING?
            </h2>
            <p className="text-sm text-[#8a93b8] leading-relaxed font-sans">
              We are expanding our core team across Engineering, Art, Audio, and Narrative. Remote friendly, studio profit sharing, and creative autonomy.
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  setActivePage('careers');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="cyber-btn cyber-btn-cyan py-3 px-8 text-xs"
              >
                EXPLORE OPEN ROLES
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
