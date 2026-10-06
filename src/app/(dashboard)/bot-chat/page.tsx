"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bot, Loader2, MessageSquareText, Send, UserRound } from "lucide-react";
import { api, LooseApiResponse } from "@/lib/api";
import { useOutreachStore } from "@/store/useOutreachStore";

type AiCallingBot = LooseApiResponse & {
  id: string;
  name?: string;
  role?: string;
  description?: string;
  trainingChunkCount?: number;
  lastTrainedAt?: string;
};

type SearchResult = {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: SearchResult[];
};

const panelClass =
  "rounded-2xl border border-zinc-850 bg-zinc-900/35 shadow-xl";
const selectClass =
  "w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/40";

function buildAssistantReply(results: SearchResult[]) {
  if (!results.length) {
    return "I could not find relevant training knowledge for that question yet. Please train this bot with more content and try again.";
  }

  const topSnippets = results
    .slice(0, 3)
    .map((item) => item.content.trim())
    .filter(Boolean)
    .map((text) => text.replace(/\s+/g, " "))
    .map((text) => (text.length > 260 ? `${text.slice(0, 260)}...` : text));

  return topSnippets.join("\n\n");
}

export default function BotChatPage() {
  const { showAlert } = useOutreachStore();
  const [selectedBotId, setSelectedBotId] = useState<string>("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const { data: bots = [], isLoading } = useQuery<AiCallingBot[]>({
    queryKey: ["ai-calling-bots"],
    queryFn: () => api.aiCallingBots.list() as Promise<AiCallingBot[]>,
  });

  const selectedBot = useMemo(
    () => bots.find((bot) => bot.id === selectedBotId) || null,
    [bots, selectedBotId],
  );

  const trainedBots = useMemo(
    () => bots.filter((bot) => Number(bot.trainingChunkCount || 0) > 0),
    [bots],
  );

  const chatMutation = useMutation({
    mutationFn: async (question: string) => {
      if (!selectedBotId) throw new Error("Please select a trained bot first.");
      const response = (await api.aiCallingBots.chat(selectedBotId, {
        message: question,
        topK: 4,
      })) as LooseApiResponse & {
        reply?: string;
        sources?: SearchResult[];
      };
      return {
        reply: String(response?.reply || "").trim(),
        sources: Array.isArray(response?.sources) ? response.sources : [],
      };
    },
    onSuccess: (response) => {
      const assistantText =
        response.reply || buildAssistantReply(response.sources);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: assistantText,
          sources: response.sources.slice(0, 4),
        },
      ]);
    },
    onError: (error: Error) => {
      showAlert(error.message, "error");
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          text: "I ran into an issue while searching bot knowledge. Please try again.",
        },
      ]);
    },
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = input.trim();
    if (!question) return;
    if (!selectedBotId) {
      showAlert("Select a trained bot first.", "error");
      return;
    }

    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", text: question },
    ]);
    setInput("");
    chatMutation.mutate(question);
  };

  const onSelectBot = (botId: string) => {
    setSelectedBotId(botId);
    setMessages([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-zinc-900 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white">
            <MessageSquareText className="h-8 w-8 text-indigo-400" />
            Bot Chat
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Pick a trained calling agent and chat over its knowledge chunks.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.5fr)]">
        <section className={panelClass}>
          <div className="border-b border-zinc-850 px-5 py-4">
            <p className="text-sm font-bold text-white">Trained Bots</p>
            <p className="text-xs text-zinc-500">
              Choose a bot with trained chunks to start chatting
            </p>
          </div>
          <div className="max-h-[620px] divide-y divide-zinc-850 overflow-y-auto">
            {isLoading ? (
              [1, 2, 3].map((item) => (
                <div key={item} className="h-24 animate-pulse bg-zinc-900/40" />
              ))
            ) : trainedBots.length === 0 ? (
              <div className="p-6 text-sm text-zinc-500">
                No trained bots found. Train one in Calling Agents first.
              </div>
            ) : (
              trainedBots.map((bot) => {
                const isActive = selectedBotId === bot.id;
                return (
                  <button
                    key={bot.id}
                    type="button"
                    onClick={() => onSelectBot(bot.id)}
                    className={`block w-full px-5 py-4 text-left transition ${
                      isActive ? "bg-indigo-950/25" : "hover:bg-zinc-900/70"
                    }`}
                  >
                    <p className="truncate text-sm font-bold text-zinc-100">
                      {bot.name || "Unnamed Bot"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {bot.role || bot.description || "AI calling specialist"}
                    </p>
                    <p className="mt-2 text-[11px] text-zinc-500">
                      {Number(bot.trainingChunkCount || 0)} chunks
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className={`${panelClass} flex min-h-[620px] flex-col`}>
          <div className="border-b border-zinc-850 px-5 py-4">
            <p className="text-sm font-bold text-white">
              {selectedBot
                ? `Chatting with ${selectedBot.name || "Selected Bot"}`
                : "Select a bot to chat"}
            </p>
            <p className="text-xs text-zinc-500">
              Responses are grounded in trained bot chunks.
            </p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {!selectedBot ? (
              <div className="rounded-xl border border-zinc-850 bg-zinc-950/60 p-4 text-sm text-zinc-500">
                Choose a trained bot from the left panel to begin.
              </div>
            ) : messages.length === 0 ? (
              <div className="rounded-xl border border-zinc-850 bg-zinc-950/60 p-4 text-sm text-zinc-500">
                Start by asking a question about this bot&apos;s trained
                knowledge.
              </div>
            ) : (
              messages.map((message) => (
                <article
                  key={message.id}
                  className={`rounded-2xl border p-4 ${
                    message.role === "user"
                      ? "ml-8 border-indigo-500/20 bg-indigo-950/20"
                      : "mr-8 border-zinc-800 bg-zinc-950/70"
                  }`}
                >
                  <header className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-400">
                    {message.role === "user" ? (
                      <UserRound className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                    <span>{message.role === "user" ? "You" : "Bot"}</span>
                  </header>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">
                    {message.text}
                  </p>
                  {message.role === "assistant" &&
                    Array.isArray(message.sources) &&
                    message.sources.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-zinc-850 pt-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                          Sources
                        </p>
                        {message.sources.slice(0, 2).map((source) => (
                          <p
                            key={source.id}
                            className="line-clamp-2 text-xs text-zinc-400"
                          >
                            {source.content}
                          </p>
                        ))}
                      </div>
                    )}
                </article>
              ))
            )}

            {chatMutation.isPending && (
              <div className="mr-8 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="border-t border-zinc-850 p-4">
            <div className="flex gap-3">
              <input
                className={selectClass}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask the selected bot a question..."
                disabled={!selectedBot || chatMutation.isPending}
              />
              <button
                type="submit"
                disabled={!selectedBot || !input.trim() || chatMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
