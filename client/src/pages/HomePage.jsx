import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Shield, Sparkles, MapPin, Trophy, Target, ArrowRight, Zap, Compass, Flame } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Chip from '../components/ui/Chip.jsx';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col relative overflow-hidden font-sans">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-purple-600/20 via-brand/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-40 right-10 w-72 h-72 bg-accent-lime/10 blur-3xl rounded-full pointer-events-none" />

      {/* Navigation Header */}
      <header className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand to-purple-500 flex items-center justify-center shadow-md shadow-brand/30">
            <Shield className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight text-white">
            Geo<span className="text-accent-lime">Fit</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <Link to="/map">
              <Button variant="primary" size="sm" icon={ArrowRight} iconPosition="right">
                Open Tactical Map
              </Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button variant="primary" size="sm" icon={Sparkles}>
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 lg:py-20 flex flex-col items-center text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/90 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-6 shadow-sm">
          <Zap className="w-3.5 h-3.5 text-accent-lime" />
          <span className="tracking-wide uppercase text-[11px]">Real-World Territory Conquest Running</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-bold tracking-tight text-white max-w-4xl leading-[1.1]">
          Conquer Your City. <br />
          <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-accent-lime bg-clip-text text-transparent">
            One Run at a Time.
          </span>
        </h1>

        <p className="mt-6 text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
          GeoFit transforms your everyday walks and runs into an athletic territory-capture strategy game.
          Move through real-world streets, conquer hexagon sectors on a live map, and hold your dominion against local rivals.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link to={user ? '/map' : '/login'} className="w-full sm:w-auto">
            <Button variant="primary" size="lg" className="w-full text-base px-8 py-4" icon={ArrowRight} iconPosition="right">
              {user ? 'Open Live Tactical Map' : 'Claim Your First Hex'}
            </Button>
          </Link>
          <Link to="/map" className="w-full sm:w-auto">
            <Button variant="secondary" size="lg" className="w-full text-base px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white border-slate-700" icon={Compass}>
              Explore Tactical Map
            </Button>
          </Link>
        </div>

        {/* 3 Value Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-16 lg:mt-24 w-full text-left">
          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/70 backdrop-blur-md shadow-lg">
            <div className="p-3 bg-purple-900/40 text-purple-300 rounded-2xl w-fit border border-purple-500/30 mb-4">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-display font-bold text-white">1. Live GPS Territory Capture</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Real-world GPS movement covers H3 hexagon cells (~100m). Unclaimed cells and rival territories are captured dynamically as you run.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/70 backdrop-blur-md shadow-lg">
            <div className="p-3 bg-accent-lime/10 text-accent-lime rounded-2xl w-fit border border-accent-lime/30 mb-4">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-display font-bold text-white">2. Daily Athletic Objectives</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Every participant receives balanced daily distance and sector goals. Complete objectives to earn athletic XP and rise up the leagues.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/70 backdrop-blur-md shadow-lg">
            <div className="p-3 bg-purple-900/40 text-purple-300 rounded-2xl w-fit border border-purple-500/30 mb-4">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-display font-bold text-white">3. Monotonic Dual Metrics</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Your permanent workout distance and lifetime captured area never decrease, even when opponents contest active map cells.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
