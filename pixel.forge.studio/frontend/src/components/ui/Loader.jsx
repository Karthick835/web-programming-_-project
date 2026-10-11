import React from 'react';
import { Gamepad2 } from 'lucide-react';

export function Loader({ text = 'LOADING MATRIX DATA...' }) {
  return (
    <div className="py-20 flex flex-col items-center justify-center space-y-4">
      <div className="relative w-12 h-12">
        <div className="w-12 h-12 rounded-full border-2 border-t-[#00f0ff] border-r-[#ff0a78] border-b-transparent border-l-transparent animate-spin" />
        <Gamepad2 className="w-6 h-6 text-[#00f0ff] absolute inset-0 m-auto" strokeWidth={2} />
      </div>
      <div className="font-pixel text-[11px] text-[#8a93b8] tracking-widest animate-pulse">
        {text}
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="cyber-card animate-pulse space-y-4">
      <div className="h-52 bg-slate-900 rounded" />
      <div className="h-4 bg-slate-800 rounded w-1/3" />
      <div className="h-6 bg-slate-800 rounded w-3/4" />
      <div className="h-12 bg-slate-900 rounded" />
    </div>
  );
}
