import {
  getAccessToken,
  getRefreshToken,
  saveAuthSession,
  saveTokens,
  signOut,
} from "./localAuth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
const REQUEST_TIMEOUT_MS = 8000;
const AI_REQUEST_TIMEOUT_MS = 45000;
const IMPORT_REQUEST_TIMEOUT_MS = 60000;
// A master/worker cycle runs for minutes, not seconds.
const CYCLE_REQUEST_TIMEOUT_MS = 15 * 60 * 1000;

type ApiPayload = { [key: string]: unknown };
export type LooseApiResponse = ReturnType<typeof JSON.parse>;
type AuthProfileUpdate = {
  name?: string;
  email?: string;
  theme?: string;
  accentColor?: string;
};
type SettingsUpdate = {
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
  geminiApiKey?: string;
  geminiTextModel?: string;
  awsSenderEmail?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  twilioStatus?: string;
  callProvider?: "twilio" | "plivo";
  plivoAuthId?: string;
  plivoAuthToken?: string;
  plivoPhoneNumber?: string;
  plivoStatus?: string;
  geminiStatus?: string;
  growwApiKey?: string;
  growwApiSecret?: string;
  growwTotpSecret?: string;
  growwStatus?: string;
  tradeMasterModel?: string;
  tradeWorkerModel?: string;
};

type TradePolicyUpdate = {
  mode?: "paper" | "approval" | "auto";
  killSwitch?: boolean;
  reason?: string;
  maxOrderValue?: number;
  maxDailyLoss?: number;
  maxOpenPositions?: number;
  allowedSegments?: string[];
  allowNakedOptions?: boolean;
  marginBuffer?: number;
  maxTokensPerRun?: number;
  maxTokensPerDay?: number;
};

type IntentDecision = {
  decision: "approve" | "decline";
  reason?: string;
};

type GeminiKeyTestPayload = {
  geminiApiKey?: string;
};

type GeminiVoicePreviewPayload = {
  voice: string;
  language?: string;
  text?: string;
};
type CampaignPayload = {
  [key: string]: unknown;
  name?: string;
  templateId?: string;
  status?: string;
  cc?: string[]; // CC email addresses
  bcc?: string[]; // BCC email addresses
};
type CallingCampaignPayload = {
  [key: string]: unknown;
  name?: string;
  description?: string;
  objective?: string;
  prompt?: string;
  voiceQuality?: string;
  voice?: string;
  language?: string;
  selectedVoice?: string;
  selectedLanguage?: string;
  aiCallingBotId?: string;
  contactIds?: string[];
  aiSpeaksFirst?: boolean;
  preventInterruption?: boolean;
  realtimeModel?: string;
  maxTokens?: number;
  threshold?: number;
  responseSpeed?: "fast" | "balanced" | "conservative";
  tools?: string[];
};

type DirectoryPayload = {
  name?: string;
  description?: string;
};
type ContactPayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  company?: string;
  jobTitle?: string;
  linkedinUrl?: string;
  notes?: string;
  directoryId?: string | null;
  customFields?: Record<string, string>;
};
type ContactImportPayload = ApiPayload;
type TemplateAttachmentPayload = {
  id: string;
  name: string;
  contentType: string;
  size: number;
  contentBase64: string;
};
type TemplatePayload = {
  [key: string]: unknown;
  name?: string;
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
  attachments?: TemplateAttachmentPayload[];
};

type AiCallingBotPayload = {
  name?: string;
  description?: string;
  personality?: string;
  botObjective?: string;
  botGoal?: string;
  botFlow?: string;
  knowledgeBaseText?: string;
  contextOutsideKnowledgeBase?: boolean;
  language?: string;
  voice?: string;
  role?: string;
  goal?: string;
  knowledge?: string;
  rules?: string;
  objectionHandling?: string;
  greeting?: string;
  ragEnabled?: boolean;
  metadata?: Record<string, unknown>;
};
type AiCallingBotCreatePayload = AiCallingBotPayload & {
  knowledgeBasePdf?: File | null;
};

