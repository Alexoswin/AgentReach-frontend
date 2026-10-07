import { AlertTriangle, Info, Lightbulb, ShieldAlert } from 'lucide-react';
import type { DocCallout as DocCalloutData } from '@/lib/docs';

const CALLOUT_STYLES = {
  info: {
    icon: Info,
    border: 'border-sky-500/20',
    background: 'bg-sky-500/10',
    iconColor: 'text-sky-400',
  },
  tip: {
    icon: Lightbulb,
    border: 'border-indigo-500/20',
    background: 'bg-indigo-500/10',
    iconColor: 'text-indigo-400',
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-amber-500/20',
    background: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
  },
  danger: {
    icon: ShieldAlert,
    border: 'border-rose-500/20',
    background: 'bg-rose-500/10',
    iconColor: 'text-rose-400',
  },
} as const;

export default function DocCallout({ callout }: { callout: DocCalloutData }) {
  const style = CALLOUT_STYLES[callout.tone];
  const Icon = style.icon;

  return (
    <div className={`mt-5 flex gap-3 rounded-2xl border p-4 ${style.border} ${style.background}`}>
      <Icon className={`mt-0.5 h-4 w-4 flex-none ${style.iconColor}`} aria-hidden="true" />
      <div>
        <p className="text-sm font-bold text-white">{callout.title}</p>
        <p className="mt-1 text-sm leading-6 text-zinc-300">{callout.text}</p>
      </div>
    </div>
  );
}
