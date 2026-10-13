"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Globe2, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { api, type EmailDomain } from "@/lib/api";
import { useOutreachStore } from "@/store/useOutreachStore";

function statusClasses(status: EmailDomain["status"]) {
  return status === "VERIFIED"
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
    : "border-amber-500/20 bg-amber-500/10 text-amber-300";
}

export default function SendingDomainsPanel() {
  const queryClient = useQueryClient();
  const { showAlert } = useOutreachStore();
  const [domain, setDomain] = useState("");
  const [senderEmail, setSenderEmail] = useState("");

  const domainsQuery = useQuery({
    queryKey: ["sending-domains"],
    queryFn: api.domains.list,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.domains.create({
        domain: domain.trim(),
        defaultSenderEmail: senderEmail.trim() || undefined,
      }),
    onSuccess: () => {
      setDomain("");
      setSenderEmail("");
      queryClient.invalidateQueries({ queryKey: ["sending-domains"] });
      showAlert(
        "Add the TXT record below, then verify your domain.",
        "success",
        "Domain added",
      );
    },
    onError: (error: Error) => showAlert(error.message, "error"),
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => api.domains.verify(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["sending-domains"] });
      showAlert(
        result.message,
        result.verified ? "success" : "error",
        result.verified ? "Domain verified" : "Verification pending",
      );
    },
    onError: (error: Error) => showAlert(error.message, "error"),
  });

  const defaultMutation = useMutation({
    mutationFn: (id: string) => api.domains.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sending-domains"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      showAlert("New campaigns will use this sender domain.", "success");
    },
    onError: (error: Error) => showAlert(error.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.domains.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sending-domains"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      showAlert("The sending domain was removed.", "success");
    },
    onError: (error: Error) => showAlert(error.message, "error"),
  });

  const copyRecord = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showAlert("DNS value copied.", "success", "Copied");
    } catch {
      showAlert("Could not copy the DNS value.", "error");
    }
  };

  const domains = domainsQuery.data || [];

  return (
    <section className="space-y-5 rounded-2xl border border-zinc-850 bg-zinc-900/40 p-6 shadow-xl">
      <div className="flex items-start gap-3 border-b border-zinc-800/60 pb-4">
        <Globe2 className="mt-0.5 h-5 w-5 text-indigo-400" />
        <div>
          <h3 className="text-base font-bold text-white">Sending domains</h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Verify a domain you own, choose the sender address, and route
            campaign replies through its reply subdomain.
          </p>
        </div>
      </div>

      <div
        className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]"
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          createMutation.mutate();
        }}
      >
        <input
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          placeholder="example.com"
          aria-label="Sending domain"
          className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
        />
        <input
          type="email"
          value={senderEmail}
          onChange={(event) => setSenderEmail(event.target.value)}
          placeholder="hello@example.com"
          aria-label="Default sender email"
          className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
        />
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !domain.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Add domain
        </button>
      </div>

      {domainsQuery.isLoading ? (
        <div className="text-xs text-zinc-500">Loading sending domains…</div>
      ) : domains.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-5 text-xs text-zinc-500">
          No sending domains yet. Add the domain you want to use for campaigns.
        </div>
      ) : (
        <div className="space-y-4">
          {domains.map((item) => (
            <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-zinc-200">{item.domain}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClasses(item.status)}`}>
                      {item.status}
                    </span>
                    {item.isDefault && (
                      <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                        DEFAULT
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Sender: {item.defaultSenderEmail || "Not selected"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => verifyMutation.mutate(item.id)}
                    disabled={verifyMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-2 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-900 disabled:opacity-50"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verify DNS
                  </button>
                  {item.status === "VERIFIED" && !item.isDefault && (
                    <button
                      type="button"
                      onClick={() => defaultMutation.mutate(item.id)}
                      disabled={defaultMutation.isPending}
                      className="rounded-lg border border-indigo-500/20 px-3 py-2 text-[11px] font-semibold text-indigo-300 hover:bg-indigo-500/10 disabled:opacity-50"
                    >
                      Make default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(item.id)}
                    disabled={deleteMutation.isPending}
                    aria-label={`Remove ${item.domain}`}
                    className="rounded-lg border border-rose-500/20 px-3 py-2 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border border-zinc-800">
                <div className="border-b border-zinc-800 bg-zinc-900/80 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Add these DNS records
                </div>
                {item.records.map((record) => (
                  <div key={`${record.type}-${record.name}`} className="grid gap-2 border-b border-zinc-800 px-3 py-3 last:border-b-0 md:grid-cols-[70px_1fr_1fr_auto] md:items-center">
                    <span className="text-[10px] font-bold text-indigo-300">{record.type}</span>
                    <code className="break-all text-[11px] text-zinc-400">{record.name}</code>
                    <code className="break-all text-[11px] text-zinc-300">{record.value}</code>
                    <button
                      type="button"
                      onClick={() => copyRecord(record.value)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-400 hover:text-white"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </button>
                  </div>
                ))}
              </div>

              {item.lastError && item.status !== "VERIFIED" && (
                <p className="mt-3 text-xs text-amber-300">{item.lastError}</p>
              )}
              {item.status === "VERIFIED" && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400">
                  <Check className="h-3.5 w-3.5" /> This domain can be selected for campaigns.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

