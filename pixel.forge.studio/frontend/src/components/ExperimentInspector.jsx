import React, { useState, useEffect } from 'react';
import { RefreshCw, Zap, Minus, Plus, X, Copy, Check, CheckCircle2, Shield } from 'lucide-react';
import { checkDevUrlParams, getVisitorId, getSessionId, resetVisitorIdentity, trackEvent } from '../services/tracker';

const HUD_STATE_KEY = 'pf_hud_state';

/**
 * A/B Testing & Developer HUD
 *
 * Visibility:
 *  - Logged-in admin users (isAdmin prop = true)
 *  - URL param ?dev=1 (persists flag in localStorage so HUD stays visible on every page until ?dev=0 is visited)
 *
 * State persistence:
 *  - Minimized and closed states are stored in localStorage and remembered across page reloads.
 */
export default function ExperimentInspector({
  activeExperiment,
  currentVariant,
  onForceVariant,
  onReloadExperiment,
  isAdmin = false,
  visitInfo = null,
  claimedPilot = null
}) {
  // Check and persist ?dev=1 / ?dev=0 flags in localStorage
  const [devModeActive, setDevModeActive] = useState(() => {
    return checkDevUrlParams();
  });

  useEffect(() => {
    setDevModeActive(checkDevUrlParams());
  }, []);

  const isDevMode = isAdmin || devModeActive;

  // HUD state (minimized, closed) remembered in localStorage
  const [hudState, setHudState] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('dev') === '1') {
        return { minimized: false, closed: false };
      }
      const saved = localStorage.getItem(HUD_STATE_KEY);
      return saved ? JSON.parse(saved) : { minimized: false, closed: false };
    } catch {
      return { minimized: false, closed: false };
    }
  });

  const [visitorId, setVisitorId] = useState(getVisitorId());
  const [sessionId, setSessionId] = useState(getSessionId());
  const [justConverted, setJustConverted] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Persist HUD state
  useEffect(() => {
    try {
      localStorage.setItem(HUD_STATE_KEY, JSON.stringify(hudState));
    } catch (_) {}
  }, [hudState]);

  // Keep visitor and session IDs in sync
  useEffect(() => {
    setVisitorId(getVisitorId());
    setSessionId(getSessionId());
  }, [visitInfo, claimedPilot]);

  // Escape key to minimize
  useEffect(() => {
    if (!isDevMode || hudState.closed) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        setHudState(s => ({ ...s, minimized: true }));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDevMode, hudState.closed]);

  if (!isDevMode || hudState.closed) return null;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleCopy = async (text, label) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(label);
      showToast(`Copied ${label} to clipboard`);
      setTimeout(() => setCopiedKey(''), 2000);
    } catch (_) {
      showToast(`Copied ${label}`);
    }
  };

  const handleResetVisitor = () => {
    const confirmed = window.confirm(
      'Reset my test identity (dev)?\n\nThis clears your visitor ID from localStorage AND the browser cookie, simulating a brand new person.\n\nAll your current A/B assignments and analytics will be detached from this session.'
    );
    if (!confirmed) return;
    const newId = resetVisitorIdentity();
    setVisitorId(newId);
    setSessionId(getSessionId());
    if (onReloadExperiment) onReloadExperiment();
    showToast('New test visitor identity generated');
  };

  const handleTestGoalClick = () => {
    if (activeExperiment) {
      trackEvent(activeExperiment.goal_event || 'cta_click_games', window.location.pathname, {
        forcedTest: true,
        is_forced: true,
        variant: currentVariant
      });
      setJustConverted(true);
      showToast(`Goal fired for Variant ${currentVariant}`);
      setTimeout(() => setJustConverted(false), 2500);
    }
  };

  const handleClose = () => {
    if (window.confirm('Hide the Developer HUD? You can reopen it anytime by visiting ?dev=1.')) {
      setHudState({ minimized: false, closed: true });
    }
  };

  // Derive display values from visitInfo or session cache
  const cachedIdent = (() => {
    try {
      const c = sessionStorage.getItem(`pf_identified_ses_${sessionId}`);
      return c ? JSON.parse(c) : null;
    } catch {
      return null;
    }
  })();

  const visitCount = visitInfo?.visitCount ?? cachedIdent?.visitCount ?? 1;
  const matchedByValue = visitInfo?.matchedBy ?? cachedIdent?.matchedBy ?? 'cookie';
  const profileStatus = claimedPilot?.callsign
    ? `claimed (${claimedPilot.callsign})`
    : (visitInfo?.is_claimed ? 'claimed' : 'anonymous');

  const assignedVariants = visitInfo?.assignedVariants || cachedIdent?.assignedVariants || {
    [activeExperiment?.name || 'hero_cta_text']: currentVariant || 'A'
  };

  // Minimized state: small floating pill button
  if (hudState.minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setHudState(s => ({ ...s, minimized: false }))}
          aria-label="Restore DEV HUD"
          className="px-3 py-1.5 rounded-full bg-[#0b0e1b]/95 border border-cyan-500/60 text-cyan-300 font-pixel text-[10px] shadow-[0_0_20px_rgba(0,240,255,0.35)] backdrop-blur-md flex items-center gap-2 hover:bg-cyan-950 hover:border-cyan-400 transition-all cursor-pointer group"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
          </span>
          <span className="tracking-wider">DEV HUD</span>
          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/60 text-pink-400 border border-pink-500/30">
            {currentVariant || 'A'}
          </span>
          <Plus className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 max-w-sm w-full font-sans transition-all duration-300"
      role="complementary"
      aria-label="A/B Testing Developer HUD"
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div className="mb-2 px-3 py-1.5 rounded bg-cyan-500 text-black text-xs font-mono font-bold shadow-lg animate-fade-in flex items-center justify-between">
          <span>{toastMessage}</span>
          <Check className="w-3.5 h-3.5 ml-2" />
        </div>
      )}

      <div className="bg-[#0b0e1b]/98 border border-cyan-500/50 rounded-lg shadow-[0_0_30px_rgba(0,240,255,0.25)] backdrop-blur-md overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2 bg-gradient-to-r from-cyan-950/80 to-purple-950/80 border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            <span className="font-pixel text-[9px] text-cyan-300 tracking-wider">DEV HUD</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/60 text-pink-400 border border-pink-500/40 ml-1">
              VAR: {currentVariant || 'A'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Minimize button */}
            <button
              onClick={() => setHudState(s => ({ ...s, minimized: true }))}
              aria-label="Minimize DEV HUD"
              title="Minimize HUD"
              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            {/* Close button */}
            <button
              onClick={handleClose}
              aria-label="Close DEV HUD"
              title="Close HUD"
              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3 space-y-3 text-xs max-h-[85vh] overflow-y-auto">
          {/* Full Visitor ID (Monospace, Never Truncated) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono uppercase text-cyan-400 font-bold">
                FULL VISITOR ID
              </span>
              <button
                onClick={() => handleCopy(visitorId, 'visitor ID')}
                className="px-2 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-mono text-[9px] flex items-center gap-1 transition-colors cursor-pointer"
                title="Copy full visitor ID to clipboard"
              >
                {copiedKey === 'visitor ID' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedKey === 'visitor ID' ? 'COPIED' : 'COPY'}
              </button>
            </div>
            <div className="p-2 bg-black/80 rounded border border-cyan-500/30 font-mono text-[10px] text-cyan-300 break-all select-all leading-tight">
              {visitorId}
            </div>
          </div>

          {/* Session & Profile Metadata */}
          <div className="bg-black/50 p-2.5 rounded border border-slate-800 space-y-1.5 text-[10px]">
            {/* Session ID */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Session ID:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-purple-300 max-w-[150px] truncate" title={sessionId}>
                  {sessionId}
                </span>
                <button
                  onClick={() => handleCopy(sessionId, 'session ID')}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  title="Copy session ID"
                >
                  {copiedKey === 'session ID' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Visit Count */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Visit Count:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-emerald-400 font-bold">
                  {visitCount}
                </span>
                <button
                  onClick={() => handleCopy(String(visitCount), 'visit count')}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  title="Copy visit count"
                >
                  {copiedKey === 'visit count' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Matched By */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Matched By:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-cyan-400 uppercase font-semibold text-[10px]">
                  {matchedByValue}
                </span>
                <button
                  onClick={() => handleCopy(matchedByValue, 'matched by')}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  title="Copy matched by"
                >
                  {copiedKey === 'matched by' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Profile Status */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Profile Status:</span>
              <span className={`font-mono font-semibold ${claimedPilot?.callsign ? 'text-amber-300' : 'text-slate-400'}`}>
                {profileStatus}
              </span>
            </div>
          </div>

          {/* Assigned Experiment Variants */}
          <div className="bg-black/50 p-2.5 rounded border border-slate-800 space-y-1.5 text-[10px]">
            <div className="text-[9px] font-mono uppercase text-slate-400 font-bold">
              ASSIGNED VARIANTS
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300 truncate max-w-[170px]" title={activeExperiment?.name || 'hero_cta_text'}>
                {activeExperiment?.name || 'hero_cta_text'}
              </span>
              <span className="font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold">
                VAR {currentVariant || 'A'}
              </span>
            </div>
            {Object.entries(assignedVariants || {})
              .filter(([k]) => k !== (activeExperiment?.name || 'hero_cta_text'))
              .map(([expKey, varVal]) => (
                <div key={expKey} className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400 truncate max-w-[170px]">{expKey}</span>
                  <span className="font-mono text-slate-300">VAR {varVal}</span>
                </div>
              ))}

            {/* Force Variant Switcher */}
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-800">
              <span className="text-slate-400">Force Variant:</span>
              <div className="flex gap-1">
                {['A', 'B'].map((v) => (
                  <button
                    key={v}
                    onClick={() => onForceVariant(v)}
                    aria-label={`Force variant ${v}`}
                    className={`px-2 py-0.5 text-[9px] font-pixel rounded transition-all cursor-pointer ${
                      currentVariant === v
                        ? v === 'A'
                          ? 'bg-cyan-500 text-black font-bold shadow-[0_0_8px_#00f0ff]'
                          : 'bg-pink-500 text-white font-bold shadow-[0_0_8px_#ff007f]'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    VAR {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={handleTestGoalClick}
              className="py-1.5 px-2 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-400 text-[9px] font-mono rounded flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              {justConverted ? <CheckCircle2 className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
              {justConverted ? 'FIRED!' : 'FIRE GOAL'}
            </button>

            <button
              onClick={handleResetVisitor}
              className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[9px] font-mono rounded flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              RESET ID (DEV)
            </button>
          </div>

          <div className="text-[8px] font-mono text-slate-500 text-center flex items-center justify-center gap-1">
            <Shield className="w-2.5 h-2.5 text-cyan-400" />
            <span>Dev HUD · Esc to minimize</span>
          </div>
        </div>
      </div>
    </div>
  );
}
