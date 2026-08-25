"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardCheck, RefreshCw, X } from "lucide-react";
import { api } from "@/lib/api";
import { useOutreachStore } from "@/store/useOutreachStore";
import {
  Card,
  ModeBanner,
  PageHeader,
  StatusBadge,
  money,
  when,
} from "../shared";
import type {
  DecisionResult,
  DeskOverview,
  OrderIntent,
  RiskGate,
} from "@/lib/trade-agent-types";

/**
 * The approval queue. This is the human half of the trust boundary: the point
 * where a person, not a model, decides an order should exist.
 */
export default function ProposalsPage() {
  const queryClient = useQueryClient();
  const { showAlert } = useOutreachStore();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: overview } = useQuery<DeskOverview>({
    queryKey: ["trade-agent", "overview"],
    queryFn: api.tradeAgent.overview,
  });

  const { data: proposals, isLoading } = useQuery<OrderIntent[]>({
    queryKey: ["trade-agent", "proposals"],
    queryFn: () => api.tradeAgent.proposals(),
    refetchInterval: 20000,
  });

  const decide = useMutation({
    mutationFn: ({
      intentId,
      decision,
    }: {
      intentId: string;
      decision: "approve" | "decline";
    }) => api.tradeAgent.decide(intentId, { decision }),
    onMutate: ({ intentId }) => setBusyId(intentId),
    onSettled: () => setBusyId(null),
    onSuccess: (res: DecisionResult, { decision }) => {
      queryClient.invalidateQueries({ queryKey: ["trade-agent"] });
      if (decision === "decline") {
        showAlert("Proposal declined.", "success");
      } else if (res?.skipped) {
        showAlert(res.reason || "Nothing was sent.", "error", "Not executed");
      } else {
        showAlert(
          res?.simulated
            ? "Simulated fill recorded. Nothing was sent to the broker."
            : "Order placed with Groww.",
          "success",
          res?.simulated ? "Paper fill" : "Order placed",
        );
      }
    },
    onError: (err: Error) => showAlert(err.message, "error"),
  });

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title="Proposals"
        description="Order intents the agents produced. Each one has already passed the validator and the risk engine — approving re-runs risk against live state before anything is sent."
        icon={<ClipboardCheck className="h-8 w-8 text-amber-400" />}
        actions={
          <button
            type="button"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["trade-agent"] })
            }
            className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-900"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        }
      />

      <ModeBanner mode={overview?.mode} />

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-2xl border border-zinc-850 bg-zinc-900" />
      ) : !proposals?.length ? (
        <Card>
          <p className="text-sm text-zinc-500">
            Nothing is waiting for a decision. Proposing no orders is a normal
            outcome — most cycles should end that way.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {proposals.map((intent) => {
            const blocked = intent.status === "REJECTED";
            const decidable = ["AWAITING_APPROVAL", "APPROVED", "PROPOSED"].includes(
              intent.status,
            );

            return (
              <Card key={intent.id}>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                          intent.transactionType === "BUY"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {intent.transactionType}
                      </span>
                      <h3 className="text-lg font-bold text-white">
                        {intent.quantity} × {intent.tradingSymbol}
                      </h3>
                      <StatusBadge status={intent.status} />
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {intent.segment} · {intent.orderType} · {intent.product} ·{" "}
                      {intent.validity} · proposed {when(intent.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold tabular-nums text-white">
                      {money(intent.notional)}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {intent.price > 0 ? `at ${money(intent.price)}` : "at market"}
                      {intent.triggerPrice > 0
                        ? ` · trigger ${money(intent.triggerPrice)}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="mb-4 rounded-xl border border-zinc-850 bg-zinc-950/60 p-4">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Rationale
                  </p>
                  <p className="text-sm leading-relaxed text-zinc-300">
                    {intent.rationale || "No rationale was recorded."}
                  </p>
                </div>

                {intent.riskVerdict?.gates?.length ? (
                  <div className="mb-4">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Risk gates
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {intent.riskVerdict.gates.map((gate: RiskGate) => (
                        <span
                          key={gate.gate}
                          title={gate.message}
                          className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${
                            gate.passed
                              ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                              : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {gate.passed ? "✓" : "✕"} {gate.gate}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {blocked ? (
                  <p className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-[12px] text-rose-300">
                    {intent.statusReason || "Blocked by the risk engine."}
                  </p>
                ) : null}

                {decidable ? (
                  <div className="flex gap-2 border-t border-zinc-800/60 pt-4">
                    <button
                      type="button"
                      disabled={busyId === intent.id}
                      onClick={() =>
                        decide.mutate({ intentId: intent.id, decision: "approve" })
                      }
                      className="flex items-center gap-2 rounded-xl bg-emerald-500/90 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {busyId === intent.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      {overview?.mode === "paper" ? "Approve (simulated)" : "Approve"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === intent.id}
                      onClick={() =>
                        decide.mutate({ intentId: intent.id, decision: "decline" })
                      }
                      className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-bold text-zinc-300 transition-colors hover:bg-zinc-900 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Decline
                    </button>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
