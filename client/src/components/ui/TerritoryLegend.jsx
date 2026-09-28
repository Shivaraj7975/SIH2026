import React from 'react';
import { Shield } from 'lucide-react';

export function TerritoryLegend({ className = '' }) {
  return (
    <div className={`bg-white p-3.5 rounded-2xl border border-slate-200 text-xs space-y-2.5 shadow-sm font-sans ${className}`}>
      <div className="font-semibold text-slate-900 uppercase tracking-[0.06em] text-[11px] flex items-center gap-1.5 pb-2 border-b border-slate-100">
        <Shield className="w-3.5 h-3.5 text-purple-600" />
        <span>Territory Legend</span>
      </div>

      <div className="space-y-2 text-xs">
        {/* 1. My Territory */}
        <div className="flex items-center gap-2.5">
          <span
            className="w-4 h-4 rounded-md inline-block shrink-0"
            style={{
              backgroundColor: 'rgba(124, 58, 237, 0.40)',
              border: '2.5px solid #5B21B6',
            }}
          />
          <div className="flex items-center justify-between w-full">
            <span className="text-slate-900 font-semibold">My Territory</span>
            <span className="text-[10px] text-slate-400 font-sans">#7C3AED</span>
          </div>
        </div>

        {/* 2. Rival Territory */}
        <div className="flex items-center gap-2.5">
          <span
            className="w-4 h-4 rounded-md inline-block shrink-0"
            style={{
              backgroundColor: 'rgba(6, 182, 212, 0.30)',
              border: '1.5px solid #06B6D4',
            }}
          />
          <div className="flex items-center justify-between w-full">
            <span className="text-slate-800 font-medium">Rival Territory</span>
            <span className="text-[10px] text-slate-400 font-sans">#06B6D4</span>
          </div>
        </div>

        {/* 3. Contested Territory */}
        <div className="flex items-center gap-2.5">
          <span
            className="w-4 h-4 rounded-md inline-block shrink-0"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.30)',
              border: '1.5px dashed #F59E0B',
            }}
          />
          <div className="flex items-center justify-between w-full">
            <span className="text-slate-800 font-medium">Contested</span>
            <span className="text-[10px] text-slate-400 font-sans">Dashed</span>
          </div>
        </div>

        {/* 4. Unclaimed / Neutral */}
        <div className="flex items-center gap-2.5">
          <span
            className="w-4 h-4 rounded-md inline-block shrink-0"
            style={{
              backgroundColor: 'transparent',
              border: '1px solid rgba(203, 213, 225, 0.60)',
            }}
          />
          <div className="flex items-center justify-between w-full">
            <span className="text-slate-500 font-medium">Unclaimed</span>
            <span className="text-[10px] text-slate-400 font-sans">Neutral</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TerritoryLegend;
