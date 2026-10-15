import { saveAuthSession, signOut } from "./localAuth";
import { pageQueryString } from "./pagination";
import type { PageParams, Paginated } from "./pagination";

// Same-origin path proxied to the primary backend by next.config.ts, so the
// session cookies are first-party. ECS is used only when the primary proxy
// cannot reach its backend. Set NEXT_PUBLIC_ECS_API_URL to the ECS API URL
// including /api, for example https://api-123.ecs.us-east-1.on.aws/api.
const BASE_URL = "/api";
const DEFAULT_ECS_API_URL =
  "https://ag-2bf1312f8ce3453e8c76ca79e45a3f08.ecs.ap-south-1.on.aws/api";
const ECS_BASE_URL = normalizeApiBase(
  process.env.NEXT_PUBLIC_ECS_API_URL || DEFAULT_ECS_API_URL,
);
const FAILOVER_STATUSES = new Set([502, 503, 504]);
const PRIMARY_RETRY_DELAY_MS = 30_000;
const REQUEST_TIMEOUT_MS = 8000;
const AI_REQUEST_TIMEOUT_MS = 45000;
const IMPORT_REQUEST_TIMEOUT_MS = 60000;
const PROSPECT_RUN_TIMEOUT_MS = 120000;
let csrfToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;
let activeBaseUrl = BASE_URL;
let primaryUnavailableUntil = 0;
const AUTH_PATHS_WITHOUT_REFRESH = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/identity-platform",
  "/auth/cognito",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/resend-verification",
]);

type ApiPayload = { [key: string]: unknown };
export type LooseApiResponse = ReturnType<typeof JSON.parse>;
type AuthProfileUpdate = {
  name?: string;
  email?: string;
  theme?: string;
  accentColor?: string;
  password?: string;
  currentPassword?: string;
};
type SettingsUpdate = {
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
  geminiApiKey?: string;
  geminiTextModel?: string;
  awsSenderEmail?: string;
  replyTrackingDomain?: string;
  replyTrackingTopicArn?: string;
  sesConfigurationSet?: string;
  mailFromName?: string;
  mailSignature?: string;
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
  trackOpens?: boolean;
  fromEmail?: string;
  fromName?: string;
  sendRatePerHour?: number | null;
  unsubscribeLink?: boolean;
};
type CampaignTestPayload = {
  templateId: string;
  to?: string;
  contactId?: string;
  fromEmail?: string;
  fromName?: string;
  unsubscribeLink?: boolean;
};

export type MailFolder =
  | "inbox"
  | "starred"
  | "sent"
  | "drafts"
  | "scheduled"
  | "campaigns"
  | "archive"
  | "trash";
