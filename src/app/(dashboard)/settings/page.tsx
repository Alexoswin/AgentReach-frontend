"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useOutreachStore } from "@/store/useOutreachStore";
import { useState, useEffect } from "react";
import {
  Settings,
  Server,
  Key,
  Mail,
  Check,
  RefreshCw,
  CandlestickChart,
  ShieldAlert,
} from "lucide-react";

const DEFAULT_GEMINI_TEXT_MODEL = "gemini-2.5-flash-lite";
const MASKED_CREDENTIAL = "••••••••••••••••";
const DEFAULT_TRADE_MASTER_MODEL = "gemini-pro-latest";
const DEFAULT_TRADE_WORKER_MODEL = "gemini-flash-latest";

function StatusPill({ status }: { status?: string }) {
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
        status === "CONNECTED"
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/10"
          : status === "FAILED"
            ? "bg-rose-500/10 text-rose-400 border-rose-500/10"
            : "bg-zinc-850 text-zinc-400 border-zinc-800"
      }`}
    >
      {status || "DISCONNECTED"}
    </span>
  );
}

/**
 * The API returns saved credentials masked. If the user has typed something
 * new that has not been saved yet, keep their text rather than replacing it
 * with the mask.
 */
function keepSecret(incoming: string | undefined, previous: string) {
  const value = incoming || "";
  if (
    value === MASKED_CREDENTIAL &&
    previous &&
    previous !== MASKED_CREDENTIAL
  ) {
    return previous;
  }
  return value;
}

/* ------------------------------------------------------------------ */
/*  Settings page                                                      */
/* ------------------------------------------------------------------ */
export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { showAlert } = useOutreachStore();

  const [awsAccessKeyId, setAwsAccessKeyId] = useState("");
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState("");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [awsSenderEmail, setAwsSenderEmail] = useState("");
  const [geminiTextModel, setGeminiTextModel] = useState(
    DEFAULT_GEMINI_TEXT_MODEL,
  );
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState("");
  const [callProvider, setCallProvider] = useState<"twilio" | "plivo">(
    "twilio",
  );
  const [plivoAuthId, setPlivoAuthId] = useState("");
  const [plivoAuthToken, setPlivoAuthToken] = useState("");
  const [plivoPhoneNumber, setPlivoPhoneNumber] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");

  // Trade-Agent: Groww
  const [growwApiKey, setGrowwApiKey] = useState("");
  const [growwApiSecret, setGrowwApiSecret] = useState("");
  const [growwTotpSecret, setGrowwTotpSecret] = useState("");

  // Trade-Agent: Gemini model split (the desk reuses the Gemini API key above)
  const [tradeMasterModel, setTradeMasterModel] = useState(
    DEFAULT_TRADE_MASTER_MODEL,
  );
  const [tradeWorkerModel, setTradeWorkerModel] = useState(
    DEFAULT_TRADE_WORKER_MODEL,
  );

  // Fetch saved settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: api.settings.get,
  });

  // Hydrate form from saved settings
  useEffect(() => {
    if (settings) {
      queueMicrotask(() => {
        setAwsAccessKeyId(settings.awsAccessKeyId || "");
        setAwsSecretAccessKey(settings.awsSecretAccessKey || "");
        setAwsRegion(settings.awsRegion || "us-east-1");
        setAwsSenderEmail(settings.awsSenderEmail || "");
        setGeminiTextModel(
          settings.geminiTextModel || DEFAULT_GEMINI_TEXT_MODEL,
        );
        setTwilioAccountSid(settings.twilioAccountSid || "");
        setTwilioAuthToken(settings.twilioAuthToken || "");
        setTwilioPhoneNumber(settings.twilioPhoneNumber || "");
        setCallProvider(settings.callProvider === "plivo" ? "plivo" : "twilio");
        setPlivoAuthId(settings.plivoAuthId || "");
        setPlivoAuthToken(settings.plivoAuthToken || "");
        setPlivoPhoneNumber(settings.plivoPhoneNumber || "");
        setGrowwApiKey((prev) => keepSecret(settings.growwApiKey, prev));
        setGrowwApiSecret((prev) => keepSecret(settings.growwApiSecret, prev));
        setGrowwTotpSecret((prev) =>
          keepSecret(settings.growwTotpSecret, prev),
        );
        setTradeMasterModel(
          settings.tradeMasterModel || DEFAULT_TRADE_MASTER_MODEL,
        );
        setTradeWorkerModel(
          settings.tradeWorkerModel || DEFAULT_TRADE_WORKER_MODEL,
        );
        setGeminiApiKey((prev) => {
          const incoming = settings.geminiApiKey || "";
          if (
            incoming === MASKED_CREDENTIAL &&
            prev &&
            prev !== MASKED_CREDENTIAL
          ) {
            return prev;
          }
          return incoming;
        });
      });
    }
  }, [settings]);

  // Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: api.settings.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      showAlert("Your settings have been saved.", "success", "Settings saved");
    },
    onError: (err: Error) => {
      showAlert(
        err.message ||
          "We could not save your settings. Please check the fields and try again.",
        "error",
      );
    },
  });

  const testSesMutation = useMutation({
    mutationFn: api.settings.testSes,
    onSuccess: (res) => {
      if (res.success) {
        showAlert(
          res.message || "Your email sending connection is working.",
          "success",
          "Email settings verified",
        );
      } else {
        showAlert(
          res.error ||
            "We could not verify your email sending settings. Please check your AWS details.",
          "error",
        );
      }
    },
    onError: (err: Error) => {
      showAlert(
        err.message ||
          "We could not test your email sending settings. Please try again.",
        "error",
      );
    },
  });

  const testTwilioMutation = useMutation({
    mutationFn: api.settings.testTwilio,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      if (res.success) {
        showAlert(
          res.message || "Your Twilio integration is working.",
          "success",
          "Twilio settings verified",
        );
      } else {
        showAlert(
          res.error ||
            "We could not verify your Twilio integration. Please check details.",
          "error",
        );
      }
    },
    onError: (err: Error) => {
      showAlert(
        err.message ||
          "We could not test your Twilio settings. Please try again.",
        "error",
      );
    },
  });

  const testPlivoMutation = useMutation({
    mutationFn: api.settings.testPlivo,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      if (res.success) {
        showAlert(
          res.message || "Your Plivo integration is working.",
          "success",
          "Plivo settings verified",
        );
      } else {
        showAlert(
          res.error ||
            "We could not verify your Plivo integration. Please check details.",
          "error",
        );
      }
    },
    onError: (err: Error) => {
      showAlert(
        err.message ||
          "We could not test your Plivo settings. Please try again.",
        "error",
      );
    },
  });

  const testGeminiMutation = useMutation({
    mutationFn: () => api.settings.testGemini({ geminiApiKey }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      if (res.success) {
        showAlert(
          res.message || "Your Gemini Live API key is working.",
          "success",
          "Gemini Live key verified",
        );
      } else {
        showAlert(
          res.error || "We could not verify your Gemini Live API key.",
          "error",
        );
      }
    },
    onError: (err: Error) => {
      showAlert(
        err.message ||
          "We could not test your Gemini Live API key. Please try again.",
        "error",
      );
    },
  });

  const testGrowwMutation = useMutation({
    mutationFn: api.settings.testGroww,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      if (res.success) {
        showAlert(
          res.message || "Your Groww connection is working.",
          "success",
          "Groww verified",
        );
      } else {
        showAlert(
          res.error || "We could not verify your Groww credentials.",
          "error",
        );
      }
    },
    onError: (err: Error) => {
      showAlert(
        err.message || "We could not test your Groww connection.",
        "error",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate({
      awsAccessKeyId,
      awsSecretAccessKey,
      awsRegion,
      awsSenderEmail,
      geminiApiKey,
      geminiTextModel,
      twilioAccountSid,
      twilioAuthToken,
      twilioPhoneNumber,
      callProvider,
      plivoAuthId,
      plivoAuthToken,
      plivoPhoneNumber,
      growwApiKey,
      growwApiSecret,
      growwTotpSecret,
      tradeMasterModel,
      tradeWorkerModel,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-zinc-800 rounded w-1/4 pb-4 border-b border-zinc-900" />
        <div className="h-96 bg-zinc-900 border border-zinc-850 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="pb-5 border-b border-zinc-900">
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <Settings className="h-8 w-8 text-indigo-400" />
          System Settings
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Configure API credentials for AWS SES, Twilio/Plivo telephony,
          Gemini AI, and Groww.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* AWS SES Panel */}
        <div className="p-6 bg-zinc-900/40 border border-zinc-850 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/60">
            <Server className="h-5 w-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">
              AWS Simple Email Service (SES)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                AWS Access Key ID
              </label>
              <input
                type="text"
                value={awsAccessKeyId}
                onChange={(e) => setAwsAccessKeyId(e.target.value)}
                placeholder="AKIA..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                AWS Secret Access Key
              </label>
              <input
                type="password"
                value={awsSecretAccessKey}
                onChange={(e) => setAwsSecretAccessKey(e.target.value)}
                placeholder="••••••••••••••••••••••••••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                AWS Region
              </label>
              <input
                type="text"
                value={awsRegion}
                onChange={(e) => setAwsRegion(e.target.value)}
                placeholder="us-east-1"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Sender Email Address
              </label>
              <input
                type="email"
                value={awsSenderEmail}
                onChange={(e) => setAwsSenderEmail(e.target.value)}
                placeholder="you@yourdomain.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
              />
              <p className="mt-1.5 text-[11px] text-zinc-600">
                Must be a verified identity in your AWS SES account.
              </p>
            </div>
          </div>

          <div className="flex justify-start gap-3 pt-3">
            <button
              type="button"
              disabled={testSesMutation.isPending}
              onClick={() => testSesMutation.mutate()}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testSesMutation.isPending ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Mail className="h-3.5 w-3.5" />
              )}
              Test SES Connection
            </button>
          </div>
        </div>

        {/* Telephony Panel (Twilio / Plivo) */}
        <div className="p-6 bg-zinc-900/40 border border-zinc-850 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">
                Telephony Configuration
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <StatusPill
                status={
                  callProvider === "plivo"
                    ? settings?.plivoStatus
                    : settings?.twilioStatus
                }
              />
              {(callProvider === "plivo"
                ? settings?.plivoLastVerified
                : settings?.twilioLastVerified) && (
                <span className="text-[10px] text-zinc-500">
                  Verified:{" "}
                  {new Date(
                    (callProvider === "plivo"
                      ? settings?.plivoLastVerified
                      : settings?.twilioLastVerified) as string,
                  ).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Active Provider
            </span>
            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1">
              {(["twilio", "plivo"] as const).map((prov) => (
                <button
                  key={prov}
                  type="button"
                  onClick={() => setCallProvider(prov)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    callProvider === prov
                      ? "bg-indigo-500/20 text-indigo-300"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {prov}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-zinc-600">
              Calling campaigns launch through the active provider.
            </span>
          </div>

          {callProvider === "twilio" ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Twilio Account SID
                  </label>
                  <input
                    type="text"
                    value={twilioAccountSid}
                    onChange={(e) => setTwilioAccountSid(e.target.value)}
                    placeholder="AC..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Twilio Auth Token
                  </label>
                  <input
                    type="password"
                    value={twilioAuthToken}
                    onChange={(e) => setTwilioAuthToken(e.target.value)}
                    placeholder="••••••••••••••••••••••••••••••••"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Twilio Phone Number
                  </label>
                  <input
                    type="text"
                    value={twilioPhoneNumber}
                    onChange={(e) => setTwilioPhoneNumber(e.target.value)}
                    placeholder="+1234567890"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>

              <div className="flex justify-start gap-3 pt-3">
                <button
                  type="button"
                  disabled={testTwilioMutation.isPending}
                  onClick={() => testTwilioMutation.mutate()}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testTwilioMutation.isPending ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Server className="h-3.5 w-3.5" />
                  )}
                  Test Twilio Connection
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Plivo Auth ID
                  </label>
                  <input
                    type="text"
                    value={plivoAuthId}
                    onChange={(e) => setPlivoAuthId(e.target.value)}
                    placeholder="MA..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Plivo Auth Token
                  </label>
                  <input
                    type="password"
                    value={plivoAuthToken}
                    onChange={(e) => setPlivoAuthToken(e.target.value)}
                    placeholder="••••••••••••••••••••••••••••••••"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Plivo Phone Number
                  </label>
                  <input
                    type="text"
                    value={plivoPhoneNumber}
                    onChange={(e) => setPlivoPhoneNumber(e.target.value)}
                    placeholder="+1234567890"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>

              <div className="flex justify-start gap-3 pt-3">
                <button
                  type="button"
                  disabled={testPlivoMutation.isPending}
                  onClick={() => testPlivoMutation.mutate()}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testPlivoMutation.isPending ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Server className="h-3.5 w-3.5" />
                  )}
                  Test Plivo Connection
                </button>
              </div>
            </>
          )}
        </div>

        {/* Gemini Live API Key Panel */}
        <div className="p-6 bg-zinc-900/40 border border-zinc-850 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-purple-400" />
              <h3 className="text-base font-bold text-white">
                Gemini Live API Key
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  settings?.geminiStatus === "CONNECTED"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/10"
                    : settings?.geminiStatus === "FAILED"
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/10"
                      : "bg-zinc-850 text-zinc-400 border-zinc-800"
                }`}
              >
                {settings?.geminiStatus || "DISCONNECTED"}
              </span>
              {settings?.geminiLastVerified && (
                <span className="text-[10px] text-zinc-500">
                  Verified:{" "}
                  {new Date(settings.geminiLastVerified).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Gemini API Key
              </label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIza..."
                autoComplete="off"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 focus:border-indigo-500/50 focus:outline-none"
              />
              <p className="mt-2 text-[11px] text-zinc-500">
                Saved encrypted and used for Gemini Live campaign calls, bot
                chat, voice previews, AI calling campaign generation, and AI
                email template text generation.
              </p>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Text Model (for email templates)
              </label>
              <input
                type="text"
                value={geminiTextModel}
                onChange={(e) => setGeminiTextModel(e.target.value)}
                placeholder={DEFAULT_GEMINI_TEXT_MODEL}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 focus:border-indigo-500/50 focus:outline-none"
              />
              <p className="mt-2 text-[11px] text-zinc-500">
                Cheap Gemini text model used to generate email templates.
                Default: {DEFAULT_GEMINI_TEXT_MODEL}.
              </p>
            </div>
          </div>

          {/* Trade-Agent model split — same key, different models per role. */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <CandlestickChart className="h-4 w-4 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">
                Trade-Agent models
              </h4>
            </div>
            <p className="mb-4 text-[11px] leading-relaxed text-zinc-500">
              The trading desk runs on this same Gemini key. Split the work so
              judgement-heavy calls get the stronger model and high-volume ones
              stay cheap.
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Master Model
                </label>
                <input
                  type="text"
                  value={tradeMasterModel}
                  onChange={(e) => setTradeMasterModel(e.target.value)}
                  placeholder={DEFAULT_TRADE_MASTER_MODEL}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 focus:border-indigo-500/50 focus:outline-none"
                />
                <p className="mt-1.5 text-[11px] text-zinc-600">
                  Orchestrator, F&amp;O strategy and equity workers. Default:{" "}
                  {DEFAULT_TRADE_MASTER_MODEL}.
                </p>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Worker Model
                </label>
                <input
                  type="text"
                  value={tradeWorkerModel}
                  onChange={(e) => setTradeWorkerModel(e.target.value)}
                  placeholder={DEFAULT_TRADE_WORKER_MODEL}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 focus:border-indigo-500/50 focus:outline-none"
                />
                <p className="mt-1.5 text-[11px] text-zinc-600">
                  Research and technical workers — high volume, cheap. Default:{" "}
                  {DEFAULT_TRADE_WORKER_MODEL}.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-start gap-3 pt-3">
            <button
              type="button"
              disabled={testGeminiMutation.isPending}
              onClick={() => testGeminiMutation.mutate()}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testGeminiMutation.isPending ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Key className="h-3.5 w-3.5" />
              )}
              Test Gemini Live Key
            </button>
          </div>
        </div>

        {/* Groww Trading API Panel */}
        <div className="p-6 bg-zinc-900/40 border border-zinc-850 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
            <div className="flex items-center gap-2">
              <CandlestickChart className="h-5 w-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">
                Groww Trading API
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <StatusPill status={settings?.growwStatus} />
              {settings?.growwLastVerified && (
                <span className="text-[10px] text-zinc-500">
                  Verified:{" "}
                  {new Date(settings.growwLastVerified).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-none text-amber-400" />
            <p className="text-[11px] leading-relaxed text-amber-700/80">
              These credentials reach a live demat account. Set{" "}
              <code className="rounded bg-zinc-950 px-1 py-0.5 text-amber-300">
                CREDENTIAL_ENCRYPTION_KEY
              </code>{" "}
              (32+ characters) on the backend first — saving is refused without
              it. Groww access tokens expire at 06:00 IST daily; storing a
              secret or TOTP seed is what lets the desk renew unattended.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                API Key
              </label>
              <input
                type="password"
                value={growwApiKey}
                onChange={(e) => setGrowwApiKey(e.target.value)}
                placeholder="From groww.in/trade-api/api-keys"
                autoComplete="off"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 focus:border-indigo-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                API Secret
              </label>
              <input
                type="password"
                value={growwApiSecret}
                onChange={(e) => setGrowwApiSecret(e.target.value)}
                placeholder="Daily approval flow"
                autoComplete="off"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 focus:border-indigo-500/50 focus:outline-none"
              />
              <p className="mt-1.5 text-[11px] text-zinc-600">
                Needs approval on the Groww keys page each morning.
              </p>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                TOTP Secret
              </label>
              <input
                type="password"
                value={growwTotpSecret}
                onChange={(e) => setGrowwTotpSecret(e.target.value)}
                placeholder="Base32 seed"
                autoComplete="off"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 focus:border-indigo-500/50 focus:outline-none"
              />
              <p className="mt-1.5 text-[11px] text-zinc-600">
                Alternative to the secret. This is your second factor — storing
                it means a server compromise is an account compromise.
              </p>
            </div>
          </div>

          <div className="flex justify-start gap-3 pt-3">
            <button
              type="button"
              disabled={testGrowwMutation.isPending}
              onClick={() => testGrowwMutation.mutate()}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testGrowwMutation.isPending ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CandlestickChart className="h-3.5 w-3.5" />
              )}
              Test Groww Connection
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={updateSettingsMutation.isPending}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:brightness-110 disabled:opacity-50"
          >
            {updateSettingsMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
