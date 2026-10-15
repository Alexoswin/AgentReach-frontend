"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, CheckSquare, Mail, MailOpen, Megaphone, Paperclip, Square, Star, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { BulkThreadAction, MailFolder, MailThreadSummary } from "@/lib/api";
import type { Paginated } from "@/lib/pagination";
import { useOutreachStore } from "@/store/useOutreachStore";
import { addressName, formatListTime, getErrorMessage } from "./mail-utils";

function ThreadRow({
  thread,
  active,
  selected,
  folder,
  onOpen,
  onToggleSelect,
}: {
  thread: MailThreadSummary;
  active: boolean;
  selected: boolean;
  folder: MailFolder;
  onOpen: () => void;
  onToggleSelect: () => void;
}) {
  const queryClient = useQueryClient();
  const unread = thread.unreadCount > 0;
  const people =
    thread.participants.length > 0
      ? thread.participants.map(addressName).join(", ")
      : "(no recipients)";
  const toggleStar = useMutation({
    mutationFn: () => api.mail.updateThread(thread.id, { starred: !thread.starred }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mail"] }),
  });
  const quickAction = useMutation({
    mutationFn: (data: Parameters<typeof api.mail.updateThread>[1]) =>
      api.mail.updateThread(thread.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mail"] }),
  });

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => event.key === "Enter" && onOpen()}
      className={`group flex cursor-pointer items-start gap-2 px-3 py-2.5 transition-colors ${
        active ? "bg-indigo-500/10" : unread ? "bg-zinc-900/60 hover:bg-zinc-900" : "hover:bg-zinc-900/60"
      }`}
    >
      <button
        type="button"
        aria-label={selected ? "Deselect" : "Select"}
        onClick={(event) => {
          event.stopPropagation();
          onToggleSelect();
        }}
        className="mt-1 shrink-0 text-zinc-600 hover:text-zinc-300"
      >
        {selected ? <CheckSquare className="h-4 w-4 text-indigo-400" /> : <Square className="h-4 w-4" />}
      </button>
      <button
        type="button"
        aria-label={thread.starred ? "Unstar" : "Star"}
        onClick={(event) => {
          event.stopPropagation();
          toggleStar.mutate();
        }}
        className="mt-1 shrink-0 text-zinc-700 hover:text-amber-300"
      >
        <Star className={`h-4 w-4 ${thread.starred ? "fill-amber-400 text-amber-400" : ""}`} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`truncate text-sm ${unread ? "font-bold text-white" : "text-zinc-300"}`}>
            {people}
          </span>
          {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />}
          {thread.hasAttachments && <Paperclip className="h-3 w-3 shrink-0 text-zinc-600" />}
          {thread.scheduledCount > 0 && (
            <span className="shrink-0 rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">
              Scheduled
            </span>
          )}
          <span className="ml-auto shrink-0 text-[11px] text-zinc-500 group-hover:hidden">
            {formatListTime(thread.lastActivityAt || thread.lastMessageAt)}
          </span>
          <span className="ml-auto hidden shrink-0 items-center gap-0.5 group-hover:flex">
            {folder !== "trash" && folder !== "archive" && (
              <button
                type="button"
                title="Archive"
                onClick={(event) => {
                  event.stopPropagation();
                  quickAction.mutate({ archived: true });
                }}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            )}
            {folder !== "trash" && (
              <button
                type="button"
                title="Trash"
                onClick={(event) => {
                  event.stopPropagation();
                  quickAction.mutate({ trashed: true });
                }}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              title={unread ? "Mark as read" : "Mark as unread"}
              onClick={(event) => {
                event.stopPropagation();
                quickAction.mutate({ read: !unread });
              }}
              className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
            >
              {unread ? <Mail className="h-3.5 w-3.5" /> : <MailOpen className="h-3.5 w-3.5" />}
            </button>
          </span>
        </div>
        <p className={`truncate text-xs ${unread ? "text-zinc-300" : "text-zinc-500"}`}>
          {thread.subject || "(no subject)"}
          {thread.snippet ? ` — ${thread.snippet}` : ""}
        </p>
        {thread.campaign && (
          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            <span className="flex min-w-0 items-center gap-1 rounded-full border border-purple-500/20 bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-300">
              <Megaphone className="h-3 w-3 shrink-0" />
              <span className="truncate">{thread.campaign.name}</span>
            </span>
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                thread.hasInbound ? "bg-emerald-500/10 text-emerald-300" : "bg-zinc-850 text-zinc-500"
              }`}
            >
              {thread.hasInbound ? "Replied" : "No reply yet"}
            </span>
          </div>
        )}
      </div>
    </li>
  );
}

const BULK_ACTIONS: { action: BulkThreadAction; label: string; icon: typeof Archive }[] = [
  { action: "read", label: "Mark read", icon: MailOpen },
  { action: "archive", label: "Archive", icon: Archive },
  { action: "trash", label: "Delete", icon: Trash2 },
];

export default function ThreadList({
  folder,
  page,
  activeId,
  selectedIds,
  onSelectedIdsChange,
  onOpen,
  isLoading,
}: {
  folder: MailFolder;
  page: Paginated<MailThreadSummary> | undefined;
  activeId: string | null;
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
  onOpen: (thread: MailThreadSummary) => void;
  isLoading: boolean;
}) {
  const queryClient = useQueryClient();
  const { showAlert } = useOutreachStore();
  const items = page?.items || [];
  const bulk = useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: BulkThreadAction }) =>
      api.mail.bulk(ids, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mail"] });
      onSelectedIdsChange(new Set());
    },
    onError: (error) => showAlert(getErrorMessage(error, "Could not update those conversations."), "error"),
  });

  if (isLoading) {
    return (
      <ul className="divide-y divide-zinc-850">
        {[1, 2, 3, 4, 5].map((n) => (
          <li key={n} className="h-[62px] animate-pulse bg-zinc-900/40" />
        ))}
      </ul>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center text-sm text-zinc-500">
        <Mail className="h-7 w-7 text-zinc-700" />
        Nothing here.
      </div>
    );
  }

  const allSelected = items.length > 0 && items.every((thread) => selectedIds.has(thread.id));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-zinc-850 px-3 py-1.5">
        <button
          type="button"
          aria-label={allSelected ? "Deselect all" : "Select all"}
          onClick={() =>
            onSelectedIdsChange(allSelected ? new Set() : new Set(items.map((thread) => thread.id)))
          }
          className="p-1 text-zinc-600 hover:text-zinc-300"
        >
          {allSelected ? <CheckSquare className="h-4 w-4 text-indigo-400" /> : <Square className="h-4 w-4" />}
        </button>
        {selectedIds.size > 0 ? (
          <div className="flex items-center gap-1">
            <span className="px-1 text-xs text-zinc-500">{selectedIds.size} selected</span>
            {BULK_ACTIONS.map(({ action, label, icon: Icon }) => (
              <button
                key={action}
                type="button"
                title={label}
                disabled={bulk.isPending}
                onClick={() => bulk.mutate({ ids: Array.from(selectedIds), action })}
                className="rounded p-1.5 text-zinc-400 hover:bg-zinc-850 hover:text-white disabled:opacity-40"
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        ) : (
          <span className="px-1 text-xs text-zinc-600">{page?.total ?? 0} conversations</span>
        )}
      </div>
      <ul className="flex-1 divide-y divide-zinc-850 overflow-y-auto">
        {items.map((thread) => (
          <ThreadRow
            key={thread.id}
            thread={thread}
            folder={folder}
            active={thread.id === activeId}
            selected={selectedIds.has(thread.id)}
            onOpen={() => onOpen(thread)}
            onToggleSelect={() => {
              const next = new Set(selectedIds);
              if (next.has(thread.id)) next.delete(thread.id);
              else next.add(thread.id);
              onSelectedIdsChange(next);
            }}
          />
        ))}
      </ul>
    </div>
  );
}
