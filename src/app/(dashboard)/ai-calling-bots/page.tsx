"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  CheckCircle2,
  Database,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Trash2,
  Upload,
} from "lucide-react";
import { api, LooseApiResponse } from "@/lib/api";
import { useOutreachStore } from "@/store/useOutreachStore";
import { MissingCredentials } from "@/components/MissingCredentials";

type AiCallingBot = LooseApiResponse & {
  id: string;
  name?: string;
  description?: string;
  personality?: string;
  botObjective?: string;
  botGoal?: string;
  botFlow?: string;
  knowledgeBaseText?: string;
  contextOutsideKnowledgeBase?: boolean;
  role?: string;
  goal?: string;
  knowledge?: string;
  rules?: string;
  ragEnabled?: boolean;
  status?: string;
  trainingChunkCount?: number;
  lastTrainedAt?: string;
};

type SearchResult = {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
};

type WorkspaceMode = "create" | "search";

const DEFAULT_FORM = {
  name: "",
  description: "",
  personality: "warm, concise, calm, and naturally conversational",
  botObjective: "",
  botGoal: "Understand customer needs and capture a clear next step.",
  botFlow:
    "Greet briefly, understand intent, answer clearly, and move to one next step.",
  knowledgeBaseText: "",
  contextOutsideKnowledgeBase: false,
  ragEnabled: true,
};

const inputClass =
  "w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/40";
const labelClass =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-zinc-500";
const panelClass =
  "rounded-2xl border border-zinc-850 bg-zinc-900/35 shadow-xl";

