import React, { createContext, useContext, useState, useCallback } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toastOrMessage, type = 'info', duration = 4000) => {
    let newToast;
    if (typeof toastOrMessage === 'object' && toastOrMessage !== null) {
      newToast = {
        id: Date.now() + Math.random().toString(36).slice(2, 6),
        duration: toastOrMessage.duration || duration,
        type: toastOrMessage.type || 'info',
        title: toastOrMessage.title || '',
        message: toastOrMessage.message || '',
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

  const conquest = useCallback((message, title = '') => {
    addToast({ message, title, type: 'conquest' });
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
      <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl border bg-white shadow-xl text-slate-900 border-slate-200 transition-all duration-150"
          >
            {toast.type === 'conquest' && <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />}
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />}

            <div className="flex-1 text-sm">
              {toast.title && <div className="font-bold text-slate-900">{toast.title}</div>}
              {toast.message && <div className="text-xs text-slate-600 mt-0.5 font-medium">{toast.message}</div>}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-700 p-1 transition-colors"
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
    const noop = () => {};
    return {
      addToast: noop,
      removeToast: noop,
      success: noop,
      error: noop,
      warning: noop,
      info: noop,
      conquest: noop,
    };
  }
  return {
    ...context,
    toast: context,
  };
}
