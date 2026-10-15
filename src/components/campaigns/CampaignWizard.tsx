"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Loader2,
  Mail,
  Paperclip,
  Play,
  Save,
  Send,
} from "lucide-react";
import { api } from "@/lib/api";
import { useOutreachStore } from "@/store/useOutreachStore";
import AudiencePicker from "./AudiencePicker";
import TemplateWorkspace from "./TemplateWorkspace";
import {
  EMAIL_PATTERN,
  EmailChipInput,
  getErrorMessage,
  personalize,
} from "./shared";
import type { Contact, ContactDirectory, EmailCampaign, Template } from "./shared";

const STEPS = ["Audience", "Content", "Settings", "Review"] as const;
// The send queue sends at most 5 emails a second per account.
const MAX_SENDS_PER_SECOND = 5;
const RATE_OPTIONS = [
  { value: 0, label: "As fast as possible (up to 5 a second)" },
  { value: 30, label: "30 an hour" },
  { value: 60, label: "60 an hour" },
  { value: 120, label: "120 an hour" },
  { value: 300, label: "300 an hour" },
  { value: 1000, label: "1,000 an hour" },
];

function formatDuration(seconds: number) {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  const hours = seconds / 3600;
  return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} hours`;
}

function previewDocument(html: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#fff;color:#111827;font-family:Arial,sans-serif;padding:20px;font-size:15px;line-height:1.55}a{color:#2563eb}</style></head><body>${html}</body></html>`;
}

/**
 * New campaign in four steps: who gets it, what it says, how it is sent,
 * and a final review with a test send before it goes out.
 */
