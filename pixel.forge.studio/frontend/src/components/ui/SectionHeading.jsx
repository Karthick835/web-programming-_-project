import React from 'react';

export default function SectionHeading({ badge, title, subtitle, align = 'center', className = '' }) {
  const isCenter = align === 'center';

  return (
    <div className={`space-y-3 ${isCenter ? 'text-center max-w-3xl mx-auto' : 'max-w-2xl'} ${className}`}>
      {badge && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[rgba(0,240,255,0.1)] border border-[rgba(0,240,255,0.35)] text-[#00f0ff] font-pixel text-[10px] tracking-wider uppercase shadow-[0_0_12px_rgba(0,240,255,0.2)]">
          {badge}
        </div>
      )}
      <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#e8ecff] tracking-tight leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm sm:text-base text-[#8a93b8] leading-relaxed font-sans">
          {subtitle}
        </p>
      )}
    </div>
  );
}
