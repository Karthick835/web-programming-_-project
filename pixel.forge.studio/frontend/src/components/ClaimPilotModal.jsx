import React, { useState } from 'react';
import { Shield, Key, Copy, Check, Download, AlertTriangle, X, Terminal, UserCheck } from 'lucide-react';
import Modal from './ui/Modal';
import { pilotAPI } from '../services/api';
import { getVisitorId, setCanonicalVisitorId, trackEvent } from '../services/tracker';

export default function ClaimPilotModal({ isOpen, onClose, onSuccess, initialPreferences = {}, initialWishlist = [] }) {
  const [step, setStep] = useState('form'); // 'form' | 'code'
  const [callsign, setCallsign] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Recovery code display state
  const [generatedCode, setGeneratedCode] = useState('');
  const [savedChecked, setSavedChecked] = useState(false);
  const [copied, setCopied] = useState(false);

  const resetState = () => {
    setStep('form');
    setCallsign('');
    setEmail('');
    setErrorMsg('');
    setGeneratedCode('');
    setSavedChecked(false);
    setCopied(false);
    setLoading(false);
  };

  const handleClose = () => {
    // If on recovery code step, cannot close unless checkbox is confirmed
    if (step === 'code' && !savedChecked) return;
    resetState();
    onClose();
  };

  const handleClaim = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const visitorId = getVisitorId();
    try {
      const res = await pilotAPI.claim({
        callsign: callsign.trim().toUpperCase(),
        email: email.trim() || undefined,
        visitor_id: visitorId,
        preferences: initialPreferences,
        wishlist: initialWishlist
      });

      setGeneratedCode(res.data.recoveryCode);
      setStep('code');
      trackEvent('click', window.location.pathname, { action: 'claim_pilot_pass', callsign: res.data.callsign });
    } catch (err) {
      setErrorMsg(err?.response?.data?.error || 'Failed to claim pilot profile. Please verify callsign and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleDownloadTxt = () => {
    const content = `========================================================\nPIXEL FORGE STUDIO — PILOT PASS RECOVERY CREDENTIAL\n========================================================\nCallsign:       ${callsign.trim().toUpperCase()}\nRecovery Code:  ${generatedCode}\nDate Claimed:   ${new Date().toISOString()}\n\nIMPORTANT:\nPixel Forge Studio does not store this plain code.\nStore this code securely to restore your profile across devices\nor after clearing browser cache.\n========================================================\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pixelforge-recovery-${callsign.trim().toLowerCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFinish = () => {
    if (!savedChecked) return;
    if (onSuccess) {
      onSuccess({ callsign: callsign.trim().toUpperCase(), recoveryCode: generatedCode });
    }
    resetState();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'form' ? 'CLAIM PILOT PROFILE' : 'SAVE YOUR RECOVERY CODE'}
      size="md"
    >
      {step === 'form' ? (
        <form onSubmit={handleClaim} className="space-y-5">
          <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono">
              <Shield className="w-4 h-4" />
              <span>ZERO-PASSWORD RECOVERY IDENTITY</span>
            </div>
            <p className="leading-relaxed">
              Your browser remembers you automatically. Claiming your Pilot Profile generates an immutable recovery code so you can restore your progress, wishlist, and A/B configurations across devices or after clearing site data.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-500/40 rounded text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-cyan-300">
              CALLSIGN / HANDLE * (3–20 characters)
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={20}
              placeholder="e.g. CYBER_ACE_99"
              value={callsign}
              onChange={(e) => setCallsign(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-cyan-400"
            />
            <p className="text-[11px] text-slate-500">
              Only letters, numbers, hyphens, and underscores allowed.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-400">
              RECOVERY EMAIL (OPTIONAL — FOR MAGIC RESTORE LINKS)
            </label>
            <input
              type="email"
              placeholder="pilot@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
            />
            <p className="text-[11px] text-slate-500">
              Never used for marketing. Only used if you request a magic restore link.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full cyber-btn cyber-btn-cyan py-3 text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_#00f0ff]/20"
            >
              <UserCheck className="w-4 h-4" />
              {loading ? 'GENERATING PILOT PASS...' : 'CLAIM PILOT PROFILE'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="p-4 bg-amber-950/40 rounded-lg border border-amber-500/40 text-xs text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold font-mono text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>RECORD THIS CODE NOW — IT WILL NEVER BE SHOWN AGAIN</span>
            </div>
            <p className="text-amber-200/90 leading-relaxed">
              We store only an irreversible cryptographic hash of this recovery code. If you lose it, we cannot recover your profile.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono text-cyan-400 block">
              YOUR PILOT RECOVERY KEY
            </label>
            <div className="p-3.5 bg-black border-2 border-cyan-400/60 rounded-lg flex items-center justify-between gap-3 shadow-[0_0_15px_#00f0ff]/20">
              <span className="font-mono text-base sm:text-lg font-bold text-cyan-300 tracking-wider select-all">
                {generatedCode}
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-2 rounded bg-cyan-950 border border-cyan-500/40 hover:bg-cyan-900 text-cyan-300 transition-colors"
                  title="Copy Recovery Code"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="p-2 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 transition-colors"
                  title="Download .txt"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            {copied && (
              <p className="text-xs text-emerald-400 font-mono">
                ✓ Copied to clipboard!
              </p>
            )}
          </div>

          <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                id="savedRecoveryCheck"
                checked={savedChecked}
                onChange={(e) => setSavedChecked(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-cyan-400 bg-slate-950 border-slate-700 focus:ring-0"
              />
              <span className="text-xs text-slate-200 font-sans leading-normal">
                I have copied or downloaded my recovery code and understand it is required to restore my Pilot Pass on another device or after clearing browser storage.
              </span>
            </label>
          </div>

          <div>
            <button
              type="button"
              disabled={!savedChecked}
              onClick={handleFinish}
              className={`w-full py-3 text-xs font-heading font-bold rounded flex items-center justify-center gap-2 transition-all ${
                savedChecked
                  ? 'cyber-btn cyber-btn-cyan shadow-[0_0_20px_#00f0ff]/30 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              CONFIRM & ACTIVATE PILOT PASS
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
