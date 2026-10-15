"use client";

import { useState } from "react";
import { X } from "lucide-react";

export type TemplateFormat = "HTML" | "TEXT";
export type TemplateBuilderMode = "AI" | "MANUAL";
export type TemplateGenerationPayload = {
  goal: string;
  audience: string;
  tone: string;
  instructions?: string;
  referenceDocumentText?: string;
  referenceDocumentName?: string;
  format: TemplateFormat;
};
export type TemplateAttachment = {
  id: string;
  name: string;
  contentType: string;
  size: number;
  contentBase64: string;
};
export type Template = {
  id: string;
  name: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  type?: string;
  category?: string;
  attachments?: TemplateAttachment[];
};
export type TemplateGenerationResult = {
  subject: string;
  bodyHtml: string;
  bodyText: string;
};
export type TemplateGenerationJob = {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  result?: TemplateGenerationResult;
  error?: string;
};
export type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  jobTitle?: string;
  customFields?: string;
  directoryId?: string | null;
};
export type ContactDirectory = {
  id: string;
  name: string;
  contactCount?: number;
};
export type EmailCampaign = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  scheduledAt?: string | null;
  contactCount?: number;
  pendingCount?: number;
  queuedCount?: number;
  failedCount?: number;
  sentCount?: number;
  deliveredCount?: number;
  bouncedCount?: number;
  suppressedCount?: number;
  unsubscribedCount?: number;
  openedCount?: number;
  repliedCount?: number;
  openRate?: number;
  replyRate?: number;
  trackOpens?: boolean;
  unsubscribeLink?: boolean;
  sendRatePerHour?: number | null;
  fromEmail?: string;
  fromName?: string;
  // CC/BCC copies share the tracking image, so their opens are counted too.
  opensIncludeCopies?: boolean;
  cc?: string[];
  bcc?: string[];
  // findAll returns a { id, name } projection alongside each campaign.
  template?: { id: string; name: string } | null;
};
export type EmailCampaignContact = {
  id: string;
  contactId: string;
  contact: Contact;
  deliveryStatus: string;
  openStatus?: boolean;
  replyStatus?: boolean;
  firstOpenedAt?: string | null;
  repliedAt?: string | null;
  replySubject?: string | null;
  replyText?: string | null;
  sentTime?: string | null;
  errorMessage?: string | null;
  unsubscribedAt?: string | null;
  // The recipient's conversation in the Inbox.
  threadId?: string | null;
};
export type CampaignStats = {
  contactCount: number;
  pendingCount: number;
  queuedCount: number;
  failedCount: number;
  sentCount: number;
  deliveredCount: number;
  bouncedCount: number;
  suppressedCount: number;
  unsubscribedCount: number;
  openedCount: number;
  repliedCount: number;
  openRate: number;
  replyRate: number;
};
export type EmailCampaignDetails = EmailCampaign & {
  contacts?: EmailCampaignContact[];
  template?: Template | null;
  stats?: CampaignStats;
};
export type CampaignLaunchResult = {
  message?: string;
};
export type ReferencePdfResult = {
  name?: string;
  text?: string;
};

export type CampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "RUNNING"
  | "PAUSED"
  | "STOPPED"
  | "COMPLETED"
  | "FAILED";

export const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export const MAX_TEMPLATE_ATTACHMENTS = 5;
export const MAX_TEMPLATE_ATTACHMENT_BYTES = 5 * 1024 * 1024;
// Mirrors MAX_TEMPLATE_ATTACHMENTS_TOTAL_BYTES on the backend so oversized
// sets are caught before upload rather than at launch.
export const MAX_TEMPLATE_ATTACHMENTS_TOTAL_BYTES = 7 * 1024 * 1024;
export const MAX_REFERENCE_PDF_BYTES = 8 * 1024 * 1024;
export const MAX_COPY_RECIPIENTS = 10;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "";

export const htmlToText = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export const textToHtml = (text: string) => {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.length > 0
    ? paragraphs
        .map(
          (paragraph) =>
            `<p>${paragraph
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#39;")
              .replace(/\n/g, "<br/>")}</p>`,
        )
        .join("")
    : "<p>Hi {{firstName}},</p>";
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Fills {{placeholders}} the way the backend does when it sends: contact
 * fields and custom fields, escaped in HTML, unknown ones left empty.
 */
export function personalize(
  template: string | undefined,
  contact: Record<string, unknown> | null,
  { html = false }: { html?: boolean } = {},
) {
  if (!template) return "";
  const values: Record<string, unknown> = {};
  if (typeof contact?.customFields === "string") {
    try {
      Object.assign(values, JSON.parse(contact.customFields));
    } catch {
      // Ignore malformed custom fields, as the backend does.
    }
  }
  Object.assign(values, {
    firstName: contact?.firstName,
    lastName: contact?.lastName,
    company: contact?.company,
    jobTitle: contact?.jobTitle,
    email: contact?.email,
  });
  return template.replace(/\{\{(.*?)\}\}/g, (_, key: string) => {
    const value = Object.prototype.hasOwnProperty.call(values, key) ? values[key] : "";
    const text =
      typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : "";
    return html ? escapeHtml(text) : text;
  });
}

export const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-zinc-850 text-zinc-400 border-zinc-800",
  SCHEDULED: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  RUNNING: "bg-indigo-500/10 text-indigo-400 border-indigo-500/10",
  PAUSED: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  STOPPED: "bg-zinc-850 text-zinc-300 border-zinc-700",
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/10",
  FAILED: "bg-rose-500/10 text-rose-400 border-rose-500/10",
};

