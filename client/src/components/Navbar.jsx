import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Map, Trophy, User, Shield, ChevronDown, LogOut, Activity } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Navbar({
  allUsers = [],
  onSwitchUser,
}) {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 py-2 shadow-xs font-sans">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Brand Logo: Clean "GeoFit" only (no territory tag) */}
        <Link to="/map" className="flex items-center gap-2 group shrink-0">
          <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#7C3AED] shadow-sm transition-transform group-hover:scale-105">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2.5]" />
          </div>
          <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 font-sans">
            Geo<span className="text-[#7C3AED]">Fit</span>
          </span>
        </Link>

        {/* Clean Center Navigation: Map, Rankings, and Workouts & Logs */}
        <nav className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
          <Link
            to="/map"
            className={`h-8 sm:h-9 flex items-center gap-1.5 px-2.5 sm:px-3.5 rounded-lg transition-all ${
              location.pathname === '/map'
                ? 'bg-[#7C3AED] text-white shadow-xs'
                : 'text-[#475569] hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Map className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Map</span>
          </Link>

          <Link
            to="/leaderboard"
            className={`h-8 sm:h-9 flex items-center gap-1.5 px-2.5 sm:px-3.5 rounded-lg transition-all ${
              location.pathname === '/leaderboard'
                ? 'bg-[#7C3AED] text-white shadow-xs'
                : 'text-[#475569] hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Rankings</span>
          </Link>

          <Link
            to="/activity"
            className={`h-8 sm:h-9 flex items-center gap-1.5 px-2.5 sm:px-3.5 rounded-lg transition-all ${
              location.pathname === '/activity' || location.pathname === '/logs' || location.pathname === '/workouts'
                ? 'bg-[#7C3AED] text-white shadow-xs'
                : 'text-[#475569] hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="sm:hidden">Logs</span>
            <span className="hidden sm:inline">Workout Logs</span>
          </Link>
        </nav>

        {/* Right Side User Profile & Actions Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="h-9 sm:h-11 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                aria-label="User menu"
              >
                <span className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white border text-xs font-bold border-purple-300 shadow-xs">
                  {user.avatar || '⚡'}
                </span>
                <div className="hidden sm:block text-left font-sans">
                  <div className="text-sm font-semibold text-slate-900 leading-tight">
                    {user.displayName || user.username}
                  </div>
                  <div className="text-xs text-purple-700 font-medium leading-tight">
                    Rank #{user.weeklyRank || 1} · {user.currentTerritoryCount || 0} hexes
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 border-b border-slate-100 flex justify-between items-center">
                    <span>Active Athlete</span>
                    <span className="text-[#7C3AED] font-bold">{user.currentTerritoryCount || 0} Sectors</span>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <Link
                      to="/activity"
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-[#7C3AED] transition-colors"
                    >
                      <Activity className="w-4 h-4 text-[#7C3AED]" />
                      <span>Workout &amp; Activity Logs</span>
                    </Link>

                    <Link
                      to="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-[#7C3AED] transition-colors"
                    >
                      <User className="w-4 h-4 text-[#7C3AED]" />
                      <span>Profile &amp; Objectives</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-600" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                to="/login"
                className="h-8 sm:h-10 px-4 flex items-center text-xs font-bold bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl shadow-xs transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
