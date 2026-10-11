import React from 'react';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage({ onNavigateHome }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="cyber-card max-w-lg w-full text-center p-8 sm:p-12 space-y-6 relative overflow-hidden hud-corner">
        <div className="w-20 h-20 bg-pink-500/10 border border-pink-500/40 rounded-full flex items-center justify-center mx-auto text-pink-400 shadow-[0_0_30px_rgba(255,10,120,0.3)]">
          <AlertTriangle className="w-10 h-10 animate-bounce" />
        </div>

        <div className="space-y-2">
          <span className="pixel-badge badge-pink text-[10px] tracking-widest inline-block">
            ERR_SECTOR_NOT_FOUND
          </span>
          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-white">
            404
          </h1>
          <h2 className="font-pixel text-sm text-cyan-400">
            SIGNAL LOST IN THE VOID
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-sans leading-relaxed max-w-sm mx-auto">
            The neural coordinate you are trying to reach does not exist or has been decompiled from our servers.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onNavigateHome}
            className="w-full sm:w-auto cyber-btn cyber-btn-cyan text-xs py-3 px-6 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            RETURN TO BASE HQ
          </button>
          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto cyber-btn cyber-btn-outline text-xs py-3 px-6 flex items-center justify-center gap-2 text-slate-300"
          >
            <ArrowLeft className="w-4 h-4" />
            GO BACK
          </button>
        </div>
      </div>
    </div>
  );
}
