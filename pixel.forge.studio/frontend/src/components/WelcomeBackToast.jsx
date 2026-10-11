import React, { useState, useEffect } from 'react';
import { Sparkles, X, Shield, ArrowRight } from 'lucide-react';

function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function WelcomeBackToast({ visitInfo, onClose, isPilotClaimed, onClaimPilot }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visitInfo && visitInfo.isReturning && visitInfo.visitCount > 1) {
      const shownKey = `pf_welcomed_ses_${sessionStorage.getItem('pf_session_id')}`;
      if (sessionStorage.getItem(shownKey)) return;

      sessionStorage.setItem(shownKey, '1');
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
        if (onClose) onClose();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [visitInfo, onClose]);

  if (!visible || !visitInfo) return null;

  return (
    <div
      className="fixed top-24 right-4 z-40 max-w-sm bg-[#0a0d18]/95 border border-pink-500/40 rounded-xl p-4 shadow-[0_0_30px_rgba(255,10,120,0.25)] backdrop-blur-md animate-in slide-in-from-right duration-300 space-y-2.5"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-pink-500/15 border border-pink-500/40 flex items-center justify-center text-pink-400 flex-shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>

        <div className="flex-1 pr-1">
          <div className="font-pixel text-[10px] text-pink-400">RETURNING OPERATIVE</div>
          <div className="text-xs font-sans text-white font-medium leading-relaxed">
            Welcome back! This is your <span className="font-mono font-bold text-cyan-300">{getOrdinal(visitInfo.visitCount)}</span> visit.
          </div>
        </div>

        <button
          onClick={() => {
            setVisible(false);
            if (onClose) onClose();
          }}
          aria-label="Close welcome notification"
          className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!isPilotClaimed && (
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400 font-sans">
            Preserve your wishlist across devices?
          </span>
          <button
            onClick={() => {
              setVisible(false);
              if (onClaimPilot) onClaimPilot();
            }}
            className="text-[11px] font-mono font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 flex-shrink-0"
          >
            Claim Pilot Pass <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