type HistoryParams = Record<string, string | undefined>;

async function handleResponse<T = LooseApiResponse>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch((): ApiPayload => ({}));
    throw new Error(
      toFriendlyApiError(errorData.message || res.statusText, res.status),
    );
  }
  return res.json() as Promise<T>;
}

function toFriendlyApiError(message: unknown, status: number) {
  const text = Array.isArray(message)
    ? message.join(" ")
    : String(message || "");
  const lower = text.toLowerCase();

  if (status === 401) return "Your session has expired. Please log in again.";
  if (status === 403) return "You do not have permission to do that.";
  if (status === 404)
    return "We could not find that item. It may have been removed.";
  if (status >= 500)
    return "The server had a problem. Please try again in a moment.";
  if (lower.includes("duplicate") || lower.includes("already exists"))
    return "This item already exists.";
  if (lower.includes("missing") || lower.includes("required"))
    return "Please fill in the required information.";
  if (lower.includes("invalid"))
    return "Some information looks incorrect. Please check it and try again.";
  if (lower.includes("no pending contacts"))
    return "Everyone in this campaign has already been sent successfully. Add more recipients to send to more people.";
  if (lower.includes("no pending calls"))
    return "Please add contacts before launching this calling campaign.";
  if (lower.includes("not running or queued"))
    return "This calling campaign is not currently running or in queue.";
  if (lower.includes("no contacts with phone numbers"))
    return "Add at least one contact with a phone number before launching this calling campaign.";
  if (lower.includes("no contacts"))
    return "Please add recipients before launching this campaign.";
  if (lower.includes("template"))
    return "Please choose or create an email template first.";

  return text || "Something went wrong. Please try again.";
}

async function request<T = LooseApiResponse>(
  path: string,
  init?: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
) {
  return requestWithAuth<T>(path, init, timeoutMs, true);
}

async function requestBlob(
  path: string,
  init?: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
) {
  return requestBlobWithAuth(path, init, timeoutMs, true);
}

async function requestWithAuth<T = LooseApiResponse>(
  path: string,
  init?: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
  allowRefresh = true,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers(init?.headers);
    const accessToken = getAccessToken();

    if (accessToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });

    if (response.status === 401 && allowRefresh && path !== "/auth/refresh") {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return requestWithAuth<T>(path, init, timeoutMs, false);
      }
    }

    return handleResponse<T>(response);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("This is taking longer than expected. Please try again.");
    }

    if (error instanceof TypeError) {
      throw new Error(
        "We could not reach the app server. Please try again in a moment.",
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function requestBlobWithAuth(
  path: string,
  init?: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
  allowRefresh = true,
): Promise<Blob> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers(init?.headers);
    const accessToken = getAccessToken();

    if (accessToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });

    if (response.status === 401 && allowRefresh && path !== "/auth/refresh") {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return requestBlobWithAuth(path, init, timeoutMs, false);
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch((): ApiPayload => ({}));
      throw new Error(
        toFriendlyApiError(errorData.message || response.statusText, response.status),
      );
    }

    return response.blob();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("This is taking longer than expected. Please try again.");
    }

    if (error instanceof TypeError) {
      throw new Error(
        "We could not reach the app server. Please try again in a moment.",
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      signOut();
      return false;
    }

    const session = await response.json();
    saveAuthSession(session);
    saveTokens(session.accessToken, session.refreshToken);
    return true;
  } catch {
    signOut();
    return false;
  }
}

function toQueryString(params: HistoryParams) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });

  return query.toString();
}

