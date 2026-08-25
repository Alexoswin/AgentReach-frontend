"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { LooseApiResponse } from "@/lib/api";
import {
  HD_VOICE_GENDER,
  geminiLanguageLabels,
  getHdVoices,
} from "@/lib/utils";
import { useOutreachStore } from "@/store/useOutreachStore";
import { LoaderOverlay } from "@/components/Loader";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  PhoneCall,
  Plus,
  Play,
  User,
  Volume2,
  Clock,
  MessageSquare,
  Pause,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  X,
  Edit2,
  Trash2,
  RotateCcw,
  Square,
  Folder,
  Languages,
  Bot,
  Sparkles,
  Download,
} from "lucide-react";
import { MissingCredentials } from "@/components/MissingCredentials";

type DirectoryFilter = "all" | "uncategorized" | string;

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  company?: string;
  directoryId?: string | null;
};

type ContactDirectory = {
  id: string;
  name: string;
  contactCount?: number;
};

type AiCallingBot = {
  id: string;
  name?: string;
  description?: string;
  language?: string;
  voice?: string;
  role?: string;
  personality?: string;
  ragEnabled?: boolean;
  trainingChunkCount?: number;
  lastTrainedAt?: string;
};

type GeneratedCallingCampaign = {
  name: string;
  objective: string;
  prompt: string;
  voice: string;
  language: string;
};

type CallingCampaignGenerationJob = {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  result?: GeneratedCallingCampaign;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

type VoiceGender = "female" | "male";
type ResponseSpeed = "fast" | "balanced" | "conservative";

const DEFAULT_GEMINI_LIVE_MODEL =
  "gemini-3.1-flash-native-audio-preview-12-2025";

const RESPONSE_SPEED_OPTIONS: Array<{
  value: ResponseSpeed;
  label: string;
}> = [
  { value: "fast", label: "Fast" },
  { value: "balanced", label: "Balanced" },
  { value: "conservative", label: "Careful" },
];

const LANGUAGE_PREVIEW_TEXTS: Record<string, string> = {
  "en-IN": "Hello, this is a quick ReachConvert voice preview.",
  "hi-IN": "नमस्ते, यह एक त्वरित रीचकन्वर्ट वॉयस प्रीव्यू है।",
  "bn-IN": "নমস্কার, এটি একটি দ্রুত রিচকনভার্ট ভয়েস প্রিভিউ।",
  "gu-IN": "નમસ્તે, આ એક ઝડપી રીચકન્વર્ટ વોઇસ પ્રીવ્યૂ છે.",
  "mr-IN": "नमस्कार, हा एक द्रुत रीचकन्व्हर्ट व्हॉइस प्रिव्ह्यू आहे.",
  "ta-IN": "வணக்கம், இது ஒரு விரைவான ரீச்கன்வெர்ட் குரல் முன்னோட்டம்.",
  "te-IN": "నమస్కారం, ఇది శీఘ్ర రీచ్‌కన్వర్ట్ వాయిస్ ప్రివ్యూ.",
  "kn-IN": "ನಮಸ್ಕಾರ, ಇದು ತ್ವರಿತ ರೀಚ್‌ಕನ್ವರ್ಟ್ ಧ್ವನಿ ಪೂರ್ವವೀಕ್ಷಣೆ.",
  "ml-IN": "നമസ്കാരം, ഇതൊരു ദ്രുത റീച്ച്കൺവെർട്ട് വോയ്‌സ് പ്രിവ്യൂ ആണ്.",
  "pa-IN": "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਇਹ ਇੱਕ ਤੇਜ਼ ਰੀਚਕਨਵਰਟ ਵੌਇਸ ਪ੍ਰੀਵਿਊ ਹੈ।",
};


const extractHdVoiceName = (value?: string) => {
  const rawValue = value?.trim();
  if (!rawValue) return "";
  const withoutProvider = rawValue.replace(/^google:/i, "");
  const matched = withoutProvider.match(
    /^[a-z]{2,3}-[A-Z]{2}-Chirp3-HD-([A-Za-z]+)$/,
  );
  return matched?.[1] || withoutProvider;
};

const normalizeResponseSpeed = (value: unknown): ResponseSpeed => {
  return value === "balanced" || value === "conservative" ? value : "fast";
};

const extractHdLanguage = (value?: string) => {
  const rawValue = value?.trim().replace(/^google:/i, "");
  return (
    rawValue?.match(/^([a-z]{2,3}-[A-Z]{2})-Chirp3-HD-[A-Za-z]+$/)?.[1] || ""
  );
};

const getHdVoiceDefaultGender = (value?: string): VoiceGender => {
  const voiceName = extractHdVoiceName(value);
  return HD_VOICE_GENDER[voiceName] || "female";
};

const normalizeHdLanguageValue = (
  languageValue?: string,
  voiceValue?: string,
) => {
  if (languageValue && getHdVoices(languageValue).length > 0) {
    return languageValue;
  }
  const languageFromVoice = extractHdLanguage(voiceValue);
  if (languageFromVoice && getHdVoices(languageFromVoice).length > 0) {
    return languageFromVoice;
  }
  return "en-IN";
};

const normalizeHdVoiceForLanguageAndGender = (
  voiceValue: string | undefined,
  languageValue: string,
  genderValue: VoiceGender,
) => {
  const voiceName = extractHdVoiceName(voiceValue);
  const voices = getHdVoices(languageValue, genderValue);
  if (voices.some((option) => option.value === voiceName)) {
    return voiceName;
  }
  return voices[0]?.value || getHdVoices(languageValue)[0]?.value || "Puck";
};

const buildGoogleHdVoice = (voiceName: string, languageValue: string) =>
  `google:${languageValue}-Chirp3-HD-${extractHdVoiceName(voiceName) || "Puck"}`;

const antigravityLanguages = geminiLanguageLabels.filter(
  (group) =>
    group.label === "Indian Languages" ||
    group.label === "European Languages" ||
    group.label === "Asian Languages",
);

const getLanguageLabel = (value: string) => {
  for (const group of antigravityLanguages) {
    const opt = group.options.find((o) => o.value === value);
    if (opt) return opt.label;
  }
  return value;
};

const getDialedNetworkRange = (phoneNumber?: string) => {
  const digits = String(phoneNumber || "").replace(/\D/g, "");
  if (!digits) return "Unknown";
  if (digits.startsWith("91") && digits.length >= 12) {
    return `+91 ${digits.slice(2, 7)}****`;
  }
  if (digits.startsWith("1") && digits.length >= 11) {
    return `+1 ${digits.slice(1, 4)}-${digits.slice(4, 7)}***`;
  }
  const prefixLength = Math.min(Math.max(digits.length - 4, 4), 7);
  return `+${digits.slice(0, prefixLength)}${"*".repeat(
    Math.max(0, digits.length - prefixLength),
  )}`;
};

const TRANSCRIPT_COPY: Record<
  string,
  { assistant: string; contact: string; empty: string }
> = {
  en: {
    assistant: "AI Agent",
    contact: "Contact",
    empty: "No conversational transcript recorded.",
  },
  hi: {
    assistant: "एआई एजेंट",
    contact: "संपर्क",
    empty: "बातचीत की ट्रांसक्रिप्ट रिकॉर्ड नहीं हुई.",
  },
  bn: {
    assistant: "এআই এজেন্ট",
    contact: "যোগাযোগ",
    empty: "কথোপকথনের ট্রান্সক্রিপ্ট রেকর্ড হয়নি.",
  },
  gu: {
    assistant: "AI એજન્ટ",
    contact: "સંપર્ક",
    empty: "વાતચીતની ટ્રાન્સક્રિપ્ટ રેકોર્ડ થઈ નથી.",
  },
  mr: {
    assistant: "एआय एजंट",
    contact: "संपर्क",
    empty: "संभाषणाची ट्रान्सक्रिप्ट रेकॉर्ड झाली नाही.",
  },
  ta: {
    assistant: "AI முகவர்",
    contact: "தொடர்பு",
    empty: "உரையாடல் பதிவு கிடைக்கவில்லை.",
  },
  te: {
    assistant: "AI ఏజెంట్",
    contact: "కాంటాక్ట్",
    empty: "సంభాషణ ట్రాన్స్‌క్రిప్ట్ రికార్డ్ కాలేదు.",
  },
  kn: {
    assistant: "AI ಏಜೆಂಟ್",
    contact: "ಸಂಪರ್ಕ",
    empty: "ಸಂಭಾಷಣೆಯ ಟ್ರಾನ್ಸ್‌ಕ್ರಿಪ್ಟ್ ದಾಖಲಾಗಿಲ್ಲ.",
  },
  ml: {
    assistant: "AI ഏജന്റ്",
    contact: "കോണ്ടാക്റ്റ്",
    empty: "സംഭാഷണ ട്രാൻസ്‌ക്രിപ്റ്റ് രേഖപ്പെടുത്തിയിട്ടില്ല.",
  },
  pa: {
    assistant: "AI ਏਜੰਟ",
    contact: "ਸੰਪਰਕ",
    empty: "ਗੱਲਬਾਤ ਦੀ ਟ੍ਰਾਂਸਕ੍ਰਿਪਟ ਰਿਕਾਰਡ ਨਹੀਂ ਹੋਈ.",
  },
};

const getTranscriptCopy = (languageCode?: string) => {
  const prefix = String(languageCode || "en-IN").split("-")[0].toLowerCase();
  return TRANSCRIPT_COPY[prefix] || TRANSCRIPT_COPY.en;
};

const parseTranscriptLine = (line: string) => {
  const match = line.match(
    /^\s*(AI Agent|Agent|Assistant|AI|User|Customer|Contact)\s*:\s*(.*)$/i,
  );
  if (!match) return { role: "contact", text: line.trim() };
  const speaker = match[1].toLowerCase();
  return {
    role:
      speaker === "ai" ||
      speaker === "agent" ||
      speaker === "assistant" ||
      speaker === "ai agent"
        ? "assistant"
        : "contact",
    text: match[2].trim(),
  };
};

const DATA_FIELD_LABELS: Record<string, string> = {
  opportunityStatus: "Opportunity",
  interviewDate: "Interview Date",
  interviewTime: "Interview Time",
  location: "Location",
  meetingLink: "Meeting Link",
  contactPerson: "Contact Person",
  email: "Email",
  phone: "Phone",
  role: "Role",
  resumeRequested: "Resume Requested",
  callbackRequested: "Callback Requested",
};

const DATA_FIELD_ORDER = [
  "opportunityStatus",
  "role",
  "interviewDate",
  "interviewTime",
  "location",
  "meetingLink",
  "contactPerson",
  "email",
  "phone",
  "resumeRequested",
  "callbackRequested",
];

const formatCollectedDataValue = (key: string, value: unknown) => {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key === "opportunityStatus") {
    const normalized = String(value || "").replace(/_/g, " ");
    return normalized
      ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
      : "";
  }
  return String(value || "").trim();
};

