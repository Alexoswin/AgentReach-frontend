"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  Paperclip,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { MailAttachment, MailMessage } from "@/lib/api";
import { useOutreachStore } from "@/store/useOutreachStore";
import RichTextEditor from "./RichTextEditor";
import RecipientInput from "./RecipientInput";
import MessageBody from "./MessageBody";
import type { ComposeRequest } from "./ComposeProvider";
import { EMAIL_PATTERN, formatBytes, getErrorMessage } from "./mail-utils";

const AUTOSAVE_MS = 1200;
const UNDO_SECONDS = 10;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
// SES takes 10 MB per email once encoded, which leaves about 7 MB of files.
const MAX_TOTAL_ATTACHMENT_BYTES = 7 * 1024 * 1024;

export type SentEmail = {
  messageId: string;
  threadId: string;
  scheduled: boolean;
  sendAt: string;
  subject: string;
};

type Fields = {
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  html: string;
  attachments: MailAttachment[];
  trackOpens: boolean;
};

function signatureHtml(signature?: string) {
  return signature?.trim() ? `<p></p><p>--</p>${signature}` : "";
}

function fieldsFromDraft(draft: MailMessage): Fields {
  return {
    from: draft.from?.email || "",
    to: draft.to.map((address) => address.email),
    cc: draft.cc.map((address) => address.email),
    bcc: draft.bcc.map((address) => address.email),
    subject: draft.subject || "",
    html: draft.html || "",
    attachments: draft.attachments || [],
    trackOpens: draft.trackOpens,
  };
}

function payloadFrom(fields: Fields) {
  return {
    from: fields.from,
    to: fields.to,
    cc: fields.cc,
    bcc: fields.bcc,
    subject: fields.subject,
    html: fields.html,
    attachments: fields.attachments.map((attachment) => ({
      fileId: attachment.id,
      name: attachment.name,
    })),
    trackOpens: fields.trackOpens,
  };
}

function schedulePresets(now = new Date()) {
  const at = (days: number, hour: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    date.setHours(hour, 0, 0, 0);
    return date;
  };
  const daysToMonday = (8 - now.getDay()) % 7 || 7;
  return [
    { label: "Tomorrow morning", date: at(1, 8) },
    { label: "Tomorrow afternoon", date: at(1, 13) },
    { label: "Monday morning", date: at(daysToMonday, 8) },
  ];
}

