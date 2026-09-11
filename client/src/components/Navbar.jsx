import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Map, Trophy, Target, User, Shield, Volume2, VolumeX, Zap, ChevronDown, Activity, LayoutDashboard, LogOut } from 'lucide-react';
import { sounds } from '../lib/audio.js';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Navbar({
  onOpenChallenge,
  onOpenDemo,
  allUsers = [],
  onSwitchUser,
}) {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const { user, logout } = useAuth();
  const location = useLocation();

  const toggleSound = () => {
    const state = sounds.toggle();
    setSoundOn(state);
  };

  const navLinks = [
    { path: '/map', label: 'Live Map', icon: Map },
    { path: '/dashboard', label: 'Command', icon: LayoutDashboard },
    { path: '/activity', label: 'Workouts', icon: Activity },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { path: '/profile', label: 'Athlete Profile', icon: User },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-purple-600 shadow-sm">
            <Shield className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-slate-900 font-sans">
                Geo<span className="text-purple-600">Fit</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                TERRITORY
              </span>
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}

          {onOpenChallenge && (
            <button
              onClick={onOpenChallenge}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:text-purple-600 hover:bg-white transition-colors cursor-pointer"
            >
              <Target className="w-4 h-4 text-purple-600" />
              Daily Objective
            </button>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {onOpenDemo && (
            <button
              onClick={onOpenDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Launch Demo Mode"
            >
              <Zap className="w-3.5 h-3.5 text-purple-600 fill-purple-600" />
              <span className="tracking-wide">DEMO MODE</span>
            </button>
          )}

          <button
            onClick={toggleSound}
            className="p-2 text-slate-500 hover:text-purple-600 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer transition-colors"
            title="Toggle Sound Effects"
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-purple-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <span
                  className="flex items-center justify-center w-7 h-7 rounded-lg bg-white border text-xs font-bold border-purple-300"
                >
                  {user.avatar || '⚡'}
                </span>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-slate-900">{user.displayName || user.username}</div>
                  <div className="text-[10px] text-purple-600 font-mono">Rank #{user.weeklyRank || 1}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-1" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-xl p-2 z-50">
                  <div className="px-3 py-2 text-[10px] uppercase font-mono tracking-wider text-slate-500 border-b border-slate-100 flex justify-between items-center">
                    <span>Active Athlete</span>
                    <span className="text-purple-600 font-bold">{user.currentTerritoryCount || 0} Sectors</span>
                  </div>
                  
                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <User className="w-4 h-4 text-purple-600" />
                      View Profile
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-600" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-purple-600 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs transition-colors"
              >
                Join
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="flex md:hidden items-center justify-around pt-2.5 mt-2.5 border-t border-slate-200 text-xs">
        <Link
          to="/map"
          className={`flex flex-col items-center gap-1 ${
            location.pathname === '/map' ? 'text-purple-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Map className="w-4 h-4" />
          <span>Map</span>
        </Link>
        <Link
          to="/dashboard"
          className={`flex flex-col items-center gap-1 ${
            location.pathname === '/dashboard' ? 'text-purple-600 font-bold' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Command</span>
        </Link>
        <Link
          to="/leaderboard"
          className={`flex flex-col items-center gap-1 ${
            location.pathname === '/leaderboard' ? 'text-purple-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Rankings</span>
        </Link>
        <Link
          to="/profile"
          className={`flex flex-col items-center gap-1 ${
            location.pathname === '/profile' ? 'text-purple-600 font-bold' : 'text-slate-500'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile</span>
        </Link>
      </div>
    </header>
  );
}
