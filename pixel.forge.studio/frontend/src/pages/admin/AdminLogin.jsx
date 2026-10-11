import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight, Sparkles, Key, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminLogin({ onLoginSuccess, onCancel }) {
  const [email, setEmail] = useState('admin@pixelforge.io');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please verify email and password.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (role) => {
    if (role === 'admin') {
      setEmail('admin@pixelforge.io');
      setPassword('admin123');
    } else {
      setEmail('editor@pixelforge.io');
      setPassword('editor123');
    }
    setError('');
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-[#0c0f1e] border border-cyan-500/40 rounded-xl p-8 shadow-[0_0_50px_rgba(0,240,255,0.2)] space-y-6 hud-corner relative">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-lg bg-pink-500/20 border border-pink-500/50 flex items-center justify-center mx-auto text-pink-400 shadow-[0_0_20px_rgba(255,0,127,0.3)]">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-white">
            STAFF HQ ACCESS
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            JWT Authenticated Mission Control
          </p>
        </div>

        {/* Quick Demo Pre-fills */}
        <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-2">
          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
            <Key className="w-3 h-3 text-cyan-400" />
            DEMO CREDENTIALS (CLICK TO FILL):
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials('admin')}
              className="py-1 px-2 text-[10px] font-mono bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/40 rounded text-center transition-all"
            >
              Admin (Full Control)
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('editor')}
              className="py-1 px-2 text-[10px] font-mono bg-pink-950/50 hover:bg-pink-900/60 text-pink-300 border border-pink-500/40 rounded text-center transition-all"
            >
              Editor (Content Only)
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-500/50 rounded text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-slate-300 mb-1 font-mono">Staff Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-400 font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-mono">Access Key (Password)</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-400 font-mono text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full cyber-btn cyber-btn-cyan py-3 text-xs flex items-center justify-center gap-2"
          >
            {loading ? 'AUTHENTICATING...' : 'ENTER CONTROL MATRIX'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            &larr; Return to Public Website
          </button>
        </div>

      </div>
    </div>
  );
}
