import React from 'react';
import { Shield, Sparkles, Trophy, Clock, Swords, MapPin, X, Maximize2 } from 'lucide-react';

export function buildMapPopupHTML(properties, activeUserId) {
  const currentUid = activeUserId || 'user-shivaraj';
  const isMine = Boolean(properties.just_captured || (properties.owner_id && (properties.owner_id === currentUid || properties.owner_id === activeUserId)));
  const isUnclaimed = !isMine && (!properties.owner_id || properties.is_unclaimed);
  const ownerName = isUnclaimed ? 'Unclaimed Neutral Sector' : (properties.owner_name || 'Anonymous Runner');
  const ownerAvatar = isUnclaimed ? '⚪' : (properties.owner_avatar || '⚡');
  const ownerColor = isMine ? '#7C3AED' : isUnclaimed ? '#94A3B8' : (properties.owner_color || '#06B6D4');
  const cellId = properties.cell_id || properties.id || '';
  const shortHex = cellId ? `H3 #${cellId.slice(-8)}` : 'H3 Sector';
  const captureCount = properties.capture_count || (isUnclaimed ? 0 : 1);

  const totalHexes = properties.owner_total_hexes || 1;
  const totalAreaM2 = properties.owner_total_area_m2 || (totalHexes * 10);
  const totalAreaKm2 = properties.owner_total_area_km2 || (totalHexes * 0.000010).toFixed(4);
  const areaDisplay = isUnclaimed
    ? '10 m² (Single Hex)'
    : `${totalAreaM2.toLocaleString()} m² (${totalHexes} hexes)`;

  return `
    <div style="font-family: Inter, -apple-system, sans-serif; color: #F8FAFC; background: #0F172A; padding: 12px; border-radius: 16px; border: 1px solid #334155; min-width: 220px; box-shadow: 0 12px 32px rgba(0,0,0,0.4);">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; padding-right: 16px;">
        <div style="font-size: 16px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 10px; background: ${ownerColor}22; border: 1.5px solid ${ownerColor};">${ownerAvatar}</div>
        <div style="min-width: 0; flex: 1;">
          <div style="font-weight: 700; font-size: 13px; color: #FFFFFF; display: flex; align-items: center; gap: 6px;">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${ownerName}</span>
            ${isMine ? '<span style="color:#FFFFFF; font-size:9px; font-weight:800; padding:1px 5px; background:#7C3AED; border-radius:4px;">YOU</span>' : ''}
          </div>
          <div style="font-size: 11px; color: #A3E635; font-weight: 600;">Total Area: ${areaDisplay}</div>
        </div>
      </div>
      <div style="background: rgba(30, 41, 59, 0.8); padding: 8px 10px; border-radius: 10px; font-size: 11px; display: flex; flex-direction: column; gap: 4px; border: 1px solid #1E293B;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #94A3B8;">Status:</span>
          <strong style="color: ${isMine ? '#A3E635' : isUnclaimed ? '#94A3B8' : '#06B6D4'}; font-weight: 700;">
            ${isMine ? 'Occupied by You' : isUnclaimed ? 'Unclaimed' : 'Rival Territory'}
          </strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #94A3B8;">Total Area:</span>
          <strong style="color: #F8FAFC; font-weight: 700;">${totalAreaM2.toLocaleString()} m² <span style="color: #94A3B8; font-weight: normal;">(${totalAreaKm2} km²)</span></strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #94A3B8;">Battles:</span>
          <strong style="color: #F8FAFC;">${captureCount} ${captureCount === 1 ? 'time' : 'times'}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 2px; border-top: 1px dashed #334155;">
          <span style="color: #64748B;">Sector ID:</span>
          <span style="color: #94A3B8; font-family: monospace; font-size: 10px;">${shortHex}</span>
        </div>
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

  const currentUid = activeUserId || 'user-shivaraj';
  const isMine = Boolean(sector.just_captured || (sector.owner_id && (sector.owner_id === currentUid || sector.owner_id === activeUserId)));
  const isUnclaimed = !isMine && (!sector.owner_id || sector.is_unclaimed);
  const ownerName = isUnclaimed ? 'Unclaimed Neutral Sector' : (sector.owner_name || 'Anonymous Runner');
  const ownerAvatar = isUnclaimed ? '⚪' : (sector.owner_avatar || '⚡');
  const ownerColor = isMine ? '#7C3AED' : isUnclaimed ? '#94A3B8' : (sector.owner_color || '#06B6D4');
  const captureCount = sector.capture_count || (isUnclaimed ? 0 : 1);
  const cellId = sector.cell_id || sector.id || '';
  const shortHex = cellId ? `H3 #${cellId.slice(-8)}` : 'H3 Sector';

  const totalHexes = sector.owner_total_hexes || 1;
  const totalAreaM2 = sector.owner_total_area_m2 || (totalHexes * 10);
  const totalAreaKm2 = sector.owner_total_area_km2 || (totalHexes * 0.000010).toFixed(4);
  const areaDisplay = isUnclaimed
    ? '10 m² (Single Hex)'
    : `${totalAreaM2.toLocaleString()} m² (${totalHexes} hexes)`;

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
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-md max-w-sm w-full text-slate-800 animate-in fade-in zoom-in-95 duration-150 font-sans">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-xs border shrink-0"
            style={{
              backgroundColor: `${ownerColor}15`,
              borderColor: `${ownerColor}66`,
            }}
          >
            {ownerAvatar}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate">
              <h4 className="font-bold text-sm text-slate-900 truncate">{ownerName}</h4>
              {isMine && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#7C3AED] text-white">
                  YOU
                </span>
              )}
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold font-sans">
              Total Area: {areaDisplay}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label="Close popup"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="py-2.5 space-y-2 text-xs">
        <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
          <span className="text-slate-600 flex items-center gap-1.5 font-medium">
            <Swords className="w-3.5 h-3.5 text-[#7C3AED]" />
            Status:
          </span>
          <span className="font-bold text-slate-900">
            {isMine ? 'Occupied by You' : isUnclaimed ? 'Unclaimed Neutral' : 'Rival Territory'}
          </span>
        </div>

        <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
          <span className="text-slate-600 flex items-center gap-1.5 font-medium">
            <Maximize2 className="w-3.5 h-3.5 text-[#7C3AED]" />
            Total Dominion Area:
          </span>
          <span className="font-bold text-[#7C3AED]">
            {totalAreaM2.toLocaleString()} m² <span className="text-slate-500 font-normal">({totalAreaKm2} km²)</span>
          </span>
        </div>

        <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
          <span className="text-slate-600 flex items-center gap-1.5 font-medium">
            <Trophy className="w-3.5 h-3.5 text-[#7C3AED]" />
            Total Battles / Captures:
          </span>
          <span className="font-bold text-slate-900">
            {captureCount} {captureCount === 1 ? 'time' : 'times'}
          </span>
        </div>

        <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
          <span className="text-slate-600 flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-[#7C3AED]" />
            Last Claimed:
          </span>
          <span className="text-slate-700 font-medium">
            {isUnclaimed ? 'Never (Neutral Grid)' : formattedTime}
          </span>
        </div>

        <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-slate-400">
          <span>Sector Index:</span>
          <span className="font-mono text-slate-500">{shortHex} (~10 m²)</span>
        </div>
      </div>
    </div>
  );
}
