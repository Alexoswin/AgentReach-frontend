"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { Inbox, Mail, MailOpen, Reply, Search } from "lucide-react";
import Pagination from "@/components/Pagination";
import { api } from "@/lib/api";
import type { EmailReply } from "@/lib/api";
import { useDebouncedValue } from "@/lib/pagination";

const contactName = (reply: EmailReply) =>
  reply.contact
    ? `${reply.contact.firstName || ""} ${reply.contact.lastName || ""}`.trim() ||
      reply.contact.email
    : "Removed contact";

const formatWhen = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
};

/** Opens the user's mail app with a reply to the contact already addressed. */
const replyHref = (reply: EmailReply) => {
  const subject = reply.replySubject || reply.subject || "";
  const params = new URLSearchParams({
    subject: /^re:/i.test(subject) ? subject : `Re: ${subject}`,
  });
  return `mailto:${reply.contact?.email || ""}?${params
    .toString()
    .replace(/\+/g, "%20")}`;
};

export default function RepliesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim());

  const { data: campaigns = [] } = useQuery({
    queryKey: ["email-campaigns-list"],
    queryFn: api.emailCampaigns.list,
  });

  const params = {
    page,
    limit: pageSize,
    search: debouncedSearch,
    campaignId,
    unread: unreadOnly,
  };
  const { data: replyPage, isLoading } = useQuery({
    queryKey: ["email-replies", params],
    queryFn: () => api.emailCampaigns.replies(params),
    placeholderData: keepPreviousData,
  });
  const replies = replyPage?.items ?? [];
  const selected =
    replies.find((reply) => reply.id === selectedId) ?? replies[0] ?? null;

  const readMutation = useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) =>
      api.emailCampaigns.setReplyRead(id, read),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["email-replies"] }),
  });

  const openReply = (reply: EmailReply) => {
    setSelectedId(reply.id);
    if (!reply.read) readMutation.mutate({ id: reply.id, read: true });
  };

  const resetPage = () => {
    setPage(1);
    setSelectedId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-zinc-900">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Inbox className="h-8 w-8 text-indigo-400" />
            Replies
            {(replyPage?.unreadCount || 0) > 0 && (
              <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-bold text-indigo-300">
                {replyPage!.unreadCount} unread
              </span>
            )}
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Replies from contacts to your email campaigns. Each reply is also
            forwarded to your sender inbox; auto-replies and bounces are left
            out here.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            placeholder="Search by contact, company or reply text…"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-3 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <select
          value={campaignId}
          onChange={(e) => {
            setCampaignId(e.target.value);
            resetPage();
          }}
          className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All campaigns</option>
          {(campaigns as { id: string; name: string }[]).map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => {
              setUnreadOnly(e.target.checked);
              resetPage();
            }}
            className="h-4 w-4 accent-indigo-500"
          />
          Unread only
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Reply list */}
        <div className="overflow-hidden rounded-2xl border border-zinc-850 bg-zinc-900/30">
          {isLoading ? (
            <div className="space-y-px">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-20 animate-pulse bg-zinc-900/60" />
              ))}
            </div>
          ) : replies.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Mail className="mx-auto h-8 w-8 text-zinc-600" />
              <p className="mt-3 text-sm font-semibold text-zinc-300">
                {debouncedSearch || campaignId || unreadOnly
                  ? "No replies match these filters"
                  : "No replies yet"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Replies to campaign emails show up here as they arrive.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-850">
              {replies.map((reply) => {
                const active = selected?.id === reply.id;
                return (
                  <li key={reply.id}>
                    <button
                      type="button"
                      onClick={() => openReply(reply)}
                      className={`w-full px-4 py-3 text-left transition-colors ${
                        active ? "bg-zinc-800/60" : "hover:bg-zinc-900/60"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          aria-label={reply.read ? undefined : "Unread"}
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            reply.read ? "bg-transparent" : "bg-indigo-400"
                          }`}
                        />
                        <span
                          className={`truncate text-sm ${
                            reply.read
                              ? "text-zinc-300"
                              : "font-bold text-white"
                          }`}
                        >
                          {contactName(reply)}
                        </span>
                        <span className="ml-auto shrink-0 text-[11px] text-zinc-500">
                          {formatWhen(reply.repliedAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate pl-4 text-xs text-zinc-400">
                        {reply.replySubject || "(no subject)"}
                      </p>
                      <p className="mt-0.5 truncate pl-4 text-xs text-zinc-500">
                        {reply.campaign?.name || "Deleted campaign"} ·{" "}
                        {reply.replyText?.slice(0, 120)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Selected reply */}
        <div className="rounded-2xl border border-zinc-850 bg-zinc-900/30 p-6">
          {selected ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white">
                    {selected.replySubject || "(no subject)"}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    <span className="font-semibold text-zinc-200">
                      {contactName(selected)}
                    </span>
                    {selected.contact?.email && (
                      <> &lt;{selected.contact.email}&gt;</>
                    )}
                    {selected.contact?.company && (
                      <> · {selected.contact.company}</>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {new Date(selected.repliedAt).toLocaleString()} · Campaign:{" "}
                    {selected.campaign?.name || "Deleted campaign"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      readMutation.mutate({
                        id: selected.id,
                        read: !selected.read,
                      })
                    }
                    className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white"
                  >
                    {selected.read ? (
                      <Mail className="h-3.5 w-3.5" />
                    ) : (
                      <MailOpen className="h-3.5 w-3.5" />
                    )}
                    Mark {selected.read ? "unread" : "read"}
                  </button>
                  {selected.contact?.email && (
                    <a
                      href={replyHref(selected)}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-3 py-2 text-xs font-bold text-white shadow-md"
                    >
                      <Reply className="h-3.5 w-3.5" />
                      Reply
                    </a>
                  )}
                </div>
              </div>

              <p className="whitespace-pre-wrap rounded-xl border border-zinc-850 bg-zinc-950/60 p-4 text-sm leading-relaxed text-zinc-200">
                {selected.replyText || "This reply has no text."}
              </p>

              {selected.subject && (
                <p className="text-xs text-zinc-500">
                  In reply to &ldquo;{selected.subject}&rdquo;
                  {selected.sentTime &&
                    `, sent ${new Date(selected.sentTime).toLocaleString()}`}
                  . The full message, with any attachments, is in your sender
                  inbox.
                </p>
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-48 items-center justify-center text-sm text-zinc-500">
              Select a reply to read it.
            </div>
          )}
        </div>
      </div>

      {replyPage && replyPage.total > 0 && (
        <Pagination
          page={replyPage.page}
          limit={replyPage.limit}
          total={replyPage.total}
          totalPages={replyPage.totalPages}
          onPageChange={(next) => {
            setPage(next);
            setSelectedId(null);
          }}
          onLimitChange={(size) => {
            setPageSize(size);
            resetPage();
          }}
          label="replies"
        />
      )}
    </div>
  );
}
