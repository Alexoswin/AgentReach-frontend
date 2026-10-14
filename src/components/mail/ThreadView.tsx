"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Bot,
  ChevronDown,
  Download,
  Forward,
  Loader2,
  Mail,
  MailOpen,
  Megaphone,
  Paperclip,
  PenLine,
  PhoneCall,
  Reply,
  ReplyAll,
  Star,
  Trash2,
  Undo2,
  UserRound,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { MailAttachment, MailMessage, MailThreadDetail } from "@/lib/api";
import { useOutreachStore } from "@/store/useOutreachStore";
import { useCompose } from "./ComposeProvider";
import MessageBody from "./MessageBody";
import {
  addressLine,
  addressName,
  formatBytes,
  formatFullTime,
  getErrorMessage,
  initials,
  outboundStatus,
  TONE_CLASSES,
} from "./mail-utils";

async function downloadAttachment(attachment: MailAttachment) {
  const blob = await api.mail.downloadAttachment(attachment.id);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = attachment.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function AttachmentChip({ attachment }: { attachment: MailAttachment }) {
  const { showAlert } = useOutreachStore();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadAttachment(attachment);
        } catch (error) {
          showAlert(getErrorMessage(error, "Could not download that file."), "error");
        } finally {
          setBusy(false);
        }
      }}
      className="flex max-w-[16rem] items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-left text-xs text-zinc-300 hover:border-indigo-500/40"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
      ) : (
        <Paperclip className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
      )}
      <span className="truncate">{attachment.name}</span>
      <span className="shrink-0 text-zinc-600">{formatBytes(attachment.size)}</span>
      <Download className="h-3 w-3 shrink-0 text-zinc-500" />
    </button>
  );
}

function recipientsLine(message: MailMessage) {
  const people = [...message.to, ...message.cc].map(addressName);
  return people.length > 3 ? `${people.slice(0, 3).join(", ")} +${people.length - 3}` : people.join(", ");
}