const formatDate = (value?: string) => {
  if (!value) return "Not trained";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not trained";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function AiCallingBotsPage() {
  const queryClient = useQueryClient();
  const { showAlert } = useOutreachStore();

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: api.settings.get,
  });

  const [mode, setMode] = useState<WorkspaceMode>("create");
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [knowledgeBasePdf, setKnowledgeBasePdf] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const { data: bots = [], isLoading: isBotsLoading } = useQuery<
    AiCallingBot[]
  >({
    queryKey: ["ai-calling-bots"],
    queryFn: () => api.aiCallingBots.list() as Promise<AiCallingBot[]>,
  });

  const selectedBot = useMemo(
    () => bots.find((bot) => bot.id === selectedBotId) || bots[0] || null,
    [bots, selectedBotId],
  );

  const trainedCount = bots.filter(
    (bot) => Number(bot.trainingChunkCount || 0) > 0,
  ).length;
  const totalChunks = bots.reduce(
    (sum, bot) => sum + Number(bot.trainingChunkCount || 0),
    0,
  );

  const updateForm = (
    key: keyof typeof DEFAULT_FORM,
    value: string | boolean,
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setKnowledgeBasePdf(null);
    setEditingBotId(null);
  };

  const selectBot = (bot: AiCallingBot) => {
    setSelectedBotId(bot.id);
    setMode("search");
  };

  const startEdit = (bot: AiCallingBot) => {
    setEditingBotId(bot.id);
    setSelectedBotId(bot.id);
    setForm({
      name: bot.name || "",
      description: bot.description || "",
      personality: bot.personality || DEFAULT_FORM.personality,
      botObjective: bot.botObjective || "",
      botGoal: bot.botGoal || bot.goal || DEFAULT_FORM.botGoal,
      botFlow: bot.botFlow || bot.rules || DEFAULT_FORM.botFlow,
      knowledgeBaseText: bot.knowledgeBaseText || bot.knowledge || "",
      contextOutsideKnowledgeBase: bot.contextOutsideKnowledgeBase === true,
      ragEnabled: bot.ragEnabled !== false,
    });
    setKnowledgeBasePdf(null);
    setMode("create");
  };

  const createBotMutation = useMutation({
    mutationFn: () =>
      api.aiCallingBots.create({
        ...form,
        knowledgeBasePdf,
      }),
    onSuccess: (bot: LooseApiResponse) => {
      queryClient.invalidateQueries({ queryKey: ["ai-calling-bots"] });
      setSelectedBotId(bot.id || null);
      resetForm();
      setMode("search");
      showAlert(
        "Calling agent created and knowledge base embedded successfully.",
        "success",
        "Agent created",
      );
    },
    onError: (error: Error) => showAlert(error.message, "error"),
  });

  const updateBotMutation = useMutation({
    mutationFn: () =>
      api.aiCallingBots.update(editingBotId!, {
        ...form,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-calling-bots"] });
      showAlert(
        "The calling agent profile was updated.",
        "success",
        "Agent updated",
      );
      resetForm();
    },
    onError: (error: Error) => showAlert(error.message, "error"),
  });

  const deleteBotMutation = useMutation({
    mutationFn: api.aiCallingBots.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-calling-bots"] });
      setSelectedBotId(null);
      setEditingBotId(null);
      setSearchResults([]);
      showAlert(
        "The agent and its embeddings were deleted.",
        "success",
        "Agent deleted",
      );
    },
    onError: (error: Error) => showAlert(error.message, "error"),
  });

  const searchMutation = useMutation({
    mutationFn: () =>
      api.aiCallingBots.search(selectedBot!.id, {
        query: searchQuery,
        topK: 5,
      }),
    onSuccess: (result: SearchResult[]) => setSearchResults(result || []),
    onError: (error: Error) => showAlert(error.message, "error"),
  });

  const submitBot = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      showAlert("Agent name is required.", "error");
      return;
    }
    if (!form.knowledgeBaseText.trim() && !knowledgeBasePdf && !editingBotId) {
      showAlert(
        "Provide Knowledge Base Text or upload a PDF for embedding.",
        "error",
      );
      return;
    }
    if (editingBotId) {
      if (knowledgeBasePdf) {
        showAlert(
          "PDF upload is only applied during Create & Train. Save this edit without PDF.",
          "error",
        );
        return;
      }
      updateBotMutation.mutate();
      return;
    }
    createBotMutation.mutate();
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedBot) return showAlert("Select an agent first.", "error");
    if (!searchQuery.trim())
      return showAlert("Enter a search question.", "error");
    searchMutation.mutate();
  };

  if (settings && settings.geminiStatus !== "CONNECTED") {
    return (
      <MissingCredentials
        title="Gemini Live Key Required"
        description="To create and train calling agents, add and verify your Gemini API key for Gemini Live in Settings."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-zinc-900 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white">
            <Bot className="h-8 w-8 text-indigo-400" />
            Calling Agents
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Create calling agents and embed knowledge during agent creation, then validate
            retrieval using search.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setMode("create");
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          New Bot
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric icon={Bot} label="Agents" value={bots.length} />
        <Metric icon={CheckCircle2} label="Trained" value={trainedCount} />
        <Metric icon={Database} label="Knowledge Chunks" value={totalChunks} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.5fr)]">
        <section className={`${panelClass} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-zinc-850 px-5 py-4">
            <div>
              <p className="text-sm font-bold text-white">Agent Library</p>
              <p className="text-xs text-zinc-500">
                Reusable calling agent profiles
              </p>
            </div>
            <RefreshCw className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="max-h-[720px] divide-y divide-zinc-850 overflow-y-auto">
            {isBotsLoading ? (
              [1, 2, 3].map((item) => (
                <div key={item} className="h-24 animate-pulse bg-zinc-900/40" />
              ))
            ) : bots.length === 0 ? (
              <div className="p-6 text-sm text-zinc-500">
                No bots created yet.
              </div>
            ) : (
              bots.map((bot) => {
                const isActive = selectedBot?.id === bot.id;
                return (
                  <button
                    type="button"
                    key={bot.id}
                    onClick={() => selectBot(bot)}
                    className={`block w-full px-5 py-4 text-left transition ${
                      isActive ? "bg-indigo-950/25" : "hover:bg-zinc-900/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-zinc-100">
                          {bot.name}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
                          {bot.description || "AI calling specialist"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-zinc-500">
                      <span>{Number(bot.trainingChunkCount || 0)} chunks</span>
                      <span>{formatDate(bot.lastTrainedAt)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className={panelClass}>
          <div className="flex flex-col gap-3 border-b border-zinc-850 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold text-white">
                {mode === "create"
                  ? editingBotId
                    ? "Edit Agent"
                    : "Create Agent"
                  : selectedBot?.name || "Select Agent"}
              </p>
              <p className="text-xs text-zinc-500">
                {mode === "create"
                  ? "Configure agent identity and knowledge base."
                  : "Search embedded knowledge chunks."}
              </p>
            </div>
            <div className="flex w-full gap-2 rounded-xl border border-zinc-850 bg-zinc-950/80 p-1 lg:w-auto">
              <ModeButton
                active={mode === "create"}
                icon={Settings2}
                label="Profile"
                onClick={() => setMode("create")}
              />
              <ModeButton
                active={mode === "search"}
                icon={Search}
                label="Search"
                onClick={() => setMode("search")}
              />
            </div>
          </div>

          <div className="p-5">
            {mode === "create" ? (
              <form onSubmit={submitBot} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Name">
                    <input
                      className={inputClass}
                      value={form.name}
                      onChange={(e) => updateForm("name", e.target.value)}
                      placeholder="Reach Agent"
                    />
                  </Field>
                  <Field label="Description">
                    <input
                      className={inputClass}
                      value={form.description}
                      onChange={(e) =>
                        updateForm("description", e.target.value)
                      }
                      placeholder="Outbound sales qualification agent"
                    />
                  </Field>
                </div>
                <Field label="Personality">
                  <textarea
                    className={`${inputClass} min-h-20`}
                    value={form.personality}
                    onChange={(e) => updateForm("personality", e.target.value)}
                  />
                </Field>
                <Field label="Agent Objective">
                  <textarea
                    className={`${inputClass} min-h-20`}
                    value={form.botObjective}
                    onChange={(e) => updateForm("botObjective", e.target.value)}
                  />
                </Field>
                <Field label="Agent Goal">
                  <textarea
                    className={`${inputClass} min-h-20`}
                    value={form.botGoal}
                    onChange={(e) => updateForm("botGoal", e.target.value)}
                  />
                </Field>
                <Field label="Agent Flow">
                  <textarea
                    className={`${inputClass} min-h-24`}
                    value={form.botFlow}
                    onChange={(e) => updateForm("botFlow", e.target.value)}
                  />
                </Field>
                <Field label="Knowledge Base Text">
                  <textarea
                    className={`${inputClass} min-h-40`}
                    value={form.knowledgeBaseText}
                    onChange={(e) =>
                      updateForm("knowledgeBaseText", e.target.value)
                    }
                    placeholder="Paste KB content to chunk and embed."
                  />
                </Field>
                <Field label="Knowledge Base PDF">
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) =>
                      setKnowledgeBasePdf(e.target.files?.[0] || null)
                    }
                    className="w-full rounded-xl border border-dashed border-zinc-700 bg-zinc-950 px-3 py-4 text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-xs file:font-bold file:text-zinc-200"
                  />
                </Field>
                <label className="flex items-center gap-3 rounded-xl border border-zinc-850 bg-zinc-950 px-3 py-3 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={form.contextOutsideKnowledgeBase}
                    onChange={(e) =>
                      updateForm(
                        "contextOutsideKnowledgeBase",
                        e.target.checked,
                      )
                    }
                    className="h-4 w-4 accent-indigo-500"
                  />
                  Context outside knowledge base
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={
                      createBotMutation.isPending || updateBotMutation.isPending
                    }
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-60"
                  >
                    {createBotMutation.isPending ||
                    updateBotMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : editingBotId ? (
                      <Save className="h-4 w-4" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {editingBotId ? "Save Changes" : "Create & Train Agent"}
                  </button>
                  {editingBotId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm font-bold text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div className="space-y-5">
                <SelectedBotHeader
                  bot={selectedBot}
                  onEdit={() => selectedBot && startEdit(selectedBot)}
                  onDelete={() =>
                    selectedBot && deleteBotMutation.mutate(selectedBot.id)
                  }
                  deleting={deleteBotMutation.isPending}
                />
                <form
                  onSubmit={submitSearch}
                  className="flex flex-col gap-3 rounded-2xl border border-zinc-850 bg-zinc-950/50 p-4 md:flex-row"
                >
                  <input
                    className={inputClass}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ask something this agent should know"
                  />
                  <button
                    type="submit"
                    disabled={!selectedBot || searchMutation.isPending}
                    className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-60"
                  >
                    {searchMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Search
                  </button>
                </form>
                <div className="space-y-3">
                  {searchResults.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-850 bg-zinc-950/40 p-8 text-center text-sm text-zinc-500">
                      No search results yet.
                    </div>
                  ) : (
                    searchResults.map((result, index) => (
                      <div
                        key={result.id || index}
                        className="rounded-2xl border border-zinc-850 bg-zinc-950/50 p-4"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-zinc-500">
                          <span className="font-bold text-zinc-300">
                            Result {index + 1}
                          </span>
                          <span>{Math.round((result.score || 0) * 100)}%</span>
                        </div>
                        <p className="text-sm leading-6 text-zinc-300">
                          {result.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bot;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-zinc-850 bg-zinc-900/35 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
          {label}
        </span>
        <Icon className="h-4 w-4 text-indigo-400" />
      </div>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function ModeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Bot;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition lg:flex-none ${active ? "border border-zinc-700 bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-200"}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function SelectedBotHeader({
  bot,
  onEdit,
  onDelete,
  deleting,
}: {
  bot: AiCallingBot | null;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  if (!bot) {
    return (
      <div className="rounded-2xl border border-zinc-850 bg-zinc-950/50 p-5 text-sm text-zinc-500">
        Select or create a bot to continue.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-850 bg-zinc-950/50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-black text-white">{bot.name}</p>
            <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] font-bold uppercase text-zinc-400">
              {bot.status || "READY"}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {bot.description || "AI calling specialist"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-500">
            <span className="rounded-lg border border-zinc-850 px-2 py-1">
              {Number(bot.trainingChunkCount || 0)} chunks
            </span>
            <span className="rounded-lg border border-zinc-850 px-2 py-1">
              {formatDate(bot.lastTrainedAt)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl border border-zinc-800 px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="flex items-center gap-2 rounded-xl border border-rose-900/60 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-950/30 disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
