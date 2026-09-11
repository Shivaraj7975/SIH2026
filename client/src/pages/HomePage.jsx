import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Shield, Sparkles, MapPin, Trophy, Target, ArrowRight, Zap, Flame, Compass } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-cyan-500/15 via-blue-600/5 to-transparent blur-3xl pointer-events-none" />

      <header className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <Shield className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="font-black text-xl tracking-tight text-white font-sans">
            Geo<span className="text-cyan-400">Fit</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <Link to="/dashboard">
              <Button variant="primary" size="sm" icon={ArrowRight} iconPosition="right">
                Open Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm" icon={Sparkles}>
                  Join Grid
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 lg:py-20 flex flex-col items-center text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold mb-6 shadow-lg shadow-cyan-500/10">
          <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>REAL-WORLD MULTIPLAYER FITNESS STRATEGY</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl leading-[1.1]">
          Conquer Your City. <br />
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            One Run at a Time.
          </span>
        </h1>

        <p className="mt-6 text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
          GeoFit transforms your everyday walks and runs into an interactive territory-capture game.
          Move through real-world streets, conquer geographical hexagon sectors on a live map, and compete on historical fitness leaderboards.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link to={user ? '/dashboard' : '/register'} className="w-full sm:w-auto">
            <Button variant="primary" size="lg" className="w-full text-base px-8 py-4" icon={ArrowRight} iconPosition="right">
              {user ? 'Go to Dashboard' : 'Claim Your First Sector'}
            </Button>
          </Link>
          <Link to="/map" className="w-full sm:w-auto">
            <Button variant="secondary" size="lg" className="w-full text-base px-8 py-4" icon={Compass}>
              Explore Live Map
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-16 lg:mt-24 w-full text-left">
          <Card variant="glass" className="p-6 hover:border-cyan-500/40 transition-all">
            <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl w-fit border border-cyan-500/30 mb-4">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">1. Live GPS Territory Capture</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Real-world GPS movement covers H3 hexagon cells (~100m). Unoccupied cells and rival sectors are captured dynamically as you move.
            </p>
          </Card>

          <Card variant="glass" className="p-6 hover:border-amber-500/40 transition-all">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl w-fit border border-amber-500/30 mb-4">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">2. Uniform 24H Challenges</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Every participant receives the same daily challenge (distance, calories, sectors). Complete objectives to earn bonus XP and climb the standings.
            </p>
          </Card>

          <Card variant="glass" className="p-6 hover:border-rose-500/40 transition-all">
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-2xl w-fit border border-rose-500/30 mb-4">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">3. Historical Effort Ranks</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Leaderboards are powered by authentic workout distance. Your historical exercise metrics are never lost when sectors change ownership.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
