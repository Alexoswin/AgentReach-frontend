"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  Clock,
  Loader2,
  MessageSquare,
  Paperclip,
  Pause,
  PenLine,
  Play,
  PlusCircle,
  RefreshCw,
  Send,
  Square,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useOutreachStore } from "@/store/useOutreachStore";
import { useEscapeKey } from "@/lib/useEscapeKey";
import AudiencePicker from "./AudiencePicker";
import {
  DELIVERY_STYLES,
  EMAIL_PATTERN,
  EmailChipInput,
  formatBytes,
  formatDateTime,
  getErrorMessage,
  getLaunchState,
  readTemplateAttachmentFiles,
  STATUS_STYLES,
} from "./shared";
import type {
  CampaignLaunchResult,
  Contact,
  ContactDirectory,
  EmailCampaignDetails,
  Template,
  TemplateAttachment,
} from "./shared";

const RATE_LABELS: Record<string, string> = {
  "": "As fast as possible (up to 5 a second)",
  "30": "30 an hour",
  "60": "60 an hour",
  "120": "120 an hour",
  "300": "300 an hour",
  "1000": "1,000 an hour",
};

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Not sent" },
  { value: "QUEUED", label: "Queued" },
  { value: "SENT", label: "Sent" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "OPENED", label: "Opened" },
  { value: "REPLIED", label: "Replied" },
  { value: "BOUNCED", label: "Bounced" },
  { value: "FAILED", label: "Failed" },
  { value: "SUPPRESSED", label: "Skipped" },
];

const buttonClass =
  "flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white disabled:opacity-40";

