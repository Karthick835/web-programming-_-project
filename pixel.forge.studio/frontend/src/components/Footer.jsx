import React, { useState } from 'react';
import { Gamepad2, Globe, MessageSquare, Code2, Send, CheckCircle2 } from 'lucide-react';
import { trackEvent } from '../services/tracker';

export default function Footer({ setActivePage, onOpenClaimPilot }) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleNewsletter = (e) => {
    e.preventDefault();
    if (!email) return;
    trackEvent('form_submit', window.location.pathname, { type: 'newsletter_signup', email });
    setSubscribed(true);
    setEmail('');
  };

  const handleNavigate = (pageId) => {
    setActivePage(pageId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#05060b] border-t border-[rgba(0,240,255,0.18)] pt-16 pb-12 mt-20 relative overflow-hidden">
      {/* Top ambient neon glow line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent opacity-60 shadow-[0_0_16px_#00f0ff]" />

      <div className="page-container">
        {/* 4-Column Grid on Desktop, Stacked on Mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 pb-12 border-b border-slate-800/80">
          
          {/* Col 1: Studio Brand */}
          <div className="space-y-4">
            <div 
              className="flex items-center gap-3 cursor-pointer group select-none" 
              onClick={() => handleNavigate('home')}
            >
              <div className="w-9 h-9 rounded bg-[#00f0ff]/15 border border-[#00f0ff]/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Gamepad2 className="w-5 h-5 text-[#00f0ff]" strokeWidth={2} />
              </div>
              <span className="font-pixel text-sm text-[#00f0ff]">PIXEL FORGE</span>
            </div>
            <p className="text-xs sm:text-sm text-[#8a93b8] leading-relaxed font-sans">
              Crafting adrenaline-fueled cyberpunk roguelikes, neon action adventures, and handcrafted pixel engines for PC, consoles, and beyond.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noreferrer" 
                title="Global Community" 
                className="w-9 h-9 rounded bg-[#0f1224] border border-slate-800 flex items-center justify-center text-[#8a93b8] hover:text-[#00f0ff] hover:border-[#00f0ff]/50 transition-colors"
              >
                <Globe className="w-5 h-5" strokeWidth={2} />
              </a>
              <a 
                href="https://discord.com" 
                target="_blank" 
                rel="noreferrer" 
                title="Discord Community" 
                className="w-9 h-9 rounded bg-[#0f1224] border border-slate-800 flex items-center justify-center text-[#8a93b8] hover:text-[#ff0a78] hover:border-[#ff0a78]/50 transition-colors"
              >
                <MessageSquare className="w-5 h-5" strokeWidth={2} />
              </a>
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noreferrer" 
                title="Open Source & Engine" 
                className="w-9 h-9 rounded bg-[#0f1224] border border-slate-800 flex items-center justify-center text-[#8a93b8] hover:text-[#00ff88] hover:border-[#00ff88]/50 transition-colors"
              >
                <Code2 className="w-5 h-5" strokeWidth={2} />
              </a>
            </div>
          </div>

          {/* Col 2: Navigation Links (Styled as plain text links with hover color) */}
          <div className="space-y-4">
            <h4 className="font-pixel text-xs text-[#e8ecff] tracking-wider uppercase">
              STUDIO PORTAL
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm font-sans">
              <li>
                <a 
                  href="#games" 
                  onClick={(e) => { e.preventDefault(); handleNavigate('games'); }} 
                  className="text-[#8a93b8] hover:text-[#00f0ff] transition-colors inline-block"
                >
                  Featured Games Catalogue
                </a>
              </li>
              <li>
                <a 
                  href="#about" 
                  onClick={(e) => { e.preventDefault(); handleNavigate('about'); }} 
                  className="text-[#8a93b8] hover:text-[#00f0ff] transition-colors inline-block"
                >
                  Studio Story & Timeline
                </a>
              </li>
              <li>
                <a 
                  href="#team" 
                  onClick={(e) => { e.preventDefault(); handleNavigate('team'); }} 
                  className="text-[#8a93b8] hover:text-[#00f0ff] transition-colors inline-block"
                >
                  Meet the Developers
                </a>
              </li>
              <li>
                <a 
                  href="#careers" 
                  onClick={(e) => { e.preventDefault(); handleNavigate('careers'); }} 
                  className="text-[#8a93b8] hover:text-[#00f0ff] transition-colors inline-block"
                >
                  Careers & Open Positions <span className="text-[10px] text-[#00ff88] font-mono font-bold">(Hiring!)</span>
                </a>
              </li>
              <li>
                <a 
                  href="#devlogs" 
                  onClick={(e) => { e.preventDefault(); handleNavigate('devlogs'); }} 
                  className="text-[#8a93b8] hover:text-[#00f0ff] transition-colors inline-block"
                >
                  Devlogs & Transmissions
                </a>
              </li>
              <li>
                <a 
                  href="#pilot" 
                  onClick={(e) => { e.preventDefault(); handleNavigate('pilot'); }} 
                  className="text-[#8a93b8] hover:text-[#00f0ff] transition-colors inline-block"
                >
                  Pilot Pass Profile & Wishlist
                </a>
              </li>
              <li>
                <a 
                  href="#restore" 
                  onClick={(e) => { e.preventDefault(); handleNavigate('restore'); }} 
                  className="text-[#8a93b8] hover:text-[#00f0ff] transition-colors inline-block"
                >
                  Restore Profile (Recovery Key)
                </a>
              </li>
              <li>
                <a 
                  href="#contact" 
                  onClick={(e) => { e.preventDefault(); handleNavigate('contact'); }} 
                  className="text-[#8a93b8] hover:text-[#00f0ff] transition-colors inline-block"
                >
                  Contact & Press Inquiries
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Studio Operations & Press */}
          <div className="space-y-4">
            <h4 className="font-pixel text-xs text-[#e8ecff] tracking-wider uppercase">
              OPERATIONS
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm font-sans text-[#8a93b8]">
              <li>
                <strong className="text-[#e8ecff]">Hubs:</strong> San Francisco & Tokyo Studio
              </li>
              <li>
                <strong className="text-[#e8ecff]">Press Kit:</strong> press@pixelforge.io
              </li>
              <li>
                <strong className="text-[#e8ecff]">Community:</strong> 45,000+ Active Pilots
              </li>
              <li>
                <strong className="text-[#e8ecff]">Engine:</strong> Proprietary NeonVoxel C++
              </li>
              <li>
                <strong className="text-[#e8ecff]">Platform:</strong> PC, PS5, Xbox, Switch 2
              </li>
            </ul>
          </div>

          {/* Col 4: Newsletter & Transmissions */}
          <div className="space-y-4">
            <h4 className="font-pixel text-xs text-[#ff0a78] tracking-wider uppercase">
              DEV TRANSMISSIONS
            </h4>
            <p className="text-xs text-[#8a93b8] leading-relaxed font-sans">
              Subscribe for exclusive closed beta invitations, steam keys, and developer roadmaps.
            </p>
            {subscribed ? (
              <div className="p-3 rounded bg-[rgba(0,255,136,0.15)] border border-[#00ff88]/40 text-[#00ff88] text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                <span>Transmitted! Welcome to the Resistance.</span>
              </div>
            ) : (
              <form onSubmit={handleNewsletter} className="space-y-2.5">
                <input
                  type="email"
                  required
                  placeholder="pilot@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0f1224] border border-slate-700 rounded px-3.5 py-2.5 text-xs text-[#e8ecff] focus:outline-none focus:border-[#00f0ff] font-sans"
                />
                <button
                  type="submit"
                  className="w-full cyber-btn cyber-btn-magenta text-[10px] py-2.5 px-4"
                >
                  <Send className="w-3.5 h-3.5" strokeWidth={2} />
                  JOIN RESISTANCE
                </button>
              </form>
            )}
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#5a6488] gap-4 font-sans">
          <div className="flex flex-wrap items-center gap-4">
            <span>&copy; {new Date().getFullYear()} Pixel Forge Studio Inc. All rights reserved.</span>
            {onOpenClaimPilot && (
              <button
                type="button"
                onClick={onOpenClaimPilot}
                className="px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] hover:bg-cyan-900 transition-colors cursor-pointer"
              >
                Claim your Pilot Profile
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span>Engineered with precision & pixels</span>
            <span className="inline-block w-2 h-2 rounded-full bg-[#00ff88] animate-ping" />
            <span className="text-[#00ff88] font-mono text-[11px]">Telemetry Engine: Nominal</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
