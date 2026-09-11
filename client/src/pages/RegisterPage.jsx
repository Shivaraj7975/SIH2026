import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, User, Lock, Tag, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../lib/toast.jsx';
import Button from '../components/ui/Button.jsx';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card.jsx';

const AVATAR_OPTIONS = ['⚡', '🔥', '🌿', '👾', '🚀', '🐺', '🐯', '💎', '🎯', '🦅'];

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('⚡');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (user?.id) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleRegister = async (e) => {
    e?.preventDefault();
    if (!username.trim() || !displayName.trim() || !password) {
      toast?.error?.('Please fill in all registration fields');
      return;
    }

    setIsLoading(true);
    try {
      const loggedUser = await register({
        username: username.trim(),
        displayName: displayName.trim(),
        avatar,
        password,
      });
      try {
        toast?.success?.(`Account created! Welcome, ${loggedUser?.displayName || loggedUser?.username}!`);
      } catch (_) {}
      navigate('/dashboard', { replace: true });
    } catch (err) {
      try {
        toast?.error?.(err.message || 'Registration failed');
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
        <span className="font-black text-2xl tracking-tight text-slate-900 font-sans">
          Geo<span className="text-purple-600">Fit</span>
        </span>
      </Link>

      <div className="w-full max-w-md relative z-10 space-y-4">
        <Card variant="glass" className="border-slate-200 shadow-xl bg-white">
          <CardHeader className="border-b border-slate-100">
            <div>
              <CardTitle className="text-lg text-slate-900 font-bold">JOIN THE GRID</CardTitle>
              <CardDescription className="text-slate-500">Create your runner identity to start conquering territory.</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-6">
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Avatar Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Choose Avatar</label>
                <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  {AVATAR_OPTIONS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setAvatar(em)}
                      className={`w-9 h-9 text-lg rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        avatar === em
                          ? 'bg-purple-100 border-2 border-purple-600 scale-110 shadow-sm'
                          : 'bg-white border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Display Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Display Name</label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Shivaraj Kumar"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-purple-600 focus:bg-white font-medium placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Username (Login ID)</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. shivaraj"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-purple-600 focus:bg-white font-medium placeholder:text-slate-400 font-mono"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-purple-600 focus:bg-white font-medium placeholder:text-slate-400"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                className="w-full text-sm font-bold mt-2"
                icon={Sparkles}
              >
                Create Account & Join
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Login Prompt */}
        <p className="text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-purple-600 font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