function HDVoiceSelector({
  value,
  onChange,
  language,
  gender,
  previewText,
}: {
  value: string;
  onChange: (v: string) => void;
  language: string;
  gender: VoiceGender;
  previewText: string;
}) {
  const [open, setOpen] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const togglePlay = async (e: React.MouseEvent, val: string) => {
    e.stopPropagation();
    const voiceName = `google:${language}-Chirp3-HD-${val}`;
    if (previewingVoice === voiceName) {
      audioRef.current?.pause();
      setPreviewingVoice(null);
    } else {
      setPreviewingVoice(voiceName);
      try {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const result = await api.settings.previewGeminiVoice({
          voice: voiceName,
          language,
          text: previewText,
        });
        const audio = new Audio(result.audioDataUrl);
        audioRef.current = audio;
        audio.onended = () => {
          setPreviewingVoice(null);
        };
        audio.play().catch(() => {
          setPreviewingVoice(null);
        });
      } catch {
        setPreviewingVoice(null);
      }
    }
  };

  const voices = useMemo(
    () => getHdVoices(language, gender),
    [language, gender],
  );

  const selectedLabel = useMemo(() => {
    const found = voices.find((v) => v.value === value);
    return found ? found.label : "Select HD Voice";
  }, [value, voices]);

  // Effect to auto-select a valid voice if current is not in filtered list
  useEffect(() => {
    if (voices.length > 0 && !voices.some((v) => v.value === value)) {
      onChange(voices[0].value);
    }
  }, [voices, value, onChange]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-left text-xs text-zinc-200 transition-colors hover:border-zinc-700 focus:border-indigo-500/50 focus:outline-none"
      >
        <span>{selectedLabel}</span>
        <ChevronDown
          className={`h-4 w-4 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40 max-h-60 overflow-y-auto scrollbar-thin scrollbar-track-zinc-950 scrollbar-thumb-zinc-800">
          {voices.length > 0 ? (
            <ul>
              {voices.map((opt) => (
                <li key={opt.value}>
                  <div
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-zinc-900 ${opt.value === value ? "bg-indigo-500/10 text-indigo-400" : "text-zinc-300"}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                        if (audioRef.current) audioRef.current.pause();
                        setPreviewingVoice(null);
                      }}
                      className="flex-1 text-left flex items-center gap-2"
                    >
                      {opt.value === value && (
                        <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span className={opt.value === value ? "" : "pl-5.5"}>
                        {opt.label}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => togglePlay(e, opt.value)}
                      className="ml-2 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      {previewingVoice ===
                      `google:${language}-Chirp3-HD-${opt.value}` ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 text-xs text-zinc-500 text-center">
              No {gender} HD voices available for this language.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CallingCampaignsPage() {
  const queryClient = useQueryClient();
  const { showAlert } = useOutreachStore();
  const isCampaignActive = (status?: string) =>
    status === "RUNNING" || status === "LAUNCHING";

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: api.settings.get,
  });

  const [activeTab, setActiveTab] = useState<"list" | "detail" | "create">(
    "list",
  );
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null,
  );
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(
    null,
  );

  // Recording preview playback
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const [recordingLoadingId, setRecordingLoadingId] = useState<string | null>(
    null,
  );
  const [activeRecordingUrl, setActiveRecordingUrl] = useState<string | null>(
    null,
  );
  const callAudioRef = useRef<HTMLAudioElement | null>(null);
  const recordingObjectUrlsRef = useRef<Record<string, string>>({});

  // Expanded Transcript Collapsible
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

  // Create Campaign State
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [prompt, setPrompt] = useState("");
  const [aiCampaignPrompt, setAiCampaignPrompt] = useState("");
  const [aiCampaignTone, setAiCampaignTone] = useState(
    "Warm, natural, concise, and helpful",
  );
  const [voice, setVoice] = useState("Puck");
  const [language, setLanguage] = useState("en-IN");
  const [voiceGender, setVoiceGender] = useState<VoiceGender>("male");
  const [voicePreviewText, setVoicePreviewText] = useState(
    "Hello, this is a quick ReachConvert voice preview.",
  );
  const [aiSpeaksFirst, setAiSpeaksFirst] = useState(true);
  const [preventInterruption, setPreventInterruption] = useState(false);
  const [realtimeModel, setRealtimeModel] = useState(
    DEFAULT_GEMINI_LIVE_MODEL,
  );
  const [responseSpeed, setResponseSpeed] = useState<ResponseSpeed>("fast");
  const [aiCallingBotId, setAiCallingBotId] = useState<string | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContactDirectoryId, setSelectedContactDirectoryId] =
    useState<DirectoryFilter>("all");
  const [generationJobId, setGenerationJobId] = useState<string | null>(null);
  const handledGenerationJobIdRef = useRef<string | null>(null);
  const [isAddContactsOpen, setIsAddContactsOpen] = useState(false);
  const [addContactSearch, setAddContactSearch] = useState("");
  const [addContactsDirectoryId, setAddContactsDirectoryId] =
    useState<DirectoryFilter>("all");
  const [addSelectedContactIds, setAddSelectedContactIds] = useState<string[]>(
    [],
  );

  useEffect(() => {
    return () => {
      callAudioRef.current?.pause();
      Object.values(recordingObjectUrlsRef.current).forEach((url) =>
        URL.revokeObjectURL(url),
      );
      recordingObjectUrlsRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!activeRecordingUrl || !playingCallId || !callAudioRef.current) return;
    callAudioRef.current.play().catch(() => {
      showAlert("We could not play this call recording.", "error");
      setPlayingCallId(null);
      setActiveRecordingUrl(null);
    });
  }, [activeRecordingUrl, playingCallId, showAlert]);

  // Fetch campaigns list
  const { data: campaigns = [], isLoading: isListLoading } = useQuery({
    queryKey: ["calling-campaigns"],
    queryFn: api.callingCampaigns.list,
  });

  // Fetch AI calling bots for bot picker
  const { data: aiBots = [] } = useQuery<AiCallingBot[]>({
    queryKey: ["ai-calling-bots"],
    queryFn: () => api.aiCallingBots.list() as Promise<AiCallingBot[]>,
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: () => api.contacts.list() as Promise<Contact[]>,
  });

  const { data: contactDirectories = [] } = useQuery<ContactDirectory[]>({
    queryKey: ["contact-directories"],
    queryFn: () =>
      api.contacts.directories.list() as Promise<ContactDirectory[]>,
  });

  // Fetch single campaign details
  const { data: campaignDetails, isLoading: isDetailLoading } = useQuery({
    queryKey: ["calling-campaign", selectedCampaignId],
    queryFn: () =>
      selectedCampaignId ? api.callingCampaigns.get(selectedCampaignId) : null,
    enabled: !!selectedCampaignId,
    refetchInterval: (query) => {
      // Fast refetch while live calls are running to show real-time updates.
      return isCampaignActive(query.state.data?.status) ? 2000 : false;
    },
  });

  const { data: generationJob } = useQuery<CallingCampaignGenerationJob>({
    queryKey: ["calling-campaign-generation-job", generationJobId],
    queryFn: () =>
      api.callingCampaigns.generationStatus(
        generationJobId!,
      ) as Promise<CallingCampaignGenerationJob>,
    enabled: !!generationJobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "COMPLETED" || status === "FAILED" ? false : 3000;
    },
  });

  // Mutations
  const createCampaignMutation = useMutation({
    mutationFn: api.callingCampaigns.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calling-campaigns"] });
      showAlert(
        "Your calling campaign is saved and ready.",
        "success",
        "Campaign ready",
      );
      resetForm();
      setActiveTab("list");
    },
    onError: (err: Error) => {
      showAlert(
        err.message ||
          "We could not save this calling campaign. Please check the details and try again.",
        "error",
      );
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: LooseApiResponse }) =>
      api.callingCampaigns.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calling-campaigns"] });
      if (editingCampaignId) {
        queryClient.invalidateQueries({
          queryKey: ["calling-campaign", editingCampaignId],
        });
      }
      showAlert(
        "The calling campaign has been updated.",
        "success",
        "Campaign updated",
      );
      resetForm();
      setEditingCampaignId(null);
      setActiveTab(selectedCampaignId ? "detail" : "list");
    },
    onError: (err: Error) => {
      showAlert(
        err.message ||
          "We could not update this calling campaign. Please try again.",
        "error",
      );
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: api.callingCampaigns.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calling-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["history-calls"] });
      showAlert(
        "The calling campaign and its call logs were deleted.",
        "success",
        "Campaign deleted",
      );
      setSelectedCampaignId(null);
      setEditingCampaignId(null);
      setActiveTab("list");
    },
    onError: (err: Error) => {
      showAlert(
        err.message ||
          "We could not delete this calling campaign. Please try again.",
        "error",
      );
    },
  });

  const launchCampaignMutation = useMutation({
    mutationFn: ({ id, isRelaunch }: { id: string; isRelaunch: boolean }) =>
      isRelaunch
        ? api.callingCampaigns.relaunch(id)
        : api.callingCampaigns.launch(id),
    onSuccess: (
      result: LooseApiResponse,
      variables: { id: string; isRelaunch: boolean },
    ) => {
      queryClient.invalidateQueries({ queryKey: ["calling-campaigns"] });
      if (selectedCampaignId) {
        queryClient.invalidateQueries({
          queryKey: ["calling-campaign", selectedCampaignId],
        });
      }
      const dialer = result?.twilio;
      if (
        dialer &&
        Number(dialer.placed || 0) === 0 &&
        Number(dialer.failed || 0) > 0
      ) {
        showAlert(
          dialer.errors?.[0] ||
            "The telephony provider did not queue any calls. Check your provider settings and PUBLIC_API_URL.",
          "error",
          "Calling not queued",
        );
        return;
      }
      showAlert(
        dialer
          ? `Queued ${dialer.placed || 0} call(s). Failed: ${dialer.failed || 0}.`
          : variables.isRelaunch
            ? "The calling campaign has been relaunched. Queue status will appear in the call logs."
            : "The calling campaign has started. Queue status will appear in the call logs.",
        "success",
        variables.isRelaunch ? "Calling relaunched" : "Calling started",
      );
    },
    onError: (err: Error, variables: { id: string; isRelaunch: boolean }) => {
      showAlert(
        err.message ||
          (variables.isRelaunch
            ? "We could not relaunch the calling campaign. Please try again."
            : "We could not start the calling campaign. Please add contacts first."),
        "error",
      );
    },
  });

  const stopCampaignMutation = useMutation({
    mutationFn: api.callingCampaigns.stop,
    onSuccess: (result: LooseApiResponse) => {
      queryClient.invalidateQueries({ queryKey: ["calling-campaigns"] });
      if (selectedCampaignId) {
        queryClient.invalidateQueries({
          queryKey: ["calling-campaign", selectedCampaignId],
        });
      }
      const cancelledCount = Number(result?.cancelledCalls || 0);
      showAlert(
        `The campaign was stopped. ${cancelledCount} call(s) were cancelled.`,
        "success",
        "Campaign stopped",
      );
    },
    onError: (err: Error) => {
      showAlert(
        err.message || "We could not stop this calling campaign.",
        "error",
      );
    },
  });

  const [schedulingCampaignId, setSchedulingCampaignId] = useState<
    string | null
  >(null);
  const [scheduleValue, setScheduleValue] = useState("");

  const scheduleCampaignMutation = useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt: string }) =>
      api.callingCampaigns.schedule(id, scheduledAt),
    onSuccess: (result: LooseApiResponse) => {
      queryClient.invalidateQueries({ queryKey: ["calling-campaigns"] });
      setSchedulingCampaignId(null);
      setScheduleValue("");
      showAlert(
        result?.message || "The calling campaign is scheduled.",
        "success",
        "Campaign scheduled",
      );
    },
    onError: (err: Error) => {
      showAlert(
        err.message || "We could not schedule this calling campaign.",
        "error",
      );
    },
  });

  const unscheduleCampaignMutation = useMutation({
    mutationFn: api.callingCampaigns.unschedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calling-campaigns"] });
      showAlert("Schedule cancelled.", "success");
    },
    onError: (err: Error) => {
      showAlert(err.message || "Could not cancel the schedule.", "error");
    },
  });

  const addContactsMutation = useMutation({
    mutationFn: ({ id, contactIds }: { id: string; contactIds: string[] }) =>
      api.callingCampaigns.update(id, { contactIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calling-campaigns"] });
      if (selectedCampaignId) {
        queryClient.invalidateQueries({
          queryKey: ["calling-campaign", selectedCampaignId],
        });
      }
      setIsAddContactsOpen(false);
      setAddContactSearch("");
      setAddContactsDirectoryId("all");
      setAddSelectedContactIds([]);
      showAlert(
        "The selected contacts were added to this calling campaign.",
        "success",
        "Contacts added",
      );
    },
    onError: (err: Error) => {
      showAlert(
        err.message || "We could not add those contacts. Please try again.",
        "error",
      );
    },
  });

  const previewVoiceMutation = useMutation({
    mutationFn: () => {
      const hdLanguage = normalizeHdLanguageValue(language, voice);
      return api.settings.previewGeminiVoice({
        voice: buildGoogleHdVoice(
          normalizeHdVoiceForLanguageAndGender(voice, hdLanguage, voiceGender),
          hdLanguage,
        ),
        language: hdLanguage,
        text: voicePreviewText,
      });
    },
    onSuccess: () => {
      showAlert("Voice preview is ready.", "success", "Preview ready");
    },
    onError: (err: Error) => {
      showAlert(
        err.message ||
          "We could not generate a voice preview. Please check your Gemini API key settings.",
        "error",
      );
    },
  });

  const generateCallingCampaignMutation = useMutation<
    CallingCampaignGenerationJob,
    Error
  >({
    mutationFn: () =>
      api.callingCampaigns.startGenerate({
        prompt: aiCampaignPrompt,
        tone: aiCampaignTone,
      }) as Promise<CallingCampaignGenerationJob>,
    onSuccess: (job) => {
      setGenerationJobId(job.id);
      handledGenerationJobIdRef.current = null;
      showAlert(
        "AI calling campaign generation started. Status will refresh automatically.",
        "info",
        "Generating campaign",
      );
    },
    onError: (err: Error) => {
      showAlert(
        err.message ||
          "We could not generate a calling campaign. Please try a more specific prompt.",
        "error",
      );
    },
  });

  useEffect(() => {
    if (
      !generationJob ||
      !generationJobId ||
      handledGenerationJobIdRef.current === generationJobId
    )
      return;

    if (generationJob.status === "COMPLETED" && generationJob.result) {
      const generated = generationJob.result;
      handledGenerationJobIdRef.current = generationJobId;
      window.setTimeout(() => {
        const nextLanguage = normalizeHdLanguageValue(
          generated.language,
          generated.voice,
        );
        const nextGender = getHdVoiceDefaultGender(generated.voice);
        const nextVoice = normalizeHdVoiceForLanguageAndGender(
          generated.voice,
          nextLanguage,
          nextGender,
        );
        setName((current) => generated.name || current);
        setObjective(generated.objective || "");
        setPrompt(generated.prompt || aiCampaignPrompt);
        setVoiceGender(nextGender);
        setVoice(nextVoice);
        setLanguage(nextLanguage);
        setVoicePreviewText(
          LANGUAGE_PREVIEW_TEXTS[nextLanguage] ||
            LANGUAGE_PREVIEW_TEXTS["en-IN"],
        );
        setGenerationJobId(null);
        showAlert(
          "AI calling campaign draft generated.",
          "success",
          "Campaign generated",
        );
      }, 0);
    }

    if (generationJob.status === "FAILED") {
      handledGenerationJobIdRef.current = generationJobId;
      window.setTimeout(() => {
        setGenerationJobId(null);
        showAlert(
          generationJob.error ||
            "We could not generate a calling campaign. Please try a more specific prompt.",
          "error",
        );
      }, 0);
    }
  }, [aiCampaignPrompt, generationJob, generationJobId, showAlert]);

  const resetForm = () => {
    setName("");
    setObjective("");
    setPrompt("");
    setAiCampaignPrompt("");
    setAiCampaignTone("Warm, natural, concise, and helpful");
    setVoice("Puck");
    setLanguage("en-IN");
    setVoiceGender("male");
    setVoicePreviewText("Hello, this is a quick ReachConvert voice preview.");
    setAiSpeaksFirst(true);
    setPreventInterruption(false);
    setRealtimeModel(DEFAULT_GEMINI_LIVE_MODEL);
    setResponseSpeed("fast");
    setAiCallingBotId(null);
    setSelectedContactIds([]);
    setContactSearch("");
    setSelectedContactDirectoryId("all");
    setGenerationJobId(null);
    handledGenerationJobIdRef.current = null;
    setEditingCampaignId(null);
  };

  const hasPhoneNumber = (contact: Contact) =>
    Boolean(contact.phoneNumber?.trim());

  const getContactsByDirectory = (
    contactList: Contact[],
    directoryId: DirectoryFilter,
  ) =>
    contactList.filter((contact) => {
      if (directoryId === "all") return true;
      if (directoryId === "uncategorized") return !contact.directoryId;
      return contact.directoryId === directoryId;
    });

  const matchesContactSearch = (contact: Contact, term: string) => {
    const normalizedTerm = term.trim().toLowerCase();
    if (!normalizedTerm) return true;
    return (
      contact.firstName.toLowerCase().includes(normalizedTerm) ||
      contact.lastName.toLowerCase().includes(normalizedTerm) ||
      contact.email.toLowerCase().includes(normalizedTerm) ||
      (contact.phoneNumber || "").toLowerCase().includes(normalizedTerm) ||
      (contact.company || "").toLowerCase().includes(normalizedTerm)
    );
  };

  const callableContacts = contacts.filter(hasPhoneNumber);
  const callableDirectoryOptions = contactDirectories
    .map((directory) => ({
      ...directory,
      callableCount: callableContacts.filter(
        (contact) => contact.directoryId === directory.id,
      ).length,
    }))
    .filter((directory) => directory.callableCount > 0);
  const unassignedCallableCount = callableContacts.filter(
    (contact) => !contact.directoryId,
  ).length;

  const selectDirectoryFallback = (
    directoryId: DirectoryFilter,
    availableContacts: Contact[],
  ): DirectoryFilter => {
    if (directoryId === "all") return "all";
    if (directoryId === "uncategorized") {
      return availableContacts.some((contact) => !contact.directoryId)
        ? "uncategorized"
        : "all";
    }
    return availableContacts.some(
      (contact) => contact.directoryId === directoryId,
    )
      ? directoryId
      : "all";
  };

  const toggleCreateContactSelection = (contactId: string) => {
    setSelectedContactIds((current) =>
      current.includes(contactId)
        ? current.filter((id) => id !== contactId)
        : [...current, contactId],
    );
  };

  const toggleAddContactSelection = (contactId: string) => {
    setAddSelectedContactIds((current) =>
      current.includes(contactId)
        ? current.filter((id) => id !== contactId)
        : [...current, contactId],
    );
  };

  const handleVoiceChange = (voiceName: string) => {
    setVoice(voiceName);
  };

  const handleLanguageChange = (languageName: string) => {
    setLanguage(languageName);
    setVoicePreviewText(
      LANGUAGE_PREVIEW_TEXTS[languageName] || LANGUAGE_PREVIEW_TEXTS["en-IN"],
    );
    setVoice(
      normalizeHdVoiceForLanguageAndGender(voice, languageName, voiceGender),
    );
  };

  const handleVoiceGenderChange = (gender: VoiceGender) => {
    setVoiceGender(gender);
    const nextVoices = getHdVoices(language, gender);
    if (!nextVoices.some((v) => v.value === voice)) {
      setVoice(nextVoices[0]?.value || "");
    }
  };

  const handleAiBotSelect = (bot: AiCallingBot, isSelected: boolean) => {
    if (isSelected) {
      setAiCallingBotId(null);
      return;
    }

    setAiCallingBotId(bot.id);
    if (!bot.voice && !bot.language) return;

    const nextLanguage = normalizeHdLanguageValue(bot.language, bot.voice);
    const nextGender = getHdVoiceDefaultGender(bot.voice);
    setLanguage(nextLanguage);
    setVoiceGender(nextGender);
    setVoice(
      normalizeHdVoiceForLanguageAndGender(bot.voice, nextLanguage, nextGender),
    );
    setVoicePreviewText(
      LANGUAGE_PREVIEW_TEXTS[nextLanguage] || LANGUAGE_PREVIEW_TEXTS["en-IN"],
    );
  };

  const isGeneratingCampaign =
    generateCallingCampaignMutation.isPending ||
    generationJob?.status === "PENDING" ||
    generationJob?.status === "PROCESSING";

  const handleCreateDirectoryChange = (directoryId: DirectoryFilter) => {
    setSelectedContactDirectoryId(directoryId);
    setSelectedContactIds((current) =>
      current.filter((id) => {
        const contact = callableContacts.find((item) => item.id === id);
        if (!contact) return false;
        if (directoryId === "all") return true;
        if (directoryId === "uncategorized") return !contact.directoryId;
        return contact.directoryId === directoryId;
      }),
    );
  };

  const handleAddDirectoryChange = (directoryId: DirectoryFilter) => {
    setAddContactsDirectoryId(directoryId);
    setAddSelectedContactIds((current) =>
      current.filter((id) => {
        const contact = contacts.find((item) => item.id === id);
        if (!contact) return false;
        if (directoryId === "all") return true;
        if (directoryId === "uncategorized") return !contact.directoryId;
        return contact.directoryId === directoryId;
      }),
    );
  };

  const createDirectoryContacts = getContactsByDirectory(
    callableContacts,
    selectDirectoryFallback(selectedContactDirectoryId, callableContacts),
  );
  const createFilteredContacts = createDirectoryContacts.filter((contact) =>
    matchesContactSearch(contact, contactSearch),
  );
  const selectedCreateContactsInView = createFilteredContacts.filter(
    (contact) => selectedContactIds.includes(contact.id),
  );

  const toggleCreateSelectAll = () => {
    if (createFilteredContacts.length === 0) return;
    setSelectedContactIds((current) => {
      const visibleIds = new Set(
        createFilteredContacts.map((contact) => contact.id),
      );
      const allVisibleSelected = createFilteredContacts.every((contact) =>
        current.includes(contact.id),
      );
      if (allVisibleSelected)
        return current.filter((id) => !visibleIds.has(id));

      const next = new Set(current);
      createFilteredContacts.forEach((contact) => next.add(contact.id));
      return Array.from(next);
    });
  };

  const availableAddContacts = contacts.filter((contact) => {
    const alreadyInCampaign = campaignDetails?.calls?.some(
      (call: LooseApiResponse) => call.contactId === contact.id,
    );

    return hasPhoneNumber(contact) && !alreadyInCampaign;
  });
  const addDirectoryContacts = getContactsByDirectory(
    availableAddContacts,
    selectDirectoryFallback(addContactsDirectoryId, availableAddContacts),
  );
  const availableAddFilteredContacts = addDirectoryContacts.filter((contact) =>
    matchesContactSearch(contact, addContactSearch),
  );
  const selectedAddContactsInView = availableAddFilteredContacts.filter(
    (contact) => addSelectedContactIds.includes(contact.id),
  );

  const toggleAddSelectAll = () => {
    if (availableAddFilteredContacts.length === 0) return;
    setAddSelectedContactIds((current) => {
      const visibleIds = new Set(
        availableAddFilteredContacts.map((contact) => contact.id),
      );
      const allVisibleSelected = availableAddFilteredContacts.every((contact) =>
        current.includes(contact.id),
      );
      if (allVisibleSelected)
        return current.filter((id) => !visibleIds.has(id));

      const next = new Set(current);
      availableAddFilteredContacts.forEach((contact) => next.add(contact.id));
      return Array.from(next);
    });
  };

  const startEditCampaign = async (campaign: LooseApiResponse) => {
    try {
      const details = campaign.calls
        ? campaign
        : await queryClient.fetchQuery({
            queryKey: ["calling-campaign", campaign.id],
            queryFn: () => api.callingCampaigns.get(campaign.id),
          });
      const existingContactIds = details.calls
        ? details.calls.map((call: LooseApiResponse) => call.contactId)
        : [];

      setSelectedCampaignId(details.id);
      setEditingCampaignId(details.id);
      setName(details.name || "");
      setObjective(details.objective || "");
      setPrompt(details.prompt || "");
      const nextLanguage = normalizeHdLanguageValue(
        details.language,
        details.voice,
      );
      const nextGender = getHdVoiceDefaultGender(details.voice);
      setVoiceGender(nextGender);
      setVoice(
        normalizeHdVoiceForLanguageAndGender(
          details.voice,
          nextLanguage,
          nextGender,
        ),
      );
      setLanguage(nextLanguage);
      setVoicePreviewText(
        LANGUAGE_PREVIEW_TEXTS[nextLanguage] || LANGUAGE_PREVIEW_TEXTS["en-IN"],
      );
      setAiSpeaksFirst(details.aiSpeaksFirst ?? true);
      setPreventInterruption(details.preventInterruption ?? false);
      setRealtimeModel(details.realtimeModel || DEFAULT_GEMINI_LIVE_MODEL);
      setResponseSpeed(normalizeResponseSpeed(details.responseSpeed));
      setAiCallingBotId(details.aiCallingBotId || null);
      setSelectedContactIds(existingContactIds);
      setContactSearch("");
      setSelectedContactDirectoryId("all");
      setActiveTab("create");
    } catch (err) {
      showAlert(
        err instanceof Error
          ? err.message
          : "We could not open this campaign for editing.",
        "error",
      );
    }
  };

  const handleDeleteCampaign = (campaignId: string) => {
    if (confirm("Delete this calling campaign and its call logs?")) {
      deleteCampaignMutation.mutate(campaignId);
    }
  };

  const handleLaunchCampaign = (campaign: LooseApiResponse) => {
    if (isCampaignActive(campaign.status)) return;
    const isRelaunch = campaign.status !== "DRAFT";
    console.debug("[AI Calling] Launch requested", {
      campaignId: campaign.id,
      status: campaign.status,
      contactCount: campaign.contactCount,
      isRelaunch,
    });
    launchCampaignMutation.mutate({ id: campaign.id, isRelaunch });
  };

  const handleStopCampaign = (campaign: LooseApiResponse) => {
    if (!isCampaignActive(campaign.status)) return;
    if (
      confirm(
        "Stop this campaign now? Pending and queued calls will be cancelled.",
      )
    ) {
      stopCampaignMutation.mutate(campaign.id);
    }
  };

  const getCallRecordingObjectUrl = async (call: LooseApiResponse) => {
    if (!call.recordingUrl) {
      throw new Error("Recording is not available yet.");
    }
    const cachedUrl = recordingObjectUrlsRef.current[call.id];
    if (cachedUrl) return cachedUrl;
    const blob = await api.callingCampaigns.recordingAudio(call.id);
    const url = URL.createObjectURL(blob);
    recordingObjectUrlsRef.current[call.id] = url;
    return url;
  };

  const buildRecordingFileName = (call: LooseApiResponse) => {
    const contact = call.contact || {};
    const nameParts = [
      contact.firstName,
      contact.lastName,
      call.campaign?.name || campaignDetails?.name,
    ]
      .filter(Boolean)
      .join("-")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return `${nameParts || "agentreach-call"}-${call.id}.mp3`;
  };

  const handleToggleCallRecording = async (call: LooseApiResponse) => {
    if (playingCallId === call.id) {
      callAudioRef.current?.pause();
      setPlayingCallId(null);
      setActiveRecordingUrl(null);
      return;
    }

    try {
      setRecordingLoadingId(call.id);
      callAudioRef.current?.pause();
      const url = await getCallRecordingObjectUrl(call);
      setActiveRecordingUrl(url);
      setPlayingCallId(call.id);
    } catch (err) {
      showAlert(
        err instanceof Error ? err.message : "Recording is not available yet.",
        "error",
      );
    } finally {
      setRecordingLoadingId(null);
    }
  };

  const handleDownloadCallRecording = async (call: LooseApiResponse) => {
    try {
      setRecordingLoadingId(call.id);
      const url = await getCallRecordingObjectUrl(call);
      const link = document.createElement("a");
      link.href = url;
      link.download = buildRecordingFileName(call);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      showAlert(
        err instanceof Error ? err.message : "Recording is not available yet.",
        "error",
      );
    } finally {
      setRecordingLoadingId(null);
    }
  };

  const getCallTranscriptText = (call: LooseApiResponse) => {
    if (call.transcript) return call.transcript;
    if (!Array.isArray(call.scripts)) return "";
    return call.scripts
      .map((script: LooseApiResponse) => {
        const role = script.role === "assistant" ? "AI" : "User";
        const content = script.content || script.text || script.message;
        return content ? `${role}: ${content}` : "";
      })
      .filter(Boolean)
      .join("\n");
  };

  const getCollectedDataFields = (call: LooseApiResponse) => {
    const data = call.collectedData || call.analysis?.collectedData || {};
    const orderedKeys = [
      ...DATA_FIELD_ORDER,
      ...Object.keys(data).filter((key) => !DATA_FIELD_ORDER.includes(key)),
    ];
    return orderedKeys
      .map((key) => ({
        key,
        label:
          DATA_FIELD_LABELS[key] ||
          key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (char) => char.toUpperCase()),
        value: formatCollectedDataValue(key, data[key]),
      }))
      .filter((item) => item.value && item.value !== "No");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showAlert(
        "Please enter a campaign name so you can recognize it later.",
        "error",
      );
      return;
    }
    if (!editingCampaignId && selectedContactIds.length === 0) {
      showAlert(
        "Please select at least one contact before saving this calling campaign.",
        "error",
      );
      return;
    }

    const payloadLanguage = normalizeHdLanguageValue(language, voice);
    const payloadVoice = buildGoogleHdVoice(
      normalizeHdVoiceForLanguageAndGender(voice, payloadLanguage, voiceGender),
      payloadLanguage,
    );

    const payload = {
      name,
      objective,
      prompt,
      voiceQuality: "hd",
      voice: payloadVoice,
      language: payloadLanguage,
      selectedVoice: payloadVoice,
      selectedLanguage: payloadLanguage,
      aiCallingBotId: aiCallingBotId || undefined,
      aiSpeaksFirst,
      preventInterruption,
      realtimeModel: realtimeModel || DEFAULT_GEMINI_LIVE_MODEL,
      maxTokens: 4000,
      threshold: 0,
      responseSpeed,
      tools: ["end_call", "fetch_context"],
      contactIds: selectedContactIds,
    };

    console.debug("[AI Calling] Saving campaign", {
      mode: editingCampaignId ? "edit" : "create",
      campaignId: editingCampaignId,
      selectedContacts: selectedContactIds.length,
    });

    if (editingCampaignId) {
      updateCampaignMutation.mutate({ id: editingCampaignId, data: payload });
    } else {
      createCampaignMutation.mutate(payload);
    }
  };

  // Convert transcript text into readable structured conversation bubbles
  const renderTranscriptBubbles = (
    transcriptText: string,
    languageCode?: string,
  ) => {
    const copy = getTranscriptCopy(languageCode);
    if (!transcriptText)
      return (
        <p className="text-xs text-zinc-500 italic">
          {copy.empty}
        </p>
      );

    const lines = transcriptText.split("\n").filter((l) => l.trim());
    return (
      <div className="space-y-3 pt-2">
        {lines.map((line, idx) => {
          const parsed = parseTranscriptLine(line);
          const isAgent = parsed.role === "assistant";

          return (
            <div
              key={idx}
              className={`flex ${isAgent ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-xs leading-relaxed ${
                  isAgent
                    ? "bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-bl-none"
                    : "bg-indigo-600 text-white rounded-br-none"
                }`}
              >
                <span className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">
                  {isAgent ? copy.assistant : copy.contact}
                </span>
                {parsed.text}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const activeProvider = settings?.callProvider === "plivo" ? "plivo" : "twilio";
  const hasActiveProviderCredentials =
    activeProvider === "plivo"
      ? Boolean(
          settings?.plivoAuthId &&
            settings?.plivoAuthToken &&
            settings?.plivoPhoneNumber,
        )
      : Boolean(
          settings?.twilioAccountSid &&
            settings?.twilioAuthToken &&
            settings?.twilioPhoneNumber,
        );

  if (settings && !hasActiveProviderCredentials) {
    return (
      <MissingCredentials
        title={
          activeProvider === "plivo"
            ? "Plivo Credentials Required"
            : "Twilio Credentials Required"
        }
        description={
          activeProvider === "plivo"
            ? "To create and manage AI calling campaigns, you need to configure your Plivo Auth ID, Auth Token, and Phone Number in settings."
            : "To create and manage AI calling campaigns, you need to configure your Twilio Account SID, Auth Token, and Phone Number in settings."
        }
      />
    );
  }

  if (settings && settings.geminiStatus !== "CONNECTED") {
    return (
      <MissingCredentials
        title="Gemini Live Key Required"
        description="To create and launch AI calling campaigns, add and verify your Gemini API key for Gemini Live in settings."
      />
    );
  }

  return (
    <div className="space-y-6">
      <LoaderOverlay
        show={launchCampaignMutation.isPending}
        label={
          launchCampaignMutation.variables?.isRelaunch
            ? "Relaunching campaign"
            : "Starting AI dialer"
        }
        sublabel={`Queuing calls with your Gemini Live voice agent via ${
          activeProvider === "plivo" ? "Plivo" : "Twilio"
        }…`}
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-zinc-900">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <PhoneCall className="h-8 w-8 text-indigo-400" />
            AI calling Campaigns
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Configure automated calling schedules with Gemini Live agents and
            detailed transcript logs.
          </p>
        </div>
        {activeTab === "list" && (
          <button
            onClick={() => {
              resetForm();
              setActiveTab("create");
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:brightness-110 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Campaign
          </button>
        )}
        {activeTab !== "list" && (
          <button
            onClick={() => setActiveTab("list")}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 hover:bg-zinc-850 hover:text-white transition-all"
          >
            Back to Campaigns
          </button>
        )}
      </div>

      {/* Campaign List Tab */}
      {activeTab === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isListLoading ? (
            [1, 2].map((n) => (
              <div
                key={n}
                className="h-48 bg-zinc-900 border border-zinc-850 rounded-2xl animate-pulse"
              ></div>
            ))
          ) : campaigns.length > 0 ? (
            campaigns.map((camp: LooseApiResponse) => {
              const statusColors: Record<string, string> = {
                DRAFT: "bg-zinc-850 text-zinc-400 border-zinc-800",
                LAUNCHING: "bg-amber-500/10 text-amber-300 border-amber-500/15",
                RUNNING:
                  "bg-indigo-500/10 text-indigo-400 border-indigo-500/10",
                COMPLETED:
                  "bg-emerald-500/10 text-emerald-400 border-emerald-500/10",
                STOPPED: "bg-zinc-800 text-zinc-300 border-zinc-700",
                FAILED: "bg-rose-500/10 text-rose-400 border-rose-500/10",
              };

              return (
                <div
                  key={camp.id}
                  className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:bg-zinc-900/60 transition-all group"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[camp.status] || statusColors.DRAFT}`}
                      >
                        {camp.status}
                      </span>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => startEditCampaign(camp)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800/70"
                          title="Edit campaign"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCampaign(camp.id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20"
                          title="Delete campaign"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white tracking-tight">
                        {camp.name}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {camp.objective || "No objective set"}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-2">
                        {camp.contactCount || 0} callable contacts
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-zinc-850/65 pt-4 mt-6">
                    <button
                      onClick={() => {
                        setSelectedCampaignId(camp.id);
                        setActiveTab("detail");
                      }}
                      className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-semibold"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      View Calls
                    </button>
                    {isCampaignActive(camp.status) ? (
                      <button
                        onClick={() => handleStopCampaign(camp)}
                        className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
                      >
                        <Square className="h-3.5 w-3.5" />
                        Stop
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        {camp.status === "SCHEDULED" ? (
                          <button
                            onClick={() =>
                              unscheduleCampaignMutation.mutate(camp.id)
                            }
                            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            {camp.scheduledAt
                              ? `${new Date(camp.scheduledAt).toLocaleString()} — Cancel`
                              : "Cancel schedule"}
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              setSchedulingCampaignId((prev) =>
                                prev === camp.id ? null : camp.id,
                              )
                            }
                            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-semibold"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            Schedule
                          </button>
                        )}
                        <button
                          onClick={() => handleLaunchCampaign(camp)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                        >
                          {camp.status === "DRAFT" ? (
                            <Play className="h-3.5 w-3.5" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          {camp.status === "DRAFT"
                            ? "Start Dialer"
                            : "Relaunch"}
                        </button>
                      </div>
                    )}
                  </div>
                  {schedulingCampaignId === camp.id && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-850/65 pt-3">
                      <input
                        type="datetime-local"
                        value={scheduleValue}
                        onChange={(e) => setScheduleValue(e.target.value)}
                        className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-indigo-500/50 focus:outline-none"
                      />
                      <button
                        disabled={
                          !scheduleValue || scheduleCampaignMutation.isPending
                        }
                        onClick={() =>
                          scheduleCampaignMutation.mutate({
                            id: camp.id,
                            scheduledAt: new Date(scheduleValue).toISOString(),
                          })
                        }
                        className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50"
                      >
                        Confirm
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-16 text-center border border-zinc-850 bg-zinc-900/20 rounded-2xl text-zinc-500">
              No calling campaigns configured. Click &quot;Create Campaign&quot;
              to build an automated dialer pipeline.
            </div>
          )}
        </div>
      )}

      {/* Campaign Details Tab */}
      {activeTab === "detail" && selectedCampaignId && (
        <div className="space-y-6">
          {isDetailLoading || !campaignDetails ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-16 bg-zinc-900 border border-zinc-850 rounded-2xl"></div>
              <div className="h-80 bg-zinc-900 border border-zinc-850 rounded-2xl"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Campaign summary card */}
              <div className="p-6 bg-zinc-900/50 border border-zinc-850 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-white">
                      {campaignDetails.name}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-950 border border-zinc-850 text-zinc-400">
                      {campaignDetails.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Objective: {campaignDetails.objective || "No objective set"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isCampaignActive(campaignDetails.status) ? (
                    <button
                      onClick={() => handleStopCampaign(campaignDetails)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-rose-950/20 border border-rose-500/15 rounded-xl text-xs font-bold text-rose-300 hover:text-rose-200"
                    >
                      <Square className="h-3.5 w-3.5" /> Stop Campaign
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => startEditCampaign(campaignDetails)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 hover:text-white"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => {
                          setAddSelectedContactIds([]);
                          setAddContactSearch("");
                          setAddContactsDirectoryId("all");
                          setIsAddContactsOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 hover:text-white"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Contacts
                      </button>
                      <button
                        onClick={() => handleLaunchCampaign(campaignDetails)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl text-xs font-bold text-white shadow-md hover:brightness-110"
                      >
                        {campaignDetails.status === "DRAFT" ? (
                          <Play className="h-3.5 w-3.5" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        {campaignDetails.status === "DRAFT"
                          ? "Launch Pending Calls"
                          : "Relaunch Campaign"}
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(campaignDetails.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-rose-950/20 border border-rose-500/15 rounded-xl text-xs font-bold text-rose-300 hover:text-rose-200"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Calls List */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
                  Dialed Call Logs
                </h4>

                {campaignDetails.calls && campaignDetails.calls.length > 0 ? (
                  <div className="space-y-4">
                    {campaignDetails.calls.map((call: LooseApiResponse) => {
                      const isExpanded = expandedCallId === call.id;
                      const isPlaying = playingCallId === call.id;
                      const contact = call.contact || {};
                      const dialedNetworkRange =
                        call.dialedNetworkRange ||
                        getDialedNetworkRange(contact.phoneNumber);
                      const collectedDataFields = getCollectedDataFields(call);

                      const outcomeColors: Record<string, string> = {
                        PENDING: "bg-zinc-850 text-zinc-400",
                        QUEUING: "bg-sky-500/10 text-sky-300 border-sky-500/10",
                        QUEUED: "bg-sky-500/10 text-sky-300 border-sky-500/10",
                        DIALING:
                          "bg-indigo-500/10 text-indigo-300 border-indigo-500/10",
                        RINGING: "bg-sky-500/10 text-sky-300 border-sky-500/10",
                        CONNECTED:
                          "bg-emerald-500/10 text-emerald-300 border-emerald-500/10",
                        IN_PROGRESS:
                          "bg-purple-500/10 text-purple-300 border-purple-500/10",
                        ANSWERED:
                          "bg-emerald-500/10 text-emerald-400 border-emerald-500/10",
                        NO_ANSWER: "bg-zinc-800 text-zinc-500 border-zinc-800",
                        BUSY: "bg-amber-500/10 text-amber-400 border-amber-500/10",
                        FAILED:
                          "bg-rose-500/10 text-rose-400 border-rose-500/10",
                      };

                      return (
                        <div
                          key={call.id}
                          className="bg-zinc-900/40 border border-zinc-850 rounded-2xl overflow-hidden shadow-xl"
                        >
                          {/* Log Bar */}
                          <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-zinc-950 flex items-center justify-center text-zinc-400 border border-zinc-850">
                                <User className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-white">
                                  {contact.firstName || "Unknown"}{" "}
                                  {contact.lastName || "Contact"}
                                </p>
                                <p className="text-xs text-zinc-500">
                                  {contact.email || "No email"} •{" "}
                                  {contact.phoneNumber || "No phone"}
                                </p>
                                <p className="mt-0.5 text-[10px] font-semibold text-zinc-600">
                                  Network range: {dialedNetworkRange}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                              <span
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${outcomeColors[call.outcome] || outcomeColors.PENDING}`}
                              >
                                {call.outcome}
                              </span>

                              <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                                <Clock className="h-3.5 w-3.5" />
                                {call.duration}s
                              </div>

                              <div className="flex items-center gap-2">
                                {call.recordingUrl ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled={recordingLoadingId === call.id}
                                      onClick={() =>
                                        void handleToggleCallRecording(call)
                                      }
                                      className={`p-1.5 rounded-xl border transition-all disabled:cursor-wait disabled:opacity-60 ${
                                        isPlaying
                                          ? "bg-indigo-600 border-indigo-600 text-white"
                                          : "bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white"
                                      }`}
                                      title={
                                        isPlaying
                                          ? "Pause recording"
                                          : "Play recording"
                                      }
                                    >
                                      {isPlaying ? (
                                        <Pause className="h-4.5 w-4.5" />
                                      ) : (
                                        <Volume2 className="h-4.5 w-4.5" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={recordingLoadingId === call.id}
                                      onClick={() =>
                                        void handleDownloadCallRecording(call)
                                      }
                                      className="p-1.5 rounded-xl border border-zinc-850 bg-zinc-950 text-zinc-400 transition-all hover:text-white disabled:cursor-wait disabled:opacity-60"
                                      title="Download recording"
                                    >
                                      <Download className="h-4.5 w-4.5" />
                                    </button>
                                  </>
                                ) : call.outcome === "ANSWERED" ? (
                                  <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] font-semibold text-zinc-500">
                                    Recording pending
                                  </span>
                                ) : null}

                                {/* Collapsible Toggle */}
                                <button
                                  onClick={() =>
                                    setExpandedCallId(
                                      isExpanded ? null : call.id,
                                    )
                                  }
                                  className="p-1.5 bg-zinc-950 border border-zinc-850 text-zinc-400 hover:text-white rounded-xl transition-all"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4.5 w-4.5" />
                                  ) : (
                                    <ChevronDown className="h-4.5 w-4.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Recording playback */}
                          {isPlaying && (
                            <div className="px-6 py-4 bg-zinc-950/40 border-t border-zinc-850 flex flex-col gap-3 sm:flex-row sm:items-center">
                              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                                Recording
                              </span>
                              <audio
                                ref={callAudioRef}
                                src={activeRecordingUrl || undefined}
                                controls
                                className="h-9 w-full min-w-0 flex-1"
                                onEnded={() => {
                                  setPlayingCallId(null);
                                  setActiveRecordingUrl(null);
                                }}
                              />
                            </div>
                          )}

                          {/* Collapsible content (transcript) */}
                          {isExpanded && (
                            <div className="p-6 bg-zinc-950/30 border-t border-zinc-850 space-y-4">
                              {call.errorMessage && (
                                <div className="rounded-xl border border-rose-500/15 bg-rose-950/10 px-4 py-3 text-xs text-rose-300">
                                  {call.errorMessage}
                                </div>
                              )}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="rounded-xl border border-zinc-850 bg-zinc-950/70 p-3">
                                  <span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                                    Session
                                  </span>
                                  <p className="mt-1 text-xs font-semibold text-zinc-200">
                                    {call.sessionStatus || "pending"} ·{" "}
                                    {call.callType || "phone_call"}
                                  </p>
                                  <p className="mt-1 text-[10px] text-zinc-500">
                                    {call.selectedVoice ||
                                      campaignDetails.voice ||
                                      "Kore"}{" "}
                                    ·{" "}
                                    {getLanguageLabel(
                                      call.selectedLanguage ||
                                        campaignDetails.language ||
                                        "en-IN",
                                    )}
                                  </p>
                                  <p className="mt-1 text-[10px] text-zinc-500">
                                    Network range: {dialedNetworkRange}
                                  </p>
                                </div>
                                <div className="rounded-xl border border-zinc-850 bg-zinc-950/70 p-3">
                                  <span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                                    Analysis
                                  </span>
                                  <p className="mt-1 text-xs font-semibold text-zinc-200">
                                    {call.analysis?.engagement_score
                                      ? `${call.analysis.engagement_score}% engagement`
                                      : "Not scored"}
                                  </p>
                                  <p className="mt-1 text-[10px] text-zinc-500">
                                    {call.analysis?.intent ||
                                      call.endCallReason ||
                                      "No intent captured"}
                                  </p>
                                </div>
                                <div className="rounded-xl border border-zinc-850 bg-zinc-950/70 p-3">
                                  <span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                                    Timing
                                  </span>
                                  <p className="mt-1 text-xs font-semibold text-zinc-200">
                                    {call.totalTime
                                      ? `${Math.round(call.totalTime / 1000)}s total`
                                      : `${call.duration || 0}s duration`}
                                  </p>
                                  <p className="mt-1 text-[10px] text-zinc-500">
                                    {call.startupTime
                                      ? `${Math.round(call.startupTime / 1000)}s startup`
                                      : "Startup not recorded"}
                                  </p>
                                </div>
                              </div>
                              {(call.summary || call.keyOutcomes) && (
                                <div className="rounded-xl border border-zinc-850 bg-zinc-950/70 p-4 space-y-2">
                                  {call.summary && (
                                    <p className="text-xs text-zinc-300 leading-relaxed">
                                      {call.summary}
                                    </p>
                                  )}
                                  {call.keyOutcomes && (
                                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                                      {call.keyOutcomes}
                                    </p>
                                  )}
                                </div>
                              )}
                              {call.topicsCovered?.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {call.topicsCovered.map((topic: string) => (
                                    <span
                                      key={topic}
                                      className="rounded-full border border-indigo-500/15 bg-indigo-500/10 px-2 py-1 text-[10px] font-semibold text-indigo-200"
                                    >
                                      {topic}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="rounded-xl border border-zinc-850 bg-zinc-950/70 p-4">
                                <div className="mb-3 flex items-center gap-2">
                                  <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
                                  <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                    Data Collected
                                  </h5>
                                </div>
                                {collectedDataFields.length > 0 ? (
                                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {collectedDataFields.map((item) => (
                                      <div
                                        key={item.key}
                                        className="rounded-lg border border-zinc-850 bg-zinc-950 px-3 py-2"
                                      >
                                        <span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                                          {item.label}
                                        </span>
                                        <p className="mt-1 break-words text-xs font-semibold text-zinc-200">
                                          {item.value}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs italic text-zinc-500">
                                    No interview details or follow-up fields
                                    were captured yet.
                                  </p>
                                )}
                              </div>
                              <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                Conversational Transcript ·{" "}
                                {getLanguageLabel(
                                  call.selectedLanguage ||
                                    campaignDetails.language ||
                                    "en-IN",
                                )}
                              </h5>
                              {renderTranscriptBubbles(
                                getCallTranscriptText(call),
                                call.selectedLanguage ||
                                  campaignDetails.language ||
                                  "en-IN",
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-zinc-500 border border-zinc-850 bg-zinc-900/10 rounded-2xl">
                    No dialed call history recorded. Start the Dialer to
                    stream Gemini Live conversations.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Campaign Tab */}
      {/* Create Campaign Tab */}
      {activeTab === "create" && (
        <form
          onSubmit={handleSubmit}
          className="space-y-6 w-full bg-zinc-900/30 border border-zinc-850 p-6 rounded-2xl shadow-xl"
        >
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              {editingCampaignId
                ? "Edit Calling Campaign"
                : "Create Calling Campaign"}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Configure your outbound calling AI persona, scripts, and targeting
              options.
            </p>
          </div>
          <div className="space-y-6 ">
            {/* SECTION 1: Campaign Basics */}
            <div className="bg-zinc-950/40 border border-zinc-850 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                1. Campaign Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lead Follow-Up Voice Dialer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">
                    Dialer Objective
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Call leads to schedule product demo bookings"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2">
                  Campaign Context
                </label>
                <textarea
                  placeholder="e.g. You are Sarah from SalesCorp. Be friendly, ask how their automation is going, and request a 15 min follow-up call."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 h-24 resize-none transition-colors"
                />
              </div>
            </div>

            {/* SECTION 2: AI Generate Campaign */}
            <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 space-y-4">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Sparkles className="h-24 w-24 text-indigo-400" />
              </div>
              <div className="flex items-center gap-2">
                <Bot className="h-4.5 w-4.5 text-indigo-400" />
                <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wider">
                  AI Campaign Copilot
                </label>
              </div>
              <p className="text-[11px] text-zinc-400">
                Let AI auto-generate your agent persona, knowledge base, rules,
                greeting, and objections based on your description below.
              </p>
              <textarea
                placeholder="Describe the calling campaign you want. Example: Call inbound demo leads for ReachConvert, qualify their outreach needs, handle budget/timing objections, and book a 15 minute demo."
                value={aiCampaignPrompt}
                onChange={(e) => setAiCampaignPrompt(e.target.value)}
                className="w-full bg-zinc-950/80 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 h-20 resize-none transition-colors"
              />
              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    Desired Agent Tone
                  </label>
                  <input
                    type="text"
                    value={aiCampaignTone}
                    onChange={(e) => setAiCampaignTone(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <button
                  type="button"
                  disabled={isGeneratingCampaign || !aiCampaignPrompt.trim()}
                  onClick={() => generateCallingCampaignMutation.mutate()}
                  className="flex h-10 items-center justify-center gap-2 px-5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-xs font-bold text-white hover:brightness-110 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/10"
                >
                  <Bot className="h-3.5 w-3.5" />
                  {isGeneratingCampaign ? "Generating..." : "Generate Campaign"}
                </button>
              </div>
              {generationJobId && (
                <div className="flex items-center gap-2 text-[11px] text-indigo-300 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  <span>
                    Generating campaign draft (Job:{" "}
                    {generationJobId.slice(0, 8)})
                  </span>
                </div>
              )}
            </div>

            {/* SECTION 2: Bot Picker */}
            <div className="bg-zinc-950/40 border border-zinc-850 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-2 mb-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  2. Select AI Bot
                </h4>
                {aiCallingBotId && (
                  <button
                    type="button"
                    onClick={() => setAiCallingBotId(null)}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-red-500 hover:text-red-400 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              {aiBots.length === 0 ? (
                <p className="text-xs text-zinc-500 italic py-2">
                  No AI bots found. Create a bot in the{" "}
                  <a
                    href="/ai-calling-bots"
                    className="text-indigo-400 underline underline-offset-2 hover:text-indigo-300"
                  >
                    AI Calling Bots
                  </a>{" "}
                  section first.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {aiBots.map((bot) => {
                    const isSelected = aiCallingBotId === bot.id;
                    return (
                      <button
                        key={bot.id}
                        type="button"
                        onClick={() => handleAiBotSelect(bot, isSelected)}
                        className={`relative text-left rounded-xl border p-3.5 transition-all ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-950/40 shadow-sm shadow-indigo-500/20"
                            : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900/60"
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                            <CheckSquare className="h-2.5 w-2.5 text-white" />
                          </span>
                        )}
                        <p
                          className={`text-xs font-bold truncate pr-5 ${isSelected ? "text-indigo-300" : "text-zinc-200"}`}
                        >
                          {bot.name || "Unnamed Bot"}
                        </p>
                        {bot.role && (
                          <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                            {bot.role}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {bot.ragEnabled && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                              RAG
                            </span>
                          )}
                          {(bot.trainingChunkCount ?? 0) > 0 && (
                            <span className="text-[9px] text-zinc-500">
                              {bot.trainingChunkCount} chunks
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION 3: Voice Setup */}
            <div className="bg-zinc-950/40 border border-zinc-850 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                3. Voice & Language Configuration
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">
                    Language / Accent
                  </label>
                  <div className="relative">
                    <Languages className="absolute left-3 top-3 h-3.5 w-3.5 text-zinc-500" />
                    <select
                      value={language}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="" disabled>
                        Select Language
                      </option>
                      {antigravityLanguages.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">
                    Voice Gender
                  </label>
                  <div className="grid grid-cols-2 gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                    {(["female", "male"] as VoiceGender[]).map((gender) => (
                      <button
                        key={gender}
                        type="button"
                        onClick={() => handleVoiceGenderChange(gender)}
                        className={`rounded-lg py-1.5 text-xs font-semibold capitalize transition-colors ${
                          voiceGender === gender
                            ? "bg-indigo-600 text-white"
                            : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                        }`}
                      >
                        {gender}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">
                    Voice Model
                  </label>
                  <div className="relative">
                    <HDVoiceSelector
                      value={voice}
                      onChange={handleVoiceChange}
                      language={language}
                      gender={voiceGender}
                      previewText={voicePreviewText}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-850 bg-zinc-950/70 px-3 py-2 text-[11px] text-zinc-500">
                Live call output uses{" "}
                <span className="font-semibold text-zinc-300">
                  {getLanguageLabel(language)}
                </span>{" "}
                instructions with Gemini Live voice{" "}
                <span className="font-semibold text-zinc-300">
                  {extractHdVoiceName(voice) || "Puck"}
                </span>
                .
              </div>

              <div className="grid grid-cols-1 gap-4 border-t border-zinc-850 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-2">
                      Gemini Live Model
                    </label>
                    <input
                      type="text"
                      value={realtimeModel}
                      onChange={(e) => setRealtimeModel(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-2">
                      Response Speed
                    </label>
                    <div
                      role="group"
                      aria-label="Response speed"
                      className="grid grid-cols-3 rounded-xl border border-zinc-800 bg-zinc-950 p-1"
                    >
                      {RESPONSE_SPEED_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setResponseSpeed(option.value)}
                          className={`min-h-9 rounded-lg px-2 text-xs font-semibold transition-colors ${
                            responseSpeed === option.value
                              ? "bg-indigo-600 text-white"
                              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex min-h-10 items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs font-semibold text-zinc-300">
                    <input
                      type="checkbox"
                      checked={aiSpeaksFirst}
                      onChange={(e) => setAiSpeaksFirst(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-indigo-500"
                    />
                    AI opens the call
                  </label>
                  <label className="flex min-h-10 items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs font-semibold text-zinc-300">
                    <input
                      type="checkbox"
                      checked={preventInterruption}
                      onChange={(e) =>
                        setPreventInterruption(e.target.checked)
                      }
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-indigo-500"
                    />
                    Prevent interruption
                  </label>
                </div>
              </div>

            </div>

            {/* SECTION 4: Target Audience */}
            <div className="bg-zinc-950/40 border border-zinc-850 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-2 mb-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  4. Audience Setup
                </h4>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800">
                  {selectedContactIds.length} selected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                <div className="relative">
                  <Folder className="absolute left-3 top-3 h-3.5 w-3.5 text-zinc-500" />
                  <select
                    value={selectDirectoryFallback(
                      selectedContactDirectoryId,
                      callableContacts,
                    )}
                    onChange={(e) =>
                      handleCreateDirectoryChange(e.target.value)
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="all">
                      All callable contacts ({callableContacts.length})
                    </option>
                    {unassignedCallableCount > 0 && (
                      <option value="uncategorized">
                        Unassigned ({unassignedCallableCount})
                      </option>
                    )}
                    {callableDirectoryOptions.map((directory) => (
                      <option key={directory.id} value={directory.id}>
                        {directory.name} ({directory.callableCount})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={createFilteredContacts.length === 0}
                  onClick={toggleCreateSelectAll}
                  className="px-4 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold disabled:opacity-50 hover:bg-zinc-850 transition-colors"
                >
                  {createFilteredContacts.length > 0 &&
                  selectedCreateContactsInView.length ===
                    createFilteredContacts.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>

              <input
                type="text"
                placeholder="Search contacts by name, email, or phone..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
              />

              <p className="text-[10px] text-zinc-500">
                {createFilteredContacts.length} callable contacts match filter.{" "}
                {selectedCreateContactsInView.length} selected.
              </p>

              <div className="border border-zinc-850 rounded-xl bg-zinc-950/40 divide-y divide-zinc-850 max-h-64 overflow-y-auto">
                {createFilteredContacts.length > 0 ? (
                  createFilteredContacts.map((contact) => (
                    <button
                      type="button"
                      key={contact.id}
                      onClick={() => toggleCreateContactSelection(contact.id)}
                      className="w-full p-3 flex items-center justify-between text-left hover:bg-zinc-900/50 transition-colors"
                    >
                      <span>
                        <span className="block text-xs font-semibold text-zinc-200">
                          {contact.firstName} {contact.lastName}
                        </span>
                        <span className="block text-[10px] text-zinc-500 mt-0.5">
                          {contact.email} • {contact.phoneNumber || "No phone"}
                        </span>
                      </span>
                      <span
                        className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${
                          selectedContactIds.includes(contact.id)
                            ? "border-indigo-500 bg-indigo-500 text-white"
                            : "border-zinc-800 bg-zinc-950"
                        }`}
                      >
                        {selectedContactIds.includes(contact.id) && (
                          <CheckSquare className="h-3 w-3" />
                        )}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-500 text-xs">
                    {contacts.length === 0
                      ? "No contacts found. Import contacts first."
                      : callableContacts.length === 0
                        ? "No contacts with phone numbers found."
                        : "No callable contacts match search filter."}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-850 mt-6">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setActiveTab(selectedCampaignId ? "detail" : "list");
              }}
              className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-zinc-200 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                createCampaignMutation.isPending ||
                updateCampaignMutation.isPending
              }
              className="px-6 py-2.5 bg-gradient-to-tr from-indigo-500 to-purple-600 text-xs font-semibold text-white rounded-xl shadow-md hover:brightness-110 transition-all"
            >
              {editingCampaignId ? "Update Campaign" : "Save Campaign"}
            </button>
          </div>
        </form>
      )}

      {isAddContactsOpen && selectedCampaignId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
              <h3 className="text-lg font-bold text-white">
                Add Contacts to Calling Campaign
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddContactsOpen(false);
                  setAddContactSearch("");
                  setAddContactsDirectoryId("all");
                  setAddSelectedContactIds([]);
                }}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                <div className="relative">
                  <Folder className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                  <select
                    value={selectDirectoryFallback(
                      addContactsDirectoryId,
                      availableAddContacts,
                    )}
                    onChange={(e) => handleAddDirectoryChange(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">
                      All callable contacts ({availableAddContacts.length})
                    </option>
                    {availableAddContacts.some(
                      (contact) => !contact.directoryId,
                    ) && (
                      <option value="uncategorized">
                        Unassigned (
                        {
                          availableAddContacts.filter(
                            (contact) => !contact.directoryId,
                          ).length
                        }
                        )
                      </option>
                    )}
                    {contactDirectories
                      .map((directory) => ({
                        ...directory,
                        callableCount: availableAddContacts.filter(
                          (contact) => contact.directoryId === directory.id,
                        ).length,
                      }))
                      .filter((directory) => directory.callableCount > 0)
                      .map((directory) => (
                        <option key={directory.id} value={directory.id}>
                          {directory.name} ({directory.callableCount})
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={availableAddFilteredContacts.length === 0}
                  onClick={toggleAddSelectAll}
                  className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white disabled:opacity-50"
                >
                  {availableAddFilteredContacts.length > 0 &&
                  selectedAddContactsInView.length ===
                    availableAddFilteredContacts.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>
              <input
                type="text"
                placeholder="Search contacts by name, email, or phone..."
                value={addContactSearch}
                onChange={(e) => setAddContactSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-zinc-500">
                {availableAddFilteredContacts.length} callable contacts in view,{" "}
                {selectedAddContactsInView.length} selected here.
              </p>

              <div className="border border-zinc-850 rounded-xl bg-zinc-950/40 divide-y divide-zinc-850 max-h-[300px] overflow-y-auto">
                {availableAddFilteredContacts.length > 0 ? (
                  availableAddFilteredContacts.map((contact) => (
                    <button
                      type="button"
                      key={contact.id}
                      onClick={() => toggleAddContactSelection(contact.id)}
                      className="w-full p-3 flex items-center justify-between text-left hover:bg-zinc-900/50 transition-colors"
                    >
                      <span>
                        <span className="block text-xs font-semibold text-zinc-200">
                          {contact.firstName} {contact.lastName}
                        </span>
                        <span className="block text-[10px] text-zinc-500 mt-0.5">
                          {contact.email} • {contact.phoneNumber || "No phone"}
                        </span>
                      </span>
                      <span
                        className={`h-5 w-5 rounded-md border flex items-center justify-center ${
                          addSelectedContactIds.includes(contact.id)
                            ? "border-indigo-500 bg-indigo-500 text-white"
                            : "border-zinc-800 bg-zinc-950"
                        }`}
                      >
                        {addSelectedContactIds.includes(contact.id) && (
                          <CheckSquare className="h-3 w-3" />
                        )}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-500 text-xs">
                    No available callable contacts found.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800/60">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddContactsOpen(false);
                    setAddContactSearch("");
                    setAddContactsDirectoryId("all");
                    setAddSelectedContactIds([]);
                  }}
                  className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-zinc-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    addSelectedContactIds.length === 0 ||
                    addContactsMutation.isPending
                  }
                  onClick={() => {
                    console.debug("[AI Calling] Adding contacts to campaign", {
                      campaignId: selectedCampaignId,
                      selectedContacts: addSelectedContactIds.length,
                    });
                    addContactsMutation.mutate({
                      id: selectedCampaignId,
                      contactIds: addSelectedContactIds,
                    });
                  }}
                  className="px-4 py-2.5 bg-gradient-to-tr from-indigo-500 to-purple-600 text-xs font-semibold text-white rounded-xl shadow-md transition-all hover:brightness-110 disabled:opacity-50"
                >
                  Add Selection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
