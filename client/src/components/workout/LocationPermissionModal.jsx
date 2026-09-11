import React from 'react';
import { Navigation, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

export default function LocationPermissionModal({
  isOpen,
  onClose,
  onRequestPermission,
  isLoading = false,
  error = null,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="GPS Location Access Required"
      maxWidth="max-w-md"
    >
      <div className="space-y-4 text-slate-200">
        <div className="relative flex items-center justify-center p-6 bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent" />
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-400 shadow-xl shadow-cyan-950/50">
            <Navigation className="w-8 h-8 animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-bold text-white">Why does GeoFit need your GPS?</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            GeoFit converts your real-world outdoor movement into multiplayer territory on the tactical map. High-accuracy GPS is required to:
          </p>
          <ul className="text-xs text-slate-300 space-y-1.5 pl-1">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Detect which H3 geographical hexagons you conquer live.</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Accurately record your workout distance, pace, and calories.</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Compete in uniform 24H daily challenges & leaderboards.</span>
            </li>
          </ul>
        </div>

        <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-[11px] text-slate-300 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-white">Privacy Guarantee:</strong> Other users only see public territory ownership, never your live GPS coordinates or breadcrumb routes.
          </span>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-xs text-rose-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Permission Notice</span>
            </div>
            <p className="text-[11px] leading-relaxed">{error.message}</p>
            {error.code === 'PERMISSION_DENIED' && (
              <p className="text-[10px] text-slate-400 mt-1">
                Tip: Click the padlock / location icon in your browser address bar to allow location access, then retry.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2.5 pt-2">
          <Button variant="secondary" size="md" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            icon={Navigation}
            onClick={onRequestPermission}
            isLoading={isLoading}
          >
            Allow Location & Start
          </Button>
        </div>
      </div>
    </Modal>
  );
}
