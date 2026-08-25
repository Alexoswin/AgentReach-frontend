"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, RefreshCw, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import { useOutreachStore } from "@/store/useOutreachStore";
import {
  Card,
  ExecutionMode,
  MODE_STYLES,
  PageHeader,
  money,
} from "../shared";
import type { PolicyResponse, TradePolicy } from "@/lib/trade-agent-types";

const MODES: ExecutionMode[] = ["paper", "approval", "auto"];
const SEGMENTS = ["CASH", "FNO"];

export default function PolicyPage() {
  const { data, isLoading } = useQuery<PolicyResponse>({
    queryKey: ["trade-agent", "policy"],
    queryFn: api.tradeAgent.policy,
  });

  if (isLoading || !data) {
    return (
      <div className="h-96 animate-pulse rounded-2xl border border-zinc-850 bg-zinc-900" />
    );
  }

  // Keying on the saved policy seeds the form from server state on mount and
  // re-seeds it after a save, without syncing state inside an effect.
  return <PolicyForm key={JSON.stringify(data.policy)} data={data} />;
}

function PolicyForm({ data }: { data: PolicyResponse }) {
  const queryClient = useQueryClient();
  const { showAlert } = useOutreachStore();
  const saved: TradePolicy = data.policy;

  const [mode, setMode] = useState<ExecutionMode>(saved.mode);
  const [maxOrderValue, setMaxOrderValue] = useState(saved.maxOrderValue);
  const [maxDailyLoss, setMaxDailyLoss] = useState(saved.maxDailyLoss);
  const [maxOpenPositions, setMaxOpenPositions] = useState(
    saved.maxOpenPositions,
  );
  const [allowedSegments, setAllowedSegments] = useState<string[]>(
    saved.allowedSegments,
  );
  const [allowNakedOptions, setAllowNakedOptions] = useState(
    saved.allowNakedOptions,
  );
  const [marginBuffer, setMarginBuffer] = useState(saved.marginBuffer);
  const [maxTokensPerRun, setMaxTokensPerRun] = useState(saved.maxTokensPerRun);
  const [maxTokensPerDay, setMaxTokensPerDay] = useState(saved.maxTokensPerDay);

  const save = useMutation({
    mutationFn: api.tradeAgent.updatePolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trade-agent"] });
      showAlert("Policy saved.", "success", "Risk policy updated");
    },
    onError: (err: Error) => showAlert(err.message, "error"),
  });

  const killSwitch = useMutation({
    mutationFn: (engaged: boolean) =>
      api.tradeAgent.updatePolicy({
        killSwitch: engaged,
        reason: "Changed from the risk policy screen.",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trade-agent"] });
      showAlert("Kill switch updated.", "success");
    },
    onError: (err: Error) => showAlert(err.message, "error"),
  });

  const engaged = saved.killSwitch;
  const breaker = data.circuitBreaker;

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Risk Policy"
        description="These limits are enforced in code, not by the models. Every proposal is checked against them twice: when it is made, and again immediately before execution."
        icon={<ShieldAlert className="h-8 w-8 text-rose-400" />}
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-white">Kill switch</p>
            <p className="mt-0.5 text-[12px] text-zinc-500">
              {engaged
                ? "Engaged. Every order intent is rejected at the first gate."
                : "Off. Orders are gated normally."}
            </p>
            {breaker?.open ? (
              <p className="mt-1.5 text-[12px] text-rose-400">
                Tripped automatically after {breaker.consecutiveFailures}{" "}
                consecutive execution failures. Understand the cause before
                clearing it.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => killSwitch.mutate(!engaged)}
            disabled={killSwitch.isPending}
            className={`rounded-xl border px-5 py-2.5 text-sm font-bold transition-colors disabled:opacity-50 ${
              engaged
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                : "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
            }`}
          >
            {engaged ? "Clear kill switch" : "Engage kill switch"}
          </button>
        </div>
      </Card>

      <Card title="Execution mode">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {MODES.map((option) => {
            const style = MODE_STYLES[option];
            const selected = mode === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setMode(option)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  selected
                    ? `${style.ring} ${style.bg}`
                    : "border-zinc-850 bg-zinc-950/60 hover:border-zinc-700"
                }`}
              >
                <p
                  className={`text-sm font-bold ${selected ? style.text : "text-zinc-300"}`}
                >
                  {style.label}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                  {style.blurb}
                </p>
              </button>
            );
          })}
        </div>

        {mode === "auto" ? (
          <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-[12px] leading-relaxed text-rose-300">
            Autonomous mode places real orders with no human in the loop. India&apos;s
            retail algo-trading rules expect broker-registered, exchange-approved
            algos for automated order placement — confirm with Groww what is
            permitted on your account before enabling this. The desk also refuses
            to run in auto mode without an exchange holiday list configured.
          </p>
        ) : null}
      </Card>

      <Card title="Limits">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Max order value"
            hint={`Per order. ${maxOrderValue ? money(maxOrderValue) : "0 disables this gate."}`}
            value={maxOrderValue}
            onChange={setMaxOrderValue}
          />
          <Field
            label="Max daily loss"
            hint={`Past this, new entries are blocked and exits still allowed. ${
              maxDailyLoss ? money(maxDailyLoss) : "0 disables this gate."
            }`}
            value={maxDailyLoss}
            onChange={setMaxDailyLoss}
          />
          <Field
            label="Max open positions"
            hint="0 disables this gate."
            value={maxOpenPositions}
            onChange={setMaxOpenPositions}
          />
          <Field
            label="Margin buffer"
            hint={`Fraction of clear cash held back: ${Math.round(marginBuffer * 100)}%.`}
            value={marginBuffer}
            step="0.05"
            onChange={setMarginBuffer}
          />
          <Field
            label="Max tokens per run"
            hint="The Gemini API has no server-side spend ceiling, so this is enforced here."
            value={maxTokensPerRun}
            onChange={setMaxTokensPerRun}
          />
          <Field
            label="Max tokens per day"
            hint="Counted from IST midnight across all runs."
            value={maxTokensPerDay}
            onChange={setMaxTokensPerDay}
          />
        </div>
      </Card>

      <Card title="Instruments">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Allowed segments
            </p>
            <div className="flex gap-2">
              {SEGMENTS.map((segment) => {
                const on = allowedSegments.includes(segment);
                return (
                  <button
                    key={segment}
                    type="button"
                    onClick={() =>
                      setAllowedSegments(
                        on
                          ? allowedSegments.filter((item) => item !== segment)
                          : [...allowedSegments, segment],
                      )
                    }
                    className={`rounded-xl border px-4 py-2 text-xs font-bold transition-colors ${
                      on
                        ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300"
                        : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {segment}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-zinc-600">
              Groww&apos;s API covers equity and derivatives only — there is no
              commodities/MCX support.
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={allowNakedOptions}
              onChange={(e) => setAllowNakedOptions(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-indigo-500"
            />
            <span>
              <span className="text-sm font-semibold text-zinc-200">
                Allow selling options
              </span>
              <span className="block text-[11px] leading-relaxed text-zinc-500">
                Off by default. With this off, the risk engine rejects every short
                option leg rather than trying to prove a hedge exists — a wrong
                &quot;yes&quot; there is far more dangerous than a conservative
                &quot;no&quot;.
              </span>
            </span>
          </label>
        </div>
      </Card>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={save.isPending}
          onClick={() =>
            save.mutate({
              mode,
              maxOrderValue,
              maxDailyLoss,
              maxOpenPositions,
              allowedSegments,
              allowNakedOptions,
              marginBuffer,
              maxTokensPerRun,
              maxTokensPerDay,
            })
          }
          className="flex items-center gap-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:brightness-110 disabled:opacity-50"
        >
          {save.isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Save policy
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  step = "1",
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
  step?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </label>
      <input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm tabular-nums text-zinc-200 focus:border-indigo-500/50 focus:outline-none"
      />
      <p className="mt-1.5 text-[11px] text-zinc-600">{hint}</p>
    </div>
  );
}
