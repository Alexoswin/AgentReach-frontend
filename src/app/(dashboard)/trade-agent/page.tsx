"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CandlestickChart,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { useOutreachStore } from "@/store/useOutreachStore";
import { MissingCredentials } from "@/components/MissingCredentials";
import type {
  BrokerPosition,
  DeskOverview,
  RunStartResult,
} from "@/lib/trade-agent-types";
import {
  BlockerList,
  Card,
  ModeBanner,
  PageHeader,
  Stat,
  money,
  when,
} from "./shared";

export default function TradeDeskPage() {
  const queryClient = useQueryClient();
  const { showAlert } = useOutreachStore();

  const { data: overview, isLoading } = useQuery<DeskOverview>({
    queryKey: ["trade-agent", "overview"],
    queryFn: api.tradeAgent.overview,
    // A cycle takes minutes; a slow poll keeps the screen honest without noise.
    refetchInterval: 30000,
  });

  const startRun = useMutation({
    mutationFn: api.tradeAgent.startRun,
    onSuccess: (res: RunStartResult) => {
      queryClient.invalidateQueries({ queryKey: ["trade-agent"] });
      showAlert(
        res.summary || `Cycle finished as ${res.status}.`,
        res.status === "COMPLETED" ? "success" : "error",
        `Run ${res.status}`,
      );
    },
    onError: (err: Error) => showAlert(err.message, "error"),
  });

  const refreshPortfolio = useMutation({
    mutationFn: api.tradeAgent.refreshPortfolio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trade-agent"] });
      showAlert("Portfolio refreshed from the broker.", "success");
    },
    onError: (err: Error) => showAlert(err.message, "error"),
  });

  const killSwitch = useMutation({
    mutationFn: (engaged: boolean) =>
      api.tradeAgent.updatePolicy({
        killSwitch: engaged,
        reason: engaged
          ? "Engaged from the trade desk."
          : "Cleared from the trade desk.",
      }),
    onSuccess: (_res, engaged) => {
      queryClient.invalidateQueries({ queryKey: ["trade-agent"] });
      showAlert(
        engaged
          ? "Kill switch engaged. Every order is now rejected."
          : "Kill switch cleared.",
        engaged ? "error" : "success",
      );
    },
    onError: (err: Error) => showAlert(err.message, "error"),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-1/3 rounded bg-zinc-800" />
        <div className="h-40 rounded-2xl border border-zinc-850 bg-zinc-900" />
        <div className="h-64 rounded-2xl border border-zinc-850 bg-zinc-900" />
      </div>
    );
  }

  // Neither integration configured at all — send them to Settings rather than
  // showing an empty desk.
  if (!overview?.gemini?.configured && !overview?.groww?.configured) {
    return (
      <MissingCredentials
        title="Trade-Agent is not connected yet"
        description="Add your Groww API key and your Gemini API key in Settings, then come back here."
      />
    );
  }

  const snapshot = overview.snapshot;
  const dayPnl =
    Number(snapshot?.realisedPnl ?? 0) + Number(snapshot?.unrealisedPnl ?? 0);
  const engaged = Boolean(overview.policy?.killSwitch);

  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader
        title="Trade Desk"
        description="A Gemini master/worker desk trading through Groww. Models propose; code and you dispose."
        icon={<CandlestickChart className="h-8 w-8 text-emerald-400" />}
        actions={
          <>
            <button
              type="button"
              onClick={() => refreshPortfolio.mutate()}
              disabled={refreshPortfolio.isPending}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-900 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshPortfolio.isPending ? "animate-spin" : ""}`}
              />
              Refresh book
            </button>
            <button
              type="button"
              onClick={() => startRun.mutate()}
              disabled={startRun.isPending || overview.running || !overview.ready}
              title={
                overview.ready ? undefined : "Resolve the blockers below first."
              }
              className="flex items-center gap-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:brightness-110 disabled:opacity-50"
            >
              {startRun.isPending || overview.running ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {overview.running ? "Cycle running…" : "Run a cycle"}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <ModeBanner mode={overview.mode} />

        {/* Always one click, always visible. */}
        <button
          type="button"
          onClick={() => killSwitch.mutate(!engaged)}
          disabled={killSwitch.isPending}
          className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-colors disabled:opacity-50 ${
            engaged
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
          }`}
        >
          {engaged ? (
            <ShieldCheck className="h-4 w-4" />
          ) : (
            <ShieldAlert className="h-4 w-4" />
          )}
          {engaged ? "Clear kill switch" : "Engage kill switch"}
        </button>
      </div>

      <BlockerList blockers={overview.blockers ?? []} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Day P&L"
          value={money(dayPnl)}
          tone={dayPnl > 0 ? "good" : dayPnl < 0 ? "bad" : "neutral"}
          hint={
            overview.policy?.maxDailyLoss
              ? `Loss limit ${money(overview.policy.maxDailyLoss)}`
              : "No loss limit set"
          }
        />
        <Stat
          label="Open positions"
          value={snapshot?.openPositionCount ?? 0}
          hint={
            overview.policy?.maxOpenPositions
              ? `Limit ${overview.policy.maxOpenPositions}`
              : "No limit set"
          }
        />
        <Stat
          label="Clear cash"
          value={money(snapshot?.margin?.clear_cash)}
          hint={`${Math.round((overview.policy?.marginBuffer ?? 0) * 100)}% held back`}
        />
        <Stat
          label="Tokens today"
          value={(overview.tokens?.spentToday ?? 0).toLocaleString()}
          hint={
            overview.tokens?.dailyBudget
              ? `of ${overview.tokens.dailyBudget.toLocaleString()} budget`
              : "No daily budget set"
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Session">
          <dl className="space-y-2.5 text-sm">
            <Row label="IST date" value={overview.session?.istDate} />
            <Row label="Phase" value={overview.session?.phase} />
            <Row
              label="Trading day"
              value={overview.session?.tradingDay ? "Yes" : "No"}
            />
            <Row
              label="Holiday list"
              value={
                overview.session?.holidayListConfigured
                  ? "Configured"
                  : "Not configured"
              }
            />
            <Row
              label="Instruments"
              value={
                overview.instruments?.ready
                  ? `${overview.instruments.size.toLocaleString()} loaded`
                  : "Not loaded"
              }
            />
          </dl>
        </Card>

        <Card title="Connections">
          <dl className="space-y-2.5 text-sm">
            <Row label="Groww" value={overview.groww?.status} />
            <Row
              label="Auth flow"
              value={overview.groww?.authFlow}
              hint={
                overview.groww?.canSelfRenew
                  ? "Can renew its daily token unattended"
                  : "Needs a manual token each morning"
              }
            />
            <Row
              label="Token expires"
              value={when(overview.groww?.tokenExpiresAt)}
            />
            <Row label="Gemini" value={overview.gemini?.status} />
            <Row
              label="Master model"
              value={overview.gemini?.masterModel}
              hint="Orchestrator, F&O and equity workers"
            />
            <Row
              label="Worker model"
              value={overview.gemini?.workerModel}
              hint="Research and technical workers"
            />
          </dl>
        </Card>
      </div>

      <Card title="Positions">
        {snapshot?.positions?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-[10px] uppercase tracking-wider text-zinc-500">
                  <th className="pb-2 pr-4">Symbol</th>
                  <th className="pb-2 pr-4">Qty</th>
                  <th className="pb-2 pr-4">Net price</th>
                  <th className="pb-2 pr-4">Product</th>
                  <th className="pb-2">Realised P&L</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.positions.map((position: BrokerPosition, index: number) => (
                  <tr
                    key={`${position.trading_symbol}-${index}`}
                    className="border-b border-zinc-900/60 last:border-0"
                  >
                    <td className="py-2.5 pr-4 font-semibold text-zinc-200">
                      {position.trading_symbol}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-zinc-400">
                      {position.quantity}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-zinc-400">
                      {money(position.net_price)}
                    </td>
                    <td className="py-2.5 pr-4 text-zinc-500">
                      {position.product}
                    </td>
                    <td
                      className={`py-2.5 tabular-nums ${
                        Number(position.realised_pnl) >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {money(position.realised_pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            No open positions in the last snapshot
            {snapshot?.capturedAt ? ` (${when(snapshot.capturedAt)})` : ""}.
          </p>
        )}
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value?: string | number | null;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right">
        <span className="font-medium text-zinc-200">{value ?? "—"}</span>
        {hint ? (
          <span className="block text-[11px] text-zinc-600">{hint}</span>
        ) : null}
      </dd>
    </div>
  );
}
