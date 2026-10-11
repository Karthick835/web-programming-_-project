import React, { useState, useEffect } from 'react';
import { Gamepad2, Shield, Tv, Menu, X, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({
  activePage,
  setActivePage,
  scanlinesEnabled,
  setScanlinesEnabled,
  pilotCallsign = null,
  onOpenClaimPilot
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const navItems = [
    { id: 'home', label: 'HOME' },
    { id: 'games', label: 'GAMES' },
    { id: 'devlogs', label: 'DEVLOGS' },
    { id: 'about', label: 'ABOUT' },
    { id: 'team', label: 'TEAM' },
    { id: 'careers', label: 'CAREERS' },
    { id: 'contact', label: 'CONTACT' },
  ];

  const handleNav = (id) => {
    setActivePage(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#07080f]/90 backdrop-blur-md border-b border-[rgba(0,240,255,0.18)] shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
      <div className="page-container h-20 flex items-center justify-between">
        
        {/* Logo Left */}
        <div 
          onClick={() => handleNav('home')}
          className="flex items-center gap-3.5 cursor-pointer group select-none"
        >
          <div className="w-11 h-11 rounded bg-gradient-to-br from-[#00f0ff] to-[#ff0a78] p-0.5 shadow-[0_0_16px_rgba(0,240,255,0.4)] group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#07080f] rounded flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-[#00f0ff] group-hover:text-[#ff0a78] transition-colors" strokeWidth={2} />
            </div>
          </div>
          <div>
            <div className="font-pixel text-sm sm:text-base text-[#00f0ff] tracking-wider flex items-center gap-2">
              PIXEL FORGE
              <span className="text-[9px] font-pixel bg-[rgba(255,10,120,0.15)] text-[#ff0a78] px-1.5 py-0.5 rounded border border-[rgba(255,10,120,0.4)]">
                STUDIO
              </span>
            </div>
            <div className="text-[11px] text-[#8a93b8] font-retro tracking-widest mt-0.5">
              NEXT-GEN ARCADE & RPG
            </div>
          </div>
        </div>

        {/* Desktop Nav Links (Centered / Right with 28px gaps) */}
        <nav className="hidden md:flex items-center gap-7 lg:gap-8">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`text-xs font-pixel tracking-wider py-1 relative transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#00f0ff]'
                    : 'text-[#8a93b8] hover:text-[#e8ecff]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-[#00f0ff] shadow-[0_0_8px_#00f0ff]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Actions: CRT Toggle & Admin Portal */}
        <div className="hidden md:flex items-center gap-3.5">
          {/* Pilot Pass Button */}
          <button
            onClick={() => {
              if (pilotCallsign) {
                handleNav('pilot');
              } else if (onOpenClaimPilot) {
                onOpenClaimPilot();
              } else {
                handleNav('pilot');
              }
            }}
            title={pilotCallsign ? `Pilot Pass: ${pilotCallsign}` : "Claim your Pilot Pass"}
            className={`px-3 py-1.5 rounded border text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
              activePage === 'pilot'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                : pilotCallsign
                ? 'bg-[#0f1224] border-cyan-500/50 text-cyan-300 hover:border-cyan-400'
                : 'bg-[#0f1224] border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-[10px] tracking-wide">
              {pilotCallsign ? `PILOT: ${pilotCallsign}` : 'PILOT PASS'}
            </span>
          </button>

          {/* Scanline CRT FX Toggle */}
          <button
            onClick={() => setScanlinesEnabled(!scanlinesEnabled)}
            title="Toggle Retro CRT Scanlines"
            className={`px-3 py-1.5 rounded border text-xs flex items-center gap-2 transition-all cursor-pointer ${
              scanlinesEnabled
                ? 'bg-[rgba(0,255,136,0.15)] border-[#00ff88]/50 text-[#00ff88] shadow-[0_0_12px_rgba(0,255,136,0.3)]'
                : 'bg-[#0f1224] border-slate-800 text-[#8a93b8] hover:text-white'
            }`}
          >
            <Tv className="w-4 h-4" strokeWidth={2} />
            <span className="font-mono text-[10px]">{scanlinesEnabled ? 'CRT: ON' : 'CRT: OFF'}</span>
          </button>

          {/* Admin HQ Button */}
          <button
            onClick={() => handleNav('admin')}
            className={`px-4 py-2 rounded text-xs font-pixel flex items-center gap-2 border transition-all cursor-pointer ${
              activePage.startsWith('admin')
                ? 'bg-[#ff0a78] text-white border-[#ff0a78] shadow-[0_0_16px_rgba(255,10,120,0.5)]'
                : 'bg-[#0f1224] hover:bg-[rgba(255,10,120,0.15)] text-[#ff0a78] border-[rgba(255,10,120,0.4)] hover:border-[#ff0a78]'
            }`}
          >
            <Shield className="w-4 h-4" strokeWidth={2} />
            {user ? 'ADMIN HQ' : 'STAFF LOGIN'}
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setScanlinesEnabled(!scanlinesEnabled)}
            className="p-2.5 bg-[#0f1224] text-[#8a93b8] rounded border border-slate-800"
            aria-label="Toggle CRT Scanlines"
          >
            <Tv className="w-5 h-5" strokeWidth={2} />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 bg-[#0f1224] text-[#00f0ff] rounded border border-[rgba(0,240,255,0.4)]"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" strokeWidth={2} /> : <Menu className="w-6 h-6" strokeWidth={2} />}
          </button>
        </div>

      </div>

      {/* Mobile Backdrop & Drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 top-20 bg-black/75 backdrop-blur-sm z-40"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="md:hidden fixed inset-x-0 top-20 z-50 bg-[#0a0d1a] border-b border-[rgba(0,240,255,0.3)] shadow-[0_20px_40px_rgba(0,0,0,0.8)] px-6 py-6 space-y-4 animate-in slide-in-from-top duration-200 max-h-[calc(100vh-5rem)] overflow-y-auto">
            <div className="flex flex-col space-y-3">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full text-left py-2.5 px-3 font-pixel text-xs rounded transition-colors ${
                    activePage === item.id
                      ? 'text-[#00f0ff] bg-[rgba(0,240,255,0.1)] border-l-4 border-[#00f0ff]'
                      : 'text-[#8a93b8] hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => handleNav('pilot')}
                className={`w-full text-left py-2.5 px-3 font-pixel text-xs rounded transition-colors ${
                  activePage === 'pilot'
                    ? 'text-cyan-300 bg-[rgba(0,240,255,0.1)] border-l-4 border-cyan-400'
                    : 'text-cyan-400 hover:text-white'
                }`}
              >
                {pilotCallsign ? `PILOT: ${pilotCallsign}` : 'PILOT PASS'}
              </button>
              <button
                onClick={() => handleNav('restore')}
                className={`w-full text-left py-2.5 px-3 font-pixel text-xs rounded transition-colors ${
                  activePage === 'restore'
                    ? 'text-cyan-300 bg-[rgba(0,240,255,0.1)] border-l-4 border-cyan-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                RESTORE IDENTITY
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <button
                onClick={() => handleNav('admin')}
                className="w-full py-3 bg-[rgba(255,10,120,0.2)] text-[#ff0a78] border border-[rgba(255,10,120,0.5)] font-pixel text-xs rounded text-center"
              >
                {user ? 'ADMIN CONTROL PANEL' : 'STAFF LOGIN'}
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
