import React from 'react';
import { Crown, Shield, MapPin, TrendingUp, TrendingDown, Minus, Flame, Compass } from 'lucide-react';
import Avatar from './Avatar.jsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
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

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-colors duration-100 gap-3',
        isCurrentUser
          ? 'bg-purple-50/70 border-purple-300 shadow-sm'
          : isTop1
          ? 'bg-amber-50/40 border-amber-200 shadow-xs'
          : 'bg-white hover:bg-slate-50 border-slate-200 shadow-xs',
        className
      )}
    >
      {/* Competitor Profile */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex items-center justify-center w-8 h-8 font-mono font-black text-sm">
            {isTop1 ? (
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-amber-700 border border-amber-300 font-black">
                <Crown className="w-4 h-4" />
              </span>
            ) : isTop2 ? (
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-700 border border-slate-300 font-black">
                2
              </span>
            ) : isTop3 ? (
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 text-orange-700 border border-orange-300 font-black">
                3
              </span>
            ) : (
              <span className="text-slate-400 font-mono font-bold">#{rank}</span>
            )}
          </div>
        </div>

        <Avatar
          avatar={user?.avatar || '⚡'}
          color={isCurrentUser ? '#7C3AED' : '#475569'}
          size="md"
        />

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-black text-sm text-slate-900 truncate tracking-wide">
              {user?.displayName || user?.username}
            </span>
            {isCurrentUser && (
              <span className="text-[9px] font-mono font-black text-white bg-purple-600 px-1.5 py-0.5 rounded tracking-wider">
                YOU
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-mono truncate">@{user?.username}</p>
        </div>
      </div>

      {/* The Three Sectors: Distance, Current Holding, and Total Captured */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 text-right flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
        {/* Sector 1: Distance Covered */}
        <div className={cn(
          'p-1.5 rounded-lg text-center sm:text-right transition-colors',
          activeSector === 'distance' ? 'bg-purple-50 border border-purple-200' : ''
        )}>
          <div className="text-xs sm:text-sm font-black font-mono text-purple-700">
            {Number(distanceKm || 0).toFixed(2)} <span className="text-[10px] text-slate-500 font-normal">km</span>
          </div>
          <div className="text-[9px] uppercase tracking-wider font-bold text-slate-500">
            Distance
          </div>
        </div>

        {/* Sector 2: Current Holding Area */}
        <div className={cn(
          'p-1.5 rounded-lg text-center sm:text-right transition-colors',
          (activeSector === 'holding' || activeSector === 'holding_area') ? 'bg-slate-100 border border-slate-200' : ''
        )}>
          <div className="text-xs sm:text-sm font-black font-mono text-slate-900">
            {Number(currentHoldingAreaM2 || 0).toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">m²</span>
          </div>
          <div className="text-[9px] uppercase tracking-wider font-bold text-slate-500 flex items-center justify-center sm:justify-end gap-1">
            <span>Holding</span>
            <span className="text-[8px] font-mono text-slate-400">({currentCellsOwned})</span>
          </div>
        </div>

        {/* Sector 3: Total Area Captured (Monotonic, never decreases) */}
        <div className={cn(
          'p-1.5 rounded-lg text-center sm:text-right transition-colors',
          (activeSector === 'total_area' || activeSector === 'captured_area') ? 'bg-purple-50 border border-purple-200' : ''
        )}>
          <div className="text-xs sm:text-sm font-black font-mono text-purple-700">
            {Number(totalAreaCapturedM2 || 0).toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">m²</span>
          </div>
          <div className="text-[9px] uppercase tracking-wider font-bold text-slate-500">
            Total Captured
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeaderboardRow;