export const api = {
  auth: {
    login: (data: { email: string; password: string }) =>
      request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    register: (data: { name: string; email: string; password: string }) =>
      request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    refresh: (refreshToken: string) =>
      request("/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }),
    me: () => request("/auth/me"),
    updateProfile: (data: AuthProfileUpdate) =>
      request("/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    resetPassword: (data: { email: string; newPassword: string }) =>
      request("/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    logout: () => request("/auth/logout", { method: "POST" }),
  },

  // Settings
  settings: {
    get: () => request("/settings"),
    update: (data: SettingsUpdate) =>
      request("/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    testSes: () => request("/settings/test-ses", { method: "POST" }),
    testTwilio: () => request("/settings/test-twilio", { method: "POST" }),
    testPlivo: () => request("/settings/test-plivo", { method: "POST" }),
    testGemini: (data?: GeminiKeyTestPayload) =>
      request("/settings/test-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data || {}),
      }),
    testGroww: () =>
      request("/settings/test-groww", { method: "POST" }, AI_REQUEST_TIMEOUT_MS),
    previewGeminiVoice: (data: GeminiVoicePreviewPayload) =>
      request(
        "/settings/preview-gemini-voice",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
        AI_REQUEST_TIMEOUT_MS,
      ),
  },

  // Trade-Agent
  tradeAgent: {
    overview: () => request("/trade-agent/overview"),
    refreshPortfolio: () =>
      request(
        "/trade-agent/portfolio/refresh",
        { method: "POST" },
        AI_REQUEST_TIMEOUT_MS,
      ),

    runs: (limit?: number) =>
      request(`/trade-agent/runs${limit ? `?limit=${limit}` : ""}`),
    run: (runId: string) => request(`/trade-agent/runs/${runId}`),
    startRun: () =>
      request("/trade-agent/runs", { method: "POST" }, CYCLE_REQUEST_TIMEOUT_MS),

    proposals: (status?: string) =>
      request(`/trade-agent/proposals${status ? `?status=${status}` : ""}`),
    decide: (intentId: string, data: IntentDecision) =>
      request(
        `/trade-agent/proposals/${intentId}/decide`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
        AI_REQUEST_TIMEOUT_MS,
      ),

    orders: (limit?: number) =>
      request(`/trade-agent/orders${limit ? `?limit=${limit}` : ""}`),
    reconcile: () =>
      request(
        "/trade-agent/orders/reconcile",
        { method: "POST" },
        AI_REQUEST_TIMEOUT_MS,
      ),

    riskEvents: (limit?: number) =>
      request(`/trade-agent/risk-events${limit ? `?limit=${limit}` : ""}`),

    policy: () => request("/trade-agent/policy"),
    updatePolicy: (data: TradePolicyUpdate) =>
      request("/trade-agent/policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),

    searchInstruments: (term: string) =>
      request(`/trade-agent/instruments?q=${encodeURIComponent(term)}`),
    refreshInstruments: () =>
      request(
        "/trade-agent/instruments/refresh",
        { method: "POST" },
        AI_REQUEST_TIMEOUT_MS,
      ),
  },

  // Contacts
  contacts: {
    list: () => request("/contacts"),
    directories: {
      list: () => request("/contacts/directories"),
      create: (data: DirectoryPayload) =>
        request("/contacts/directories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
      update: (id: string, data: DirectoryPayload) =>
        request(`/contacts/directories/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        request(`/contacts/directories/${id}`, { method: "DELETE" }),
    },
    get: (id: string) => request(`/contacts/${id}`),
    create: (data: ContactPayload) =>
      request("/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    update: (id: string, data: ContactPayload) =>
      request(`/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request(`/contacts/${id}`, { method: "DELETE" }),
    parseFile: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return request("/contacts/parse-file", {
        method: "POST",
        body: formData,
      });
    },
    import: (data: ContactImportPayload) =>
      request(
        "/contacts/import",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
        IMPORT_REQUEST_TIMEOUT_MS,
      ),
  },

  // Profile - resume upload
  profile: {
    uploadResume: (file: File) => {
      const formData = new FormData();
      formData.append("resume", file);
      return request("/profile/upload-resume", {
        method: "POST",
        body: formData,
      });
    },
  },

  // Templates
  templates: {
    list: () => request("/templates"),
    predefined: () => request("/templates/predefined"),
    get: (id: string) => request(`/templates/${id}`),
    create: (data: TemplatePayload) =>
      request("/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    update: (id: string, data: TemplatePayload) =>
      request(`/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request(`/templates/${id}`, { method: "DELETE" }),
    parseReferencePdf: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return request("/templates/reference-pdf", {
        method: "POST",
        body: formData,
      });
    },
    generate: (data: {
      goal: string;
      audience: string;
      tone: string;
      instructions?: string;
      referenceDocumentText?: string;
      referenceDocumentName?: string;
      format?: "HTML" | "TEXT";
    }) =>
      request(
        "/templates/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
        AI_REQUEST_TIMEOUT_MS,
      ),
    startGenerate: (data: {
      goal: string;
      audience: string;
      tone: string;
      instructions?: string;
      referenceDocumentText?: string;
      referenceDocumentName?: string;
      format?: "HTML" | "TEXT";
    }) =>
      request("/templates/generate-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    generationStatus: (id: string) => request(`/templates/generate-jobs/${id}`),
  },

  // Email Campaigns
  emailCampaigns: {
    list: () => request("/email-campaigns"),
    get: (id: string) => request(`/email-campaigns/${id}`),
    create: (data: CampaignPayload) =>
      request("/email-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    update: (id: string, data: CampaignPayload) =>
      request(`/email-campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request(`/email-campaigns/${id}`, { method: "DELETE" }),
    addContacts: (id: string, contactIds: string[]) =>
      request(`/email-campaigns/${id}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds }),
      }),
    removeContact: (id: string, contactId: string) =>
      request(`/email-campaigns/${id}/contacts/${contactId}`, {
        method: "DELETE",
      }),
    launch: (id: string) =>
      request(`/email-campaigns/${id}/launch`, { method: "POST" }),
    relaunch: (id: string) =>
      request(`/email-campaigns/${id}/relaunch`, { method: "POST" }),
    schedule: (id: string, scheduledAt: string) =>
      request(`/email-campaigns/${id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt }),
      }),
    unschedule: (id: string) =>
      request(`/email-campaigns/${id}/unschedule`, { method: "POST" }),
  },

  // Signal-based outreach
  signals: {
    types: () => request("/signals/types"),
    feed: (type?: string) =>
      request(`/signals${type ? `?type=${encodeURIComponent(type)}` : ""}`),
    stats: () => request("/signals/stats"),
    reviewQueue: () => request("/signals/review-queue"),
    review: (matchId: string, action: "approve" | "reject", note?: string) =>
      request(`/signals/review/${matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      }),
    createManual: (data: {
      title: string;
      summary?: string;
      url?: string;
      companyName?: string;
      companyDomain?: string;
      contactEmail?: string;
      type?: string;
    }) =>
      request("/signals/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    poll: () => request("/signals/poll", { method: "POST" }),
    playbooks: {
      list: () => request("/signals/playbooks"),
      create: (data: ApiPayload) =>
        request("/signals/playbooks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
      update: (id: string, data: ApiPayload) =>
        request(`/signals/playbooks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
      toggle: (id: string) =>
        request(`/signals/playbooks/${id}/toggle`, { method: "POST" }),
      delete: (id: string) =>
        request(`/signals/playbooks/${id}`, { method: "DELETE" }),
    },
    watches: {
      list: () => request("/signals/watches"),
      create: (data: { companyName: string; domain: string }) =>
        request("/signals/watches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
      toggle: (id: string) =>
        request(`/signals/watches/${id}/toggle`, { method: "POST" }),
      delete: (id: string) =>
        request(`/signals/watches/${id}`, { method: "DELETE" }),
    },
  },

  // AI Calling Bots
  aiCallingBots: {
    list: () => request("/ai-calling-bots"),
    voices: () => request("/ai-calling-bots/voices/google"),
    get: (id: string) => request(`/ai-calling-bots/${id}`),
    create: (data: AiCallingBotCreatePayload) => {
      const formData = new FormData();
      if (data.name) formData.append("name", data.name);
      if (data.description) formData.append("description", data.description);
      if (data.personality) formData.append("personality", data.personality);
      if (data.botObjective) formData.append("botObjective", data.botObjective);
      if (data.botGoal) formData.append("botGoal", data.botGoal);
      if (data.botFlow) formData.append("botFlow", data.botFlow);
      if (data.knowledgeBaseText) {
        formData.append("knowledgeBaseText", data.knowledgeBaseText);
      }
      if (typeof data.contextOutsideKnowledgeBase === "boolean") {
        formData.append(
          "contextOutsideKnowledgeBase",
          String(data.contextOutsideKnowledgeBase),
        );
      }
      if (typeof data.ragEnabled === "boolean") {
        formData.append("ragEnabled", String(data.ragEnabled));
      }
      if (data.knowledgeBasePdf) {
        formData.append("knowledgeBasePdf", data.knowledgeBasePdf);
      }
      return request(
        "/ai-calling-bots",
        {
          method: "POST",
          body: formData,
        },
        AI_REQUEST_TIMEOUT_MS,
      );
    },
    update: (id: string, data: AiCallingBotPayload) =>
      request(`/ai-calling-bots/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request(`/ai-calling-bots/${id}`, { method: "DELETE" }),
    search: (id: string, data: { query: string; topK?: number }) =>
      request(`/ai-calling-bots/${id}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    chat: (id: string, data: { message: string; topK?: number }) =>
      request(
        `/ai-calling-bots/${id}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
        AI_REQUEST_TIMEOUT_MS,
      ),
  },

  // Calling Campaigns
  callingCampaigns: {
    dashboard: () => request("/calling-campaigns/dashboard"),
    list: () => request("/calling-campaigns"),
    get: (id: string) => request(`/calling-campaigns/${id}`),
    create: (data: CallingCampaignPayload) =>
      request("/calling-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    generate: (data: { prompt: string; tone?: string }) =>
      request(
        "/calling-campaigns/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
        AI_REQUEST_TIMEOUT_MS,
      ),
    startGenerate: (data: { prompt: string; tone?: string }) =>
      request("/calling-campaigns/generate-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    generationStatus: (id: string) =>
      request(`/calling-campaigns/generate-jobs/${id}`),
    update: (id: string, data: CallingCampaignPayload) =>
      request(`/calling-campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request(`/calling-campaigns/${id}`, { method: "DELETE" }),
    launch: (id: string) =>
      request(`/calling-campaigns/${id}/launch`, { method: "POST" }),
    relaunch: (id: string) =>
      request(`/calling-campaigns/${id}/relaunch`, { method: "POST" }),
    stop: (id: string) =>
      request(`/calling-campaigns/${id}/stop`, { method: "POST" }),
    schedule: (id: string, scheduledAt: string) =>
      request(`/calling-campaigns/${id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt }),
      }),
    unschedule: (id: string) =>
      request(`/calling-campaigns/${id}/unschedule`, { method: "POST" }),
    recordingAudio: (callId: string) =>
      requestBlob(
        `/calling-campaigns/recordings/${callId}/audio`,
        undefined,
        20000,
      ),
  },

  // History
  history: {
    emails: (params: {
      startDate?: string;
      endDate?: string;
      campaignId?: string;
      status?: string;
    }) => {
      const query = toQueryString(params);
      return request(`/history/emails?${query}`);
    },
    calls: (params: {
      startDate?: string;
      endDate?: string;
      campaignId?: string;
      outcome?: string;
    }) => {
      const query = toQueryString(params);
      return request(`/history/calls?${query}`);
    },
    replies: (emailId: string) => request(`/history/replies/${emailId}`),
  },

  // Analytics
  analytics: {
    get: () => request("/analytics"),
  },
};