/** One campaign: progress, results, settings and recipients. */
export default function CampaignDetail({
  campaignId,
  onDeleted,
}: {
  campaignId: string;
  onDeleted: () => void;
}) {
  const queryClient = useQueryClient();
  const { showAlert } = useOutreachStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editTemplateId, setEditTemplateId] = useState("");
  const [isEditingCopies, setIsEditingCopies] = useState(false);
  const [editCc, setEditCc] = useState<string[]>([]);
  const [editBcc, setEditBcc] = useState<string[]>([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleValue, setScheduleValue] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addIds, setAddIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedReplyId, setExpandedReplyId] = useState<string | null>(null);

  const { data: campaign, isLoading } = useQuery<EmailCampaignDetails>({
    queryKey: ["email-campaign", campaignId],
    queryFn: () => api.emailCampaigns.get(campaignId) as Promise<EmailCampaignDetails>,
    // Live progress while emails are going out.
    refetchInterval: (query) =>
      ["RUNNING", "SCHEDULED"].includes(query.state.data?.status || "") ? 3000 : false,
  });
  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["templates"],
    queryFn: () => api.templates.list() as Promise<Template[]>,
  });
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: () => api.contacts.list() as Promise<Contact[]>,
    enabled: addOpen,
  });
  const { data: directories = [] } = useQuery<ContactDirectory[]>({
    queryKey: ["contact-directories"],
    queryFn: () => api.contacts.directories.list() as Promise<ContactDirectory[]>,
    enabled: addOpen,
  });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: api.settings.get });
  const replyTrackingActive = Boolean(
    settings?.replyTrackingDomain &&
      settings?.replyTrackingTopicArn &&
      settings?.awsAccessKeyId &&
      settings?.awsSecretAccessKey &&
      settings?.awsSenderEmail,
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["email-campaign", campaignId] });
  };
  const action = (
    run: () => Promise<unknown>,
    fallback: string,
    title?: string,
  ) => ({
    mutationFn: run,
    onSuccess: (result: unknown) => {
      refresh();
      const message = (result as CampaignLaunchResult | undefined)?.message;
      if (message) showAlert(message, "success", title);
    },
    onError: (error: unknown) => showAlert(getErrorMessage(error, fallback), "error"),
  });

  const launch = useMutation(action(() => api.emailCampaigns.launch(campaignId), "We could not start this campaign.", "Campaign started"));
  const relaunch = useMutation(action(() => api.emailCampaigns.relaunch(campaignId), "We could not relaunch this campaign.", "Campaign relaunched"));
  const pause = useMutation(action(() => api.emailCampaigns.pause(campaignId), "We could not pause this campaign.", "Paused"));
  const resume = useMutation(action(() => api.emailCampaigns.resume(campaignId), "We could not resume this campaign.", "Resumed"));
  const stop = useMutation(action(() => api.emailCampaigns.stop(campaignId), "We could not stop this campaign.", "Stopped"));
  const unschedule = useMutation(action(() => api.emailCampaigns.unschedule(campaignId), "Could not cancel the schedule.", "Schedule cancelled"));
  const schedule = useMutation({
    ...action(
      () => api.emailCampaigns.schedule(campaignId, new Date(scheduleValue).toISOString()),
      "We could not schedule this campaign.",
      "Campaign scheduled",
    ),
    onSettled: () => setScheduleOpen(false),
  });
  const update = useMutation({
    mutationFn: (data: Parameters<typeof api.emailCampaigns.update>[1]) =>
      api.emailCampaigns.update(campaignId, data),
    onSuccess: () => {
      refresh();
      setIsEditing(false);
      setIsEditingCopies(false);
    },
    onError: (error) => showAlert(getErrorMessage(error, "We could not update this campaign."), "error"),
  });
  const remove = useMutation({
    mutationFn: () => api.emailCampaigns.delete(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      showAlert("The campaign has been removed from your list.", "success", "Campaign deleted");
      onDeleted();
    },
    onError: (error) => showAlert(getErrorMessage(error, "We could not delete this campaign."), "error"),
  });
  const addContacts = useMutation({
    mutationFn: () => api.emailCampaigns.addContacts(campaignId, addIds),
    onSuccess: () => {
      refresh();
      setAddOpen(false);
      setAddIds([]);
      showAlert("The selected contacts were added to this campaign.", "success", "Recipients added");
    },
    onError: (error) => showAlert(getErrorMessage(error, "We could not add those contacts."), "error"),
  });
  const removeContact = useMutation({
    mutationFn: (contactId: string) => api.emailCampaigns.removeContact(campaignId, contactId),
    onSuccess: () => {
      refresh();
      showAlert("That recipient was removed from this campaign.", "info", "Recipient removed");
    },
    onError: (error) => showAlert(getErrorMessage(error, "We could not remove that recipient."), "error"),
  });
  const updateAttachments = useMutation({
    mutationFn: ({ id, attachments }: { id: string; attachments: TemplateAttachment[] }) =>
      api.templates.update(id, { attachments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      refresh();
      showAlert("Template attachments have been updated.", "success", "Attachments saved");
    },
    onError: (error) => showAlert(getErrorMessage(error, "We could not update template attachments."), "error"),
  });

  useEscapeKey(addOpen, () => setAddOpen(false));

  if (isLoading || !campaign) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 rounded-2xl border border-zinc-850 bg-zinc-900" />
        <div className="h-80 rounded-2xl border border-zinc-850 bg-zinc-900" />
      </div>
    );
  }

  const rows = campaign.contacts || [];
  const stats = campaign.stats;
  const busy = campaign.status === "RUNNING" || campaign.status === "PAUSED";
  const launchState = getLaunchState({
    contactCount: rows.length,
    pendingCount: rows.filter((row) => row.deliveryStatus === "PENDING").length,
    failedCount: rows.filter((row) => row.deliveryStatus === "FAILED").length,
  });
  const alreadySent = rows.filter((row) => ["SENT", "DELIVERED"].includes(row.deliveryStatus)).length;
  const finished = (stats?.sentCount || 0) + (stats?.bouncedCount || 0) + (stats?.failedCount || 0) + (stats?.suppressedCount || 0);
  const progress = rows.length > 0 ? Math.round((finished / rows.length) * 100) : 0;
  const copies = (campaign.cc?.length || 0) + (campaign.bcc?.length || 0);
  const templateAttachments = campaign.template?.attachments || [];

  const filtered = rows.filter((row) => {
    if (!statusFilter) return true;
    if (statusFilter === "OPENED") return Boolean(row.openStatus);
    if (statusFilter === "REPLIED") return Boolean(row.replyStatus);
    return row.deliveryStatus === statusFilter;
  });

  const changeAttachments = async (
    next: (current: TemplateAttachment[]) => Promise<TemplateAttachment[] | null> | TemplateAttachment[] | null,
  ) => {
    if (!campaign.template) return;
    const attachments = await next(templateAttachments);
    if (attachments) updateAttachments.mutate({ id: campaign.template.id, attachments });
  };
  const onFileError = (message: string) => showAlert(message, "error");

  const tiles = [
    { label: "Sent", value: stats?.sentCount ?? 0, detail: `of ${rows.length}` },
    { label: "Delivered", value: stats?.deliveredCount ?? 0, detail: "confirmed by SES" },
    {
      label: "Opened",
      value: campaign.trackOpens === false ? "Off" : `${stats?.openRate ?? 0}%`,
      detail: campaign.trackOpens === false ? "tracking is off" : `${stats?.openedCount ?? 0} (approx.)`,
    },
    { label: "Replied", value: `${stats?.replyRate ?? 0}%`, detail: `${stats?.repliedCount ?? 0} replies` },
    { label: "Bounced", value: stats?.bouncedCount ?? 0, detail: "hard bounces" },
    { label: "Unsubscribed", value: stats?.unsubscribedCount ?? 0, detail: `${stats?.suppressedCount ?? 0} skipped` },
  ];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="space-y-4 rounded-2xl border border-zinc-850 bg-zinc-900/50 p-6 shadow-xl">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="min-w-0 flex-1 space-y-2">
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  aria-label="Campaign name"
                  className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
                />
                <select
                  value={editTemplateId}
                  onChange={(event) => setEditTemplateId(event.target.value)}
                  aria-label="Template"
                  className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Select a template…</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                {alreadySent > 0 && (
                  <p className="max-w-md text-[11px] leading-relaxed text-amber-200/70">
                    {alreadySent} emails already went out. A new template only applies to recipients not sent to yet.
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={update.isPending}
                    onClick={() => {
                      if (!editName.trim() || !editTemplateId) {
                        showAlert("Give the campaign a name and a template.", "error");
                        return;
                      }
                      update.mutate({ name: editName.trim(), templateId: editTemplateId });
                    }}
                    className="rounded-lg bg-indigo-500 px-3 py-2 text-[10px] font-bold text-white hover:brightness-110 disabled:opacity-50"
                  >
                    {update.isPending ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-lg border border-zinc-800 px-3 py-2 text-[10px] font-bold text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-bold text-white">{campaign.name}</h3>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[campaign.status] || STATUS_STYLES.DRAFT}`}
                  >
                    {campaign.status}
                  </span>
                  {!busy && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditName(campaign.name);
                        setEditTemplateId(campaign.template?.id || "");
                        setIsEditing(true);
                      }}
                      className="flex items-center gap-1 rounded-lg border border-zinc-800 px-2 py-1 text-[10px] font-bold text-zinc-400 hover:border-indigo-500/40 hover:text-white"
                    >
                      <PenLine className="h-3 w-3" /> Edit
                    </button>
                  )}
                </div>
                <p className="text-xs text-zinc-500">
                  Template: <span className="font-semibold text-zinc-300">{campaign.template?.name || "No Template"}</span>
                  {campaign.scheduledAt && campaign.status === "SCHEDULED" && (
                    <> · Sends {formatDateTime(campaign.scheduledAt)}</>
                  )}
                </p>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {campaign.status === "RUNNING" && (
              <button type="button" disabled={pause.isPending} onClick={() => pause.mutate()} className={buttonClass}>
                <Pause className="h-3.5 w-3.5" /> Pause
              </button>
            )}
            {campaign.status === "PAUSED" && (
              <button
                type="button"
                disabled={resume.isPending}
                onClick={() => resume.mutate()}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 disabled:opacity-40"
              >
                <Play className="h-3.5 w-3.5" /> Resume
              </button>
            )}
            {["RUNNING", "PAUSED", "SCHEDULED"].includes(campaign.status) && (
              <button
                type="button"
                disabled={stop.isPending}
                onClick={() => {
                  if (window.confirm("Stop this campaign? Emails not sent yet are cancelled; you can launch again later to send them.")) {
                    stop.mutate();
                  }
                }}
                className={`${buttonClass} hover:border-rose-500/40 hover:text-rose-300`}
              >
                <Square className="h-3.5 w-3.5" /> Stop
              </button>
            )}
            {!busy && campaign.status !== "SCHEDULED" && (
              <button
                type="button"
                disabled={!launchState.canLaunch || launch.isPending}
                onClick={() => {
                  if (window.confirm(`Send this campaign to the recipients who have not received it yet?`)) launch.mutate();
                }}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {launch.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                {launchState.canLaunch && launchState.label === "Launch"
                  ? campaign.status === "DRAFT"
                    ? "Send now"
                    : "Send to the rest"
                  : launchState.label}
              </button>
            )}
            {!busy && alreadySent > 0 && (
              <button
                type="button"
                disabled={relaunch.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Re-send this campaign to all ${rows.length} recipients?\n\n${alreadySent} of them already received it and will get a second copy.`,
                    )
                  ) {
                    relaunch.mutate();
                  }
                }}
                className={`${buttonClass} border-amber-500/30 text-amber-400`}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Relaunch all
              </button>
            )}
            {campaign.status === "SCHEDULED" ? (
              <button type="button" onClick={() => unschedule.mutate()} className={`${buttonClass} border-amber-500/30 text-amber-400`}>
                <Clock className="h-3.5 w-3.5" /> Cancel schedule
              </button>
            ) : (
              !busy && (
                <button type="button" onClick={() => setScheduleOpen((value) => !value)} className={buttonClass}>
                  <Clock className="h-3.5 w-3.5" /> Schedule
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => {
                setAddIds([]);
                setAddOpen(true);
              }}
              className={buttonClass}
            >
              <PlusCircle className="h-3.5 w-3.5" /> Add contacts
            </button>
            {!busy && (
              <button
                type="button"
                title="Delete campaign"
                onClick={() => {
                  if (window.confirm("Delete this campaign?")) remove.mutate();
                }}
                className={`${buttonClass} hover:border-rose-500/40 hover:text-rose-300`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {scheduleOpen && !busy && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-850 bg-zinc-950/60 px-4 py-3">
            <label className="text-xs font-semibold text-zinc-400">Send at:</label>
            <input
              type="datetime-local"
              value={scheduleValue}
              onChange={(event) => setScheduleValue(event.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-200 focus:border-indigo-500/50 focus:outline-none"
            />
            <button
              type="button"
              disabled={!scheduleValue || schedule.isPending}
              onClick={() => schedule.mutate()}
              className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50"
            >
              Confirm schedule
            </button>
          </div>
        )}

        {rows.length > 0 && (campaign.status !== "DRAFT" || finished > 0) && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-zinc-500">
              <span>
                {finished} of {rows.length} processed
                {(stats?.queuedCount || 0) > 0 ? ` · ${stats!.queuedCount} queued` : ""}
                {(stats?.pendingCount || 0) > 0 ? ` · ${stats!.pendingCount} not sent` : ""}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-850">
              <div
                className={`h-full rounded-full transition-all ${campaign.status === "PAUSED" ? "bg-amber-400" : "bg-gradient-to-r from-indigo-500 to-purple-500"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {(stats?.sentCount || 0) > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-2xl border border-zinc-850 bg-zinc-900/30 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{tile.label}</p>
              <p className="mt-1 font-mono text-xl font-bold text-white">{tile.value}</p>
              <p className="text-[11px] text-zinc-500">{tile.detail}</p>
            </div>
          ))}
        </div>
      )}
      {campaign.trackOpens !== false && campaign.opensIncludeCopies && (stats?.sentCount || 0) > 0 && (
        <p className="text-[11px] text-amber-200/70">
          This campaign CCs or BCCs other addresses. They get the same tracking image, so their opens are counted as the recipient&apos;s.
        </p>
      )}
      {!replyTrackingActive && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-[11px] leading-relaxed text-amber-200/80">
          Reply tracking is off, so replies go straight to your sender inbox and are not counted here. Set it up under{" "}
          <Link href="/settings" className="font-semibold text-amber-300 underline">
            Settings → Reply tracking
          </Link>
          .
        </p>
      )}

      {/* Sending settings */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-zinc-850 bg-zinc-900/30 p-5">
          <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-200">Sending</h4>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
            <dt className="text-zinc-500">From</dt>
            <dd className="break-all text-zinc-300">
              {campaign.fromName ? `${campaign.fromName} ` : ""}
              {campaign.fromEmail || settings?.awsSenderEmail || "Sender Email from Settings"}
            </dd>
            <dt className="text-zinc-500">Speed</dt>
            <dd>
              <select
                value={campaign.sendRatePerHour ? String(campaign.sendRatePerHour) : ""}
                disabled={busy || update.isPending}
                onChange={(event) =>
                  update.mutate({ sendRatePerHour: event.target.value ? Number(event.target.value) : null })
                }
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 disabled:opacity-50"
              >
                {Object.entries(RATE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
                {campaign.sendRatePerHour && !RATE_LABELS[String(campaign.sendRatePerHour)] && (
                  <option value={String(campaign.sendRatePerHour)}>{campaign.sendRatePerHour} an hour</option>
                )}
              </select>
            </dd>
          </dl>
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={campaign.trackOpens !== false}
              disabled={busy || update.isPending}
              onChange={(event) => update.mutate({ trackOpens: event.target.checked })}
              className="h-3.5 w-3.5 accent-indigo-500"
            />
            Track opens
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={campaign.unsubscribeLink !== false}
              disabled={busy || update.isPending}
              onChange={(event) => update.mutate({ unsubscribeLink: event.target.checked })}
              className="h-3.5 w-3.5 accent-indigo-500"
            />
            Include an unsubscribe link
          </label>
        </div>

        <div className="space-y-3 rounded-2xl border border-zinc-850 bg-zinc-900/30 p-5">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-200">CC &amp; BCC</h4>
            {!busy &&
              (isEditingCopies ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingCopies(false)}
                    className="rounded-lg border border-zinc-800 px-3 py-1.5 text-[10px] font-bold text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={update.isPending}
                    onClick={() => {
                      const invalid = [...editCc, ...editBcc].filter((address) => !EMAIL_PATTERN.test(address));
                      if (invalid.length > 0) {
                        showAlert(`These are not valid email addresses: ${invalid.join(", ")}`, "error");
                        return;
                      }
                      update.mutate({ cc: editCc, bcc: editBcc });
                    }}
                    className="rounded-lg bg-indigo-500 px-3 py-1.5 text-[10px] font-bold text-white hover:brightness-110 disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditCc(campaign.cc || []);
                    setEditBcc(campaign.bcc || []);
                    setIsEditingCopies(true);
                  }}
                  className="flex items-center gap-1 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-[10px] font-bold text-zinc-300 hover:text-white"
                >
                  <PenLine className="h-3 w-3" /> Edit
                </button>
              ))}
          </div>
          {isEditingCopies ? (
            <>
              <EmailChipInput
                label="CC"
                hint="Visible to every recipient."
                values={editCc}
                onChange={setEditCc}
                invalidAddresses={editCc.filter((address) => !EMAIL_PATTERN.test(address))}
              />
              <EmailChipInput
                label="BCC"
                hint="Hidden from recipients."
                values={editBcc}
                onChange={setEditBcc}
                invalidAddresses={editBcc.filter((address) => !EMAIL_PATTERN.test(address))}
              />
            </>
          ) : copies === 0 ? (
            <p className="text-xs text-zinc-500">No CC or BCC. Emails go only to the campaign&apos;s contacts.</p>
          ) : (
            <div className="space-y-2 text-xs">
              {(["cc", "bcc"] as const).map((field) =>
                (campaign[field]?.length || 0) > 0 ? (
                  <div key={field} className="flex flex-wrap items-center gap-1.5">
                    <span className="w-8 text-[10px] font-bold uppercase text-zinc-500">{field}</span>
                    {campaign[field]!.map((address) => (
                      <span key={address} className="rounded-lg bg-zinc-850 px-2 py-1 text-zinc-200">
                        {address}
                      </span>
                    ))}
                  </div>
                ) : null,
              )}
              <p className="text-[11px] text-amber-200/70">
                Each copied address gets one email per recipient ({copies} × {rows.length} = {copies * rows.length} extra emails).
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Template attachments */}
      {campaign.template && (
        <div className="space-y-3 rounded-2xl border border-zinc-850 bg-zinc-900/30 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-200">Email</h4>
              <p className="mt-1 truncate text-xs text-zinc-500">
                {campaign.template.name} — {campaign.template.subject}
              </p>
            </div>
            {!busy && (
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-[10px] font-bold text-zinc-300 hover:text-white">
                <Upload className="h-3.5 w-3.5" /> Add files
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={async (event) => {
                    const input = event.currentTarget;
                    const files = input.files;
                    await changeAttachments(async (current) => {
                      const added = await readTemplateAttachmentFiles(files, current, onFileError);
                      return added.length > 0 ? [...current, ...added] : null;
                    });
                    input.value = "";
                  }}
                />
              </label>
            )}
          </div>
          {templateAttachments.length === 0 ? (
            <p className="text-[11px] text-zinc-600">No attachments on this template.</p>
          ) : (
            <div className="space-y-2">
              {templateAttachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="grid grid-cols-1 gap-2 rounded-lg border border-zinc-850 bg-zinc-950/40 p-2 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"
                >
                  <input
                    key={`${attachment.id}-${attachment.name}`}
                    type="text"
                    defaultValue={attachment.name}
                    disabled={busy}
                    aria-label="Attachment name"
                    onBlur={(event) => {
                      const name = event.target.value.trim();
                      if (name && name !== attachment.name) {
                        void changeAttachments((current) =>
                          current.map((item) => (item.id === attachment.id ? { ...item, name } : item)),
                        );
                      }
                    }}
                    className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                  />
                  <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                    <Paperclip className="h-3 w-3" /> {formatBytes(attachment.size)}
                  </span>
                  {!busy && (
                    <>
                      <label className="flex cursor-pointer items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[10px] font-bold text-zinc-300 hover:bg-zinc-850">
                        Replace
                        <input
                          type="file"
                          className="hidden"
                          onChange={async (event) => {
                            const input = event.currentTarget;
                            const files = input.files;
                            await changeAttachments(async (current) => {
                              const [replacement] = await readTemplateAttachmentFiles(files, [], onFileError);
                              return replacement
                                ? current.map((item) =>
                                    item.id === attachment.id ? { ...replacement, id: attachment.id } : item,
                                  )
                                : null;
                            });
                            input.value = "";
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          void changeAttachments((current) => current.filter((item) => item.id !== attachment.id))
                        }
                        className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[10px] font-bold text-rose-400 hover:bg-rose-950/30"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recipients */}
      <div className="overflow-hidden rounded-2xl border border-zinc-850 bg-zinc-900/30 shadow-xl">
        <div className="flex flex-col gap-3 border-b border-zinc-850 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
            Recipients <span className="font-normal text-zinc-500">({rows.length})</span>
          </h4>
          <div className="flex flex-wrap gap-1">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  statusFilter === filter.value
                    ? "bg-indigo-500/15 text-indigo-200"
                    : "text-zinc-500 hover:text-zinc-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="border-b border-zinc-850 bg-zinc-900/60 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Recipient</th>
                <th className="px-6 py-3.5 font-semibold">Status</th>
                <th className="px-6 py-3.5 font-semibold">Opened</th>
                <th className="px-6 py-3.5 font-semibold">Replied</th>
                <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {filtered.length > 0 ? (
                filtered.map((row) => {
                  const showReply = expandedReplyId === row.id && !!row.replyText;
                  return (
                    <Fragment key={row.id}>
                      <tr className="transition-colors hover:bg-zinc-900/40">
                        <td className="px-6 py-3">
                          <p className="font-semibold text-white">
                            {row.contact ? `${row.contact.firstName} ${row.contact.lastName}` : "Deleted contact"}
                          </p>
                          <p className="text-xs text-zinc-500">{row.contact?.email}</p>
                        </td>
                        <td className="px-6 py-3">
                          <span
                            title={row.errorMessage || undefined}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${DELIVERY_STYLES[row.deliveryStatus] || DELIVERY_STYLES.PENDING}`}
                          >
                            {row.deliveryStatus === "SUPPRESSED" ? "SKIPPED" : row.deliveryStatus}
                          </span>
                          {row.unsubscribedAt && <p className="mt-1 text-[10px] text-amber-300">Unsubscribed</p>}
                        </td>
                        <td className="px-6 py-3">
                          {row.openStatus ? (
                            <span
                              title={row.firstOpenedAt ? `First opened ${formatDateTime(row.firstOpenedAt)}` : undefined}
                              className="flex items-center gap-1 text-xs font-bold text-emerald-400"
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Opened
                            </span>
                          ) : (
                            <span className="text-zinc-650">-</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          {row.replyStatus ? (
                            <button
                              type="button"
                              disabled={!row.replyText}
                              title={row.repliedAt ? `Replied ${formatDateTime(row.repliedAt)}` : undefined}
                              onClick={() => setExpandedReplyId(showReply ? null : row.id)}
                              className="flex items-center gap-1 text-xs font-bold text-indigo-400 enabled:hover:text-indigo-300"
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Replied
                              {row.replyText && <span className="font-medium text-zinc-500">{showReply ? "· hide" : "· view"}</span>}
                            </button>
                          ) : (
                            <span className="text-zinc-650">-</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex justify-end gap-1">
                            {row.threadId && (
                              <Link
                                href={`/inbox?thread=${row.threadId}`}
                                title="Open the conversation in the Inbox"
                                className="rounded p-1 text-zinc-500 transition-colors hover:bg-indigo-950/20 hover:text-indigo-300"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Link>
                            )}
                            <button
                              type="button"
                              title="Remove from campaign"
                              disabled={busy}
                              onClick={() => {
                                if (window.confirm("Remove this contact from the campaign?")) removeContact.mutate(row.contactId);
                              }}
                              className="rounded p-1 text-zinc-500 transition-colors hover:bg-rose-950/20 hover:text-rose-400 disabled:opacity-30"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {showReply && (
                        <tr className="bg-zinc-950/60">
                          <td colSpan={5} className="px-6 py-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              {row.replySubject || "Reply"} · {formatDateTime(row.repliedAt)}
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{row.replyText}</p>
                            {row.threadId && (
                              <Link
                                href={`/inbox?thread=${row.threadId}`}
                                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 hover:text-indigo-200"
                              >
                                <Send className="h-3.5 w-3.5" /> Reply in the Inbox
                              </Link>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    {rows.length === 0 ? 'No recipients yet. Click "Add contacts" to build the list.' : "No recipients match this filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add contacts to campaign"
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h3 className="text-lg font-bold text-white">Add contacts to campaign</h3>
              <button type="button" onClick={() => setAddOpen(false)} aria-label="Close" className="text-zinc-500 hover:text-zinc-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <AudiencePicker
                contacts={contacts}
                directories={directories}
                selectedIds={addIds}
                onChange={setAddIds}
                excludeIds={new Set(rows.map((row) => row.contactId))}
                maxHeight="max-h-[300px]"
              />
              <div className="flex justify-end gap-3 border-t border-zinc-800/60 pt-4">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={addIds.length === 0 || addContacts.isPending}
                  onClick={() => addContacts.mutate()}
                  className="rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:brightness-110 disabled:opacity-50"
                >
                  Add {addIds.length > 0 ? addIds.length : ""} selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