export type MailAddress = { email: string; name?: string | null };
export type MailAttachment = {
  id: string;
  name: string;
  contentType: string;
  size: number;
  contentId?: string | null;
  inline?: boolean;
};
export type MailThreadSummary = {
  id: string;
  subject: string;
  snippet: string;
  participants: MailAddress[];
  lastMessageAt: string | null;
  lastActivityAt: string | null;
  messageCount: number;
  unreadCount: number;
  hasInbound: boolean;
  draftCount: number;
  scheduledCount: number;
  hasAttachments: boolean;
  starred: boolean;
  archived: boolean;
  trashed: boolean;
  labels: string[];
  lastDirection: "INBOUND" | "OUTBOUND" | null;
  lastStatus: string | null;
  contactId: string | null;
  campaign: { id: string; name: string } | null;
};
export type MailMessage = {
  id: string;
  threadId: string;
  direction: "INBOUND" | "OUTBOUND";
  source: "MANUAL" | "CAMPAIGN" | null;
  status: string;
  from: MailAddress | null;
  to: MailAddress[];
  cc: MailAddress[];
  bcc: MailAddress[];
  replyTo?: string | null;
  subject: string;
  html: string;
  text: string;
  quotedHtml: string;
  quotedText: string;
  quotedMessageId?: string | null;
  snippet: string;
  attachments: MailAttachment[];
  sendAt?: string | null;
  scheduled: boolean;
  sentAt?: string | null;
  receivedAt?: string | null;
  readAt?: string | null;
  trackOpens: boolean;
  openCount: number;
  firstOpenedAt?: string | null;
  lastOpenedAt?: string | null;
  deliveredAt?: string | null;
  bouncedAt?: string | null;
  bounceType?: string | null;
  complainedAt?: string | null;
  lastError?: string | null;
  automated: boolean;
  campaignId?: string | null;
  createdAt: string;
  updatedAt: string;
};
export type MailThreadDetail = MailThreadSummary & {
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    company?: string;
    jobTitle?: string;
  } | null;
  messages: MailMessage[];
};
export type MailCounts = {
  inbox: number;
  campaigns: number;
  drafts: number;
  scheduled: number;
};
export type MailSenders = {
  defaultFrom: string | null;
  fromName: string;
  signature: string;
  addresses: string[];
  domains: string[];
  sesConfigured: boolean;
  replyTrackingActive: boolean;
};
export type MailContactContext = {
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    company?: string;
    jobTitle?: string;
    phoneNumber?: string;
    linkedinUrl?: string;
    notes?: string;
  } | null;
  campaigns: {
    id: string;
    name: string;
    status: string | null;
    deliveryStatus: string;
    sentTime?: string | null;
    opened: boolean;
    replied: boolean;
  }[];
  calls: {
    id: string;
    outcome: string;
    duration: number;
    timestamp: string;
    summary?: string;
  }[];
};
export type DraftPayload = {
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  html?: string;
  from?: string;
  attachments?: { fileId: string; name?: string }[];
  trackOpens?: boolean;
};
export type CreateDraftPayload = DraftPayload & {
  mode?: "new" | "reply" | "replyAll" | "forward";
  sourceMessageId?: string;
  contactId?: string;
};
type ThreadListParams = {
  folder: MailFolder;
  page: number;
  limit: number;
  search?: string;
  unread?: boolean;
  campaignId?: string;
  replied?: "true" | "false";
};
export type BulkThreadAction =
  | "read"
  | "unread"
  | "star"
  | "unstar"
  | "archive"
  | "unarchive"
  | "trash"
  | "untrash"
  | "delete";
