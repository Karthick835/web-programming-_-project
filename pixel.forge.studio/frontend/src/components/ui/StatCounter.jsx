import React from 'react';

export default function StatCounter({ value, label, sublabel, color = 'cyan' }) {
  const colorMap = {
    cyan: 'text-[#00f0ff]',
    magenta: 'text-[#ff0a78]',
    yellow: 'text-[#ffd400]',
    emerald: 'text-[#00ff88]'
  };

  return (
    <div className="bg-[#0f1224]/80 p-6 rounded-lg border border-[rgba(0,240,255,0.18)] backdrop-blur-md text-center flex flex-col justify-center space-y-1 hover:border-[#00f0ff]/40 transition-colors">
      <div className={`font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold ${colorMap[color] || 'text-[#00f0ff]'}`}>
        {value}
      </div>
      <div className="font-pixel text-[10px] text-[#e8ecff] uppercase tracking-wider pt-1">
        {label}
      </div>
      {sublabel && (
        <div className="text-[11px] font-mono text-[#8a93b8]">
          {sublabel}
        </div>
      )}
    </div>
  );
}
