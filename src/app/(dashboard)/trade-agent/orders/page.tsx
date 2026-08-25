"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { useOutreachStore } from "@/store/useOutreachStore";
import { Card, PageHeader, StatusBadge, money, when } from "../shared";
import type { ReconcileResult, TradeOrder } from "@/lib/trade-agent-types";

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const { showAlert } = useOutreachStore();

  const { data: orders, isLoading } = useQuery<TradeOrder[]>({
    queryKey: ["trade-agent", "orders"],
    queryFn: () => api.tradeAgent.orders(100),
    refetchInterval: 20000,
  });

  const reconcile = useMutation({
    mutationFn: api.tradeAgent.reconcile,
    onSuccess: (res: ReconcileResult) => {
      queryClient.invalidateQueries({ queryKey: ["trade-agent"] });
      showAlert(
        res.skipped
          ? res.reason || "Reconciliation was skipped."
          : `Checked ${res.checked} order(s), updated ${res.updated}.`,
        res.skipped ? "error" : "success",
      );
    },
    onError: (err: Error) => showAlert(err.message, "error"),
  });

  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader
        title="Orders"
        description="Every order the desk has produced. Simulated fills are badged — paper and live are never mixed silently."
        icon={<Receipt className="h-8 w-8 text-indigo-400" />}
        actions={
          <button
            type="button"
            onClick={() => reconcile.mutate()}
            disabled={reconcile.isPending}
            className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-900 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${reconcile.isPending ? "animate-spin" : ""}`}
            />
            Reconcile now
          </button>
        }
      />

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-zinc-850 bg-zinc-900" />
      ) : !orders?.length ? (
        <Card>
          <p className="text-sm text-zinc-500">No orders yet.</p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-[10px] uppercase tracking-wider text-zinc-500">
                  <th className="pb-2 pr-4">Symbol</th>
                  <th className="pb-2 pr-4">Side</th>
                  <th className="pb-2 pr-4">Qty</th>
                  <th className="pb-2 pr-4">Price</th>
                  <th className="pb-2 pr-4">Filled</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Placed</th>
                  <th className="pb-2">Broker ID</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-zinc-900/60 last:border-0"
                  >
                    <td className="py-3 pr-4">
                      <span className="font-semibold text-zinc-200">
                        {order.tradingSymbol}
                      </span>
                      {order.simulated ? (
                        <span className="ml-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[9px] font-bold text-sky-400">
                          PAPER
                        </span>
                      ) : null}
                      <span className="block text-[11px] text-zinc-600">
                        {order.segment} · {order.product}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={
                          order.transactionType === "BUY"
                            ? "font-semibold text-emerald-400"
                            : "font-semibold text-rose-400"
                        }
                      >
                        {order.transactionType}
                      </span>
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-zinc-400">
                      {order.quantity}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-zinc-400">
                      {order.price > 0 ? money(order.price) : "Market"}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-zinc-400">
                      {order.filledQuantity}
                      {order.averagePrice > 0 ? (
                        <span className="block text-[11px] text-zinc-600">
                          @ {money(order.averagePrice)}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3 pr-4 text-[11px] text-zinc-500">
                      {when(order.placedAt)}
                    </td>
                    <td className="py-3 font-mono text-[11px] text-zinc-600">
                      {order.growwOrderId || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
