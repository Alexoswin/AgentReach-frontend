"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { MailMessage } from "@/lib/api";
import ComposeWindow from "./ComposeWindow";
import type { SentEmail } from "./ComposeWindow";
import SendUndoToast from "./SendUndoToast";

export type ComposeRequest =
  | { kind: "new"; to?: string[]; subject?: string; contactId?: string }
  | { kind: "reply" | "replyAll" | "forward"; sourceMessageId: string }
  | { kind: "draft"; draft: MailMessage };

type ComposeEntry = { key: number; request: ComposeRequest };

const MAX_WINDOWS = 3;

const ComposeContext = createContext<{
  openCompose: (request: ComposeRequest) => void;
} | null>(null);

export function useCompose() {
  const context = useContext(ComposeContext);
  if (!context) throw new Error("useCompose must be used inside ComposeProvider");
  return context;
}

/**
 * Compose windows docked at the bottom of every dashboard page, like Gmail,
 * plus the "Undo" toast shown while a sent email waits in the queue.
 */
export default function ComposeProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<ComposeEntry[]>([]);
  const [pending, setPending] = useState<SentEmail | null>(null);
  const nextKey = useRef(0);

  const openCompose = useCallback((request: ComposeRequest) => {
    nextKey.current += 1;
    const key = nextKey.current;
    setWindows((current) => {
      if (
        request.kind === "draft" &&
        current.some(
          (entry) => entry.request.kind === "draft" && entry.request.draft.id === request.draft.id,
        )
      ) {
        return current;
      }
      return [...current, { key, request }].slice(-MAX_WINDOWS);
    });
  }, []);

  const close = (key: number) =>
    setWindows((current) => current.filter((entry) => entry.key !== key));
  const clearPending = useCallback(() => setPending(null), []);

  const value = useMemo(() => ({ openCompose }), [openCompose]);

  return (
    <ComposeContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex items-end justify-end gap-3 sm:right-4 sm:left-auto">
        {windows.map((entry) => (
          <ComposeWindow
            key={entry.key}
            request={entry.request}
            onClose={() => close(entry.key)}
            onSent={(sent) => {
              close(entry.key);
              if (!sent.scheduled) setPending(sent);
            }}
          />
        ))}
      </div>
      {pending && (
        <SendUndoToast
          key={pending.messageId}
          pending={pending}
          onUndone={(draft) => {
            setPending(null);
            openCompose({ kind: "draft", draft });
          }}
          onDone={clearPending}
        />
      )}
    </ComposeContext.Provider>
  );
}
