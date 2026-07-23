import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';

export interface ConfirmationOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning' | 'secure';
}

interface PendingConfirmation extends ConfirmationOptions {
  resolve: (accepted: boolean) => void;
}

const ConfirmationContext = createContext<
  ((options: ConfirmationOptions) => Promise<boolean>) | undefined
>(undefined);

export function useConfirmation() {
  const confirm = useContext(ConfirmationContext);
  if (!confirm) throw new Error('useConfirmation must be used within ConfirmationProvider.');
  return confirm;
}

export const ConfirmationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const safeButtonRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((options: ConfirmationOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending((current) => {
        current?.resolve(false);
        return { ...options, resolve };
      });
      window.setTimeout(() => safeButtonRef.current?.focus(), 0);
    });
  }, []);

  const settle = useCallback((accepted: boolean) => {
    setPending((current) => {
      current?.resolve(accepted);
      return null;
    });
  }, []);

  const tone = pending?.tone ?? 'warning';
  const toneClasses = {
    danger: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    secure: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  }[tone];

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center overflow-y-auto bg-slate-950/90 p-3 backdrop-blur-xl sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) settle(false);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirmation-title"
            aria-describedby="confirmation-message"
            className="my-auto w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl sm:p-8"
            onKeyDown={(event) => {
              if (event.key === 'Escape') settle(false);
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${toneClasses}`}>
                {tone === 'secure' ? <ShieldCheck size={22} /> : <AlertTriangle size={22} />}
              </div>
              <button
                type="button"
                onClick={() => settle(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/5 hover:text-white"
                aria-label="Close confirmation"
              >
                <X size={20} />
              </button>
            </div>

            <h2 id="confirmation-title" className="mt-6 text-xl font-extrabold tracking-tight text-white sm:text-2xl">
              {pending.title}
            </h2>
            <p id="confirmation-message" className="mt-3 text-sm leading-6 text-slate-400">
              {pending.message}
            </p>

            <div className="mt-8 flex flex-col-reverse gap-3 min-[380px]:grid min-[380px]:grid-cols-2">
              <button
                ref={safeButtonRef}
                type="button"
                onClick={() => settle(false)}
                className="min-h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-slate-200 transition hover:bg-white/10"
              >
                {pending.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => settle(true)}
                className={`min-h-12 rounded-xl px-4 text-sm font-bold text-white transition active:scale-[0.98] ${
                  tone === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : tone === 'secure'
                      ? 'bg-blue-600 hover:bg-blue-500'
                      : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                {pending.confirmLabel ?? 'Continue'}
              </button>
            </div>
          </section>
        </div>
      )}
    </ConfirmationContext.Provider>
  );
};
