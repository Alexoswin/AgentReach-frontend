"use client";

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Loader2, Mail, Pause, Play, Plus, Search, Trash2 } from "lucide-react";
import Pagination from "@/components/Pagination";
import { MissingCredentials } from "@/components/MissingCredentials";
import CampaignDetail from "@/components/campaigns/CampaignDetail";
import CampaignWizard from "@/components/campaigns/CampaignWizard";
import { getErrorMessage, getLaunchState, STATUS_STYLES } from "@/components/campaigns/shared";
import type { CampaignLaunchResult, EmailCampaign } from "@/components/campaigns/shared";
import { api } from "@/lib/api";
import { useDebouncedValue } from "@/lib/pagination";
import { useOutreachStore } from "@/store/useOutreachStore";

function CampaignCard({
  campaign,
  onOpen,
}: {
  campaign: EmailCampaign;
  onOpen: () => void;
}) {
  const queryClient = useQueryClient();
  const { showAlert } = useOutreachStore();
  const contactCount = campaign.contactCount ?? 0;
  const processed =
    (campaign.sentCount ?? 0) +
    (campaign.bouncedCount ?? 0) +
    (campaign.failedCount ?? 0) +
    (campaign.suppressedCount ?? 0);
  const progress = contactCount > 0 ? Math.round((processed / contactCount) * 100) : 0;
  const launchState = getLaunchState(campaign);

  const run = useMutation({
    mutationFn: (kind: "launch" | "pause" | "resume" | "delete") =>
      (kind === "launch"
        ? api.emailCampaigns.launch(campaign.id)
        : kind === "pause"
          ? api.emailCampaigns.pause(campaign.id)
          : kind === "resume"
            ? api.emailCampaigns.resume(campaign.id)
            : api.emailCampaigns.delete(campaign.id)) as Promise<CampaignLaunchResult>,
    onSuccess: (result, kind) => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      showAlert(
        kind === "delete" ? "The campaign has been removed from your list." : result?.message || "Done.",
        "success",
        kind === "delete" ? "Campaign deleted" : undefined,
      );
    },
    onError: (error) => showAlert(getErrorMessage(error, "Something went wrong. Please try again."), "error"),
  });

  return (
    <div className="group flex flex-col justify-between rounded-2xl border border-zinc-850 bg-zinc-900/40 p-6 shadow-xl transition-all hover:bg-zinc-900/60">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[campaign.status] || STATUS_STYLES.DRAFT}`}
          >
            {campaign.status}
          </span>
          {!["RUNNING", "PAUSED"].includes(campaign.status) && (
            <button
              type="button"
              title="Delete campaign"
              onClick={() => {
                if (window.confirm("Delete this campaign?")) run.mutate("delete");
              }}
              className="rounded p-1 text-zinc-500 opacity-80 transition-colors hover:bg-rose-950/20 hover:text-rose-400 group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div>
          <h4 className="text-base font-bold tracking-tight text-white">{campaign.name}</h4>
          <p className="mt-1 text-xs text-zinc-500">
            {contactCount} recipient{contactCount === 1 ? "" : "s"} · Created{" "}
            {new Date(campaign.createdAt).toLocaleDateString()}
            {campaign.status === "SCHEDULED" && campaign.scheduledAt
              ? ` · Sends ${new Date(campaign.scheduledAt).toLocaleString()}`
              : ""}
          </p>
        </div>
        {contactCount > 0 && campaign.status !== "DRAFT" && (
          <div className="space-y-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-850">
              <div
                className={`h-full rounded-full ${campaign.status === "PAUSED" ? "bg-amber-400" : "bg-gradient-to-r from-indigo-500 to-purple-500"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="flex flex-wrap gap-x-3 text-xs text-zinc-400">
              <span>{campaign.sentCount ?? 0} sent</span>
              {campaign.trackOpens !== false && (
                <span title="Approximate: some mail apps load or block images">
                  <span className="font-semibold text-purple-300">{campaign.openRate ?? 0}%</span> opened
                </span>
              )}
              <span>
                <span className="font-semibold text-emerald-300">{campaign.replyRate ?? 0}%</span> replied
              </span>
              {(campaign.bouncedCount ?? 0) > 0 && (
                <span className="text-rose-300">{campaign.bouncedCount} bounced</span>
              )}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-zinc-850/65 pt-4">
        <button
          type="button"
          onClick={onOpen}
          className="flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white"
        >
          <Eye className="h-3.5 w-3.5" />
          View details
        </button>
        {campaign.status === "RUNNING" ? (
          <button
            type="button"
            disabled={run.isPending}
            onClick={() => run.mutate("pause")}
            className="flex items-center gap-1 text-xs font-semibold text-amber-300 hover:text-amber-200"
          >
            <Pause className="h-3.5 w-3.5" /> Pause
          </button>
        ) : campaign.status === "PAUSED" ? (
          <button
            type="button"
            disabled={run.isPending}
            onClick={() => run.mutate("resume")}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
          >
            <Play className="h-3.5 w-3.5" /> Resume
          </button>
        ) : campaign.status === "SCHEDULED" ? (
          <span className="text-xs font-semibold text-sky-300">Scheduled</span>
        ) : launchState.canLaunch ? (
          <button
            type="button"
            disabled={run.isPending}
            onClick={() => {
              if (window.confirm(`Send "${campaign.name}" now?`)) run.mutate("launch");
            }}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
          >
            {run.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {launchState.label}
          </button>
        ) : (
          <span className="text-xs font-semibold text-zinc-600">{launchState.label}</span>
        )}
      </div>
    </div>
  );
}

