"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ScrollText } from "lucide-react";
import { api } from "@/lib/api";
import { Card, PageHeader, StatusBadge, when } from "../shared";
import { totalTokens, type TradeAgentRun } from "@/lib/trade-agent-types";

export default function RunsPage() {
  const { data: runs, isLoading } = useQuery<TradeAgentRun[]>({
    queryKey: ["trade-agent", "runs"],
    queryFn: () => api.tradeAgent.runs(50),
    refetchInterval: 30000,
  });

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title="Agent Runs"
        description="Every orchestration cycle, with the full master-to-worker transcript. Open one to see exactly what the desk was told and what it decided."
        icon={<ScrollText className="h-8 w-8 text-violet-400" />}
      />

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-zinc-850 bg-zinc-900" />
      ) : !runs?.length ? (
        <Card>
          <p className="text-sm text-zinc-500">
            No cycles have run yet. Start one from the Trade Desk.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => {
            const tokens = totalTokens(run.tokenUsage);

            return (
              <Link
                key={run.id}
                href={`/trade-agent/runs/${run.id}`}
                className="block rounded-2xl border border-zinc-850 bg-zinc-900/40 p-5 transition-colors hover:border-indigo-500/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <StatusBadge status={run.status} />
                      <span className="text-sm font-bold text-white">
                        {run.trigger}
                      </span>
                      <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                        {run.mode}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                      {run.summary || run.error || "No summary recorded."}
                    </p>
                    <p className="mt-2 text-[11px] text-zinc-600">
                      {when(run.startedAt)} · {run.iterations || 0} turn(s) ·{" "}
                      {tokens.toLocaleString()} tokens ·{" "}
                      {(run.workerSummaries || []).length} worker dispatch(es)
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 flex-none text-zinc-700" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