export type EmailReply = {
  id: string;
  campaign: { id: string; name: string } | null;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    company?: string;
  } | null;
  subject?: string | null;
  sentTime?: string | null;
  repliedAt: string;
  replySubject?: string | null;
  replyText?: string | null;
  read: boolean;
};
type ReplyListParams = {
  page: number;
  limit: number;
  search?: string;
  campaignId?: string;
  unread?: boolean;
};
const replyQueryString = ({ unread, ...params }: ReplyListParams) => {
  const query = new URLSearchParams();
  Object.entries({ ...params, unread: unread ? "true" : "" }).forEach(
    ([key, value]) => {
      if (value !== undefined && value !== "") query.set(key, String(value));
    },
  );
  return `?${query.toString()}`;
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

/** An error response from the API, keeping its HTTP status. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function normalizeApiBase(value?: string) {
  const normalized = (value || "").trim().replace(/\/+$/, "");
  if (!normalized) return "";
  return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
}

function isNetworkFailure(error: unknown) {
  return (
    error instanceof TypeError ||
    (error instanceof DOMException && error.name === 'AbortError')
  );
}

function shouldFailOver(method: string, path: string, response?: Response) {
  // A failed POST may have reached the primary server before its proxy
  // returned an error. Only replay gateway responses for safe requests to
  // avoid sending a campaign twice. Connection failures are retried because
  // fetch did not receive an HTTP response at all.
  if (!response) return true;
  if (method === "POST" && path === "/auth/login") return true;
  return ["GET", "HEAD", "OPTIONS"].includes(method);
}

async function fetchBackend(
  path: string,
  init: RequestInit | undefined,
  timeoutMs: number,
) {
  const method = (init?.method || 'GET').toUpperCase();

  const send = async (baseUrl: string) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${baseUrl}${path}`, {
        ...init,
        credentials: 'include',
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const primaryIsCoolingDown =
    activeBaseUrl === BASE_URL && Date.now() < primaryUnavailableUntil;
  const preferredBaseUrl = primaryIsCoolingDown ? ECS_BASE_URL : activeBaseUrl;

  if (!preferredBaseUrl) {
    return send(BASE_URL);
  }

  try {
    const response = await send(preferredBaseUrl);

    if (
      preferredBaseUrl === BASE_URL &&
      ECS_BASE_URL &&
      FAILOVER_STATUSES.has(response.status) &&
      shouldFailOver(method, path, response)
    ) {
      const fallbackResponse = await send(ECS_BASE_URL);
      if (fallbackResponse.ok || fallbackResponse.status < 500) {
        activeBaseUrl = ECS_BASE_URL;
        primaryUnavailableUntil = Date.now() + PRIMARY_RETRY_DELAY_MS;
      }
      return fallbackResponse;
    }

    return response;
  } catch (error) {
    if (
      preferredBaseUrl === BASE_URL &&
      ECS_BASE_URL &&
      isNetworkFailure(error)
    ) {
      const fallbackResponse = await send(ECS_BASE_URL);
      activeBaseUrl = ECS_BASE_URL;
      primaryUnavailableUntil = Date.now() + PRIMARY_RETRY_DELAY_MS;
      return fallbackResponse;
    }
    throw error;
  }
}

async function handleResponse<T = LooseApiResponse>(
  res: Response,
  path: string,
): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch((): ApiPayload => ({}));
    throw new ApiError(
      toFriendlyApiError(errorData.message || res.statusText, res.status, path),
      res.status,
    );
  }
  return res.json() as Promise<T>;
}

function toFriendlyApiError(message: unknown, status: number, path = "") {
  const text = Array.isArray(message)
    ? message.join(" ")
    : String(message || "");
  const lower = text.toLowerCase();

  // Sign-in, sign-up and SSO errors are written for the person signing in
  // ("Invalid email or password", "Registration is disabled", ...). The
  // generic mapping below turned them into "Your session has expired" or
  // "This item already exists".
  if (AUTH_PATHS_WITHOUT_REFRESH.has(path) && status < 500 && text) {
    return text;
  }

  if (status === 401) return "Your session has expired. Please log in again.";
  if (status === 403) {
    if (lower.includes("verify your email")) return text;
    return "You do not have permission to do that.";
  }
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
  try {
    const headers = new Headers(init?.headers);
    const method = (init?.method || "GET").toUpperCase();
    if (csrfToken && !["GET", "HEAD", "OPTIONS"].includes(method)) {
      headers.set("X-CSRF-Token", csrfToken);
    }

    const response = await fetchBackend(
      path,
      { ...init, headers },
      timeoutMs,
    );

    csrfToken = response.headers.get("X-CSRF-Token") || csrfToken;

    if (
      response.status === 401 &&
      allowRefresh &&
      path !== "/auth/refresh" &&
      !AUTH_PATHS_WITHOUT_REFRESH.has(path)
    ) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return requestWithAuth<T>(path, init, timeoutMs, false);
      }
    }

    return handleResponse<T>(response, path);
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
  }
}

async function requestBlobWithAuth(
  path: string,
  init?: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
  allowRefresh = true,
): Promise<Blob> {
  try {
    const headers = new Headers(init?.headers);
    const method = (init?.method || "GET").toUpperCase();
    if (csrfToken && !["GET", "HEAD", "OPTIONS"].includes(method)) {
      headers.set("X-CSRF-Token", csrfToken);
    }

    const response = await fetchBackend(
      path,
      { ...init, headers },
      timeoutMs,
    );

    csrfToken = response.headers.get("X-CSRF-Token") || csrfToken;

    if (response.status === 401 && allowRefresh && path !== "/auth/refresh") {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return requestBlobWithAuth(path, init, timeoutMs, false);
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch((): ApiPayload => ({}));
      throw new ApiError(
        toFriendlyApiError(
          errorData.message || response.statusText,
          response.status,
        ),
        response.status,
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
  }
}

// Pages fire several requests at once, so an expired access token produces
// several 401s together. Share one refresh between them: the refresh token
// rotates on every use, so parallel refreshes made all but one fail and
// could leave the browser holding a refresh cookie the server had already
// replaced, signing the user out.
function refreshAccessToken() {
  refreshInFlight ??= performRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function performRefresh() {
  try {
    const response = await fetchBackend("/auth/refresh", {
      method: "POST",
      headers: csrfToken ? { "X-CSRF-Token": csrfToken } : undefined,
      credentials: "include",
    },
    REQUEST_TIMEOUT_MS,
    );

    csrfToken = response.headers.get("X-CSRF-Token") || csrfToken;

    if (!response.ok) {
      signOut();
      return false;
    }

    const session = await response.json();
    saveAuthSession(session);
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
    verifyEmail: (data: { email: string; code: string }) =>
      request("/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    resendVerification: (data: { email: string }) =>
      request("/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    refresh: () =>
      request("/auth/refresh", {
        method: "POST",
      }),
    identityPlatform: (idToken: string) =>
      request("/auth/identity-platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }),
    linkGoogle: (idToken: string) =>
      request("/auth/link-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }),
    // Google sign-in through the AWS Cognito user pool.
    cognito: (idToken: string, nonce: string) =>
      request("/auth/cognito", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, nonce }),
      }),
    linkCognito: (idToken: string, nonce: string) =>
      request("/auth/link-cognito", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, nonce }),
      }),
    me: () => request("/auth/me"),
    updateProfile: (data: AuthProfileUpdate) =>
      request("/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    forgotPassword: (data: { email: string }) =>
      request("/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    resetPassword: (data: { token: string; newPassword: string }) =>
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

  // Contacts
  contacts: {
    list: () => request("/contacts"),
    listPage: (params: PageParams) =>
      request(`/contacts${pageQueryString(params)}`) as Promise<
        Paginated<LooseApiResponse>
      >,
    summary: () =>
      request("/contacts/summary") as Promise<{
        total: number;
        unassigned: number;
      }>,
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
    listPage: (params: PageParams) =>
      request(`/email-campaigns${pageQueryString(params)}`) as Promise<
        Paginated<LooseApiResponse>
      >,
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
    // Launching personalizes every email and queues it before answering, so
    // a large campaign needs longer than the default timeout.
    launch: (id: string) =>
      request(
        `/email-campaigns/${id}/launch`,
        { method: "POST" },
        IMPORT_REQUEST_TIMEOUT_MS,
      ),
    relaunch: (id: string) =>
      request(
        `/email-campaigns/${id}/relaunch`,
        { method: "POST" },
        IMPORT_REQUEST_TIMEOUT_MS,
      ),
    pause: (id: string) =>
      request(`/email-campaigns/${id}/pause`, { method: "POST" }),
    resume: (id: string) =>
      request(`/email-campaigns/${id}/resume`, { method: "POST" }),
    stop: (id: string) =>
      request(`/email-campaigns/${id}/stop`, { method: "POST" }),
    sendTest: (data: CampaignTestPayload) =>
      request(
        "/email-campaigns/test-send",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
        AI_REQUEST_TIMEOUT_MS,
      ),
    replies: (params: ReplyListParams) =>
      request(`/email-campaigns/replies${replyQueryString(params)}`) as Promise<
        Paginated<EmailReply> & { unreadCount: number }
      >,
    setReplyRead: (id: string, read: boolean) =>
      request(`/email-campaigns/replies/${id}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read }),
      }),
    schedule: (id: string, scheduledAt: string) =>
      request(`/email-campaigns/${id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt }),
      }),
    unschedule: (id: string) =>
      request(`/email-campaigns/${id}/unschedule`, { method: "POST" }),
  },

  // Mailbox: conversations, drafts and sending
  mail: {
    threads: ({ unread, ...params }: ThreadListParams) =>
      request(
        `/mail/threads${pageQueryString({
          ...params,
          ...(unread ? { unread: "true" } : {}),
        } as PageParams)}`,
      ) as Promise<Paginated<MailThreadSummary>>,
    thread: (id: string) =>
      request(`/mail/threads/${id}`) as Promise<MailThreadDetail>,
    updateThread: (
      id: string,
      data: {
        read?: boolean;
        starred?: boolean;
        archived?: boolean;
        trashed?: boolean;
        labels?: string[];
      },
    ) =>
      request(`/mail/threads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }) as Promise<MailThreadSummary>,
    bulk: (ids: string[], action: BulkThreadAction) =>
      request("/mail/threads/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      }),
    deleteThread: (id: string) =>
      request(`/mail/threads/${id}`, { method: "DELETE" }),
    counts: () => request("/mail/counts") as Promise<MailCounts>,
    senders: () => request("/mail/senders") as Promise<MailSenders>,
    contactContext: (email: string) =>
      request(
        `/mail/contact-context?email=${encodeURIComponent(email)}`,
      ) as Promise<MailContactContext>,
    createDraft: (data: CreateDraftPayload) =>
      request("/mail/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }) as Promise<MailMessage>,
    updateDraft: (id: string, data: DraftPayload) =>
      request(`/mail/drafts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }) as Promise<MailMessage>,
    deleteDraft: (id: string) =>
      request(`/mail/drafts/${id}`, { method: "DELETE" }),
    sendDraft: (id: string, data: { sendAt?: string; undoSeconds?: number }) =>
      request(`/mail/drafts/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }) as Promise<{
        id: string;
        threadId: string;
        status: string;
        sendAt: string;
        scheduled: boolean;
      }>,
    cancelSend: (id: string) =>
      request(`/mail/messages/${id}/cancel`, {
        method: "POST",
      }) as Promise<MailMessage>,
    uploadAttachment: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return request(
        "/mail/attachments",
        { method: "POST", body: formData },
        IMPORT_REQUEST_TIMEOUT_MS,
      ) as Promise<MailAttachment>;
    },
    downloadAttachment: (id: string) =>
      requestBlob(`/mail/attachments/${id}`, undefined, 30000),
    // Same-origin path for inline images shown inside an email.
    inlineImageUrl: (id: string) =>
      `${BASE_URL}/mail/attachments/${id}?inline=1`,
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
  },

  // Calling Campaigns
  callingCampaigns: {
    dashboard: () => request("/calling-campaigns/dashboard"),
    list: () => request("/calling-campaigns"),
    listPage: (params: PageParams) =>
      request(`/calling-campaigns${pageQueryString(params)}`) as Promise<
        Paginated<LooseApiResponse>
      >,
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

  prospects: {
    buildProfile: (data: {
      description: string;
      exampleDomains?: string[];
      maxCompanies?: number;
    }) =>
      request(
        "/prospects/profile",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
        AI_REQUEST_TIMEOUT_MS,
      ),
    createSearch: (data: {
      mode?: "icp" | "companies";
      description?: string;
      profile?: ApiPayload;
      companies?: string[];
      maxCompanies?: number;
      peoplePerCompany?: number;
    }) =>
      request("/prospects/searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    searches: () => request("/prospects/searches"),
    search: (id: string) => request(`/prospects/searches/${id}`),
    companies: (id: string) => request(`/prospects/searches/${id}/companies`),
    people: (id: string) => request(`/prospects/searches/${id}/people`),
    run: (id: string) =>
      request(
        `/prospects/searches/${id}/run`,
        { method: "POST" },
        PROSPECT_RUN_TIMEOUT_MS,
      ),
    cancel: (id: string) =>
      request(`/prospects/searches/${id}/cancel`, { method: "POST" }),
    remove: (id: string) =>
      request(`/prospects/searches/${id}`, { method: "DELETE" }),
    updatePerson: (
      id: string,
      data: { email?: string; action?: "dismissed" | "restore" },
    ) =>
      request(`/prospects/people/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    addToContacts: (data: {
      ids: string[];
      directoryId?: string;
      duplicateStrategy?: "SKIP" | "OVERWRITE";
    }) =>
      request(
        "/prospects/people/add-to-contacts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
        IMPORT_REQUEST_TIMEOUT_MS,
      ),
    watchCompany: (id: string) =>
      request(`/prospects/companies/${id}/watch`, { method: "POST" }),
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
