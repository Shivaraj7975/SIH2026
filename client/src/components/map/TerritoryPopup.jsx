import React from 'react';
import { Shield, Sparkles, Trophy, Clock, Swords, MapPin, X } from 'lucide-react';

export function buildMapPopupHTML(properties, activeUserId) {
  const isUnclaimed = !properties.owner_id || properties.is_unclaimed;
  const isMine = properties.owner_id === activeUserId;
  const ownerName = isUnclaimed ? 'Unclaimed Neutral Sector' : (properties.owner_name || 'Anonymous Runner');
  const ownerAvatar = isUnclaimed ? '⚪' : (properties.owner_avatar || '⚡');
  const ownerColor = isUnclaimed ? '#64748b' : (properties.owner_color || '#00f2fe');
  const cellId = properties.cell_id || '';
  const shortHex = cellId ? `H3 #${cellId.slice(-8)}` : 'H3 Sector';

  return `
    <div style="font-family: inherit; color: #f8fafc; min-width: 200px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span style="font-size: 18px; padding: 4px; border-radius: 8px; background: ${ownerColor}22; border: 1px solid ${ownerColor}66;">${ownerAvatar}</span>
        <div>
          <div style="font-weight: 800; font-size: 13px; color: #fff;">${ownerName} ${isMine ? '<span style="color:#00f2fe; font-size:10px; padding:2px 4px; background:#00f2fe22; border-radius:4px;">YOU</span>' : ''}</div>
          <div style="font-size: 10px; font-family: monospace; color: #94a3b8;">${shortHex}</div>
        </div>
      </div>
      <div style="background: rgba(30,41,59,0.5); padding: 8px; border-radius: 8px; font-size: 11px; margin-top: 6px;">
        <div style="color: #cbd5e1;">Status: <strong style="color: ${isMine ? '#00f2fe' : isUnclaimed ? '#94a3b8' : '#fb7185'};">${isMine ? 'Occupied by You' : isUnclaimed ? 'Unclaimed' : 'Contested Rival'}</strong></div>
      </div>
    </div>
  `;
}

export default function TerritoryPopup({
  sector,
  onClose,
  activeUserId,
  currentChallenge,
}) {
  if (!sector) return null;

  const isUnclaimed = !sector.owner_id || sector.is_unclaimed;
  const isMine = sector.owner_id === activeUserId;
  const ownerName = isUnclaimed ? 'Unclaimed Neutral Sector' : (sector.owner_name || 'Anonymous Runner');
  const ownerAvatar = isUnclaimed ? '⚪' : (sector.owner_avatar || '⚡');
  const ownerColor = isUnclaimed ? '#64748b' : (sector.owner_color || '#00f2fe');
  const captureCount = sector.capture_count || (isUnclaimed ? 0 : 1);
  const cellId = sector.cell_id || sector.id || '';
  const shortHex = cellId ? `H3 #${cellId.slice(-8)}` : 'H3 Sector';

  let formattedTime = 'Recently';
  if (sector.captured_at || sector.last_captured) {
    try {
      const date = new Date(sector.captured_at || sector.last_captured);
      formattedTime = date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      formattedTime = 'Recently';
    }
  }

  return (
    <div className="bg-white/95 border border-slate-200 rounded-2xl p-4 shadow-xl backdrop-blur-xl max-w-sm w-full text-slate-800 animate-in fade-in zoom-in-95 duration-150 font-sans">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-xs border"
            style={{
              backgroundColor: `${ownerColor}15`,
              borderColor: `${ownerColor}44`,
            }}
          >
            {ownerAvatar}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-sm text-slate-900 leading-none">{ownerName}</h4>
              {isMine && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                  YOU
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-slate-500 mt-0.5">{shortHex}</p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="py-3 space-y-2 text-xs">
        <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
          <span className="text-slate-500 flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-purple-600" />
            Total Battles / Captures:
          </span>
          <span className="font-mono font-bold text-slate-900">
            {captureCount} {captureCount === 1 ? 'time' : 'times'}
          </span>
        </div>

        <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
          <span className="text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-purple-600" />
            Last Claimed:
          </span>
          <span className="font-mono text-slate-700 font-medium">
            {isUnclaimed ? 'Never (Wilderness)' : formattedTime}
          </span>
        </div>
      </div>
    </div>
  );
}
