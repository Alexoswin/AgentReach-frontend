"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { MailMessage } from "@/lib/api";
import { useOutreachStore } from "@/store/useOutreachStore";
import type { SentEmail } from "./ComposeWindow";
import { getErrorMessage } from "./mail-utils";

/** "Sending… Undo" while the email waits out its undo delay in the queue. */
export default function SendUndoToast({
  pending,
  onUndone,
  onDone,
}: {
  pending: SentEmail;
  onUndone: (draft: MailMessage) => void;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const { showAlert } = useOutreachStore();
  const [now, setNow] = useState(() => Date.now());
  const [undoing, setUndoing] = useState(false);
  const until = new Date(pending.sendAt).getTime();
  const remaining = Math.max(0, Math.ceil((until - now) / 1000));

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 250);
    const hide = window.setTimeout(onDone, Math.max(0, until - Date.now()) + 4000);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(hide);
    };
  }, [until, onDone]);

  const undo = async () => {
    setUndoing(true);
    try {
      const draft = await api.mail.cancelSend(pending.messageId);
      queryClient.invalidateQueries({ queryKey: ["mail"] });
      showAlert("Sending undone. Your draft is open again.", "info", "Undone");
      onUndone(draft);
    } catch (error) {
      showAlert(getErrorMessage(error, "Too late to undo: the email is already sent."), "error");
      onDone();
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 shadow-2xl">
      {remaining > 0 ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-indigo-300" />
          <span>Sending in {remaining}s…</span>
          <button
            type="button"
            disabled={undoing}
            onClick={undo}
            className="font-bold text-indigo-300 hover:text-indigo-200 disabled:opacity-50"
          >
            {undoing ? "Undoing…" : "Undo"}
          </button>
        </>
      ) : (
        <>
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Message sent{pending.subject ? `: ${pending.subject}` : ""}</span>
        </>
      )}
    </div>
  );
}
