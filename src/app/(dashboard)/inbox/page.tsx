"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlertTriangle,
  Archive,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Inbox,
  Loader2,
  Megaphone,
  PenSquare,
  Search,
  Send,
  Star,
  Trash2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import type { MailFolder, MailThreadSummary } from "@/lib/api";
import { useDebouncedValue } from "@/lib/pagination";
import { useCompose } from "@/components/mail/ComposeProvider";
import ThreadList from "@/components/mail/ThreadList";
import ThreadView from "@/components/mail/ThreadView";
import { FOLDER_LABELS, isMailFolder } from "@/components/mail/mail-utils";

const PAGE_SIZE = 50;

const FOLDERS: { id: MailFolder; icon: LucideIcon; count?: "inbox" | "campaigns" | "drafts" | "scheduled" }[] = [
  { id: "inbox", icon: Inbox, count: "inbox" },
  { id: "campaigns", icon: Megaphone, count: "campaigns" },
  { id: "starred", icon: Star },
  { id: "sent", icon: Send },
  { id: "drafts", icon: FileText, count: "drafts" },
  { id: "scheduled", icon: Clock, count: "scheduled" },
  { id: "archive", icon: Archive },
  { id: "trash", icon: Trash2 },
];

function isTyping(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return Boolean(
    element &&
      (element.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)),
  );
}

