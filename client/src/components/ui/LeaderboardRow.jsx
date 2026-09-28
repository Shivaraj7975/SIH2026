import React from 'react';
import { Crown, Shield, Zap, Compass, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import Avatar from './Avatar.jsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const TERRITORY_PALETTE = [
  '#7C3AED', // violet (player default)
  '#06B6D4', // cyan
  '#F97316', // orange
  '#10B981', // emerald
  '#EC4899', // pink
  '#EAB308', // yellow
  '#3B82F6', // blue
  '#EF4444', // red
];

function getUserTerritoryColor(userId, username, isCurrentUser) {
  if (isCurrentUser) return '#7C3AED';
  const str = String(userId || username || 'runner');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = (Math.abs(hash) % (TERRITORY_PALETTE.length - 1)) + 1;
  return TERRITORY_PALETTE[idx] || '#06B6D4';
}

export function LeaderboardRow({
  rank,
  rankChange = 0,
  user,
  distanceKm = 0,
  currentHoldingAreaM2 = 0,
  currentCellsOwned = 0,
  totalAreaCapturedM2 = 0,
  activeSector = 'distance',
  isCurrentUser = false,
  className,
}) {
  const isTop1 = rank === 1;
  const isTop2 = rank === 2;
  const isTop3 = rank === 3;
  const territoryColor = getUserTerritoryColor(user?.id, user?.username, isCurrentUser);

  return (
    <div
      className={cn(
        'group flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-2xl border transition-all duration-150 gap-3',
        isCurrentUser
          ? 'bg-[#EDE9FE]/70 border-[#C4B5FD] shadow-sm ring-1 ring-[#7C3AED]/20'
          : isTop1
          ? 'bg-amber-50/40 border-amber-200/80 shadow-xs'
          : 'bg-white hover:bg-slate-50 border-slate-200/80 shadow-xs',
        className
      )}
    >
      {/* Competitor Profile */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Rank Badge */}
        <div className="flex items-center justify-center w-8 h-8 flex-shrink-0 font-display font-bold text-sm">
          {isTop1 ? (
            <span
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-100 text-amber-600 border border-amber-300 font-bold shadow-xs"
              title="1st Place (Gold)"
            >
              <Crown className="w-4 h-4 fill-amber-500 text-amber-600" />
            </span>
          ) : isTop2 ? (
            <span
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 text-slate-600 border border-slate-300 font-bold"
              title="2nd Place (Silver)"
            >
              2
            </span>
          ) : isTop3 ? (
            <span
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-900/10 text-amber-700 border border-amber-600/30 font-bold"
              title="3rd Place (Bronze)"
            >
              3
            </span>
          ) : (
            <span className="text-slate-400 font-display font-medium text-xs">#{rank}</span>
          )}
        </div>

        {/* Avatar with Territory Color Ring */}
        <div
          className="relative rounded-full p-0.5 flex-shrink-0 transition-transform group-hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${territoryColor}, ${territoryColor}99)`,
            boxShadow: `0 0 0 2px #ffffff, 0 2px 6px ${territoryColor}33`,
          }}
        >
          <Avatar
            avatar={user?.avatar || '⚡'}
            color={territoryColor}
            size="md"
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-sm text-slate-900 truncate tracking-tight">
              {user?.displayName || user?.username}
            </span>
            {isCurrentUser && (
              <span className="text-[10px] font-display font-bold text-white bg-brand px-2 py-0.5 rounded-full shadow-xs tracking-wider uppercase">
                YOU
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-sans truncate">
            <span>@{user?.username}</span>
            <span className="text-slate-300">•</span>
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: territoryColor }}
              title={`Territory Color: ${territoryColor}`}
            />
          </div>
        </div>
      </div>

      {/* The Three Sectors */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 text-right flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
        {/* Sector 1: Distance Covered */}
        <div
          className={cn(
            'p-2 rounded-xl text-center sm:text-right transition-colors',
            activeSector === 'distance'
              ? 'bg-purple-100/60 border border-purple-300/80 text-brand'
              : 'bg-slate-50/70 border border-transparent'
          )}
        >
          <div className="text-xs sm:text-sm font-display font-bold tabular-nums text-slate-900 group-hover:text-brand">
            {Number(distanceKm || 0).toFixed(2)}{' '}
            <span className="text-[10px] font-normal text-slate-500">km</span>
          </div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 flex items-center justify-center sm:justify-end gap-1">
            <Zap className="w-2.5 h-2.5 text-purple-600" />
            <span>Distance</span>
          </div>
        </div>

        {/* Sector 2: Current Holding Area */}
        <div
          className={cn(
            'p-2 rounded-xl text-center sm:text-right transition-colors',
            activeSector === 'holding' || activeSector === 'holding_area'
              ? 'bg-cyan-100/60 border border-cyan-300/80 text-cyan-800'
              : 'bg-slate-50/70 border border-transparent'
          )}
        >
          <div className="text-xs sm:text-sm font-display font-bold tabular-nums text-slate-900">
            {Number(currentHoldingAreaM2 || 0).toLocaleString()}{' '}
            <span className="text-[10px] font-normal text-slate-500">m²</span>
          </div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 flex items-center justify-center sm:justify-end gap-1">
            <Shield className="w-2.5 h-2.5 text-cyan-600" />
            <span>Holding</span>
          </div>
        </div>

        {/* Sector 3: Total Area Captured */}
        <div
          className={cn(
            'p-2 rounded-xl text-center sm:text-right transition-colors',
            activeSector === 'total_area' || activeSector === 'captured_area'
              ? 'bg-purple-100/60 border border-purple-300/80 text-brand'
              : 'bg-slate-50/70 border border-transparent'
          )}
        >
          <div className="text-xs sm:text-sm font-display font-bold tabular-nums text-purple-700">
            {Number(totalAreaCapturedM2 || 0).toLocaleString()}{' '}
            <span className="text-[10px] font-normal text-slate-500">m²</span>
          </div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 flex items-center justify-center sm:justify-end gap-1">
            <Compass className="w-2.5 h-2.5 text-purple-600" />
            <span>Captured</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeaderboardRow;
