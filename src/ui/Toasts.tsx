import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type Toast = { id: string; text: string; tone?: 'good' | 'bad' | 'neutral' };
type ToastFn = (t: Omit<Toast, 'id'>) => void;

const ToastContext = createContext<{ push: ToastFn }>({ push: () => {} });

export function ToastsProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback<ToastFn>((t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((v) => [...v, { ...t, id }]);
    setTimeout(() => setToasts((v) => v.filter((x) => x.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-3 py-2 rounded shadow-lg text-sm ${
              t.tone === 'good'
                ? 'bg-emerald-600 text-white'
                : t.tone === 'bad'
                ? 'bg-rose-600 text-white'
                : 'bg-neutral-800 text-white'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToasts() {
  return useContext(ToastContext);
}

// Legacy global toast for old code
export const Toasts = () => {
  const [s, setS] = useState<any[]>([]);
  React.useEffect(() => {
    (window as any).dmToast = (c: any) => {
      const id = Math.random().toString(36).slice(2);
      setS((v) => [...v, { id, c }]);
      setTimeout(() => setS((v) => v.filter((x) => x.id !== id)), 3000);
    };
  }, []);
  return (
    <div className="fixed bottom-4 right-4 space-y-2">
      {s.map((t) => (
        <div key={t.id} className="bg-black text-white px-3 py-2 rounded">
          {t.c}
        </div>
      ))}
    </div>
  );
};
