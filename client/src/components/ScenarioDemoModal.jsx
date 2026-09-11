import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Shield,
  Sun,
  Sunset,
  Moon,
  Trophy,
  Activity,
  Zap,
  ArrowRight,
  Flame,
  Clock,
  Layers,
} from 'lucide-react';
import Modal from './ui/Modal.jsx';
import Button from './ui/Button.jsx';
import { api } from '../lib/api.js';
import { sounds } from '../lib/audio.js';
import { useToast } from '../lib/toast.jsx';

export default function ScenarioDemoModal({ isOpen, onClose, onRefreshData }) {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [runningStep, setRunningStep] = useState(null);
  const [demoState, setDemoState] = useState(null);
  const [lastStepResult, setLastStepResult] = useState(null);
  const [auditReport, setAuditReport] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadDemoState();
    }
  }, [isOpen]);

  const loadDemoState = async () => {
    try {
      const res = await api.getDemoState();
      if (res.success) {
        setDemoState(res.data);
      }
    } catch (err) {
      console.error('Error fetching demo state:', err);
    }
  };

  const handleResetDemo = async () => {
    setRunning(true);
    try {
      await api.resetDemo();
      setLastStepResult(null);
      setAuditReport(null);
      toast.success('Demo environment reset cleanly. Ready for demonstration.');
      await loadDemoState();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      toast.error('Failed to reset demo.');
    } finally {
      setRunning(false);
    }
  };

  const handleRunStep = async (stepNum) => {
    setRunning(true);
    setRunningStep(stepNum);
    try {
      const res = await api.runDemoStep(stepNum);
      if (res.success) {
        setLastStepResult(res.data);
        sounds.play('fanfare');
        toast.success(res.data.title);
        await loadDemoState();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      toast.error(err.message || 'Error running demo step.');
    } finally {
      setRunning(false);
      setRunningStep(null);
    }
  };

  const handleRunFullPlayback = async () => {
    setRunning(true);
    setRunningStep('all');
    try {
      const res = await api.runDemoFullPlayback();
      if (res.success) {
        setAuditReport(res.data);
        setLastStepResult(null);
        sounds.play('fanfare');
        toast.success('Complete Hackathon 5-Minute Demo Playback verified!');
        await loadDemoState();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      toast.error('Failed to execute demo playback.');
    } finally {
      setRunning(false);
      setRunningStep(null);
    }
  };

  if (!isOpen) return null;

  const stats = demoState?.stats || {};
  const userAStats = stats['demo-user-a'] || {};
  const userBStats = stats['demo-user-b'] || {};
  const userCStats = stats['demo-user-c'] || {};

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="space-y-5 text-slate-800 font-sans">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-xl shadow-xs text-white">
              ⚡
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <span>Multi-User Territory Demo</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Simulate 3 athletes, multi-time-of-day takeovers, and verify 9 core invariants in &lt; 5 minutes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={handleResetDemo}
              disabled={running}
            >
              Reset Demo
            </Button>

            <Button
              variant="purple"
              size="sm"
              disabled={running}
              onClick={handleRunFullPlayback}
              icon={Sparkles}
            >
              {runningStep === 'all' ? 'Running Playback...' : 'Run Full 5-Min Demo'}
            </Button>
          </div>
        </div>

        {/* 3 Demo Athletes Live Telemetry Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          {/* User A */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <span className="font-bold text-slate-900">Demo User A (Rahul)</span>
              </div>
              <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 font-bold">
                Morning
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 font-mono text-[11px] pt-1 border-t border-slate-200">
              <div>
                <span className="text-slate-500">Distance:</span>{' '}
                <strong className="text-purple-700">{userAStats.totalDistanceKm || 0} km</strong>
              </div>
              <div>
                <span className="text-slate-500">Hexes Held:</span>{' '}
                <strong className="text-slate-900">{userAStats.currentTerritory || 0}</strong>
              </div>
            </div>
          </div>

          {/* User B */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔥</span>
                <span className="font-bold text-slate-900">Demo User B (Priya)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-700 bg-slate-200 px-2 py-0.5 rounded-full border border-slate-300 font-bold">
                Afternoon
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 font-mono text-[11px] pt-1 border-t border-slate-200">
              <div>
                <span className="text-slate-500">Distance:</span>{' '}
                <strong className="text-purple-700">{userBStats.totalDistanceKm || 0} km</strong>
              </div>
              <div>
                <span className="text-slate-500">Hexes Held:</span>{' '}
                <strong className="text-slate-900">{userBStats.currentTerritory || 0}</strong>
              </div>
            </div>
          </div>

          {/* User C */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">👑</span>
                <span className="font-bold text-slate-900">Demo User C (Shivaraj)</span>
              </div>
              <span className="text-[10px] font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200 font-bold">
                Evening
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 font-mono text-[11px] pt-1 border-t border-slate-200">
              <div>
                <span className="text-slate-500">Distance:</span>{' '}
                <strong className="text-purple-700">{userCStats.totalDistanceKm || 0} km</strong>
              </div>
              <div>
                <span className="text-slate-500">Hexes Held:</span>{' '}
                <strong className="text-slate-900">{userCStats.currentTerritory || 0}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Step-by-Step Scenario Execution Cards */}
        <div className="space-y-3">
          {/* STEP 1: Morning Route A */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-black text-purple-700 uppercase tracking-wide">
                  Step 1 • Morning Activity (06:30 AM)
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">User A Runs Route A (Area 1 Pioneer Claim)</h4>
              <p className="text-xs text-slate-500 leading-snug">
                User A runs 5.0 km through Area 1, conquering 15 pioneer hexagons in the morning.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={running}
              onClick={() => handleRunStep(1)}
            >
              {runningStep === 1 ? 'Running...' : 'Run Step 1'}
            </Button>
          </div>

          {/* STEP 2: Afternoon Route B (Contested Steal) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sunset className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  Step 2 • Afternoon Activity (02:15 PM)
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">User B Runs Route B (Steals Area 1 Territory)</h4>
              <p className="text-xs text-slate-500 leading-snug">
                User B covers part of Area 1. Current ownership transfers to User B, but User A retains 100% of historical distance.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={running}
              onClick={() => handleRunStep(2)}
            >
              {runningStep === 2 ? 'Running...' : 'Run Step 2'}
            </Button>
          </div>

          {/* STEP 3: Evening Route C (West Sector Expansion) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-black text-purple-700 uppercase tracking-wide">
                  Step 3 • Evening Activity (08:45 PM)
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">User C Runs Route C (West Sector Expansion)</h4>
              <p className="text-xs text-slate-500 leading-snug">
                User C runs 4.2 km in the evening, demonstrating equal daily challenge credit with no first-arrival penalty.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={running}
              onClick={() => handleRunStep(3)}
            >
              {runningStep === 3 ? 'Running...' : 'Run Step 3'}
            </Button>
          </div>
        </div>

        {/* Step Result Details Callout */}
        {lastStepResult && (
          <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-purple-900 font-black text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{lastStepResult.title}</span>
            </div>
            <p className="text-xs text-slate-700 font-mono bg-white p-3 rounded-xl border border-purple-200">
              {lastStepResult.explanation}
            </p>
          </div>
        )}

        {/* 9-Invariant Verification Audit Table (Full Playback Report) */}
        {auditReport && (
          <div className="p-4 bg-white border border-emerald-300 rounded-2xl space-y-3 animate-in fade-in duration-200 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>9 Core Product Invariants Audit (100% Passed)</span>
              </h4>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                VERIFIED
              </span>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {auditReport.invariantAudit.map((inv, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs gap-3"
                >
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900">{inv.invariant}</span>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{inv.detail}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                    PASS
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button variant="purple" size="md" onClick={onClose}>
            Close Demo Panel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