function Mailbox() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { openCompose } = useCompose();
  const searchRef = useRef<HTMLInputElement>(null);

  const folderParam = searchParams.get("folder");
  const folder: MailFolder = isMailFolder(folderParam) ? folderParam : "inbox";
  const threadId = searchParams.get("thread");
  // In the Campaigns folder: one campaign, and replied or not.
  const campaignId = folder === "campaigns" ? searchParams.get("campaign") : null;
  const repliedParam = searchParams.get("replied");
  const replied: "true" | "false" | undefined =
    folder === "campaigns" && (repliedParam === "true" || repliedParam === "false")
      ? repliedParam
      : undefined;

  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebouncedValue(search.trim());

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const openFolder = (next: MailFolder) => {
    setPage(1);
    setSelectedIds(new Set());
    setParams({
      folder: next === "inbox" ? null : next,
      thread: null,
      campaign: null,
      replied: null,
    });
  };

  const openCampaign = (id: string | null) => {
    setPage(1);
    setSelectedIds(new Set());
    setParams({ folder: "campaigns", campaign: id, thread: null });
  };

  const { data: counts } = useQuery({
    queryKey: ["mail", "counts"],
    queryFn: api.mail.counts,
    refetchInterval: 30_000,
  });
  const { data: senders } = useQuery({
    queryKey: ["mail-senders"],
    queryFn: api.mail.senders,
    staleTime: 5 * 60_000,
  });

  const { data: campaignPage } = useQuery({
    queryKey: ["email-campaigns", "inbox-nav"],
    queryFn: () => api.emailCampaigns.listPage({ page: 1, limit: 8 }),
    staleTime: 60_000,
  });
  const recentCampaigns = (campaignPage?.items || []) as {
    id: string;
    name: string;
    repliedCount?: number;
    sentCount?: number;
  }[];
  const activeCampaign = recentCampaigns.find((campaign) => campaign.id === campaignId);

  const params = {
    folder,
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    unread: unreadOnly,
    ...(campaignId ? { campaignId } : {}),
    ...(replied ? { replied } : {}),
  };
  const { data: threadPage, isLoading: listLoading } = useQuery({
    queryKey: ["mail", "threads", params],
    queryFn: () => api.mail.threads(params),
    placeholderData: keepPreviousData,
    refetchInterval: 20_000,
  });
  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ["mail", "thread", threadId],
    queryFn: () => api.mail.thread(threadId!),
    enabled: Boolean(threadId),
    refetchInterval: 20_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.mail.updateThread(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mail", "threads"] });
      queryClient.invalidateQueries({ queryKey: ["mail", "counts"] });
    },
  });

  // Opening a conversation marks it read, once per conversation.
  const markedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!thread || thread.unreadCount === 0 || markedRef.current === thread.id) return;
    markedRef.current = thread.id;
    markRead.mutate(thread.id);
  }, [thread, markRead]);

  const items = threadPage?.items || [];
  const openThread = (item: MailThreadSummary) => {
    // A conversation that is only a draft opens straight in the editor.
    if (folder === "drafts" && item.messageCount === 0 && item.draftCount > 0) {
      api.mail.thread(item.id).then((detail) => {
        const draft = detail.messages.find((message) => message.status === "DRAFT");
        if (draft) openCompose({ kind: "draft", draft });
      });
      return;
    }
    setParams({ thread: item.id });
  };
  const closeThread = () => setParams({ thread: null });
  const moveThread = (offset: number) => {
    const index = items.findIndex((item) => item.id === threadId);
    const next = items[index === -1 ? 0 : index + offset];
    if (next) openThread(next);
  };

  // Gmail-style keyboard shortcuts.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      const lastMessage = thread?.messages.filter((m) => m.status !== "DRAFT").at(-1);
      switch (event.key) {
        case "c":
          event.preventDefault();
          openCompose({ kind: "new" });
          break;
        case "/":
          event.preventDefault();
          searchRef.current?.focus();
          break;
        case "j":
          moveThread(1);
          break;
        case "k":
          moveThread(-1);
          break;
        case "Escape":
        case "u":
          if (threadId) closeThread();
          break;
        case "r":
        case "a":
        case "f":
          if (lastMessage) {
            event.preventDefault();
            openCompose({
              kind: event.key === "r" ? "reply" : event.key === "a" ? "replyAll" : "forward",
              sourceMessageId: lastMessage.id,
            });
          }
          break;
        case "e":
          if (thread && !thread.archived) {
            api.mail.updateThread(thread.id, { archived: true }).then(() => {
              queryClient.invalidateQueries({ queryKey: ["mail"] });
              closeThread();
            });
          }
          break;
        case "#":
          if (thread && !thread.trashed) {
            api.mail.updateThread(thread.id, { trashed: true }).then(() => {
              queryClient.invalidateQueries({ queryKey: ["mail"] });
              closeThread();
            });
          }
          break;
        case "s":
          if (thread) {
            api.mail.updateThread(thread.id, { starred: !thread.starred }).then(() =>
              queryClient.invalidateQueries({ queryKey: ["mail"] }),
            );
          }
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const total = threadPage?.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-4rem)]">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-white">
          <Inbox className="h-6 w-6 text-indigo-400" />
          Inbox
        </h2>
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search mail ( / )"
            aria-label="Search mail"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-3 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(event) => {
              setUnreadOnly(event.target.checked);
              setPage(1);
            }}
            className="h-3.5 w-3.5 accent-indigo-500"
          />
          Unread only
        </label>
      </div>

      {senders && (!senders.sesConfigured || !senders.replyTrackingActive) && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-200/80">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {!senders.sesConfigured
              ? "Add your AWS SES credentials to send email from here."
              : "Reply tracking is not set up, so replies go to your sender address and will not show up in this inbox."}{" "}
            <Link href="/settings" className="font-semibold text-amber-300 underline">
              Open Settings
            </Link>
          </span>
        </p>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[190px_minmax(0,340px)_minmax(0,1fr)]">
        {/* Folders */}
        <nav className={`${threadId ? "hidden lg:block" : ""} space-y-3`}>
          <button
            type="button"
            onClick={() => openCompose({ kind: "new" })}
            title="Compose (c)"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:brightness-110"
          >
            <PenSquare className="h-4 w-4" />
            Compose
          </button>
          <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {FOLDERS.map(({ id, icon: Icon, count }) => {
              const value = count ? counts?.[count] || 0 : 0;
              const active = folder === id;
              return (
                <li key={id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => openFolder(id)}
                    className={`flex w-full items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-indigo-500/15 font-semibold text-indigo-200"
                        : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{FOLDER_LABELS[id]}</span>
                    {value > 0 && (
                      <span className={`text-xs ${active ? "text-indigo-200" : "text-zinc-500"}`}>{value}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {recentCampaigns.some((campaign) => (campaign.sentCount || 0) > 0) && (
            <div className="hidden lg:block">
              <p className="sig-label px-3 pb-1.5 pt-2 text-zinc-600">Campaigns</p>
              <ul className="space-y-0.5">
                {recentCampaigns
                  .filter((campaign) => (campaign.sentCount || 0) > 0)
                  .map((campaign) => (
                    <li key={campaign.id}>
                      <button
                        type="button"
                        onClick={() => openCampaign(campaign.id)}
                        title={campaign.name}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs transition-colors ${
                          campaignId === campaign.id
                            ? "bg-purple-500/10 font-semibold text-purple-200"
                            : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400/70" />
                        <span className="flex-1 truncate text-left">{campaign.name}</span>
                        {(campaign.repliedCount || 0) > 0 && (
                          <span className="shrink-0 text-[10px] text-emerald-300">
                            {campaign.repliedCount}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
              </ul>
              <Link
                href="/email-campaigns"
                className="block px-3 py-1.5 text-[11px] font-semibold text-zinc-600 hover:text-zinc-300"
              >
                All campaigns →
              </Link>
            </div>
          )}
        </nav>

        {/* Conversations */}
        <section
          className={`${threadId ? "hidden lg:flex" : "flex"} min-h-[24rem] flex-col overflow-hidden rounded-2xl border border-zinc-850 bg-zinc-900/30`}
        >
          {folder === "campaigns" && (
            <div className="space-y-2 border-b border-zinc-850 px-3 py-2">
              {campaignId && (
                <div className="flex items-center gap-2 text-xs">
                  <Megaphone className="h-3.5 w-3.5 shrink-0 text-purple-300" />
                  <span className="min-w-0 flex-1 truncate font-semibold text-zinc-200">
                    {activeCampaign?.name || "Campaign"}
                  </span>
                  <Link
                    href={`/email-campaigns?campaign=${campaignId}`}
                    className="shrink-0 font-semibold text-indigo-300 hover:text-indigo-200"
                  >
                    View campaign
                  </Link>
                  <button
                    type="button"
                    aria-label="Show all campaigns"
                    onClick={() => openCampaign(null)}
                    className="shrink-0 text-zinc-500 hover:text-zinc-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="flex gap-1">
                {[
                  { value: null, label: "All" },
                  { value: "true", label: "Replied" },
                  { value: "false", label: "No reply yet" },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => {
                      setPage(1);
                      setParams({ replied: option.value, thread: null });
                    }}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      (replied ?? null) === option.value
                        ? "bg-indigo-500/15 text-indigo-200"
                        : "text-zinc-500 hover:text-zinc-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="min-h-0 flex-1">
            <ThreadList
              folder={folder}
              page={threadPage}
              isLoading={listLoading}
              activeId={threadId}
              selectedIds={selectedIds}
              onSelectedIdsChange={setSelectedIds}
              onOpen={openThread}
            />
          </div>
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-end gap-2 border-t border-zinc-850 px-3 py-2 text-xs text-zinc-500">
              <span>
                {from}–{to} of {total}
              </span>
              <button
                type="button"
                aria-label="Newer"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
                className="rounded p-1 hover:bg-zinc-850 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Older"
                disabled={to >= total}
                onClick={() => setPage((value) => value + 1)}
                className="rounded p-1 hover:bg-zinc-850 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>

        {/* Conversation */}
        <section
          className={`${threadId ? "block" : "hidden lg:block"} min-h-0 overflow-y-auto rounded-2xl border border-zinc-850 bg-zinc-950/40 p-4 sm:p-5`}
        >
          <ThreadView
            thread={threadId ? thread : undefined}
            isLoading={Boolean(threadId) && threadLoading}
            onBack={closeThread}
            onAfterRemove={closeThread}
          />
        </section>
      </div>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20 text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      }
    >
      <Mailbox />
    </Suspense>
  );
}
