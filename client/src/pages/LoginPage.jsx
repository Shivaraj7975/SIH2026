import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../lib/toast.jsx';
import Button from '../components/ui/Button.jsx';

const DEMO_ACCOUNTS = [
  { username: 'shivaraj', name: 'Shivaraj', avatar: '⚡', role: 'Lv.12 Runner', color: '#7C3AED' },
  { username: 'rahul', name: 'Rahul', avatar: '🔥', role: 'Lv.14 Runner', color: '#F97316' },
  { username: 'priya', name: 'Priya', avatar: '🌿', role: 'Lv.9 Runner', color: '#10B981' },
  { username: 'alex', name: 'Alex Cyber', avatar: '👾', role: 'Lv.11 Runner', color: '#06B6D4' },
];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if authenticated
  useEffect(() => {
    if (user?.id) {
      navigate('/map', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!username.trim() || !password) {
      toast?.error?.('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    try {
      const loggedUser = await login(username.trim(), password);
      try {
        toast?.success?.(`Welcome back, ${loggedUser?.displayName || loggedUser?.username || 'Athlete'}!`);
      } catch (_) {}
      navigate('/map', { replace: true });
    } catch (err) {
      try {
        toast?.error?.(err.message || 'Login failed');
      } catch (_) {}
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoUsername) => {
    setUsername(demoUsername);
    setPassword('password123');
    setIsLoading(true);
    try {
      const loggedUser = await login(demoUsername, 'password123');
      try {
        toast?.success?.(`Logged in as ${loggedUser?.displayName || demoUsername}!`);
      } catch (_) {}
      navigate('/map', { replace: true });
    } catch (err) {
      try {
        toast?.error?.(err.message || 'Demo login failed');
      } catch (_) {}
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Brand Header */}
      <Link to="/" className="flex items-center gap-2.5 mb-6 group relative z-10">
        <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center shadow-md shadow-purple-600/20 transition-transform group-hover:scale-105">
          <Shield className="w-5 h-5 text-white stroke-[2.5]" />
        </div>
        <span className="font-black text-2xl tracking-tight text-slate-900 font-sans">
          Geo<span className="text-purple-600">Fit</span>
        </span>
      </Link>

      <div className="w-full max-w-lg relative z-10 space-y-4">
        {/* Main Sign-In Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Card Header */}
          <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 uppercase tracking-tight">Athlete Sign In</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter any username &amp; password, or select an instant demo profile.
              </p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
              <span>H3 GRID</span>
            </span>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Quick Demo Athletes */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Instant 1-Click Demo Profiles:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => handleQuickDemoLogin(acc.username)}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-purple-50/60 hover:border-purple-300 shadow-xs hover:shadow-sm transition-all text-left cursor-pointer group active:scale-[0.98]"
                  >
                    <div
                      className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-sm shadow-xs border-2 shrink-0"
                      style={{ borderColor: acc.color }}
                    >
                      {acc.avatar}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate group-hover:text-purple-600">{acc.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">{acc.role}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center py-1">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 absolute">
                or enter any credentials
              </span>
            </div>

            {/* Credentials Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Username (Login ID)</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. shivaraj or your name"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-purple-600 focus:bg-white font-medium placeholder:text-slate-400 font-mono transition-colors shadow-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter any password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-purple-600 focus:bg-white font-medium placeholder:text-slate-400 transition-colors shadow-xs"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                className="w-full text-sm font-bold shadow-md shadow-purple-600/20 mt-2"
                icon={ArrowRight}
                iconPosition="right"
              >
                Sign In &amp; Launch Grid
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
