"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { LooseApiResponse } from "@/lib/api";
import { useOutreachStore } from "@/store/useOutreachStore";
import {
  CalendarClock,
  Mail,
  PhoneCall,
  X,
  ArrowRight,
  Inbox,
} from "lucide-react";

type ScheduledItem = {
  id: string;
  name: string;
  scheduledAt: string;
  channel: "email" | "calling";
};

export default function SchedulerPage() {
  const queryClient = useQueryClient();
  const { showAlert } = useOutreachStore();

  const emailQuery = useQuery({
    queryKey: ["email-campaigns"],
    queryFn: () => api.emailCampaigns.list() as Promise<LooseApiResponse[]>,
  });
  const callingQuery = useQuery({
    queryKey: ["calling-campaigns"],
    queryFn: () => api.callingCampaigns.list() as Promise<LooseApiResponse[]>,
  });

  const items = useMemo<ScheduledItem[]>(() => {
    const email = (emailQuery.data || [])
      .filter((c) => c.status === "SCHEDULED" && c.scheduledAt)
      .map((c) => ({
        id: c.id,
        name: c.name,
        scheduledAt: c.scheduledAt as string,
        channel: "email" as const,
      }));
    const calling = (callingQuery.data || [])
      .filter((c) => c.status === "SCHEDULED" && c.scheduledAt)
      .map((c) => ({
        id: c.id,
        name: c.name,
        scheduledAt: c.scheduledAt as string,
        channel: "calling" as const,
      }));
    return [...email, ...calling].sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
  }, [emailQuery.data, callingQuery.data]);

  const cancelMutation = useMutation({
    mutationFn: (item: ScheduledItem) =>
      item.channel === "email"
        ? api.emailCampaigns.unschedule(item.id)
        : api.callingCampaigns.unschedule(item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["calling-campaigns"] });
      showAlert("Schedule cancelled.", "success");
    },
    onError: (err: Error) =>
      showAlert(err.message || "Could not cancel the schedule.", "error"),
  });

  const isLoading = emailQuery.isLoading || callingQuery.isLoading;
  const isError = emailQuery.isError || callingQuery.isError;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-900 pb-5">
        <h2 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white">
          <CalendarClock className="h-8 w-8 text-indigo-400" />
          Scheduler
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Every email and calling campaign queued for a future launch. They
          fire automatically at the scheduled time.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl border border-zinc-850 bg-zinc-900/40"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-500/20 bg-zinc-900/20 py-16 text-center">
          <p className="text-sm font-semibold text-zinc-300">
            Could not load scheduled campaigns.
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Please try again in a moment.
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-850 bg-zinc-900/20 py-16 text-center text-zinc-500">
          <Inbox className="mx-auto mb-3 h-8 w-8 text-zinc-700" />
          <p className="text-sm">Nothing scheduled yet.</p>
          <p className="mt-1 text-xs text-zinc-600">
            Open a campaign and use{" "}
            <span className="text-zinc-400">Schedule</span> to queue it for a
            future time.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link
              href="/email-campaigns"
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-900"
            >
              <Mail className="h-3.5 w-3.5" /> Email
            </Link>
            <Link
              href="/calling-campaigns"
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-900"
            >
              <PhoneCall className="h-3.5 w-3.5" /> Calls
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const when = new Date(item.scheduledAt);
            const isEmail = item.channel === "email";
            return (
              <div
                key={`${item.channel}-${item.id}`}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-850 bg-zinc-900/40 p-5 shadow-xl sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl border ${
                      isEmail
                        ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-400"
                        : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                    }`}
                  >
                    {isEmail ? (
                      <Mail className="h-5 w-5" />
                    ) : (
                      <PhoneCall className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{item.name}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {isEmail ? "Email campaign" : "Calling campaign"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <div className="sm:text-right">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-zinc-200">
                      <CalendarClock className="h-4 w-4 text-amber-400" />
                      {when.toLocaleString()}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      {when > new Date() ? "Upcoming" : "Due — launching soon"}
                    </p>
                  </div>
                  <Link
                    href={
                      isEmail ? "/email-campaigns" : "/calling-campaigns"
                    }
                    className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white"
                  >
                    Open <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={() => cancelMutation.mutate(item)}
                    disabled={cancelMutation.isPending}
                    className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-zinc-900 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
