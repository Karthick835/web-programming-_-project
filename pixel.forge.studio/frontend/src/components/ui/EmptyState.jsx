import React from 'react';
import { Gamepad2, AlertCircle } from 'lucide-react';

export default function EmptyState({ icon: Icon = Gamepad2, title = 'No Records Found', description = 'Try adjusting your search criteria or filters.', actionLabel, onAction }) {
  return (
    <div className="text-center py-16 px-4 bg-[#0f1224]/50 rounded-lg border border-dashed border-slate-800 space-y-3">
      <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-[#8a93b8]">
        <Icon className="w-6 h-6" strokeWidth={2} />
      </div>
      <h3 className="font-heading text-lg font-bold text-[#e8ecff]">
        {title}
      </h3>
      <p className="text-xs text-[#8a93b8] max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="pt-2">
          <button
            onClick={onAction}
            className="cyber-btn cyber-btn-outline text-xs py-2 px-5"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
