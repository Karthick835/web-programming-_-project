import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Cookie } from 'lucide-react';

const CONSENT_KEY = 'pf_privacy_consent';

export default function CookieBanner({ onConsentChange }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      // Delay slightly for smooth entrance
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
    if (onConsentChange) onConsentChange('accepted');
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setVisible(false);
    if (onConsentChange) onConsentChange('declined');
  };

  if (!visible) return null;

  return (
    <aside
      className="fixed bottom-4 left-4 z-40 max-w-md w-[calc(100%-2rem)] bg-[#0b0e1a]/95 border border-cyan-500/40 rounded-xl p-4 shadow-[0_0_30px_rgba(0,240,255,0.18)] backdrop-blur-md animate-in slide-in-from-bottom duration-300"
      role="region"
      aria-label="Privacy and cookies preferences"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-0.5">
          <Cookie className="w-5 h-5" />
        </div>

        <div className="flex-1 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-white text-sm">Privacy & First-Party Storage</h3>
            <button
              onClick={handleDecline}
              aria-label="Dismiss privacy notice"
              className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-slate-300 leading-relaxed font-sans text-[11px]">
            We store an anonymous visitor ID in localStorage and a first-party cookie to persist your A/B test variant and aggregate studio visit counts. We never sell personal data or use 3rd-party trackers.
          </p>

          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={handleAccept}
              className="cyber-btn cyber-btn-cyan text-[11px] py-1.5 px-4 font-bold"
            >
              ACCEPT TELEMETRY
            </button>
            <button
              onClick={handleDecline}
              className="text-[11px] font-mono text-slate-400 hover:text-white px-3 py-1.5 rounded hover:bg-slate-800 transition-colors"
            >
              DECLINE / DNT
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
