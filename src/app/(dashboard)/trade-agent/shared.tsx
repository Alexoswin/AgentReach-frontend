"use client";

import { AlertTriangle, FlaskConical, Radio, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { ExecutionMode } from "@/lib/trade-agent-types";

export type { ExecutionMode };

/**
 * Paper and live must never be confusable at a glance, so the mode drives a
 * whole colour family rather than a small label.
 */
export const MODE_STYLES: Record<
  ExecutionMode,
  { label: string; blurb: string; ring: string; text: string; bg: string }
> = {
  paper: {
    label: "Paper",
    blurb: "Simulated fills. Nothing is sent to the broker.",
    ring: "border-sky-500/30",
    text: "text-sky-300",
    bg: "bg-sky-500/10",
  },
  approval: {
    label: "Approval",
    blurb: "Real orders, but only after you approve each one.",
    ring: "border-amber-500/30",
    text: "text-amber-300",
    bg: "bg-amber-500/10",
  },
  auto: {
    label: "Autonomous",
    blurb: "Real orders placed without a human in the loop.",
    ring: "border-rose-500/40",
    text: "text-rose-300",
    bg: "bg-rose-500/10",
  },
};

export function ModeBanner({ mode }: { mode?: string }) {
  const style = MODE_STYLES[(mode as ExecutionMode) || "paper"] ?? MODE_STYLES.paper;
  const Icon =
    mode === "auto" ? Radio : mode === "approval" ? ShieldCheck : FlaskConical;

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border ${style.ring} ${style.bg} px-4 py-3`}
    >
      <Icon className={`h-5 w-5 flex-none ${style.text}`} />
      <div>
        <p className={`text-sm font-bold ${style.text}`}>
          {style.label} mode
        </p>
        <p className="text-[11px] text-zinc-400">{style.blurb}</p>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  icon,
  actions,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-900 pb-5">
      <div>
        <h2 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white">
          {icon}
          {title}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">{description}</p>
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-zinc-850 bg-zinc-900/40 p-6 shadow-xl ${className}`}
    >
      {title ? (
        <h3 className="mb-4 border-b border-zinc-800/60 pb-3 text-base font-bold text-white">
          {title}
        </h3>
      ) : null}
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "good" | "bad";
  hint?: string;
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-400"
      : tone === "bad"
        ? "text-rose-400"
        : "text-white";

  return (
    <div className="rounded-xl border border-zinc-850 bg-zinc-950/60 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${toneClass}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-zinc-600">{hint}</p> : null}
    </div>
  );
}

/** Blockers are the most useful thing on a screen for a system that can't run. */
export function BlockerList({ blockers }: { blockers: string[] }) {
  if (!blockers.length) return null;

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <p className="text-sm font-bold text-amber-300">
          {blockers.length} thing{blockers.length === 1 ? "" : "s"} blocking the desk
        </p>
      </div>
      <ul className="space-y-1.5 pl-6">
        {blockers.map((blocker) => (
          <li
            key={blocker}
            className="list-disc text-[12px] leading-relaxed text-amber-200/80"
          >
            {blocker}
          </li>
        ))}
      </ul>
    </div>
  );
}

const STATUS_TONES: Record<string, string> = {
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  EXECUTED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  OPEN: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  RUNNING: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  PENDING: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  AWAITING_APPROVAL: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  PROPOSED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  ABORTED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  EXPIRED: "bg-zinc-800 text-zinc-400 border-zinc-700",
  DECLINED: "bg-zinc-800 text-zinc-400 border-zinc-700",
  CANCELLED: "bg-zinc-800 text-zinc-400 border-zinc-700",
  REJECTED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  INVALID: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  FAILED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export function StatusBadge({ status }: { status?: string }) {
  const tone = STATUS_TONES[status || ""] || "bg-zinc-800 text-zinc-400 border-zinc-700";
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide ${tone}`}
    >
      {(status || "UNKNOWN").replace(/_/g, " ")}
    </span>
  );
}

export function money(value: unknown) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return "—";
  return parsed.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

export function when(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}