function EmailCampaigns() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaign");
  const creating = searchParams.get("new") === "1";

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const debouncedSearch = useDebouncedValue(search.trim());

  const navigate = (params: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: true });
  };

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: api.settings.get });
  const pageParams = { page, limit: pageSize, search: debouncedSearch };
  const { data: campaignPage, isLoading } = useQuery({
    queryKey: ["email-campaigns", "page", pageParams],
    queryFn: () => api.emailCampaigns.listPage(pageParams),
    placeholderData: keepPreviousData,
    enabled: !campaignId && !creating,
    // Keeps progress bars moving while something is sending.
    refetchInterval: (query) =>
      (query.state.data?.items as EmailCampaign[] | undefined)?.some((item) =>
        ["RUNNING", "SCHEDULED"].includes(item.status),
      )
        ? 5000
        : false,
  });
  const campaigns: EmailCampaign[] = campaignPage?.items ?? [];

  // Deleting the last campaign on the last page leaves it empty; step back.
  if (campaignPage && page > campaignPage.totalPages) setPage(campaignPage.totalPages);

  if (settings && (!settings.awsAccessKeyId || !settings.awsSecretAccessKey)) {
    return (
      <MissingCredentials
        title="AWS Credentials Required"
        description="To create and launch email campaigns, you need to configure your AWS SES credentials in the settings."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-zinc-900 pb-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white">
            <Mail className="h-8 w-8 text-indigo-400" />
            Email Campaigns
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Personalized bulk email through your own AWS SES, with replies landing in your Inbox.
          </p>
        </div>
        {campaignId || creating ? (
          <button
            type="button"
            onClick={() => navigate({})}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300 transition-all hover:bg-zinc-850 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All campaigns
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate({ new: "1" })}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" />
            New campaign
          </button>
        )}
      </div>

      {creating ? (
        <CampaignWizard
          onCancel={() => navigate({})}
          onDone={(id) => navigate({ campaign: id })}
        />
      ) : campaignId ? (
        <CampaignDetail campaignId={campaignId} onDeleted={() => navigate({})} />
      ) : (
        <div className="space-y-5">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search campaigns by name..."
              aria-label="Search campaigns"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2 pl-10 pr-4 text-sm text-zinc-200 focus:border-indigo-500/50 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              [1, 2, 3].map((n) => (
                <div key={n} className="h-48 animate-pulse rounded-2xl border border-zinc-850 bg-zinc-900" />
              ))
            ) : campaigns.length > 0 ? (
              campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onOpen={() => navigate({ campaign: campaign.id })}
                />
              ))
            ) : (
              <div className="col-span-full rounded-2xl border border-zinc-850 bg-zinc-900/20 py-16 text-center text-zinc-500">
                {debouncedSearch
                  ? `No campaigns match "${debouncedSearch}".`
                  : 'No campaigns yet. Click "New campaign" to send your first one.'}
              </div>
            )}
          </div>
          {campaignPage && (
            <Pagination
              page={campaignPage.page}
              limit={campaignPage.limit}
              total={campaignPage.total}
              totalPages={campaignPage.totalPages}
              onPageChange={setPage}
              onLimitChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              pageSizeOptions={[9, 18, 36, 72]}
              label="campaigns"
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function EmailCampaignsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20 text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      }
    >
      <EmailCampaigns />
    </Suspense>
  );
}
