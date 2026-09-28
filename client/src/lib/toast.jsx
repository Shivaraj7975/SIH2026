import React, { createContext, useContext, useState, useCallback } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, XCircle, Info, X, Zap } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toastOrMessage, type = 'info', duration = 5000) => {
    let newToast;
    if (typeof toastOrMessage === 'object' && toastOrMessage !== null) {
      newToast = {
        id: Date.now() + Math.random().toString(36).slice(2, 6),
        duration: toastOrMessage.duration || duration,
        type: toastOrMessage.type || 'info',
        title: toastOrMessage.title || '',
        message: toastOrMessage.message || '',
        actionLabel: toastOrMessage.actionLabel,
        onAction: toastOrMessage.onAction,
        colorDot: toastOrMessage.colorDot,
      };
    } else {
      newToast = {
        id: Date.now() + Math.random().toString(36).slice(2, 6),
        duration,
        type,
        title: '',
        message: String(toastOrMessage || ''),
      };
    }

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, newToast.duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message, title = '') => {
    addToast({ message, title, type: 'success' });
  }, [addToast]);

  const error = useCallback((message, title = '') => {
    addToast({ message, title, type: 'error' });
  }, [addToast]);

  const warning = useCallback((message, title = '') => {
    addToast({ message, title, type: 'warning' });
  }, [addToast]);

  const info = useCallback((message, title = '') => {
    addToast({ message, title, type: 'info' });
  }, [addToast]);

  const conquest = useCallback((message, title = '', colorDot = '#7C3AED') => {
    addToast({ message, title, type: 'conquest', colorDot });
  }, [addToast]);

  const contextValue = {
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    conquest,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none font-sans">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border bg-white/95 backdrop-blur-md shadow-lg text-text-primary transition-all duration-200 animate-in slide-in-from-top-3 ${
              toast.type === 'conquest' || toast.type === 'warning'
                ? 'border-l-4 border-l-amber-500 border-border'
                : toast.type === 'success'
                ? 'border-l-4 border-l-accent-lime border-border'
                : toast.type === 'error'
                ? 'border-l-4 border-l-danger border-border'
                : 'border-border'
            }`}
          >
            {toast.colorDot ? (
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5 border border-white shadow-xs"
                style={{ backgroundColor: toast.colorDot }}
              />
            ) : (
              <>
                {toast.type === 'conquest' && <Sparkles className="w-5 h-5 text-brand shrink-0 mt-0.5" />}
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
                {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
                {toast.type === 'error' && <XCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-brand shrink-0 mt-0.5" />}
              </>
            )}

            <div className="flex-1 text-xs">
              {toast.title && <div className="font-bold font-display text-text-primary">{toast.title}</div>}
              {toast.message && <div className="text-text-secondary mt-0.5 font-medium leading-relaxed">{toast.message}</div>}

              {toast.actionLabel && (
                <button
                  type="button"
                  onClick={() => {
                    if (toast.onAction) toast.onAction();
                    removeToast(toast.id);
                  }}
                  className="mt-2 text-[11px] font-black uppercase text-brand hover:text-brand-hover tracking-wider underline cursor-pointer"
                >
                  {toast.actionLabel}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-text-muted hover:text-text-primary p-1 transition-colors cursor-pointer"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      success: (m) => console.log('Toast:', m),
      error: (m) => console.error('Toast Error:', m),
      warning: (m) => console.warn('Toast Warning:', m),
      info: (m) => console.log('Toast Info:', m),
      conquest: (m) => console.log('Toast Conquest:', m),
      addToast: () => {},
      removeToast: () => {},
    };
  }
  return context;
}
