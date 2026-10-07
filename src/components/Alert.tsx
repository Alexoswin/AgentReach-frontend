'use client';

import { useOutreachStore } from '@/store/useOutreachStore';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function Alert() {
  const { alert, clearAlert } = useOutreachStore();

  if (!alert) return null;

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
    error: <AlertCircle className="h-5 w-5 text-rose-400" />,
    info: <Info className="h-5 w-5 text-indigo-400" />,
  };

  const borderColors = {
    success: 'border-emerald-500/25 bg-emerald-950/90 text-emerald-50 shadow-emerald-950/20',
    error: 'border-rose-500/25 bg-rose-950/90 text-rose-50 shadow-rose-950/20',
    info: 'border-indigo-500/25 bg-indigo-950/90 text-indigo-50 shadow-indigo-950/20',
  };

  return (
    // The toast is always a dark surface, so resolve light-dark() tokens
    // (the icon colors) for a dark scheme even under light themes.
    <div className="fixed bottom-6 right-6 z-50 w-[calc(100vw-2rem)] max-w-sm animate-in slide-in-from-bottom-5 fade-in duration-300 [color-scheme:dark] sm:w-full">
      <div
        className={`flex items-start gap-3 rounded-2xl border px-4 py-4 backdrop-blur-md shadow-2xl ${
          borderColors[alert.type]
        }`}
      >
        <div className="mt-0.5 shrink-0">{icons[alert.type]}</div>
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-sm font-bold leading-5">{alert.title}</p>
          <p className="mt-0.5 text-sm leading-5 opacity-90">{alert.message}</p>
        </div>
        <button
          onClick={clearAlert}
          aria-label="Close notification"
          className="shrink-0 rounded-lg p-1 opacity-60 transition hover:bg-black/20 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
