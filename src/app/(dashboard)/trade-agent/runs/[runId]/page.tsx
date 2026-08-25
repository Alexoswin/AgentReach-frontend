"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, ChevronUp, ScrollText } from "lucide-react";
import { api } from "@/lib/api";
import { Card, PageHeader, StatusBadge, money, when } from "../../shared";
import {
  totalTokens,
  type AgentMessage,
  type OrderIntent,
  type RunDetail,
  type TradeSignal,
  type WorkerSummary,
} from "@/lib/trade-agent-types";

/**
 * A run's full audit trail. This screen exists so that a decision made months
 * ago can be reconstructed: what state the master saw, which workers it ran,
 * what they said, and why an order was or wasn't proposed.
 */
export default function RunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = use(params);
  const [openTurn, setOpenTurn] = useState<string | null>(null);

  const { data, isLoading } = useQuery<RunDetail>({
    queryKey: ["trade-agent", "run", runId],
    queryFn: () => api.tradeAgent.run(runId),
  });

  if (isLoading) {
    return (
      <div className="h-96 animate-pulse rounded-2xl border border-zinc-850 bg-zinc-900" />
    );
  }

  if (!data?.run) {
    return (
      <Card>
        <p className="text-sm text-zinc-500">Run not found.</p>
      </Card>
    );
  }

  const { run, transcript, signals, intents } = data;

  return (
    <div className="max-w-5xl space-y-6">
      <Link
        href="/trade-agent/runs"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 transition-colors hover:text-zinc-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All runs
      </Link>

      <PageHeader
        title={`${run.trigger} cycle`}
        description={run.summary || run.error || "No summary recorded."}
        icon={<ScrollText className="h-8 w-8 text-violet-400" />}
        actions={<StatusBadge status={run.status} />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat label="Mode" value={run.mode} />
        <MiniStat label="Turns" value={run.iterations || 0} />
        <MiniStat
          label="Tokens"
          value={totalTokens(run.tokenUsage).toLocaleString()}
        />
        <MiniStat label="Started" value={when(run.startedAt)} />
      </div>

      {run.workerSummaries?.length ? (
        <Card title="Workers dispatched">
          <div className="space-y-2.5">
            {run.workerSummaries.map((worker: WorkerSummary, index: number) => (
              <div
                key={`${worker.worker}-${index}`}
                className="rounded-xl border border-zinc-850 bg-zinc-950/60 p-3.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-zinc-200">
                    {worker.worker}
                  </span>
                  <span className="flex items-center gap-2 text-[11px] text-zinc-500">
                    {worker.signals} signal(s) · {worker.durationMs}ms
                    <StatusBadge status={worker.status?.toUpperCase()} />
                  </span>
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-400">
                  {worker.error || worker.summary}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {intents?.length ? (
        <Card title="Proposals from this run">
          <div className="space-y-2.5">
            {intents.map((intent: OrderIntent) => (
              <div
                key={intent.id}
                className="rounded-xl border border-zinc-850 bg-zinc-950/60 p-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-zinc-200">
                    {intent.transactionType} {intent.quantity} ×{" "}
                    {intent.tradingSymbol}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] tabular-nums text-zinc-500">
                      {money(intent.notional)}
                    </span>
                    <StatusBadge status={intent.status} />
                  </span>
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-400">
                  {intent.statusReason || intent.rationale}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {signals?.length ? (
        <Card title={`Signals (${signals.length})`}>
          <div className="space-y-2">
            {signals.map((signal: TradeSignal) => (
              <div
                key={signal.id}
                className="flex items-start justify-between gap-4 border-b border-zinc-900/60 pb-2 last:border-0"
              >
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-zinc-200">
                    {signal.direction} {signal.tradingSymbol}
                  </span>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-zinc-500">
                    {signal.rationale}
                  </p>
                </div>
                <span className="flex-none text-[11px] tabular-nums text-zinc-600">
                  {signal.worker} · {(signal.confidence * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card title={`Transcript (${transcript?.length || 0} turns)`}>
        <div className="space-y-2">
          {transcript?.map((turn: AgentMessage) => {
            const expanded = openTurn === turn.id;
            return (
              <div
                key={turn.id}
                className="rounded-xl border border-zinc-850 bg-zinc-950/60"
              >
                <button
                  type="button"
                  onClick={() => setOpenTurn(expanded ? null : turn.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="font-mono text-[11px] text-zinc-600">
                      #{turn.seq}
                    </span>
                    <span className="text-sm font-semibold text-zinc-200">
                      {turn.agent}
                    </span>
                    <span className="text-[11px] text-zinc-600">
                      {turn.model}
                    </span>
                  </span>
                  <span className="flex items-center gap-2.5 text-[11px] text-zinc-500">
                    {turn.error ? (
                      <span className="text-rose-400">error</span>
                    ) : (
                      <span>{turn.stopReason}</span>
                    )}
                    <span className="tabular-nums">{turn.durationMs}ms</span>
                    {expanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </span>
                </button>

                {expanded ? (
                  <div className="space-y-3 border-t border-zinc-850 px-4 py-3">
                    {turn.error ? (
                      <p className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5 text-[12px] text-rose-300">
                        {turn.error}
                      </p>
                    ) : null}
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        Usage
                      </p>
                      <p className="font-mono text-[11px] text-zinc-500">
                        {JSON.stringify(turn.usage)}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        Response
                      </p>
                      <pre className="max-h-80 overflow-auto rounded-lg bg-black/40 p-3 text-[11px] leading-relaxed text-zinc-400">
                        {JSON.stringify(turn.responseContent, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        Request
                      </p>
                      <pre className="max-h-80 overflow-auto rounded-lg bg-black/40 p-3 text-[11px] leading-relaxed text-zinc-500">
                        {JSON.stringify(turn.request, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-850 bg-zinc-950/60 p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-zinc-200">{value}</p>
    </div>
  );
}