/** One compose window: a new email, a reply or forward, or a saved draft. */
export default function ComposeWindow({
  request,
  onClose,
  onSent,
}: {
  request: ComposeRequest;
  onClose: () => void;
  onSent: (sent: SentEmail) => void;
}) {
  const queryClient = useQueryClient();
  const { showAlert } = useOutreachStore();
  const { data: senders } = useQuery({
    queryKey: ["mail-senders"],
    queryFn: api.mail.senders,
    staleTime: 5 * 60_000,
  });

  const initialDraft = request.kind === "draft" ? request.draft : null;
  const [draft, setDraft] = useState<MailMessage | null>(initialDraft);
  const [fields, setFields] = useState<Fields | null>(
    initialDraft ? fieldsFromDraft(initialDraft) : null,
  );
  const [showCc, setShowCc] = useState(Boolean(initialDraft?.cc.length));
  const [showBcc, setShowBcc] = useState(Boolean(initialDraft?.bcc.length));
  const [minimized, setMinimized] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    initialDraft ? "saved" : "idle",
  );
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [showQuoted, setShowQuoted] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [startError, setStartError] = useState<string | null>(null);

  const fieldsRef = useRef<Fields | null>(fields);
  const draftIdRef = useRef<string | null>(initialDraft?.id ?? null);
  const dirtyRef = useRef(false);
  const editedRef = useRef(false);
  const creatingRef = useRef(false);
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const timerRef = useRef<number | null>(null);

  // A new email starts once the default From address and signature are known.
  if (request.kind === "new" && fields === null && senders) {
    setFields({
      from: senders.defaultFrom || "",
      to: request.to || [],
      cc: [],
      bcc: [],
      subject: request.subject || "",
      html: signatureHtml(senders.signature),
      attachments: [],
      trackOpens: false,
    });
  }

  useEffect(() => {
    if (!dirtyRef.current) fieldsRef.current = fields;
  }, [fields]);

  // Replies and forwards are drafted on the server, which fills in the
  // recipients, subject and quoted original.
  useEffect(() => {
    if (request.kind === "new" || request.kind === "draft") return;
    if (!senders || creatingRef.current) return;
    creatingRef.current = true;
    api.mail
      .createDraft({
        mode: request.kind,
        sourceMessageId: request.sourceMessageId,
        html: signatureHtml(senders.signature),
      })
      .then((created) => {
        draftIdRef.current = created.id;
        fieldsRef.current = fieldsFromDraft(created);
        setDraft(created);
        setFields(fieldsRef.current);
        setShowCc(created.cc.length > 0);
        setSaveState("saved");
        queryClient.invalidateQueries({ queryKey: ["mail"] });
      })
      .catch((error) =>
        setStartError(getErrorMessage(error, "Could not start this email.")),
      );
  }, [request, senders, queryClient]);

  const save = useCallback(() => {
    const run = saveChain.current.then(async () => {
      const current = fieldsRef.current;
      if (!dirtyRef.current || !current) return;
      dirtyRef.current = false;
      setSaveState("saving");
      try {
        const payload = payloadFrom(current);
        const created = !draftIdRef.current;
        const saved = draftIdRef.current
          ? await api.mail.updateDraft(draftIdRef.current, payload)
          : await api.mail.createDraft({
              ...payload,
              contactId: request.kind === "new" ? request.contactId : undefined,
            });
        draftIdRef.current = saved.id;
        setDraft(saved);
        setSaveState("saved");
        if (created) queryClient.invalidateQueries({ queryKey: ["mail"] });
      } catch {
        dirtyRef.current = true;
        setSaveState("error");
      }
    });
    saveChain.current = run;
    return run;
  }, [queryClient, request]);

  // Closing the window some other way still keeps what was typed.
  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (dirtyRef.current) void save();
    },
    [save],
  );

  const update = (patch: Partial<Fields>) => {
    if (!fieldsRef.current) return;
    const next = { ...fieldsRef.current, ...patch };
    fieldsRef.current = next;
    dirtyRef.current = true;
    editedRef.current = true;
    setFields(next);
    setSaveState("idle");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void save(), AUTOSAVE_MS);
  };

  const close = async () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const id = draftIdRef.current;
    if (id && !editedRef.current && request.kind !== "draft") {
      // An untouched reply or forward is not worth keeping as a draft.
      dirtyRef.current = false;
      await api.mail.deleteDraft(id).catch(() => undefined);
      queryClient.invalidateQueries({ queryKey: ["mail"] });
    } else if (dirtyRef.current) {
      await save();
      queryClient.invalidateQueries({ queryKey: ["mail"] });
      showAlert("Your draft is saved in Drafts.", "info", "Draft saved");
    }
    onClose();
  };

  const discard = async () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    dirtyRef.current = false;
    await saveChain.current;
    if (draftIdRef.current) {
      await api.mail.deleteDraft(draftIdRef.current).catch(() => undefined);
      queryClient.invalidateQueries({ queryKey: ["mail"] });
    }
    onClose();
  };

  const send = async (sendAt?: Date) => {
    const current = fieldsRef.current;
    if (!current || sending) return;
    const recipients = [...current.to, ...current.cc, ...current.bcc];
    if (recipients.length === 0) {
      showAlert("Add at least one recipient.", "error");
      return;
    }
    const invalid = recipients.filter((address) => !EMAIL_PATTERN.test(address));
    if (invalid.length > 0) {
      showAlert(`Check these addresses: ${invalid.join(", ")}`, "error");
      return;
    }
    if (uploading > 0) {
      showAlert("Wait for the attachments to finish uploading.", "error");
      return;
    }
    if (!current.subject.trim() && !window.confirm("Send this email without a subject?")) {
      return;
    }

    setSending(true);
    setScheduleOpen(false);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    dirtyRef.current = true;
    await save();
    const id = draftIdRef.current;
    if (!id || dirtyRef.current) {
      setSending(false);
      showAlert("Could not save the email before sending. Please try again.", "error");
      return;
    }
    try {
      const result = await api.mail.sendDraft(
        id,
        sendAt ? { sendAt: sendAt.toISOString() } : { undoSeconds: UNDO_SECONDS },
      );
      queryClient.invalidateQueries({ queryKey: ["mail"] });
      if (result.scheduled) {
        showAlert(
          `It will be sent ${new Date(result.sendAt).toLocaleString()}. Find it under Scheduled.`,
          "success",
          "Email scheduled",
        );
      }
      onSent({
        messageId: id,
        threadId: result.threadId,
        scheduled: result.scheduled,
        sendAt: result.sendAt,
        subject: current.subject,
      });
    } catch (error) {
      setSending(false);
      showAlert(getErrorMessage(error, "Could not send this email."), "error");
    }
  };

  const addFiles = async (files: FileList | null) => {
    const list = Array.from(files || []);
    if (list.length === 0 || !fieldsRef.current) return;
    const tooBig = list.find((file) => file.size > MAX_ATTACHMENT_BYTES);
    if (tooBig) {
      showAlert(`${tooBig.name} is larger than 10 MB.`, "error");
      return;
    }
    const total =
      fieldsRef.current.attachments.reduce((sum, file) => sum + file.size, 0) +
      list.reduce((sum, file) => sum + file.size, 0);
    if (total > MAX_TOTAL_ATTACHMENT_BYTES) {
      showAlert(
        `Attachments can add up to ${formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)} per email. Share a link for bigger files.`,
        "error",
      );
      return;
    }
    setUploading((count) => count + list.length);
    for (const file of list) {
      try {
        const uploaded = await api.mail.uploadAttachment(file);
        update({ attachments: [...(fieldsRef.current?.attachments || []), uploaded] });
      } catch (error) {
        showAlert(getErrorMessage(error, `Could not attach ${file.name}.`), "error");
      } finally {
        setUploading((count) => count - 1);
      }
    }
  };

  const chooseOtherFrom = () => {
    const domains = senders?.domains || [];
    const value = window.prompt(
      domains.length
        ? `Send from which address? It must be at a domain verified in SES (${domains.join(", ")}).`
        : "Send from which address? It must be verified in your AWS SES account.",
      fields?.from || "",
    );
    if (value === null) return;
    const address = value.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(address)) {
      showAlert("That is not a valid email address.", "error");
      return;
    }
    update({ from: address });
  };

  const title =
    fields?.subject.trim() ||
    (request.kind === "new"
      ? "New message"
      : request.kind === "forward"
        ? "Forward"
        : request.kind === "draft"
          ? "Draft"
          : "Reply");
  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Draft saved"
        : saveState === "error"
          ? "Not saved"
          : "";
  const fromOptions = Array.from(
    new Set([...(senders?.addresses || []), fields?.from].filter(Boolean) as string[]),
  );

  const headerButtons = (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        title={minimized ? "Open" : "Minimize"}
        aria-label={minimized ? "Open" : "Minimize"}
        onClick={(event) => {
          event.stopPropagation();
          setMinimized((value) => !value);
          setExpanded(false);
        }}
        className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
      >
        <Minus className="h-4 w-4" />
      </button>
      {!minimized && (
        <button
          type="button"
          title={expanded ? "Exit full screen" : "Full screen"}
          aria-label={expanded ? "Exit full screen" : "Full screen"}
          onClick={() => setExpanded((value) => !value)}
          className="hidden rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white sm:block"
        >
          {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      )}
      <button
        type="button"
        title="Save and close"
        aria-label="Save and close"
        onClick={(event) => {
          event.stopPropagation();
          void close();
        }}
        className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  if (minimized) {
    return (
      <div className="pointer-events-auto w-full overflow-hidden rounded-t-xl border border-zinc-700 bg-zinc-900 shadow-2xl sm:w-72">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setMinimized(false)}
          onKeyDown={(event) => event.key === "Enter" && setMinimized(false)}
          className="flex cursor-pointer items-center gap-2 px-4 py-2.5"
        >
          <span className="flex-1 truncate text-sm font-semibold text-zinc-100">{title}</span>
          {headerButtons}
        </div>
      </div>
    );
  }

  return (
    <>
      {expanded && (
        <div
          className="pointer-events-auto fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        />
      )}
      <section
        aria-label={title}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void send();
          }
        }}
        className={`pointer-events-auto flex flex-col overflow-hidden border border-zinc-700 bg-zinc-950 shadow-2xl ${
          expanded
            ? "fixed inset-4 z-50 rounded-2xl lg:inset-x-[12%] lg:inset-y-10"
            : "h-[min(640px,88vh)] w-full rounded-t-2xl sm:w-[560px]"
        }`}
      >
        <header className="flex items-center gap-2 border-b border-zinc-850 bg-zinc-900 px-4 py-2.5">
          <h3 className="flex-1 truncate text-sm font-semibold text-zinc-100">{title}</h3>
          {saveLabel && <span className="text-[11px] text-zinc-500">{saveLabel}</span>}
          {headerButtons}
        </header>

        {!fields ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-zinc-500">
            {startError ? (
              <span className="text-rose-300">{startError}</span>
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
          </div>
        ) : (
          <>
            {senders && (!senders.sesConfigured || !senders.replyTrackingActive) && (
              <div className="flex items-start gap-2 border-b border-amber-500/20 bg-amber-500/5 px-4 py-2 text-[11px] leading-relaxed text-amber-200/80">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {!senders.sesConfigured
                    ? "Add your AWS SES credentials in Settings to send email."
                    : "Reply tracking is off, so replies will go to your sender address instead of this inbox."}{" "}
                  <Link href="/settings" className="font-semibold text-amber-300 underline">
                    Settings
                  </Link>
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 border-b border-zinc-850 px-4 py-1.5">
              <span className="w-8 shrink-0 text-xs text-zinc-500">From</span>
              <select
                value={fields.from}
                onChange={(event) =>
                  event.target.value === "__other"
                    ? chooseOtherFrom()
                    : update({ from: event.target.value })
                }
                className="min-w-0 flex-1 bg-transparent py-1 text-sm text-zinc-100 focus:outline-none"
              >
                {fromOptions.length === 0 && <option value="">Set a Sender Email in Settings</option>}
                {fromOptions.map((address) => (
                  <option key={address} value={address} className="bg-zinc-900">
                    {senders?.fromName ? `${senders.fromName} <${address}>` : address}
                  </option>
                ))}
                {(senders?.domains.length || 0) > 0 && (
                  <option value="__other" className="bg-zinc-900">
                    Another address…
                  </option>
                )}
              </select>
            </div>

            <RecipientInput
              label="To"
              values={fields.to}
              onChange={(to) => update({ to })}
              autoFocus={request.kind === "new" && !request.to?.length}
              trailing={
                <div className="mt-1 flex shrink-0 gap-2 text-xs text-zinc-500">
                  {!showCc && (
                    <button type="button" onClick={() => setShowCc(true)} className="hover:text-zinc-200">
                      Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button type="button" onClick={() => setShowBcc(true)} className="hover:text-zinc-200">
                      Bcc
                    </button>
                  )}
                </div>
              }
            />
            {showCc && (
              <RecipientInput label="Cc" values={fields.cc} onChange={(cc) => update({ cc })} />
            )}
            {showBcc && (
              <RecipientInput label="Bcc" values={fields.bcc} onChange={(bcc) => update({ bcc })} />
            )}
            <input
              type="text"
              value={fields.subject}
              onChange={(event) => update({ subject: event.target.value })}
              placeholder="Subject"
              aria-label="Subject"
              className="border-b border-zinc-850 bg-transparent px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />

            <RichTextEditor
              value={fields.html}
              onChange={(html) => update({ html })}
              autoFocus={request.kind !== "new" || Boolean(request.to?.length)}
              minHeight={140}
              className="min-h-0 flex-1"
            />

            {draft?.quotedHtml || draft?.quotedText ? (
              <div className="border-t border-zinc-850 px-4 py-2">
                <button
                  type="button"
                  title={showQuoted ? "Hide the quoted email" : "Show the quoted email"}
                  onClick={() => setShowQuoted((value) => !value)}
                  className="rounded-md bg-zinc-850 px-2 py-0.5 text-xs font-bold tracking-widest text-zinc-400 hover:text-zinc-200"
                >
                  •••
                </button>
                {showQuoted && (
                  <div className="mt-2 max-h-48 overflow-y-auto">
                    <MessageBody html={draft.quotedHtml} text={draft.quotedText} blockRemoteImages />
                  </div>
                )}
              </div>
            ) : null}

            {(fields.attachments.length > 0 || uploading > 0) && (
              <div className="flex flex-wrap gap-2 border-t border-zinc-850 px-4 py-2">
                {fields.attachments.map((attachment) => (
                  <span
                    key={attachment.id}
                    className="flex max-w-[16rem] items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
                  >
                    <Paperclip className="h-3 w-3 shrink-0 text-zinc-500" />
                    <span className="truncate">{attachment.name}</span>
                    <span className="shrink-0 text-zinc-600">{formatBytes(attachment.size)}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${attachment.name}`}
                      onClick={() =>
                        update({
                          attachments: fields.attachments.filter((item) => item.id !== attachment.id),
                        })
                      }
                      className="text-zinc-500 hover:text-rose-300"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {uploading > 0 && (
                  <span className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Uploading {uploading}…
                  </span>
                )}
              </div>
            )}

            <footer className="relative flex items-center gap-2 border-t border-zinc-850 px-3 py-2.5">
              <div className="flex overflow-hidden rounded-full">
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => void send()}
                  title="Send (Ctrl+Enter)"
                  className="flex items-center gap-1.5 bg-gradient-to-tr from-indigo-500 to-purple-600 px-4 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-60"
                >
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Send
                </button>
                <button
                  type="button"
                  disabled={sending}
                  aria-label="Schedule send"
                  title="Schedule send"
                  onClick={() => setScheduleOpen((value) => !value)}
                  className="border-l border-white/20 bg-gradient-to-tr from-indigo-500 to-purple-600 px-2 text-white hover:brightness-110 disabled:opacity-60"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <label
                title="Attach files"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-850 hover:text-white"
              >
                <Paperclip className="h-4 w-4" />
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={async (event) => {
                    const input = event.currentTarget;
                    await addFiles(input.files);
                    input.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                title={fields.trackOpens ? "Open tracking is on" : "Track when it is opened"}
                aria-pressed={fields.trackOpens}
                onClick={() => update({ trackOpens: !fields.trackOpens })}
                className={`flex h-8 items-center gap-1 rounded-full px-2 text-xs ${
                  fields.trackOpens
                    ? "bg-indigo-500/15 text-indigo-300"
                    : "text-zinc-400 hover:bg-zinc-850 hover:text-white"
                }`}
              >
                {fields.trackOpens ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                <span className="hidden sm:inline">Track opens</span>
              </button>
              <div className="flex-1" />
              <button
                type="button"
                title="Discard draft"
                aria-label="Discard draft"
                onClick={() => void discard()}
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-rose-500/10 hover:text-rose-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              {scheduleOpen && (
                <div className="absolute bottom-full left-3 z-20 mb-2 w-72 rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-2xl">
                  <p className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Schedule send
                  </p>
                  {schedulePresets().map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => void send(preset.date)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                    >
                      <span>{preset.label}</span>
                      <span className="text-xs text-zinc-500">
                        {preset.date.toLocaleString([], {
                          weekday: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </button>
                  ))}
                  <div className="mt-1 flex items-center gap-2 border-t border-zinc-800 px-2 pt-2">
                    <Clock className="h-4 w-4 shrink-0 text-zinc-500" />
                    <input
                      type="datetime-local"
                      value={customTime}
                      onChange={(event) => setCustomTime(event.target.value)}
                      aria-label="Pick a date and time"
                      className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-200"
                    />
                    <button
                      type="button"
                      disabled={!customTime}
                      onClick={() => void send(new Date(customTime))}
                      className="rounded-lg bg-indigo-500 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40"
                    >
                      Set
                    </button>
                  </div>
                </div>
              )}
            </footer>
          </>
        )}
      </section>
    </>
  );
}
