import React from 'react';

// Generates consistent cyberpunk/synthwave colors from a name string
const COLOR_PAIRS = [
  { bg: 'from-cyan-600 to-blue-700', text: 'text-cyan-100', border: 'border-cyan-400' },
  { bg: 'from-pink-600 to-purple-700', text: 'text-pink-100', border: 'border-pink-400' },
  { bg: 'from-emerald-600 to-teal-700', text: 'text-emerald-100', border: 'border-emerald-400' },
  { bg: 'from-amber-600 to-orange-700', text: 'text-amber-100', border: 'border-amber-400' },
  { bg: 'from-violet-600 to-fuchsia-700', text: 'text-violet-100', border: 'border-violet-400' },
  { bg: 'from-rose-600 to-red-700', text: 'text-rose-100', border: 'border-rose-400' },
];

function getInitials(name = '') {
  if (!name) return 'PF';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorIndex(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % COLOR_PAIRS.length;
}

export default function Avatar({
  name = 'Anonymous',
  role = '',
  size = 'md',
  className = '',
  showRoleBadge = false,
}) {
  const initials = getInitials(name);
  const colorScheme = COLOR_PAIRS[getColorIndex(name)];

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base font-bold',
    xl: 'w-20 h-20 text-xl font-bold',
    '2xl': 'w-28 h-28 text-3xl font-bold',
  }[size] || 'w-10 h-10 text-sm';

  return (
    <div className={`relative inline-flex flex-shrink-0 items-center justify-center select-none ${className}`}>
      <div
        className={`${sizeClasses} rounded-full bg-gradient-to-br ${colorScheme.bg} ${colorScheme.text} border ${colorScheme.border}/60 shadow-[0_0_12px_rgba(0,240,255,0.2)] flex items-center justify-center font-mono font-bold tracking-wider`}
        aria-label={`Avatar for ${name}`}
      >
        <span>{initials}</span>
      </div>

      {showRoleBadge && role && (
        <span className="absolute -bottom-1 -right-1 text-[8px] font-pixel px-1 py-0.5 rounded bg-black/90 text-cyan-300 border border-cyan-400/50 uppercase">
          {role}
        </span>
      )}
    </div>
  );
}
