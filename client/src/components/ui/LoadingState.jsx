import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingState({
  message = 'Loading grid telemetry...',
  height = 'min-h-[240px]',
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 p-8 rounded-2xl glass-panel text-cyan-400 font-mono text-xs ${height} ${className}`}
    >
      <div className="relative flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
        <div className="absolute w-5 h-5 bg-cyan-500/20 rounded-full animate-ping" />
      </div>
      <span className="tracking-wide">{message}</span>
    </div>
  );
}

export default LoadingState;
