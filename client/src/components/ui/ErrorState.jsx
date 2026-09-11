import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

export function ErrorState({
  title = 'Telemetry Error',
  message = 'Failed to load sector data. Please verify your connection.',
  onRetry = null,
  height = 'min-h-[240px]',
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center gap-3 p-8 rounded-2xl glass-panel border-rose-500/30 ${height} ${className}`}
    >
      <div className="p-3 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/30">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-black text-white">{title}</h4>
      <p className="text-xs text-slate-400 max-w-sm">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          icon={RefreshCw}
          className="mt-2"
        >
          Retry Connection
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
