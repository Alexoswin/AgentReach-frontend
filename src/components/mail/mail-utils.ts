import type { MailAddress, MailFolder, MailMessage } from "@/lib/api";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const FOLDER_LABELS: Record<MailFolder, string> = {
  inbox: "Inbox",
  starred: "Starred",
  sent: "Sent",
  drafts: "Drafts",
  scheduled: "Scheduled",
  campaigns: "Campaign replies",
  archive: "Archive",
  trash: "Trash",
};

export const MAIL_FOLDERS = Object.keys(FOLDER_LABELS) as MailFolder[];

export function isMailFolder(value: string | null): value is MailFolder {
  return !!value && (MAIL_FOLDERS as string[]).includes(value);
}

/** "3:42 PM" today, "Oct 12" this year, "Oct 12, 2025" before that. */
export function formatListTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

export function formatFullTime(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function addressName(address?: MailAddress | null) {
  if (!address) return "Unknown";
  return address.name?.trim() || address.email;
}

export function addressLine(address?: MailAddress | null) {
  if (!address?.email) return "";
  return address.name ? `${address.name} <${address.email}>` : address.email;
}

export function initials(address?: MailAddress | null) {
  const source = addressName(address)
    .replace(/@.*$/, "")
    .replace(/[^A-Za-z0-9À-ɏ ]/g, " ")
    .trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes || 0} B`;
}

/** The time a message happened: received, sent, or scheduled. */
export function messageTime(message: MailMessage) {
  return message.receivedAt || message.sentAt || message.sendAt || message.createdAt;
}

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

/** A short label for an outbound email's state, for the thread view. */
export function outboundStatus(message: MailMessage): { label: string; tone: StatusTone } | null {
  if (message.direction !== "OUTBOUND") return null;
  switch (message.status) {
    case "DRAFT":
      return { label: "Draft", tone: "warning" };
    case "QUEUED":
      return message.scheduled
        ? { label: `Scheduled for ${formatFullTime(message.sendAt)}`, tone: "info" }
        : { label: "Sending…", tone: "info" };
    case "PAUSED":
      return { label: "On hold (campaign paused)", tone: "warning" };
    case "SENDING":
      return { label: "Sending…", tone: "info" };
    case "SENT":
      return message.openCount > 0
        ? { label: `Opened${message.openCount > 1 ? ` ${message.openCount}×` : ""}`, tone: "success" }
        : { label: "Sent", tone: "neutral" };
    case "DELIVERED":
      return message.openCount > 0
        ? { label: `Opened${message.openCount > 1 ? ` ${message.openCount}×` : ""}`, tone: "success" }
        : { label: "Delivered", tone: "success" };
    case "BOUNCED":
      return { label: "Bounced", tone: "danger" };
    case "COMPLAINED":
      return { label: "Marked as spam", tone: "danger" };
    case "FAILED":
      return { label: "Not sent", tone: "danger" };
    default:
      return null;
  }
}

export const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "border-zinc-800 bg-zinc-900 text-zinc-400",
  info: "border-sky-500/20 bg-sky-500/10 text-sky-300",
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  danger: "border-rose-500/20 bg-rose-500/10 text-rose-300",
};

export function htmlToText(html: string) {
  return (html || "")
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
