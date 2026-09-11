import React from 'react';
import { Shield } from 'lucide-react';

export function TerritoryLegend({ className = '' }) {
  return (
    <div className={`bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-2 shadow-md ${className}`}>
      <div className="font-black text-slate-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5 pb-1 border-b border-slate-100">
        <Shield className="w-3.5 h-3.5 text-purple-600" />
        <span>Territory Sectors</span>
      </div>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-purple-600 border border-purple-600 shadow-sm inline-block flex-shrink-0" />
          <span className="text-slate-800 font-bold">My Captured Sectors</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-[#0F172A] border border-[#0F172A] shadow-sm inline-block flex-shrink-0" />
          <span className="text-slate-800 font-bold">Contested Rival Territory</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300 inline-block flex-shrink-0" />
          <span className="text-slate-500">Neutral / Unclaimed Hex</span>
        </div>
      </div>
    </div>
  );
}

export default TerritoryLegend;
