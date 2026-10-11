import React, { useState, useEffect } from 'react';
import { Key, Mail, CheckCircle2, AlertTriangle, ArrowRight, Shield, Terminal, ArrowLeft } from 'lucide-react';
import SectionHeading from '../components/ui/SectionHeading';
import { pilotAPI } from '../services/api';
import { getVisitorId, setCanonicalVisitorId, trackEvent } from '../services/tracker';

export default function RestorePage({ onNavigate, onProfileRestored }) {
  const [method, setMethod] = useState('code'); // 'code' | 'email'
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Auto-process magic token if present in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setLoading(true);
      const visitorId = getVisitorId();
      pilotAPI.restoreToken({
        token,
        visitor_id: visitorId,
        device_info: navigator.userAgent
      })
      .then(res => {
        setCanonicalVisitorId(res.data.canonical_visitor_id);
        if (onProfileRestored) onProfileRestored(res.data);
        setSuccessMsg(`Welcome back, Pilot ${res.data.callsign}! Your profile and preferences have been restored.`);
        trackEvent('click', '/restore', { action: 'restore_pilot_magic_token', callsign: res.data.callsign });
        setTimeout(() => onNavigate('pilot'), 2000);
      })
      .catch(err => {
        setErrorMsg(err?.response?.data?.error || 'Magic restore token has expired or is invalid.');
      })
      .finally(() => setLoading(false));
    }
  }, [onNavigate, onProfileRestored]);

  const handleRestoreWithCode = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    const visitorId = getVisitorId();
    try {
      const res = await pilotAPI.restore({
        recovery_code: code.trim().toUpperCase(),
        visitor_id: visitorId,
        device_info: navigator.userAgent
      });

      setCanonicalVisitorId(res.data.canonical_visitor_id);
      if (onProfileRestored) onProfileRestored(res.data);
      setSuccessMsg(`Pilot ${res.data.callsign} verified! Synced ${res.data.wishlist?.length || 0} wishlisted titles and variant assignments.`);
      trackEvent('click', '/restore', { action: 'restore_pilot_code', callsign: res.data.callsign });
      setTimeout(() => onNavigate('pilot'), 1800);
    } catch (err) {
      const msg = err?.response?.data?.error || 'Recovery code failed verification. Please check the code and try again.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMagicLink = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await pilotAPI.sendMagicLink(email.trim());
      setSuccessMsg(res.data.message || 'Restore link generated! Check your email or inspect the developer terminal console.');
      trackEvent('click', '/restore', { action: 'request_magic_link' });
    } catch (err) {
      setErrorMsg(err?.response?.data?.error || 'Failed to dispatch restore link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container py-12 md:py-16 space-y-12">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('home')}
          className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Back to Studio Home"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">PILOT IDENTITY RECOVERY</span>
      </div>

      <SectionHeading
        badge="PILOT PASS RESTORATION"
        title="RESTORE YOUR IDENTITY"
        subtitle="Moving to a new browser or cleared your site cache? Enter your recovery credential to restore your callsign, wishlist, and locked A/B variants."
        align="center"
      />

      <div className="max-w-md mx-auto cyber-card p-6 sm:p-8 space-y-6 hud-corner">
        
        {/* Mode Selector */}
        <div className="flex border-b border-slate-800 pb-3 gap-4">
          <button
            type="button"
            onClick={() => { setMethod('code'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex items-center gap-2 text-xs font-mono pb-1 border-b-2 transition-all ${
              method === 'code' ? 'border-cyan-400 text-cyan-300 font-bold' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            RECOVERY CODE
          </button>
          <button
            type="button"
            onClick={() => { setMethod('email'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex items-center gap-2 text-xs font-mono pb-1 border-b-2 transition-all ${
              method === 'email' ? 'border-cyan-400 text-cyan-300 font-bold' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            MAGIC LINK
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-950/60 border border-red-500/40 rounded-lg text-xs text-red-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-xs text-emerald-300 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {method === 'code' ? (
          <form onSubmit={handleRestoreWithCode} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-mono text-cyan-400 block">
                ENTER RECOVERY CODE (PF-XXXX-XXXX-XXXX-XXXX)
              </label>
              <input
                type="text"
                required
                placeholder="PF-XXXX-XXXX-XXXX-XXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3.5 py-3 text-sm font-mono text-white tracking-wider focus:outline-none focus:border-cyan-400"
              />
              <p className="text-[11px] text-slate-500">
                Rate limited to 5 attempts per 15 minutes. Verification uses timing-safe cryptography.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full cyber-btn cyber-btn-cyan py-3 text-xs flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4" />
              {loading ? 'AUTHENTICATING CODE...' : 'RESTORE PILOT PROFILE'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSendMagicLink} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-mono text-cyan-400 block">
                REGISTERED EMAIL ADDRESS
              </label>
              <input
                type="email"
                required
                placeholder="pilot@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3.5 py-3 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
              <p className="text-[11px] text-slate-500">
                If configured, a single-use restore link expiring in 15 minutes will be dispatched.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full cyber-btn cyber-btn-cyan py-3 text-xs flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              {loading ? 'DISPATCHING LINK...' : 'DISPATCH RESTORE LINK'}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Don't have a Pilot Pass yet?{' '}
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="text-cyan-400 hover:underline font-mono"
            >
              Browse games & claim on the homepage
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