export default function CampaignWizard({
  onCancel,
  onDone,
}: {
  onCancel: () => void;
  onDone: (campaignId: string) => void;
}) {
  const queryClient = useQueryClient();
  const { showAlert } = useOutreachStore();
  const [step, setStep] = useState(0);

  const [contactIds, setContactIds] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [trackOpens, setTrackOpens] = useState(true);
  const [unsubscribeLink, setUnsubscribeLink] = useState(true);
  const [ratePerHour, setRatePerHour] = useState(0);
  const [previewContactId, setPreviewContactId] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: () => api.contacts.list() as Promise<Contact[]>,
  });
  const { data: directories = [] } = useQuery<ContactDirectory[]>({
    queryKey: ["contact-directories"],
    queryFn: () => api.contacts.directories.list() as Promise<ContactDirectory[]>,
  });
  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["templates"],
    queryFn: () => api.templates.list() as Promise<Template[]>,
  });
  const { data: senders } = useQuery({
    queryKey: ["mail-senders"],
    queryFn: api.mail.senders,
    staleTime: 5 * 60_000,
  });

  const template = templates.find((item) => item.id === templateId) || null;
  const selectedContacts = contacts.filter((contact) => contactIds.includes(contact.id));
  const previewContact =
    selectedContacts.find((contact) => contact.id === previewContactId) || selectedContacts[0] || null;
  const sender = fromEmail || senders?.defaultFrom || "";
  const sendSeconds = ratePerHour
    ? (contactIds.length / ratePerHour) * 3600
    : contactIds.length / MAX_SENDS_PER_SECOND;

  const testSend = useMutation({
    mutationFn: () =>
      api.emailCampaigns.sendTest({
        templateId: templateId!,
        to: testTo.trim() || undefined,
        contactId: previewContact?.id,
        fromEmail: fromEmail || undefined,
        fromName: fromName || undefined,
        unsubscribeLink,
      }) as Promise<{ message: string }>,
    onSuccess: (result) => showAlert(result.message, "success", "Test sent"),
    onError: (error) => showAlert(getErrorMessage(error, "Could not send the test email."), "error"),
  });

  const finish = useMutation({
    mutationFn: async (mode: "draft" | "now" | "schedule") => {
      const campaign = (await api.emailCampaigns.create({
        name: name.trim(),
        templateId: templateId!,
        cc,
        bcc,
        trackOpens,
        unsubscribeLink,
        sendRatePerHour: ratePerHour || null,
        fromEmail,
        fromName,
      })) as EmailCampaign;
      await api.emailCampaigns.addContacts(campaign.id, contactIds);
      let message = "Your campaign is saved as a draft.";
      if (mode === "now") {
        const result = (await api.emailCampaigns.launch(campaign.id)) as { message?: string };
        message = result?.message || "Your campaign is sending.";
      } else if (mode === "schedule") {
        const result = (await api.emailCampaigns.schedule(
          campaign.id,
          new Date(scheduleAt).toISOString(),
        )) as { message?: string };
        message = result?.message || "Your campaign is scheduled.";
      }
      return { campaign, message, mode };
    },
    onSuccess: ({ campaign, message, mode }) => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      showAlert(
        message,
        "success",
        mode === "now" ? "Campaign started" : mode === "schedule" ? "Campaign scheduled" : "Campaign saved",
      );
      onDone(campaign.id);
    },
    onError: (error) =>
      showAlert(getErrorMessage(error, "We could not create this campaign. Please try again."), "error"),
  });

  const stepError = (index: number): string | null => {
    if (index === 0 && contactIds.length === 0) return "Choose at least one recipient.";
    if (index === 1 && !templateId) return "Choose, generate or write the email first.";
    if (index === 2) {
      if (!name.trim()) return "Give the campaign a name.";
      const invalid = [...cc, ...bcc].filter((address) => !EMAIL_PATTERN.test(address));
      if (invalid.length > 0) return `These CC/BCC addresses are not valid: ${invalid.join(", ")}`;
    }
    return null;
  };

  const goNext = () => {
    const error = stepError(step);
    if (error) {
      showAlert(error, "error");
      return;
    }
    setStep((value) => Math.min(value + 1, STEPS.length - 1));
  };

  const fromOptions = Array.from(
    new Set([...(senders?.addresses || []), fromEmail].filter(Boolean)),
  );

  return (
    <div className="space-y-6 rounded-2xl border border-zinc-850 bg-zinc-900/30 p-4 shadow-xl sm:p-6">
      {/* Steps */}
      <ol className="flex items-center gap-2 border-b border-zinc-850 pb-5">
        {STEPS.map((label, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                disabled={index > step}
                onClick={() => setStep(index)}
                className="flex items-center gap-2 disabled:cursor-default"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    current
                      ? "bg-indigo-500 text-white"
                      : done
                        ? "bg-indigo-500/20 text-indigo-300"
                        : "bg-zinc-850 text-zinc-500"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className={`hidden text-xs font-semibold sm:inline ${current ? "text-white" : "text-zinc-500"}`}>
                  {label}
                </span>
              </button>
              {index < STEPS.length - 1 && <span className="h-px flex-1 bg-zinc-800" />}
            </li>
          );
        })}
      </ol>

      {step === 0 && (
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-bold text-white">Who should get this?</h3>
            <p className="mt-1 text-xs text-zinc-500">
              People who unsubscribed, bounced or marked an earlier email as spam are skipped automatically.
            </p>
          </div>
          <AudiencePicker
            contacts={contacts}
            directories={directories}
            selectedIds={contactIds}
            onChange={setContactIds}
          />
        </div>
      )}

      {step === 1 && (
        <TemplateWorkspace selectedTemplateId={templateId} onSelect={setTemplateId} senderEmail={sender} />
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Campaign name
              </label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Q3 SaaS founder outreach"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Send from
              </label>
              <select
                value={fromEmail}
                onChange={(event) => setFromEmail(event.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">
                  {senders?.defaultFrom ? `${senders.defaultFrom} (Sender Email)` : "Sender Email from Settings"}
                </option>
                {fromOptions
                  .filter((address) => address !== senders?.defaultFrom)
                  .map((address) => (
                    <option key={address} value={address}>
                      {address}
                    </option>
                  ))}
              </select>
              <p className="mt-1.5 text-[11px] text-zinc-600">Addresses verified in your AWS SES account.</p>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Sender name
              </label>
              <input
                type="text"
                value={fromName}
                onChange={(event) => setFromName(event.target.value)}
                placeholder={senders?.fromName || "Jane from Acme"}
                maxLength={100}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <EmailChipInput
              label="CC (optional)"
              hint="Visible to every recipient. Added to each email."
              values={cc}
              onChange={setCc}
              invalidAddresses={cc.filter((address) => !EMAIL_PATTERN.test(address))}
            />
            <EmailChipInput
              label="BCC (optional)"
              hint="Hidden from recipients, e.g. your CRM's archive address."
              values={bcc}
              onChange={setBcc}
              invalidAddresses={bcc.filter((address) => !EMAIL_PATTERN.test(address))}
            />
          </div>
          {cc.length + bcc.length > 0 && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-[11px] leading-relaxed text-amber-200/80">
              Every copied address receives one email per recipient: {cc.length + bcc.length} ×{" "}
              {contactIds.length} = {(cc.length + bcc.length) * contactIds.length} extra emails.
            </p>
          )}

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Sending speed
            </label>
            <select
              value={ratePerHour}
              onChange={(event) => setRatePerHour(Number(event.target.value))}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none md:w-80"
            >
              {RATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-zinc-600">
              Spreading sends out looks more natural to inbox providers. {contactIds.length} emails take about{" "}
              {formatDuration(sendSeconds)}.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
              <input
                type="checkbox"
                checked={trackOpens}
                onChange={(event) => setTrackOpens(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-indigo-500"
              />
              <span>
                <span className="block text-xs font-semibold text-zinc-300">Track opens</span>
                <span className="mt-0.5 block text-[11px] text-zinc-500">
                  Adds an invisible image to HTML emails. Opens are approximate.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
              <input
                type="checkbox"
                checked={unsubscribeLink}
                onChange={(event) => setUnsubscribeLink(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-indigo-500"
              />
              <span>
                <span className="block text-xs font-semibold text-zinc-300">Unsubscribe link</span>
                <span className="mt-0.5 block text-[11px] text-zinc-500">
                  Adds a link and one-click unsubscribe headers, which Gmail and Yahoo expect from bulk senders.
                </span>
              </span>
            </label>
          </div>
        </div>
      )}

      {step === 3 && template && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <div className="space-y-4">
            <dl className="space-y-3 rounded-2xl border border-zinc-850 bg-zinc-950/50 p-4 text-sm">
              {[
                ["Campaign", name],
                ["Recipients", `${contactIds.length} contact${contactIds.length === 1 ? "" : "s"}`],
                ["Email", template.name],
                ["From", `${fromName || senders?.fromName || ""} ${sender ? `<${sender}>` : ""}`.trim()],
                ["Speed", RATE_OPTIONS.find((option) => option.value === ratePerHour)?.label || ""],
                ["Takes about", formatDuration(sendSeconds)],
                ["Tracking", `${trackOpens ? "Opens and replies" : "Replies only"}`],
                ["Unsubscribe link", unsubscribeLink ? "Included" : "Not included"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</dt>
                  <dd className="mt-0.5 break-words text-zinc-200">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="space-y-2 rounded-2xl border border-zinc-850 bg-zinc-950/50 p-4">
              <p className="text-xs font-bold text-zinc-300">Send a test</p>
              <input
                type="email"
                value={testTo}
                onChange={(event) => setTestTo(event.target.value)}
                placeholder={senders?.defaultFrom || "you@company.com"}
                aria-label="Send the test to"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                disabled={testSend.isPending}
                onClick={() => testSend.mutate()}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white disabled:opacity-50"
              >
                {testSend.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send test{previewContact ? ` as ${previewContact.firstName}` : ""}
              </button>
              <p className="text-[11px] text-zinc-600">Goes to your Sender Email unless you enter another address.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-400">Preview</p>
              <select
                value={previewContact?.id || ""}
                onChange={(event) => setPreviewContactId(event.target.value)}
                aria-label="Preview as"
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
              >
                {selectedContacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    As {contact.firstName} {contact.lastName} ({contact.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="mail-canvas overflow-hidden rounded-2xl border border-zinc-850 bg-white">
              <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
                <p>
                  From: {sender || "Not configured — set one in Settings"} · To: {previewContact?.email}
                </p>
                <p className="mt-2 text-sm font-bold text-zinc-900">
                  {personalize(template.subject, previewContact) || "No subject"}
                </p>
                {(template.attachments?.length || 0) > 0 && (
                  <p className="mt-2 flex items-center gap-1 text-zinc-600">
                    <Paperclip className="h-3.5 w-3.5" />
                    {template.attachments!.map((attachment) => personalize(attachment.name, previewContact)).join(", ")}
                  </p>
                )}
              </div>
              {template.bodyHtml?.trim() ? (
                <iframe
                  title="Email preview"
                  sandbox=""
                  srcDoc={previewDocument(personalize(template.bodyHtml, previewContact, { html: true }))}
                  className="h-96 w-full bg-white"
                />
              ) : (
                <div className="h-96 overflow-y-auto whitespace-pre-wrap bg-white p-5 font-mono text-sm leading-6 text-zinc-800">
                  {personalize(template.bodyText, previewContact) || "No preview body yet."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-5">
        <button
          type="button"
          onClick={() => (step === 0 ? onCancel() : setStep(step - 1))}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-850 bg-zinc-950 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {step === 0 ? "Cancel" : "Back"}
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-110"
          >
            Next: {STEPS[step + 1]}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={finish.isPending}
              onClick={() => finish.mutate("draft")}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:text-white disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              Save draft
            </button>
            <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
              <Clock className="ml-2 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(event) => setScheduleAt(event.target.value)}
                aria-label="Schedule for"
                className="bg-transparent px-1 py-1 text-xs text-zinc-200 focus:outline-none"
              />
              <button
                type="button"
                disabled={!scheduleAt || finish.isPending}
                onClick={() => finish.mutate("schedule")}
                className="rounded-lg bg-zinc-850 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
              >
                Schedule
              </button>
            </div>
            <button
              type="button"
              disabled={finish.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    `Send "${name}" to ${contactIds.length} recipient${contactIds.length === 1 ? "" : "s"} now?`,
                  )
                ) {
                  finish.mutate("now");
                }
              }}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-110 disabled:opacity-50"
            >
              {finish.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Send now
            </button>
          </div>
        )}
      </div>

      {step === 3 && !template && (
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <Mail className="h-4 w-4" /> Choose the email in the Content step first.
        </p>
      )}
    </div>
  );
}