export const DELIVERY_STYLES: Record<string, string> = {
  PENDING: "bg-zinc-850 text-zinc-400",
  QUEUED: "bg-sky-500/10 text-sky-300",
  SENT: "bg-blue-500/10 text-blue-400",
  DELIVERED: "bg-emerald-500/10 text-emerald-400",
  BOUNCED: "bg-rose-500/10 text-rose-400",
  FAILED: "bg-rose-500/10 text-rose-400",
  SUPPRESSED: "bg-amber-500/10 text-amber-300",
};

/** What the Launch button can do for a campaign right now. */
export const getLaunchState = (camp: {
  contactCount?: number;
  pendingCount?: number;
  failedCount?: number;
}) => {
  const contactCount = camp.contactCount ?? 0;
  const pending = camp.pendingCount ?? 0;
  const failed = camp.failedCount ?? 0;

  if (contactCount === 0) {
    return { canLaunch: false, label: "Add Contacts" };
  }
  if (pending === 0 && failed === 0) {
    return { canLaunch: false, label: "All Sent" };
  }
  return {
    canLaunch: true,
    label: failed > 0 && pending === 0 ? `Retry ${failed} Failed` : "Launch",
  };
};

/**
 * Chip-style entry for CC/BCC addresses. Commits on Enter, comma, or blur so a
 * half-typed address in the input never gets silently dropped on submit.
 */
export function EmailChipInput({
  label,
  hint,
  values,
  onChange,
  disabled,
  invalidAddresses = [],
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  invalidAddresses?: string[];
}) {
  const [draft, setDraft] = useState("");
  const invalid = new Set(invalidAddresses);

  const commit = (raw: string) => {
    const entries = raw
      .split(/[,;\s]+/)
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
    if (entries.length === 0) return;
    const merged = Array.from(new Set([...values, ...entries]));
    onChange(merged.slice(0, MAX_COPY_RECIPIENTS));
    setDraft("");
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
        {label}
      </label>
      <div
        className={`flex flex-wrap items-center gap-1.5 rounded-xl border bg-zinc-950 px-2 py-2 ${
          disabled ? "border-zinc-850 opacity-60" : "border-zinc-800"
        }`}
      >
        {values.map((address) => (
          <span
            key={address}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ${
              invalid.has(address)
                ? "bg-red-500/10 text-red-300 ring-1 ring-red-500/40"
                : "bg-zinc-850 text-zinc-200"
            }`}
          >
            {address}
            {!disabled && (
              <button
                type="button"
                aria-label={`Remove ${address}`}
                onClick={() => onChange(values.filter((v) => v !== address))}
                className="text-zinc-500 hover:text-red-300"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        <input
          type="text"
          disabled={disabled || values.length >= MAX_COPY_RECIPIENTS}
          value={draft}
          placeholder={
            values.length >= MAX_COPY_RECIPIENTS
              ? `Limit of ${MAX_COPY_RECIPIENTS} reached`
              : values.length === 0
                ? "name@company.com"
                : "Add another…"
          }
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit(draft);
            } else if (e.key === "Backspace" && !draft && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          // Commit on blur too — otherwise a typed-but-not-entered address is
          // lost when the user clicks straight to the submit button.
          onBlur={() => commit(draft)}
          className="min-w-[10rem] flex-1 bg-transparent px-1 py-1 text-sm text-zinc-200 focus:outline-none disabled:cursor-not-allowed"
        />
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}

const fileToTemplateAttachment = (file: File): Promise<TemplateAttachment> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve({
        id: `attachment-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
        contentBase64: result.split(",")[1] || "",
      });
    };
    reader.onerror = () => reject(new Error("Could not read attachment file"));
    reader.readAsDataURL(file);
  });

/** Reads picked files into template attachments, within the template limits. */
export async function readTemplateAttachmentFiles(
  files: FileList | null,
  existing: TemplateAttachment[],
  onError: (message: string) => void,
) {
  const list = Array.from(files || []);
  if (list.length === 0) return [];
  if (existing.length + list.length > MAX_TEMPLATE_ATTACHMENTS) {
    onError(`Templates can include up to ${MAX_TEMPLATE_ATTACHMENTS} attachments.`);
    return [];
  }
  const oversized = list.find((file) => file.size > MAX_TEMPLATE_ATTACHMENT_BYTES);
  if (oversized) {
    onError(`${oversized.name} is larger than 5 MB.`);
    return [];
  }
  const totalBytes =
    existing.reduce((sum, attachment) => sum + (attachment.size || 0), 0) +
    list.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TEMPLATE_ATTACHMENTS_TOTAL_BYTES) {
    onError(
      `These files total ${formatBytes(totalBytes)}, over the ${formatBytes(
        MAX_TEMPLATE_ATTACHMENTS_TOTAL_BYTES,
      )} limit for one email. Remove a file or link to it instead.`,
    );
    return [];
  }
  return Promise.all(list.map(fileToTemplateAttachment));
}
