import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, User, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../lib/toast.jsx';
import Button from '../components/ui/Button.jsx';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card.jsx';

const DEMO_ACCOUNTS = [
  { username: 'shivaraj', name: 'Shivaraj', avatar: '⚡', role: 'Lv.12 Runner' },
  { username: 'rahul', name: 'Rahul', avatar: '🔥', role: 'Lv.14 Runner' },
  { username: 'priya', name: 'Priya', avatar: '🌿', role: 'Lv.9 Runner' },
  { username: 'alex', name: 'Alex Cyber', avatar: '👾', role: 'Lv.11 Runner' },
];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Automatically redirect if already logged in or when auth state hydrates
  useEffect(() => {
    if (user?.id) {
      navigate('/dashboard', { replace: true });
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
      navigate('/dashboard', { replace: true });
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
      navigate('/dashboard', { replace: true });
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
        <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center shadow-md shadow-purple-600/20">
          <Shield className="w-5 h-5 text-white stroke-[2.5]" />
        </div>
        <span className="font-black text-2xl tracking-tight text-slate-900">
          Geo<span className="text-purple-600">Fit</span>
        </span>
      </Link>

      <div className="w-full max-w-md relative z-10 space-y-4">
        <Card variant="glass" className="border-slate-200 shadow-xl bg-white">
          <CardHeader className="border-b border-slate-100">
            <div>
              <CardTitle className="text-lg text-slate-900 font-bold">ATHLETE SIGN IN</CardTitle>
              <CardDescription className="text-slate-500">Enter your credentials or use 1-click instant demo below.</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Username</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. shivaraj"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-purple-600 focus:bg-white font-medium placeholder:text-slate-400 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-purple-600 focus:bg-white font-medium placeholder:text-slate-400 transition-colors"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                className="w-full text-sm font-bold mt-2"
                icon={ArrowRight}
                iconPosition="right"
              >
                Sign In
              </Button>
            </form>

            {/* Quick 1-Click Demo Profiles */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>1-Click Instant Demo Access</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.username}
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleQuickDemoLogin(acc.username)}
                    className="flex items-center gap-2 p-2.5 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-xl text-left transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <span className="text-xl">{acc.avatar}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{acc.name}</div>
                      <div className="text-[10px] text-purple-600 font-mono truncate">@{acc.username}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Register Prompt */}
        <p className="text-center text-xs text-slate-500">
          New to GeoFit?{' '}
          <Link to="/register" className="text-purple-600 font-bold hover:underline">
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
}