function MessageCard({
  message,
  expanded,
  onToggle,
  onReply,
}: {
  message: MailMessage;
  expanded: boolean;
  onToggle: () => void;
  onReply: (kind: "reply" | "replyAll" | "forward", message: MailMessage) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [showQuoted, setShowQuoted] = useState(false);
  const status = outboundStatus(message);
  const time = message.receivedAt || message.sentAt || message.sendAt || message.createdAt;
  const files = message.attachments.filter((attachment) => !attachment.inline);
  const unread = message.direction === "INBOUND" && !message.readAt;
  const manyRecipients = message.to.length + message.cc.length > 1;

  return (
    <article className="rounded-2xl border border-zinc-850 bg-zinc-900/40">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(event) => event.key === "Enter" && onToggle()}
        className="flex cursor-pointer items-start gap-3 px-4 py-3"
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            message.direction === "OUTBOUND"
              ? "bg-indigo-500/15 text-indigo-300"
              : "bg-zinc-800 text-zinc-200"
          }`}
        >
          {initials(message.from)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`truncate text-sm ${unread ? "font-bold text-white" : "font-semibold text-zinc-100"}`}>
              {message.direction === "OUTBOUND" ? "You" : addressName(message.from)}
            </span>
            {message.direction === "INBOUND" && message.from?.email && (
              <span className="truncate text-xs text-zinc-500">&lt;{message.from.email}&gt;</span>
            )}
            {message.automated && (
              <span className="flex items-center gap-1 rounded-full border border-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
                <Bot className="h-3 w-3" /> Auto-reply
              </span>
            )}
            {status && (
              <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${TONE_CLASSES[status.tone]}`}>
                {status.label}
              </span>
            )}
            {message.source === "CAMPAIGN" && (
              <span className="flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-300">
                <Megaphone className="h-3 w-3" /> Campaign
              </span>
            )}
            <span className="ml-auto shrink-0 text-xs text-zinc-500">{formatFullTime(time)}</span>
          </div>
          {expanded ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setShowDetails((value) => !value);
              }}
              className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
            >
              to {recipientsLine(message) || "(no recipients)"}
              <ChevronDown className="h-3 w-3" />
            </button>
          ) : (
            <p className="mt-0.5 truncate text-xs text-zinc-500">{message.snippet}</p>
          )}
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 px-4 pb-4">
          {showDetails && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl border border-zinc-850 bg-zinc-950/60 p-3 text-xs">
              <dt className="text-zinc-500">From</dt>
              <dd className="text-zinc-300">{addressLine(message.from)}</dd>
              <dt className="text-zinc-500">To</dt>
              <dd className="text-zinc-300">{message.to.map(addressLine).join(", ") || "—"}</dd>
              {message.cc.length > 0 && (
                <>
                  <dt className="text-zinc-500">Cc</dt>
                  <dd className="text-zinc-300">{message.cc.map(addressLine).join(", ")}</dd>
                </>
              )}
              {message.bcc.length > 0 && (
                <>
                  <dt className="text-zinc-500">Bcc</dt>
                  <dd className="text-zinc-300">{message.bcc.map(addressLine).join(", ")}</dd>
                </>
              )}
              <dt className="text-zinc-500">Date</dt>
              <dd className="text-zinc-300">{time ? new Date(time).toLocaleString() : ""}</dd>
              {message.subject && (
                <>
                  <dt className="text-zinc-500">Subject</dt>
                  <dd className="text-zinc-300">{message.subject}</dd>
                </>
              )}
              {message.firstOpenedAt && (
                <>
                  <dt className="text-zinc-500">Opened</dt>
                  <dd className="text-zinc-300">
                    {new Date(message.firstOpenedAt).toLocaleString()}
                    {message.openCount > 1 ? ` (${message.openCount} times)` : ""}
                  </dd>
                </>
              )}
            </dl>
          )}

          {message.lastError && ["FAILED", "BOUNCED", "COMPLAINED"].includes(message.status) && (
            <p className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">
              {message.lastError}
            </p>
          )}

          <MessageBody
            html={message.html}
            text={message.text}
            attachments={message.attachments}
            blockRemoteImages={message.direction === "INBOUND"}
          />

          {(message.quotedHtml || message.quotedText) && (
            <div>
              <button
                type="button"
                title={showQuoted ? "Hide the quoted email" : "Show the quoted email"}
                onClick={() => setShowQuoted((value) => !value)}
                className="rounded-md bg-zinc-850 px-2 py-0.5 text-xs font-bold tracking-widest text-zinc-400 hover:text-zinc-200"
              >
                •••
              </button>
              {showQuoted && (
                <div className="mt-2">
                  <MessageBody html={message.quotedHtml} text={message.quotedText} blockRemoteImages />
                </div>
              )}
            </div>
          )}

          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((attachment) => (
                <AttachmentChip key={attachment.id} attachment={attachment} />
              ))}
            </div>
          )}

          {message.status !== "DRAFT" && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => onReply("reply", message)}
                className="flex items-center gap-1.5 rounded-full border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-indigo-500/40 hover:text-white"
              >
                <Reply className="h-3.5 w-3.5" /> Reply
              </button>
              {manyRecipients && (
                <button
                  type="button"
                  onClick={() => onReply("replyAll", message)}
                  className="flex items-center gap-1.5 rounded-full border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-indigo-500/40 hover:text-white"
                >
                  <ReplyAll className="h-3.5 w-3.5" /> Reply all
                </button>
              )}
              <button
                type="button"
                onClick={() => onReply("forward", message)}
                className="flex items-center gap-1.5 rounded-full border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-indigo-500/40 hover:text-white"
              >
                <Forward className="h-3.5 w-3.5" /> Forward
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function ContactPanel({ email, onClose }: { email: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["mail", "contact-context", email],
    queryFn: () => api.mail.contactContext(email),
  });
  const contact = data?.contact;

  return (
    <aside className="space-y-4 rounded-2xl border border-zinc-850 bg-zinc-900/40 p-4">
      <div className="flex items-center justify-between">
        <p className="sig-label text-zinc-500">Contact</p>
        <button type="button" aria-label="Close contact details" onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
          <X className="h-4 w-4" />
        </button>
      </div>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
      ) : !contact ? (
        <div className="space-y-2 text-xs text-zinc-500">
          <p className="break-all text-sm text-zinc-300">{email}</p>
          <p>Not in your contacts yet.</p>
          <Link href="/contacts" className="font-semibold text-indigo-300 hover:text-indigo-200">
            Add contacts
          </Link>
        </div>
      ) : (
        <>
          <div>
            <p className="text-sm font-bold text-white">
              {`${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.email}
            </p>
            {(contact.jobTitle || contact.company) && (
              <p className="text-xs text-zinc-400">
                {[contact.jobTitle, contact.company].filter(Boolean).join(" · ")}
              </p>
            )}
            <p className="mt-1 break-all text-xs text-zinc-500">{contact.email}</p>
            {contact.phoneNumber && <p className="text-xs text-zinc-500">{contact.phoneNumber}</p>}
            {contact.linkedinUrl && (
              <a
                href={contact.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-indigo-300 hover:text-indigo-200"
              >
                LinkedIn
              </a>
            )}
          </div>
          {contact.notes && (
            <p className="whitespace-pre-wrap rounded-xl bg-zinc-950/60 p-2 text-xs text-zinc-400">{contact.notes}</p>
          )}
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
              <Megaphone className="h-3.5 w-3.5" /> Campaigns
            </p>
            {data!.campaigns.length === 0 ? (
              <p className="text-xs text-zinc-600">None yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {data!.campaigns.map((campaign) => (
                  <li key={`${campaign.id}-${campaign.sentTime}`} className="rounded-lg bg-zinc-950/60 px-2 py-1.5 text-xs">
                    <p className="truncate text-zinc-200">{campaign.name}</p>
                    <p className="text-zinc-500">
                      {campaign.deliveryStatus.toLowerCase()}
                      {campaign.opened ? " · opened" : ""}
                      {campaign.replied ? " · replied" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
              <PhoneCall className="h-3.5 w-3.5" /> Calls
            </p>
            {data!.calls.length === 0 ? (
              <p className="text-xs text-zinc-600">No calls yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {data!.calls.map((call) => (
                  <li key={call.id} className="rounded-lg bg-zinc-950/60 px-2 py-1.5 text-xs">
                    <p className="text-zinc-200">
                      {call.outcome.toLowerCase()} · {Math.round((call.duration || 0) / 60)} min
                    </p>
                    <p className="text-zinc-500">{new Date(call.timestamp).toLocaleDateString()}</p>
                    {call.summary && <p className="mt-1 line-clamp-3 text-zinc-400">{call.summary}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

/** One conversation: its messages, drafts, and the actions on it. */
export default function ThreadView({
  thread,
  isLoading,
  onBack,
  onAfterRemove,
}: {
  thread: MailThreadDetail | undefined;
  isLoading: boolean;
  onBack: () => void;
  onAfterRemove: () => void;
}) {
  const queryClient = useQueryClient();
  const { showAlert } = useOutreachStore();
  const { openCompose } = useCompose();
  const [expanded, setExpanded] = useState<{ threadId: string | null; ids: Set<string> }>({
    threadId: null,
    ids: new Set(),
  });
  const [contactOpen, setContactOpen] = useState(false);

  const sent = thread?.messages.filter((message) => message.status !== "DRAFT") || [];
  const drafts = thread?.messages.filter((message) => message.status === "DRAFT") || [];

  // A newly opened conversation shows its latest and unread messages.
  if (thread && expanded.threadId !== thread.id) {
    const open = new Set(
      sent
        .filter((message, index) => index === sent.length - 1 || (message.direction === "INBOUND" && !message.readAt))
        .map((message) => message.id),
    );
    setExpanded({ threadId: thread.id, ids: open });
  }

  const update = useMutation({
    mutationFn: (data: Parameters<typeof api.mail.updateThread>[1]) =>
      api.mail.updateThread(thread!.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mail"] }),
    onError: (error) => showAlert(getErrorMessage(error, "Could not update this conversation."), "error"),
  });

  const remove = useMutation({
    mutationFn: () => api.mail.deleteThread(thread!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mail"] });
      showAlert("The conversation was deleted for good.", "info", "Deleted");
      onAfterRemove();
    },
    onError: (error) => showAlert(getErrorMessage(error, "Could not delete this conversation."), "error"),
  });

  const discardDraft = useMutation({
    mutationFn: (id: string) => api.mail.deleteDraft(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mail"] }),
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center py-20 text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!thread) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-20 text-center text-sm text-zinc-500">
        <Mail className="h-8 w-8 text-zinc-700" />
        Select a conversation to read it.
      </div>
    );
  }

  const reply = (kind: "reply" | "replyAll" | "forward", message: MailMessage) =>
    openCompose({ kind, sourceMessageId: message.id });
  const contactEmail =
    thread.contact?.email ||
    sent.find((message) => message.direction === "INBOUND")?.from?.email ||
    thread.participants[0]?.email ||
    "";
  const actionClass =
    "flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-850 hover:text-white disabled:opacity-40";

  return (
    <div className="flex flex-col gap-4 xl:flex-row">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex items-start gap-2">
          <button type="button" onClick={onBack} aria-label="Back to list" className={`${actionClass} lg:hidden`}>
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-lg font-bold text-white">{thread.subject || "(no subject)"}</h2>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {thread.campaign && (
                <Link
                  href={`/email-campaigns?campaign=${thread.campaign.id}`}
                  className="flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[11px] text-purple-300 hover:text-purple-200"
                >
                  <Megaphone className="h-3 w-3" /> {thread.campaign.name}
                </Link>
              )}
              {thread.trashed && (
                <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[11px] text-zinc-500">Trash</span>
              )}
              {thread.archived && !thread.trashed && (
                <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[11px] text-zinc-500">Archived</span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              title={thread.starred ? "Unstar (s)" : "Star (s)"}
              onClick={() => update.mutate({ starred: !thread.starred })}
              className={actionClass}
            >
              <Star className={`h-4 w-4 ${thread.starred ? "fill-amber-400 text-amber-400" : ""}`} />
            </button>
            {!thread.trashed &&
              (thread.archived ? (
                <button type="button" title="Move to Inbox" onClick={() => update.mutate({ archived: false })} className={actionClass}>
                  <ArchiveRestore className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  title="Archive (e)"
                  onClick={() => {
                    update.mutate({ archived: true });
                    onAfterRemove();
                  }}
                  className={actionClass}
                >
                  <Archive className="h-4 w-4" />
                </button>
              ))}
            <button type="button" title="Mark as unread" onClick={() => update.mutate({ read: false })} className={actionClass}>
              <MailOpen className="h-4 w-4" />
            </button>
            {thread.trashed ? (
              <>
                <button type="button" title="Restore" onClick={() => update.mutate({ trashed: false })} className={actionClass}>
                  <Undo2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Delete forever"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm("Delete this conversation for good? This cannot be undone.")) remove.mutate();
                  }}
                  className={`${actionClass} hover:text-rose-300`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                title="Move to Trash (#)"
                onClick={() => {
                  update.mutate({ trashed: true });
                  onAfterRemove();
                }}
                className={actionClass}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            {contactEmail && (
              <button
                type="button"
                title="Contact details"
                aria-pressed={contactOpen}
                onClick={() => setContactOpen((value) => !value)}
                className={`${actionClass} ${contactOpen ? "bg-zinc-850 text-white" : ""}`}
              >
                <UserRound className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {sent.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              expanded={expanded.ids.has(message.id)}
              onToggle={() =>
                setExpanded((current) => {
                  const ids = new Set(current.ids);
                  if (ids.has(message.id)) ids.delete(message.id);
                  else ids.add(message.id);
                  return { ...current, ids };
                })
              }
              onReply={reply}
            />
          ))}

          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 px-4 py-3"
            >
              <PenLine className="h-4 w-4 text-amber-300" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-200">Draft</p>
                <p className="truncate text-xs text-zinc-400">
                  {draft.snippet || draft.subject || "(empty draft)"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openCompose({ kind: "draft", draft })}
                className="rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/25"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => discardDraft.mutate(draft.id)}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-rose-300"
              >
                Discard
              </button>
            </div>
          ))}
        </div>

        {sent.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => reply("reply", sent[sent.length - 1])}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 px-4 py-2 text-xs font-bold text-white hover:brightness-110"
            >
              <Reply className="h-3.5 w-3.5" /> Reply
            </button>
            <button
              type="button"
              onClick={() => reply("replyAll", sent[sent.length - 1])}
              className="flex items-center gap-1.5 rounded-full border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white"
            >
              <ReplyAll className="h-3.5 w-3.5" /> Reply all
            </button>
            <button
              type="button"
              onClick={() => reply("forward", sent[sent.length - 1])}
              className="flex items-center gap-1.5 rounded-full border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white"
            >
              <Forward className="h-3.5 w-3.5" /> Forward
            </button>
          </div>
        )}
      </div>

      {contactOpen && contactEmail && (
        <div className="w-full shrink-0 xl:w-72">
          <ContactPanel email={contactEmail} onClose={() => setContactOpen(false)} />
        </div>
      )}
    </div>
  );
}
