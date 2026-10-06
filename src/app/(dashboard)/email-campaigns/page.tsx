"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useOutreachStore } from "@/store/useOutreachStore";
import { useEffect, useRef, useState } from "react";
import {
  Mail,
  Plus,
  Play,
  Clock,
  Trash2,
  X,
  Sparkles,
  Eye,
  CheckCircle,
  ArrowRight,
  PlusCircle,
  CheckSquare,
  Code2,
  FileText,
  PenLine,
  Paperclip,
  Upload,
  Folder,
  RefreshCw,
} from "lucide-react";
import { MissingCredentials } from "@/components/MissingCredentials";
import { LoaderOverlay } from "@/components/Loader";

type TemplateFormat = "HTML" | "TEXT";
type TemplateBuilderMode = "AI" | "MANUAL";
type TemplateGenerationPayload = {
  goal: string;
  audience: string;
  tone: string;
  instructions?: string;
  referenceDocumentText?: string;
  referenceDocumentName?: string;
  format: TemplateFormat;
};
type TemplateAttachment = {
  id: string;
  name: string;
  contentType: string;
  size: number;
  contentBase64: string;
};
type Template = {
  id: string;
  name: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  type?: string;
  category?: string;
  attachments?: TemplateAttachment[];
};
type TemplateGenerationResult = {
  subject: string;
  bodyHtml: string;
  bodyText: string;
};
type TemplateGenerationJob = {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  result?: TemplateGenerationResult;
  error?: string;
};
type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  directoryId?: string | null;
};
type ContactDirectory = {
  id: string;
  name: string;
  contactCount?: number;
};
type EmailCampaign = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  scheduledAt?: string | null;
  contactCount?: number;
  pendingCount?: number;
  failedCount?: number;
  sentCount?: number;
  cc?: string[];
  bcc?: string[];
  // findAll returns a { id, name } projection alongside each campaign.
  template?: { id: string; name: string } | null;
};
type EmailCampaignContact = {
  id: string;
  contactId: string;
  contact: Contact;
  deliveryStatus: string;
  openStatus?: boolean;
  replyStatus?: boolean;
};
type EmailCampaignDetails = EmailCampaign & {
  contacts?: EmailCampaignContact[];
  template?: Template | null;
};
type CampaignLaunchResult = {
  message?: string;
};
type ReferencePdfResult = {
  name?: string;
  text?: string;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const MAX_TEMPLATE_ATTACHMENTS = 5;
const MAX_TEMPLATE_ATTACHMENT_BYTES = 5 * 1024 * 1024;
// Mirrors MAX_TEMPLATE_ATTACHMENTS_TOTAL_BYTES on the backend so oversized
// sets are caught before upload rather than at launch.
const MAX_TEMPLATE_ATTACHMENTS_TOTAL_BYTES = 7 * 1024 * 1024;
const MAX_REFERENCE_PDF_BYTES = 8 * 1024 * 1024;
const MAX_COPY_RECIPIENTS = 10;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Chip-style entry for CC/BCC addresses. Commits on Enter, comma, or blur so a
 * half-typed address in the input never gets silently dropped on submit.
 */
function EmailChipInput({
  label,
  hint,
  values,
  onChange,
  disabled,
  invalidAddresses = [],
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  invalidAddresses?: string[];
}) {
  const [draft, setDraft] = useState("");
  const invalid = new Set(invalidAddresses);

  const commit = (raw: string) => {
    const entries = raw
      .split(/[,;\s]+/)
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
    if (entries.length === 0) return;
    const merged = Array.from(new Set([...values, ...entries]));
    onChange(merged.slice(0, MAX_COPY_RECIPIENTS));
    setDraft("");
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
        {label}
      </label>
      <div
        className={`flex flex-wrap items-center gap-1.5 rounded-xl border bg-zinc-950 px-2 py-2 ${
          disabled ? "border-zinc-850 opacity-60" : "border-zinc-800"
        }`}
      >
        {values.map((address) => (
          <span
            key={address}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ${
              invalid.has(address)
                ? "bg-red-500/10 text-red-300 ring-1 ring-red-500/40"
                : "bg-zinc-850 text-zinc-200"
            }`}
          >
            {address}
            {!disabled && (
              <button
                type="button"
                aria-label={`Remove ${address}`}
                onClick={() => onChange(values.filter((v) => v !== address))}
                className="text-zinc-500 hover:text-red-300"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        <input
          type="text"
          disabled={disabled || values.length >= MAX_COPY_RECIPIENTS}
          value={draft}
          placeholder={
            values.length >= MAX_COPY_RECIPIENTS
              ? `Limit of ${MAX_COPY_RECIPIENTS} reached`
              : values.length === 0
                ? "name@company.com"
                : "Add another…"
          }
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit(draft);
            } else if (e.key === "Backspace" && !draft && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          // Commit on blur too — otherwise a typed-but-not-entered address is
          // lost when the user clicks straight to the submit button.
          onBlur={() => commit(draft)}
          className="min-w-[10rem] flex-1 bg-transparent px-1 py-1 text-sm text-zinc-200 focus:outline-none disabled:cursor-not-allowed"
        />
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}

export default function EmailCampaignsPage() {
  const queryClient = useQueryClient();
  const { showAlert } = useOutreachStore();

  const [activeTab, setActiveTab] = useState<"list" | "detail" | "create">(
    "list",
  );
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null,
  );

  // Wizard Creation State
  const [wizardStep, setWizardStep] = useState(1); // 1: Name, 2: Template selection/generation, 3: Contacts selection
  const [campaignName, setCampaignName] = useState("");
  const [campaignCc, setCampaignCc] = useState<string[]>([]);
  const [campaignBcc, setCampaignBcc] = useState<string[]>([]);
  const [isEditingCopyLists, setIsEditingCopyLists] = useState(false);
  const [editCc, setEditCc] = useState<string[]>([]);
  const [editBcc, setEditBcc] = useState<string[]>([]);
  const [isEditingCampaign, setIsEditingCampaign] = useState(false);
  const [editCampaignName, setEditCampaignName] = useState("");
  const [editCampaignTemplateId, setEditCampaignTemplateId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectedContactDirectoryId, setSelectedContactDirectoryId] =
    useState("all");
  const [templateFormat, setTemplateFormat] = useState<TemplateFormat>("HTML");
  const [templateBuilderMode, setTemplateBuilderMode] =
    useState<TemplateBuilderMode>("AI");

  // AI Generator Form State
  const [aiGoal, setAiGoal] = useState("");
  const [aiAudience, setAiAudience] = useState("");
  const [aiTone, setAiTone] = useState("Professional");
  const [aiInstructions, setAiInstructions] = useState("");
  const [aiReferencePdfName, setAiReferencePdfName] = useState("");
  const [aiReferencePdfText, setAiReferencePdfText] = useState("");
  const [isReadingReferencePdf, setIsReadingReferencePdf] = useState(false);
  const [generatedTemplate, setGeneratedTemplate] = useState<Template | null>(
    null,
  );
  const [generationJobId, setGenerationJobId] = useState<string | null>(null);
  const [generationPayload, setGenerationPayload] =
    useState<TemplateGenerationPayload | null>(null);
  const handledGenerationJobIdRef = useRef<string | null>(null);

  // Manual Template Form State
  const [manualTemplateName, setManualTemplateName] = useState("");
  const [manualTemplateSubject, setManualTemplateSubject] = useState("");
  const [manualTemplateBody, setManualTemplateBody] = useState("");
  const [manualTemplateAttachments, setManualTemplateAttachments] = useState<
    TemplateAttachment[]
  >([]);
  const [isEditingSelectedTemplate, setIsEditingSelectedTemplate] =
    useState(false);
  const [editTemplateName, setEditTemplateName] = useState("");
  const [editTemplateSubject, setEditTemplateSubject] = useState("");
  const [editTemplateBody, setEditTemplateBody] = useState("");
  const [editTemplateFormat, setEditTemplateFormat] =
    useState<TemplateFormat>("HTML");

  // Add Contacts modal in campaign details
  const [isAddContactsOpen, setIsAddContactsOpen] = useState(false);
  const [addContactsSearch, setAddContactsSearch] = useState("");
  const [addContactsDirectoryId, setAddContactsDirectoryId] = useState("all");
  const [addSelectedContactIds, setAddSelectedContactIds] = useState<string[]>(
    [],
  );

  // Fetch campaigns
  const { data: campaigns = [], isLoading: isCampaignsLoading } = useQuery<
    EmailCampaign[]
  >({
    queryKey: ["email-campaigns"],
    queryFn: () => api.emailCampaigns.list() as Promise<EmailCampaign[]>,
  });

  // Fetch single campaign details
  const { data: campaignDetails, isLoading: isCampaignDetailsLoading } =
    useQuery<EmailCampaignDetails | null>({
      queryKey: ["email-campaign", selectedCampaignId],
      queryFn: () =>
        selectedCampaignId
          ? (api.emailCampaigns.get(
              selectedCampaignId,
            ) as Promise<EmailCampaignDetails>)
          : null,
      enabled: !!selectedCampaignId,
      refetchInterval: (query) => {
        // Refetch single campaign detail more often if it's currently running to show live logs!
        return query.state.data?.status === "RUNNING" ? 2000 : false;
      },
    });

  // Fetch settings to check for credentials
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: api.settings.get,
  });

  // Fetch templates for selection
  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["templates"],
    queryFn: () => api.templates.list() as Promise<Template[]>,
  });

  // Fetch contacts for wizard selection
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: () => api.contacts.list() as Promise<Contact[]>,
  });

  const { data: contactDirectories = [] } = useQuery<ContactDirectory[]>({
    queryKey: ["contact-directories"],
    queryFn: () =>
      api.contacts.directories.list() as Promise<ContactDirectory[]>,
  });

  const { data: generationJob } = useQuery<TemplateGenerationJob>({
    queryKey: ["template-generation-job", generationJobId],
    queryFn: () =>
      api.templates.generationStatus(
        generationJobId!,
      ) as Promise<TemplateGenerationJob>,
    enabled: !!generationJobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "COMPLETED" || status === "FAILED" ? false : 5000;
    },
  });

  // Mutations
  const createCampaignMutation = useMutation({
    mutationFn: (data: {
      name: string;
      templateId: string;
      cc?: string[];
      bcc?: string[];
    }) => api.emailCampaigns.create(data) as Promise<EmailCampaign>,
    onSuccess: (newCampaign) => {
      // Associate selected contacts
      if (selectedContactIds.length > 0) {
        api.emailCampaigns
          .addContacts(newCampaign.id, selectedContactIds)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
          });
      }
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      showAlert(
        "Your campaign is saved. You can open it anytime to add contacts or start sending.",
        "success",
        "Campaign ready",
      );
      resetWizard();
      setActiveTab("list");
    },
    onError: (err: unknown) => {
      showAlert(
        getErrorMessage(
          err,
          "We could not save this campaign. Please check the details and try again.",
        ),
        "error",
      );
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: api.emailCampaigns.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      showAlert(
        "The campaign has been removed from your list.",
        "success",
        "Campaign deleted",
      );
      if (activeTab === "detail") setActiveTab("list");
    },
    onError: (err: unknown) => {
      showAlert(
        getErrorMessage(
          err,
          "We could not delete this campaign. Please try again.",
        ),
        "error",
      );
    },
  });

  const launchCampaignMutation = useMutation<
    CampaignLaunchResult,
    Error,
    string
  >({
    mutationFn: (id: string) =>
      api.emailCampaigns.launch(id) as Promise<CampaignLaunchResult>,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      if (selectedCampaignId) {
        queryClient.invalidateQueries({
          queryKey: ["email-campaign", selectedCampaignId],
        });
      }
      showAlert(
        res?.message ||
          "Your emails are being sent now. You can stay on this page and watch the results update.",
        "success",
        "Campaign started",
      );
    },
    onError: (err: unknown) => {
      showAlert(
        getErrorMessage(
          err,
          "We could not start this campaign. Please add contacts and choose a template first.",
        ),
        "error",
      );
    },
  });

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleValue, setScheduleValue] = useState("");

  const relaunchCampaignMutation = useMutation<
    CampaignLaunchResult,
    Error,
    string
  >({
    mutationFn: (id: string) =>
      api.emailCampaigns.relaunch(id) as Promise<CampaignLaunchResult>,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      if (selectedCampaignId) {
        queryClient.invalidateQueries({
          queryKey: ["email-campaign", selectedCampaignId],
        });
      }
      showAlert(
        res?.message || "This campaign is being sent again to every recipient.",
        "success",
        "Campaign relaunched",
      );
    },
    onError: (err: unknown) => {
      showAlert(
        getErrorMessage(err, "We could not relaunch this campaign."),
        "error",
      );
    },
  });

  const updateCampaignMutation = useMutation<
    EmailCampaign,
    Error,
    { id: string; name: string; templateId: string }
  >({
    mutationFn: ({ id, name, templateId }) =>
      api.emailCampaigns.update(id, {
        name,
        templateId,
      }) as Promise<EmailCampaign>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      if (selectedCampaignId) {
        queryClient.invalidateQueries({
          queryKey: ["email-campaign", selectedCampaignId],
        });
      }
      setIsEditingCampaign(false);
      showAlert(
        "Campaign details have been updated.",
        "success",
        "Campaign updated",
      );
    },
    onError: (err: unknown) => {
      showAlert(
        getErrorMessage(
          err,
          "We could not update this campaign. Please try again.",
        ),
        "error",
      );
    },
  });

  const updateCopyListsMutation = useMutation<
    EmailCampaign,
    Error,
    { id: string; cc: string[]; bcc: string[] }
  >({
    mutationFn: ({ id, cc, bcc }) =>
      api.emailCampaigns.update(id, { cc, bcc }) as Promise<EmailCampaign>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      if (selectedCampaignId) {
        queryClient.invalidateQueries({
          queryKey: ["email-campaign", selectedCampaignId],
        });
      }
      setIsEditingCopyLists(false);
      showAlert(
        "CC and BCC recipients have been updated for this campaign.",
        "success",
        "Recipients saved",
      );
    },
    onError: (err: unknown) => {
      showAlert(
        getErrorMessage(
          err,
          "We could not update CC/BCC for this campaign. Please try again.",
        ),
        "error",
      );
    },
  });

  const scheduleCampaignMutation = useMutation<
    CampaignLaunchResult,
    Error,
    { id: string; scheduledAt: string }
  >({
    mutationFn: ({ id, scheduledAt }) =>
      api.emailCampaigns.schedule(
        id,
        scheduledAt,
      ) as Promise<CampaignLaunchResult>,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      if (selectedCampaignId) {
        queryClient.invalidateQueries({
          queryKey: ["email-campaign", selectedCampaignId],
        });
      }
      setScheduleOpen(false);
      setScheduleValue("");
      showAlert(
        res?.message || "Your campaign is scheduled.",
        "success",
        "Campaign scheduled",
      );
    },
    onError: (err: unknown) => {
      showAlert(
        getErrorMessage(err, "We could not schedule this campaign."),
        "error",
      );
    },
  });

  const unscheduleCampaignMutation = useMutation<
    CampaignLaunchResult,
    Error,
    string
  >({
    mutationFn: (id: string) =>
      api.emailCampaigns.unschedule(id) as Promise<CampaignLaunchResult>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      if (selectedCampaignId) {
        queryClient.invalidateQueries({
          queryKey: ["email-campaign", selectedCampaignId],
        });
      }
      showAlert("Schedule cancelled.", "success");
    },
    onError: (err: unknown) => {
      showAlert(getErrorMessage(err, "Could not cancel the schedule."), "error");
    },
  });

  const generateAiTemplateMutation = useMutation<
    TemplateGenerationJob,
    Error,
    TemplateGenerationPayload
  >({
    mutationFn: (data) =>
      api.templates.startGenerate(data) as Promise<TemplateGenerationJob>,
    onSuccess: (job, variables) => {
      setGenerationJobId(job.id);
      setGenerationPayload(variables);
      handledGenerationJobIdRef.current = null;
      showAlert(
        "Template generation has started. Status will refresh every 5 seconds.",
        "info",
        "Generating template",
      );
    },
    onError: (err: unknown) => {
      showAlert(
        getErrorMessage(
          err,
          "We could not start AI template generation. Please try again or write it manually.",
        ),
        "error",
      );
    },
  });

  const createGeneratedTemplateMutation = useMutation<
    Template,
    Error,
    { generated: TemplateGenerationResult; data: TemplateGenerationPayload }
  >({
    mutationFn: ({ generated, data }) => {
      const generatedHtml =
        data.format === "HTML"
          ? generated.bodyHtml?.trim() || textToHtml(generated.bodyText)
          : "";
      const generatedText =
        generated.bodyText?.trim() || htmlToText(generatedHtml);

      return api.templates.create({
        name: `AI ${data.format} - ${data.audience}`,
        subject: generated.subject,
        bodyHtml: generatedHtml,
        bodyText: generatedText,
        type: "AI",
        category: `AI Generated ${data.format}`,
        goal: data.goal,
        audience: data.audience,
        tone: data.tone,
        instructions: data.referenceDocumentName
          ? `${data.instructions || ""}\nReference PDF: ${data.referenceDocumentName}`.trim()
          : data.instructions,
        // Files staged in the builder apply to whichever mode produced the
        // template. Without this the AI path silently dropped them and the
        // only way to attach was to save first, reselect, then re-upload.
        attachments: manualTemplateAttachments,
      }) as Promise<Template>;
    },
    onSuccess: (res) => {
      setGeneratedTemplate(res);
      setSelectedTemplateId(res.id);
      setGenerationJobId(null);
      setGenerationPayload(null);
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      showAlert(
        "Your AI template is ready and already selected for this campaign.",
        "success",
        "Template ready",
      );
    },
    onError: (err: unknown) => {
      showAlert(
        getErrorMessage(
          err,
          "The AI content was generated, but we could not save it as a template.",
        ),
        "error",
      );
    },
  });

  const createManualTemplateMutation = useMutation<
    Template,
    Error,
    {
      name: string;
      subject: string;
      body: string;
      format: TemplateFormat;
      attachments: TemplateAttachment[];
    }
  >({
    mutationFn: (data: {
      name: string;
      subject: string;
      body: string;
      format: TemplateFormat;
      attachments: TemplateAttachment[];
    }) =>
      api.templates.create({
        name: data.name,
        subject: data.subject,
        bodyHtml: data.format === "HTML" ? data.body : "",
        bodyText: data.format === "TEXT" ? data.body : htmlToText(data.body),
        type: "CUSTOM",
        category: `Manual ${data.format}`,
        attachments: data.attachments,
      }) as Promise<Template>,
    onSuccess: (res) => {
      setSelectedTemplateId(res.id);
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      showAlert(
        "Your template is saved and selected for this campaign.",
        "success",
        "Template saved",
      );
    },
    onError: (err: unknown) => {
      showAlert(
        getErrorMessage(
          err,
          "We could not save this template. Please check the name, subject, and message.",
        ),
        "error",
      );
    },
  });

  const updateTemplateAttachmentsMutation = useMutation<
    Template,
    Error,
    { id: string; attachments: TemplateAttachment[] }
  >({
    mutationFn: ({
      id,
      attachments,
    }: {
      id: string;
      attachments: TemplateAttachment[];
    }) => api.templates.update(id, { attachments }) as Promise<Template>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      if (selectedCampaignId) {
        queryClient.invalidateQueries({
          queryKey: ["email-campaign", selectedCampaignId],
        });
      }
      showAlert(
        "Template attachments have been updated.",
        "success",
        "Attachments saved",
      );
    },
    onError: (err: unknown) => {
      showAlert(
        getErrorMessage(
          err,
          "We could not update template attachments. Please try again.",
        ),
        "error",
      );
    },
  });

  const updateSelectedTemplateMutation = useMutation<
    Template,
    Error,
    {
      id: string;
      name: string;
      subject: string;
      body: string;
      format: TemplateFormat;
    }
  >({
    mutationFn: ({ id, name, subject, body, format }) =>
      api.templates.update(id, {
        name,
        subject,
        bodyHtml: format === "HTML" ? body : "",
        bodyText: format === "TEXT" ? body : htmlToText(body),
      }) as Promise<Template>,
    onSuccess: (res) => {
      setSelectedTemplateId(res.id);
      setIsEditingSelectedTemplate(false);
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      showAlert(
        "Template changes have been saved.",
        "success",
        "Template updated",
      );
    },
    onError: (err: unknown) => {
      showAlert(
        getErrorMessage(
          err,
          "We could not save the template changes. Please try again.",
        ),
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

    if (
      generationJob.status === "COMPLETED" &&
      generationJob.result &&
      generationPayload
    ) {
      handledGenerationJobIdRef.current = generationJobId;
      createGeneratedTemplateMutation.mutate({
        generated: generationJob.result,
        data: generationPayload,
      });
    }

    if (generationJob.status === "FAILED") {
      handledGenerationJobIdRef.current = generationJobId;
      queueMicrotask(() => {
        setGenerationJobId(null);
        setGenerationPayload(null);
      });
      showAlert(
        generationJob.error ||
          "AI template generation failed. Please try again or write it manually.",
        "error",
      );
    }
  }, [
    generationJob,
    generationJobId,
    generationPayload,
    createGeneratedTemplateMutation,
    showAlert,
  ]);

  const addContactsMutation = useMutation({
    mutationFn: ({ id, contactIds }: { id: string; contactIds: string[] }) =>
      api.emailCampaigns.addContacts(id, contactIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["email-campaign", selectedCampaignId],
      });
      showAlert(
        "The selected contacts were added to this campaign.",
        "success",
        "Recipients added",
      );
      setIsAddContactsOpen(false);
      setAddSelectedContactIds([]);
    },
    onError: (err: unknown) => {
      showAlert(
        getErrorMessage(
          err,
          "We could not add those contacts. Please try again.",
        ),
        "error",
      );
    },
  });

  const removeContactMutation = useMutation({
    mutationFn: ({ id, contactId }: { id: string; contactId: string }) =>
      api.emailCampaigns.removeContact(id, contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["email-campaign", selectedCampaignId],
      });
      showAlert(
        "That recipient was removed from this campaign.",
        "info",
        "Recipient removed",
      );
    },
    onError: (err: unknown) => {
      showAlert(
        getErrorMessage(
          err,
          "We could not remove that recipient. Please try again.",
        ),
        "error",
      );
    },
  });

  const handleLaunchCampaign = (id: string) => {
    launchCampaignMutation.mutate(id);
  };

  const handleCreateCampaignSubmit = () => {
    if (!campaignName.trim()) {
      showAlert(
        "Please enter a name so you can recognize this campaign later.",
        "error",
      );
      return;
    }
    if (!selectedTemplateId) {
      showAlert(
        "Please choose or create an email template before saving the campaign.",
        "error",
      );
      return;
    }

    const invalid = [...campaignCc, ...campaignBcc].filter(
      (address) => !EMAIL_PATTERN.test(address),
    );
    if (invalid.length > 0) {
      showAlert(
        `These CC/BCC addresses are not valid email addresses: ${invalid.join(", ")}`,
        "error",
      );
      return;
    }

    createCampaignMutation.mutate({
      name: campaignName,
      templateId: selectedTemplateId,
      cc: campaignCc,
      bcc: campaignBcc,
    });
  };

  const resetWizard = () => {
    setWizardStep(1);
    setCampaignName("");
    setCampaignCc([]);
    setCampaignBcc([]);
    setSelectedTemplateId(null);
    setSelectedContactIds([]);
    setSelectedContactDirectoryId("all");
    setAiGoal("");
    setAiAudience("");
    setAiTone("Professional");
    setAiInstructions("");
    setAiReferencePdfName("");
    setAiReferencePdfText("");
    setIsReadingReferencePdf(false);
    setGeneratedTemplate(null);
    setGenerationJobId(null);
    setGenerationPayload(null);
    handledGenerationJobIdRef.current = null;
    setTemplateFormat("HTML");
    setTemplateBuilderMode("AI");
    setManualTemplateName("");
    setManualTemplateSubject("");
    setManualTemplateBody("");
    setManualTemplateAttachments([]);
    setIsEditingSelectedTemplate(false);
    setEditTemplateName("");
    setEditTemplateSubject("");
    setEditTemplateBody("");
    setEditTemplateFormat("HTML");
    setAddContactsSearch("");
    setAddContactsDirectoryId("all");
    setAddSelectedContactIds([]);
  };

  const htmlToText = (html: string) =>
    html
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  const textToHtml = (text: string) => {
    const paragraphs = text
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    return paragraphs.length > 0
      ? paragraphs
          .map(
            (paragraph) =>
              `<p>${paragraph
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;")
                .replace(/\n/g, "<br/>")}</p>`,
          )
          .join("")
      : "<p>Hi {{firstName}},</p>";
  };

  const handleReferencePdfChange = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      showAlert("Please choose a PDF file.", "error");
      return;
    }

    if (file.size > MAX_REFERENCE_PDF_BYTES) {
      showAlert("Reference PDF must be 8 MB or smaller.", "error");
      return;
    }

    setIsReadingReferencePdf(true);
    try {
      const result = (await api.templates.parseReferencePdf(
        file,
      )) as ReferencePdfResult;
      setAiReferencePdfName(result.name || file.name);
      setAiReferencePdfText(result.text || "");
      setGeneratedTemplate(null);
      setSelectedTemplateId(null);
      showAlert(
        "The PDF reference has been added for AI generation.",
        "success",
        "Reference ready",
      );
    } catch (error: unknown) {
      setAiReferencePdfName("");
      setAiReferencePdfText("");
      showAlert(
        getErrorMessage(
          error,
          "We could not read that PDF. Please try another file.",
        ),
        "error",
      );
    } finally {
      setIsReadingReferencePdf(false);
    }
  };

  const removeReferencePdf = () => {
    setAiReferencePdfName("");
    setAiReferencePdfText("");
  };

  const handleGenerateAiTemplate = () => {
    if (!aiGoal.trim() || !aiAudience.trim()) {
      showAlert(
        "Tell the AI what you want to achieve and who you are emailing.",
        "error",
      );
      return;
    }

    generateAiTemplateMutation.mutate({
      goal: aiGoal,
      audience: aiAudience,
      tone: aiTone,
      instructions: aiInstructions,
      referenceDocumentText: aiReferencePdfText || undefined,
      referenceDocumentName: aiReferencePdfName || undefined,
      format: templateFormat,
    });
  };

  const handleCreateManualTemplate = () => {
    if (
      !manualTemplateName.trim() ||
      !manualTemplateSubject.trim() ||
      !manualTemplateBody.trim()
    ) {
      showAlert(
        "Please add a template name, subject line, and email message before saving.",
        "error",
      );
      return;
    }

    createManualTemplateMutation.mutate({
      name: manualTemplateName,
      subject: manualTemplateSubject,
      body: manualTemplateBody,
      format: templateFormat,
      attachments: manualTemplateAttachments,
    });
  };

  const getTemplateFormat = (template: Template): TemplateFormat =>
    template.bodyHtml?.trim() ? "HTML" : "TEXT";

  const startEditingSelectedTemplate = () => {
    if (!selectedTemplate) return;
    const format = getTemplateFormat(selectedTemplate);
    setEditTemplateFormat(format);
    setEditTemplateName(selectedTemplate.name || "");
    setEditTemplateSubject(selectedTemplate.subject || "");
    setEditTemplateBody(
      format === "HTML"
        ? selectedTemplate.bodyHtml || ""
        : selectedTemplate.bodyText || "",
    );
    setIsEditingSelectedTemplate(true);
  };

  const cancelEditingSelectedTemplate = () => {
    setIsEditingSelectedTemplate(false);
  };

  const handleUpdateSelectedTemplate = () => {
    if (!selectedTemplate) return;

    if (
      !editTemplateName.trim() ||
      !editTemplateSubject.trim() ||
      !editTemplateBody.trim()
    ) {
      showAlert(
        "Please keep the template name, subject, and message filled in before saving.",
        "error",
      );
      return;
    }

    updateSelectedTemplateMutation.mutate({
      id: selectedTemplate.id,
      name: editTemplateName.trim(),
      subject: editTemplateSubject.trim(),
      body: editTemplateBody,
      format: editTemplateFormat,
    });
  };

  const switchTemplateBuilderMode = (mode: TemplateBuilderMode) => {
    setTemplateBuilderMode(mode);
    setSelectedTemplateId(null);
    setGeneratedTemplate(null);
    setIsEditingSelectedTemplate(false);
  };

  // Shared between the AI and manual builders: files staged here are sent with
  // whichever template the builder saves. Previously this lived inside the
  // manual branch only, so AI templates could not be given an attachment.
  const renderStagedAttachmentsPanel = (className = "") => (
    <div className={`${className} overflow-hidden rounded-xl border border-zinc-850 bg-zinc-950/60`}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-500">
            <Paperclip className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-zinc-300">
              Template Attachments
            </p>
            <p className="mt-1 text-[11px] text-zinc-600">
              {manualTemplateAttachments.length}/
              {MAX_TEMPLATE_ATTACHMENTS} files, 5 MB each
            </p>
          </div>
        </div>
        <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-[10px] font-bold text-zinc-300 hover:border-emerald-500/40 hover:text-white">
          <Upload className="h-3.5 w-3.5" />
          Add Files
          <input
            type="file"
            multiple
            className="hidden"
            onChange={async (e) => {
              const input = e.currentTarget;
              await handleManualAttachmentFiles(input.files);
              input.value = "";
            }}
          />
        </label>
      </div>

      {manualTemplateAttachments.length > 0 ? (
        <div className="space-y-2 border-t border-zinc-850 bg-zinc-950 p-3">
          {manualTemplateAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg border border-zinc-850 bg-zinc-900/40 p-2"
            >
              <input
                type="text"
                value={attachment.name}
                onChange={(e) =>
                  updateManualAttachmentName(
                    attachment.id,
                    e.target.value,
                  )
                }
                className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-zinc-600">
                {formatAttachmentSize(attachment.size)}
              </span>
              <button
                type="button"
                onClick={() =>
                  removeManualAttachment(attachment.id)
                }
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-rose-950/30 hover:text-rose-400"
                title="Remove attachment"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-t border-zinc-850 bg-zinc-950 px-4 py-3">
          <p className="text-[11px] text-zinc-600">
            No attachments added to this template draft.
          </p>
        </div>
      )}
    </div>
  );

  const selectedTemplate = templates.find(
    (tpl) => tpl.id === selectedTemplateId,
  );
  const manualDraftTemplate =
    templateBuilderMode === "MANUAL" && manualTemplateBody.trim()
      ? {
          subject: manualTemplateSubject || "Manual template draft",
          bodyHtml: templateFormat === "HTML" ? manualTemplateBody : "",
          bodyText:
            templateFormat === "TEXT"
              ? manualTemplateBody
              : htmlToText(manualTemplateBody),
          attachments: manualTemplateAttachments,
        }
      : null;
  const builderPreviewTemplate =
    templateBuilderMode === "AI" ? generatedTemplate : manualDraftTemplate;
  const previewTemplate = selectedTemplate || builderPreviewTemplate;
  const previewAttachments: TemplateAttachment[] =
    previewTemplate?.attachments || [];
  const previewHtml = previewTemplate?.bodyHtml?.trim();
  const previewText = previewTemplate?.bodyText?.trim();
  const previewSource = selectedTemplate
    ? selectedTemplate.type || selectedTemplate.category || "Saved"
    : templateBuilderMode === "AI"
      ? "AI Generated"
      : "Manual Draft";
  const previewSrcDoc = previewHtml
    ? `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#fff;color:#111827;font-family:Arial,sans-serif}.email-preview{box-sizing:border-box;width:100%;min-height:100%;padding:20px;font-size:15px;line-height:1.55}a{color:#2563eb}</style></head><body><div class="email-preview">${previewHtml}</div></body></html>`
    : "";
  const isGeneratingTemplate =
    generateAiTemplateMutation.isPending ||
    createGeneratedTemplateMutation.isPending ||
    generationJob?.status === "PENDING" ||
    generationJob?.status === "PROCESSING";

  const toggleContactSelection = (id: string) => {
    setSelectedContactIds(
      selectedContactIds.includes(id)
        ? selectedContactIds.filter((cid) => cid !== id)
        : [...selectedContactIds, id],
    );
  };

  const filterContactsByDirectory = (
    contactList: Contact[],
    directoryId: string,
  ) =>
    contactList.filter((contact) => {
      if (directoryId === "all") return true;
      if (directoryId === "uncategorized") return !contact.directoryId;
      return contact.directoryId === directoryId;
    });

  const directoryFilteredContacts = filterContactsByDirectory(
    contacts,
    selectedContactDirectoryId,
  );
  const selectedDirectoryContactIds = new Set(
    directoryFilteredContacts.map((contact) => contact.id),
  );
  const selectedContactsInDirectory = selectedContactIds.filter((id) =>
    selectedDirectoryContactIds.has(id),
  );

  const handleContactDirectoryChange = (directoryId: string) => {
    setSelectedContactDirectoryId(directoryId);
    setSelectedContactIds([]);
  };

  const selectAllContacts = () => {
    if (directoryFilteredContacts.length === 0) return;

    if (
      selectedContactsInDirectory.length === directoryFilteredContacts.length
    ) {
      setSelectedContactIds(
        selectedContactIds.filter((id) => !selectedDirectoryContactIds.has(id)),
      );
    } else {
      const nextIds = new Set(selectedContactIds);
      directoryFilteredContacts.forEach((contact) => nextIds.add(contact.id));
      setSelectedContactIds(Array.from(nextIds));
    }
  };

  const toggleAddContactSelection = (id: string) => {
    setAddSelectedContactIds(
      addSelectedContactIds.includes(id)
        ? addSelectedContactIds.filter((cid) => cid !== id)
        : [...addSelectedContactIds, id],
    );
  };

  const handleAddContactsDirectoryChange = (directoryId: string) => {
    setAddContactsDirectoryId(directoryId);
    setAddSelectedContactIds([]);
  };

  const fileToTemplateAttachment = (file: File): Promise<TemplateAttachment> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        resolve({
          id: `attachment-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          contentBase64: result.split(",")[1] || "",
        });
      };
      reader.onerror = () =>
        reject(new Error("Could not read attachment file"));
      reader.readAsDataURL(file);
    });

  const readAttachmentFiles = async (
    files: FileList | null,
    existing: TemplateAttachment[] = [],
  ) => {
    const list = Array.from(files || []);
    if (list.length === 0) return [];

    if (existing.length + list.length > MAX_TEMPLATE_ATTACHMENTS) {
      showAlert(
        `Templates can include up to ${MAX_TEMPLATE_ATTACHMENTS} attachments.`,
        "error",
      );
      return [];
    }

    const oversized = list.find(
      (file) => file.size > MAX_TEMPLATE_ATTACHMENT_BYTES,
    );
    if (oversized) {
      showAlert(`${oversized.name} is larger than 5 MB.`, "error");
      return [];
    }

    // Mirrors the backend total cap. Without this the per-file check passes and
    // the whole set is only rejected later — after upload, or at launch.
    const totalBytes =
      existing.reduce((sum, attachment) => sum + (attachment.size || 0), 0) +
      list.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_TEMPLATE_ATTACHMENTS_TOTAL_BYTES) {
      showAlert(
        `These files total ${formatBytes(totalBytes)}, over the ${formatBytes(
          MAX_TEMPLATE_ATTACHMENTS_TOTAL_BYTES,
        )} limit for one email. Remove a file or link to it instead.`,
        "error",
      );
      return [];
    }

    return Promise.all(list.map(fileToTemplateAttachment));
  };

  const handleManualAttachmentFiles = async (files: FileList | null) => {
    const attachments = await readAttachmentFiles(
      files,
      manualTemplateAttachments,
    );
    if (attachments.length > 0) {
      setManualTemplateAttachments([
        ...manualTemplateAttachments,
        ...attachments,
      ]);
      setGeneratedTemplate(null);
      setSelectedTemplateId(null);
    }
  };

  const updateManualAttachmentName = (id: string, name: string) => {
    setManualTemplateAttachments(
      manualTemplateAttachments.map((attachment) =>
        attachment.id === id ? { ...attachment, name } : attachment,
      ),
    );
  };

  const removeManualAttachment = (id: string) => {
    setManualTemplateAttachments(
      manualTemplateAttachments.filter((attachment) => attachment.id !== id),
    );
  };

  const updateTemplateAttachmentsFor = (
    template: Template,
    attachments: TemplateAttachment[],
  ) => {
    updateTemplateAttachmentsMutation.mutate({
      id: template.id,
      attachments,
    });
  };

  const addTemplateAttachmentFiles = async (
    template: Template,
    files: FileList | null,
  ) => {
    const currentAttachments = template.attachments || [];
    const attachments = await readAttachmentFiles(files, currentAttachments);
    if (attachments.length > 0) {
      updateTemplateAttachmentsFor(template, [
        ...currentAttachments,
        ...attachments,
      ]);
    }
  };

  const replaceTemplateAttachment = async (
    template: Template,
    attachmentId: string,
    files: FileList | null,
  ) => {
    const [replacement] = await readAttachmentFiles(files, []);
    if (!replacement) return;

    updateTemplateAttachmentsFor(
      template,
      (template.attachments || []).map((attachment: TemplateAttachment) =>
        attachment.id === attachmentId
          ? { ...replacement, id: attachmentId }
          : attachment,
      ),
    );
  };

  const renameTemplateAttachment = (
    template: Template,
    attachmentId: string,
    name: string,
  ) => {
    const cleanName = name.trim();
    if (!cleanName) return;

    updateTemplateAttachmentsFor(
      template,
      (template.attachments || []).map((attachment: TemplateAttachment) =>
        attachment.id === attachmentId
          ? { ...attachment, name: cleanName }
          : attachment,
      ),
    );
  };

  const removeTemplateAttachment = (
    template: Template,
    attachmentId: string,
  ) => {
    updateTemplateAttachmentsFor(
      template,
      (template.attachments || []).filter(
        (attachment: TemplateAttachment) => attachment.id !== attachmentId,
      ),
    );
  };

  const getLaunchState = (camp: {
    contactCount?: number;
    pendingCount?: number;
    failedCount?: number;
  }) => {
    const contactCount = camp.contactCount ?? 0;
    const pending = camp.pendingCount ?? 0;
    const failed = camp.failedCount ?? 0;

    if (contactCount === 0) {
      return { canLaunch: false, label: "Add Contacts" };
    }
    if (pending === 0 && failed === 0) {
      return { canLaunch: false, label: "All Sent" };
    }
    return {
      canLaunch: true,
      label:
        failed > 0 && pending === 0
          ? `Retry ${failed} Failed`
          : "Launch",
    };
  };

  const formatAttachmentSize = (size: number) => {
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    if (size >= 1024) return `${Math.round(size / 1024)} KB`;
    return `${size || 0} B`;
  };

  const addDirectoryFilteredContacts = filterContactsByDirectory(
    contacts,
    addContactsDirectoryId,
  );
  const availableAddContacts = addDirectoryFilteredContacts.filter(
    (contact) => {
      const alreadyInCampaign = campaignDetails?.contacts?.some(
        (campaignContact) => campaignContact.contactId === contact.id,
      );
      const term = addContactsSearch.toLowerCase();
      const matchSearch =
        contact.firstName.toLowerCase().includes(term) ||
        contact.lastName.toLowerCase().includes(term) ||
        contact.email.toLowerCase().includes(term);

      return !alreadyInCampaign && matchSearch;
    },
  );

  if (settings && (!settings.awsAccessKeyId || !settings.awsSecretAccessKey)) {
    return (
      <MissingCredentials
        title="AWS Credentials Required"
        description="To create and launch email campaigns, you need to configure your AWS SES credentials in the settings."
      />
    );
  }

  return (
    <div className="space-y-">
      <LoaderOverlay
        show={launchCampaignMutation.isPending}
        label="Launching campaign"
        sublabel="Personalizing and dispatching your emails via SES…"
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-zinc-900">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Mail className="h-8 w-8 text-indigo-400" />
            Automated Email
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Automate personalized bulk outreach pipelines with tracking and AI
            copies.
          </p>
        </div>
        {activeTab === "list" && (
          <button
            onClick={() => {
              resetWizard();
              setActiveTab("create");
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:brightness-110 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            New Campaign
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

      {/* Main Campaign List Tab */}
      {activeTab === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isCampaignsLoading ? (
            [1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-48 bg-zinc-900 border border-zinc-850 rounded-2xl animate-pulse"
              ></div>
            ))
          ) : campaigns.length > 0 ? (
            campaigns.map((camp) => {
              const statusColors: Record<string, string> = {
                DRAFT: "bg-zinc-850 text-zinc-400 border-zinc-800",
                RUNNING:
                  "bg-indigo-500/10 text-indigo-400 border-indigo-500/10",
                COMPLETED:
                  "bg-emerald-500/10 text-emerald-400 border-emerald-500/10",
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
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {camp.status !== "RUNNING" && (
                          <button
                            title="Edit campaign"
                            onClick={() => {
                              setSelectedCampaignId(camp.id);
                              setEditCampaignName(camp.name);
                              setEditCampaignTemplateId(
                                camp.template?.id || "",
                              );
                              setIsEditingCampaign(true);
                              setActiveTab("detail");
                            }}
                            className="p-1 hover:bg-indigo-950/20 text-zinc-500 hover:text-indigo-400 rounded transition-colors"
                          >
                            <PenLine className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          title="Delete campaign"
                          onClick={() => {
                            if (confirm("Delete this campaign?")) {
                              deleteCampaignMutation.mutate(camp.id);
                            }
                          }}
                          className="p-1 hover:bg-rose-950/20 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white tracking-tight">
                        {camp.name}
                      </h4>
                      <p className="text-xs text-zinc-500 mt-1">
                        Created on{" "}
                        {new Date(camp.createdAt).toLocaleDateString()}
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
                      <Eye className="h-3.5 w-3.5" />
                      View Details
                    </button>
                    {camp.status !== "RUNNING" &&
                      (() => {
                        const launchState = getLaunchState(camp);
                        return launchState.canLaunch ? (
                          <button
                            onClick={() => handleLaunchCampaign(camp.id)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                          >
                            <Play className="h-3.5 w-3.5" />
                            {launchState.label}
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-600 font-semibold">
                            {launchState.label}
                          </span>
                        );
                      })()}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-16 text-center border border-zinc-850 bg-zinc-900/20 rounded-2xl text-zinc-500">
              No campaigns configured. Click &quot;New Campaign&quot; to build
              an outreach pipeline.
            </div>
          )}
        </div>
      )}

      {/* Campaign Details Tab */}
      {activeTab === "detail" && selectedCampaignId && (
        <div className="space-y-6">
          {isCampaignDetailsLoading || !campaignDetails ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-16 bg-zinc-900 border border-zinc-850 rounded-2xl"></div>
              <div className="h-80 bg-zinc-900 border border-zinc-850 rounded-2xl"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Banner */}
              <div className="p-6 bg-zinc-900/50 border border-zinc-850 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
                <div className="space-y-2 min-w-0 flex-1">
                  {isEditingCampaign ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                          Campaign name
                        </label>
                        <input
                          type="text"
                          value={editCampaignName}
                          onChange={(e) => setEditCampaignName(e.target.value)}
                          className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                          Template
                        </label>
                        <select
                          value={editCampaignTemplateId}
                          onChange={(e) =>
                            setEditCampaignTemplateId(e.target.value)
                          }
                          className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
                        >
                          {templates.map((tpl) => (
                            <option key={tpl.id} value={tpl.id}>
                              {tpl.name}
                              {(tpl.attachments?.length || 0) > 0
                                ? ` — ${tpl.attachments!.length} file(s)`
                                : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      {(campaignDetails.sentCount || 0) > 0 && (
                        <p className="max-w-md text-[11px] leading-relaxed text-amber-200/70">
                          {campaignDetails.sentCount} email
                          {campaignDetails.sentCount === 1 ? " has" : "s have"}{" "}
                          already gone out. Changing the template only affects
                          recipients who have not been sent to yet — it does not
                          alter what was already delivered.
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={updateCampaignMutation.isPending}
                          onClick={() => {
                            if (!editCampaignName.trim()) {
                              showAlert(
                                "Campaign name cannot be empty.",
                                "error",
                              );
                              return;
                            }
                            if (!editCampaignTemplateId) {
                              showAlert(
                                "Pick a template for this campaign.",
                                "error",
                              );
                              return;
                            }
                            updateCampaignMutation.mutate({
                              id: campaignDetails.id,
                              name: editCampaignName.trim(),
                              templateId: editCampaignTemplateId,
                            });
                          }}
                          className="rounded-lg bg-indigo-500 px-3 py-2 text-[10px] font-bold text-white hover:brightness-110 disabled:opacity-50"
                        >
                          {updateCampaignMutation.isPending
                            ? "Saving…"
                            : "Save changes"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingCampaign(false)}
                          className="rounded-lg border border-zinc-800 px-3 py-2 text-[10px] font-bold text-zinc-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-white">
                          {campaignDetails.name}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-950 border border-zinc-800 text-zinc-400">
                          {campaignDetails.status}
                        </span>
                        {campaignDetails.status !== "RUNNING" && (
                          <button
                            type="button"
                            title="Edit campaign"
                            onClick={() => {
                              setEditCampaignName(campaignDetails.name);
                              setEditCampaignTemplateId(
                                campaignDetails.template?.id || "",
                              );
                              setIsEditingCampaign(true);
                            }}
                            className="flex items-center gap-1 rounded-lg border border-zinc-800 px-2 py-1 text-[10px] font-bold text-zinc-400 hover:border-indigo-500/40 hover:text-white"
                          >
                            <PenLine className="h-3 w-3" />
                            Edit
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">
                        Template:{" "}
                        <span className="text-zinc-300 font-semibold">
                          {campaignDetails.template?.name || "No Template"}
                        </span>
                        {(campaignDetails.template?.attachments?.length || 0) >
                          0 && (
                          <span className="ml-2 inline-flex items-center gap-1 text-zinc-500">
                            <Paperclip className="h-3 w-3" />
                            {campaignDetails.template!.attachments!.length} file
                            {campaignDetails.template!.attachments!.length === 1
                              ? ""
                              : "s"}
                          </span>
                        )}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setAddContactsDirectoryId("all");
                      setAddSelectedContactIds([]);
                      setIsAddContactsOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white"
                  >
                    <PlusCircle className="h-3.5 w-3.5" /> Add Contacts
                  </button>
                  {campaignDetails.status !== "RUNNING" && (
                    <>
                      {(() => {
                        const contacts = campaignDetails.contacts || [];
                        const launchState = getLaunchState({
                          contactCount: contacts.length,
                          pendingCount: contacts.filter(
                            (c) => c.deliveryStatus === "PENDING",
                          ).length,
                          failedCount: contacts.filter(
                            (c) => c.deliveryStatus === "FAILED",
                          ).length,
                        });
                        return (
                          <button
                            onClick={() =>
                              handleLaunchCampaign(campaignDetails.id)
                            }
                            disabled={!launchState.canLaunch}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl text-xs font-bold text-white shadow-md hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100"
                          >
                            <Play className="h-3.5 w-3.5" />{" "}
                            {launchState.canLaunch
                              ? campaignDetails.status === "DRAFT"
                                ? "Launch Campaign"
                                : launchState.label
                              : launchState.label}
                          </button>
                        );
                      })()}
                      {(() => {
                        const contacts = campaignDetails.contacts || [];
                        const alreadySent = contacts.filter((c) =>
                          ["SENT", "DELIVERED"].includes(c.deliveryStatus),
                        ).length;
                        // Only meaningful once something has actually gone out —
                        // otherwise the normal Launch button already covers it.
                        if (alreadySent === 0) return null;
                        return (
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `Re-send this campaign to all ${contacts.length} recipients?\n\n` +
                                    `${alreadySent} of them have already received it and will get a second copy.\n\n` +
                                    `This cannot be undone once sending starts.`,
                                )
                              ) {
                                relaunchCampaignMutation.mutate(
                                  campaignDetails.id,
                                );
                              }
                            }}
                            disabled={relaunchCampaignMutation.isPending}
                            title={`Re-send to all ${contacts.length} recipients, including ${alreadySent} already sent`}
                            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-950 border border-amber-500/30 rounded-xl text-xs font-semibold text-amber-400 hover:bg-zinc-900 disabled:opacity-50"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            {relaunchCampaignMutation.isPending
                              ? "Relaunching…"
                              : "Relaunch All"}
                          </button>
                        );
                      })()}
                      {campaignDetails.status === "SCHEDULED" ? (
                        <button
                          onClick={() =>
                            unscheduleCampaignMutation.mutate(
                              campaignDetails.id,
                            )
                          }
                          className="flex items-center gap-1.5 px-3 py-2 bg-zinc-950 border border-amber-500/30 rounded-xl text-xs font-semibold text-amber-400 hover:bg-zinc-900"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          {campaignDetails.scheduledAt
                            ? `Scheduled ${new Date(campaignDetails.scheduledAt).toLocaleString()} — Cancel`
                            : "Cancel schedule"}
                        </button>
                      ) : (
                        <button
                          onClick={() => setScheduleOpen((v) => !v)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white"
                        >
                          <Clock className="h-3.5 w-3.5" /> Schedule
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {scheduleOpen && campaignDetails.status !== "RUNNING" && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-850 bg-zinc-900/40 px-4 py-3">
                  <label className="text-xs font-semibold text-zinc-400">
                    Send at:
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleValue}
                    onChange={(e) => setScheduleValue(e.target.value)}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-200 focus:border-indigo-500/50 focus:outline-none"
                  />
                  <button
                    disabled={
                      !scheduleValue || scheduleCampaignMutation.isPending
                    }
                    onClick={() =>
                      scheduleCampaignMutation.mutate({
                        id: campaignDetails.id,
                        scheduledAt: new Date(scheduleValue).toISOString(),
                      })
                    }
                    className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50"
                  >
                    Confirm schedule
                  </button>
                </div>
              )}

              {/* CC / BCC recipients */}
              <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-zinc-850 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
                      CC &amp; BCC
                    </h4>
                    <p className="mt-1 text-xs text-zinc-500">
                      Copied on every email this campaign sends.
                    </p>
                  </div>
                  {campaignDetails.status !== "RUNNING" &&
                    (isEditingCopyLists ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingCopyLists(false)}
                          className="rounded-lg border border-zinc-800 px-3 py-2 text-[10px] font-bold text-zinc-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={updateCopyListsMutation.isPending}
                          onClick={() => {
                            const invalid = [...editCc, ...editBcc].filter(
                              (address) => !EMAIL_PATTERN.test(address),
                            );
                            if (invalid.length > 0) {
                              showAlert(
                                `These are not valid email addresses: ${invalid.join(", ")}`,
                                "error",
                              );
                              return;
                            }
                            updateCopyListsMutation.mutate({
                              id: campaignDetails.id,
                              cc: editCc,
                              bcc: editBcc,
                            });
                          }}
                          className="rounded-lg bg-indigo-500 px-3 py-2 text-[10px] font-bold text-white hover:brightness-110 disabled:opacity-50"
                        >
                          {updateCopyListsMutation.isPending
                            ? "Saving…"
                            : "Save recipients"}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditCc(campaignDetails.cc || []);
                          setEditBcc(campaignDetails.bcc || []);
                          setIsEditingCopyLists(true);
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-[10px] font-bold text-zinc-300 hover:border-indigo-500/40 hover:text-white"
                      >
                        <PenLine className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    ))}
                </div>

                <div className="p-4 space-y-4">
                  {isEditingCopyLists ? (
                    <>
                      <EmailChipInput
                        label="CC"
                        hint="Visible to every recipient."
                        values={editCc}
                        onChange={setEditCc}
                        invalidAddresses={editCc.filter(
                          (address) => !EMAIL_PATTERN.test(address),
                        )}
                      />
                      <EmailChipInput
                        label="BCC"
                        hint="Hidden from recipients."
                        values={editBcc}
                        onChange={setEditBcc}
                        invalidAddresses={editBcc.filter(
                          (address) => !EMAIL_PATTERN.test(address),
                        )}
                      />
                      {editCc.length + editBcc.length > 0 && (
                        <p className="text-[11px] leading-relaxed text-amber-200/70">
                          {editCc.length + editBcc.length} copied{" "}
                          {editCc.length + editBcc.length === 1
                            ? "address"
                            : "addresses"}{" "}
                          &times; {campaignDetails.contacts?.length || 0}{" "}
                          recipients ={" "}
                          <span className="font-semibold text-amber-300">
                            {(editCc.length + editBcc.length) *
                              (campaignDetails.contacts?.length || 0)}{" "}
                            extra emails
                          </span>{" "}
                          delivered when this campaign runs.
                        </p>
                      )}
                    </>
                  ) : (campaignDetails.cc?.length || 0) +
                      (campaignDetails.bcc?.length || 0) ===
                    0 ? (
                    <p className="text-xs text-zinc-500">
                      No CC or BCC recipients. Emails go only to the contacts in
                      this campaign.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {(["cc", "bcc"] as const).map((field) => {
                        const list = campaignDetails[field] || [];
                        if (list.length === 0) return null;
                        return (
                          <div key={field}>
                            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              {field.toUpperCase()}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {list.map((address) => (
                                <span
                                  key={address}
                                  className="rounded-lg bg-zinc-850 px-2 py-1 text-xs text-zinc-200"
                                >
                                  {address}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      <p className="text-[11px] text-amber-200/70">
                        Each copied address receives one email per recipient (
                        {(campaignDetails.cc?.length || 0) +
                          (campaignDetails.bcc?.length || 0)}{" "}
                        &times; {campaignDetails.contacts?.length || 0} ={" "}
                        {((campaignDetails.cc?.length || 0) +
                          (campaignDetails.bcc?.length || 0)) *
                          (campaignDetails.contacts?.length || 0)}{" "}
                        extra emails).
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Email Template & Attachments */}
              {campaignDetails.template && (
                <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl overflow-hidden shadow-xl">
                  <div className="px-6 py-4 border-b border-zinc-850 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
                        Email Template
                      </h4>
                      <p className="mt-1 text-xs text-zinc-500 truncate">
                        {campaignDetails.template.name} —{" "}
                        {campaignDetails.template.subject}
                      </p>
                    </div>
                    {campaignDetails.status !== "RUNNING" && (
                      <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-[10px] font-bold text-zinc-300 hover:border-indigo-500/40 hover:text-white">
                        <Upload className="h-3.5 w-3.5" />
                        Add Files
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={async (e) => {
                            const input = e.currentTarget;
                            await addTemplateAttachmentFiles(
                              campaignDetails.template!,
                              input.files,
                            );
                            input.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    {(campaignDetails.template.attachments?.length || 0) >
                    0 ? (
                      campaignDetails.template.attachments!.map(
                        (attachment) => (
                          <div
                            key={attachment.id}
                            className="grid grid-cols-1 gap-2 rounded-lg border border-zinc-850 bg-zinc-950/40 p-2 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"
                          >
                            <input
                              key={`${attachment.id}-${attachment.name}`}
                              type="text"
                              defaultValue={attachment.name}
                              disabled={campaignDetails.status === "RUNNING"}
                              onBlur={(e) => {
                                if (e.target.value !== attachment.name) {
                                  renameTemplateAttachment(
                                    campaignDetails.template!,
                                    attachment.id,
                                    e.target.value,
                                  );
                                }
                              }}
                              className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                            />
                            <span className="text-[10px] text-zinc-500">
                              {formatAttachmentSize(attachment.size)}
                            </span>
                            {campaignDetails.status !== "RUNNING" && (
                              <>
                                <label className="flex cursor-pointer items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[10px] font-bold text-zinc-300 hover:bg-zinc-850">
                                  Replace
                                  <input
                                    type="file"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const input = e.currentTarget;
                                      await replaceTemplateAttachment(
                                        campaignDetails.template!,
                                        attachment.id,
                                        input.files,
                                      );
                                      input.value = "";
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeTemplateAttachment(
                                      campaignDetails.template!,
                                      attachment.id,
                                    )
                                  }
                                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[10px] font-bold text-rose-400 hover:bg-rose-950/30"
                                >
                                  Remove
                                </button>
                              </>
                            )}
                          </div>
                        ),
                      )
                    ) : (
                      <p className="text-[11px] text-zinc-600">
                        No attachments on this template.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Contacts Table in Campaign */}
              <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-zinc-850 flex justify-between items-center">
                  <h4 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
                    Campaign Recipients
                  </h4>
                  <span className="text-xs text-zinc-500 font-medium">
                    Total: {campaignDetails.contacts?.length || 0}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-zinc-300">
                    <thead className="text-xs text-zinc-500 uppercase border-b border-zinc-850 bg-zinc-900/60">
                      <tr>
                        <th className="px-6 py-3.5 font-semibold">Recipient</th>
                        <th className="px-6 py-3.5 font-semibold">Email</th>
                        <th className="px-6 py-3.5 font-semibold">Delivery</th>
                        <th className="px-6 py-3.5 font-semibold">Opens</th>
                        <th className="px-6 py-3.5 font-semibold">Replies</th>
                        <th className="px-6 py-3.5 font-semibold text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                      {campaignDetails.contacts &&
                      campaignDetails.contacts.length > 0 ? (
                        campaignDetails.contacts.map((cc) => {
                          const deliveryColors: Record<string, string> = {
                            PENDING: "bg-zinc-850 text-zinc-400",
                            SENT: "bg-blue-500/10 text-blue-400",
                            DELIVERED: "bg-emerald-500/10 text-emerald-400",
                            FAILED: "bg-rose-500/10 text-rose-400",
                          };

                          return (
                            <tr
                              key={cc.id}
                              className="hover:bg-zinc-900/40 transition-colors"
                            >
                              <td className="px-6 py-4 font-semibold text-white">
                                {cc.contact.firstName} {cc.contact.lastName}
                              </td>
                              <td className="px-6 py-4 text-zinc-400">
                                {cc.contact.email}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${deliveryColors[cc.deliveryStatus] || deliveryColors.PENDING}`}
                                >
                                  {cc.deliveryStatus}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {cc.openStatus ? (
                                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                                    <CheckCircle className="h-3.5 w-3.5" />{" "}
                                    Opened
                                  </span>
                                ) : (
                                  <span className="text-zinc-650">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {cc.replyStatus ? (
                                  <span className="text-xs text-indigo-400 font-bold flex items-center gap-1">
                                    <CheckCircle className="h-3.5 w-3.5" />{" "}
                                    Replied
                                  </span>
                                ) : (
                                  <span className="text-zinc-650">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  disabled={
                                    campaignDetails.status === "RUNNING"
                                  }
                                  onClick={() => {
                                    if (
                                      confirm(
                                        "Remove this contact from the campaign?",
                                      )
                                    ) {
                                      removeContactMutation.mutate({
                                        id: campaignDetails.id,
                                        contactId: cc.contactId,
                                      });
                                    }
                                  }}
                                  className="p-1 hover:bg-rose-950/20 text-zinc-500 hover:text-rose-400 rounded transition-colors disabled:opacity-30"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-6 py-12 text-center text-zinc-500"
                          >
                            No recipients attached to this campaign. Click
                            &quot;Add Contacts&quot; to build the recipient
                            list.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Campaign Wizard Tab */}
      {activeTab === "create" && (
        <div className="space-y-6 max-w-full bg-zinc-900/30 border border-zinc-850 p-6 rounded-2xl shadow-xl">
          {/* Wizard step banner */}
          <div className="flex items-center gap-3 pb-5 border-b border-zinc-850">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${wizardStep === 1 ? "bg-indigo-500 text-white" : "bg-zinc-850 text-zinc-400"}`}
            >
              1
            </div>
            <div className="h-px bg-zinc-800 flex-1"></div>
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${wizardStep === 2 ? "bg-indigo-500 text-white" : "bg-zinc-850 text-zinc-400"}`}
            >
              2
            </div>
            <div className="h-px bg-zinc-800 flex-1"></div>
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${wizardStep === 3 ? "bg-indigo-500 text-white" : "bg-zinc-850 text-zinc-400"}`}
            >
              3
            </div>
          </div>

          {/* STEP 1: Campaign Details */}
          {wizardStep === 1 && (
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Campaign Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q3 SaaS Founder Cold Outreach"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <EmailChipInput
                label="CC (optional)"
                hint="Visible to every recipient. Added to each email sent in this campaign."
                values={campaignCc}
                onChange={setCampaignCc}
                invalidAddresses={campaignCc.filter(
                  (address) => !EMAIL_PATTERN.test(address),
                )}
              />

              <EmailChipInput
                label="BCC (optional)"
                hint="Hidden from recipients. Useful for archiving a copy to your own inbox or CRM."
                values={campaignBcc}
                onChange={setCampaignBcc}
                invalidAddresses={campaignBcc.filter(
                  (address) => !EMAIL_PATTERN.test(address),
                )}
              />

              {campaignCc.length + campaignBcc.length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
                  <p className="text-xs font-semibold text-amber-300">
                    Every copied address receives one email per recipient
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-amber-200/70">
                    CC and BCC are applied to each send individually, not once
                    per campaign. With {campaignCc.length + campaignBcc.length}{" "}
                    copied {""}
                    {campaignCc.length + campaignBcc.length === 1
                      ? "address"
                      : "addresses"}
                    , a 200-contact campaign delivers{" "}
                    {(campaignCc.length + campaignBcc.length) * 200} extra
                    emails to {""}
                    {campaignCc.length + campaignBcc.length === 1
                      ? "that inbox"
                      : "those inboxes"}
                    . For a single summary copy, send yourself a test instead.
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!campaignName.trim()) {
                      showAlert(
                        "Please enter a name so you can recognize this campaign later.",
                        "error",
                      );
                      return;
                    }
                    setWizardStep(2);
                  }}
                  className="flex items-center gap-1 px-5 py-2.5 bg-gradient-to-tr from-indigo-500 to-purple-600 text-xs font-bold text-white rounded-xl shadow-md"
                >
                  Choose Template <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Template Selection / Generation */}
          {wizardStep === 2 && (
            <div className="space-y-6 py-2">
              <div className="flex flex-col gap-4 rounded-2xl border border-zinc-850 bg-zinc-950/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Template Workspace
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    Choose a saved template or compose a new AI/manual message
                    with optional files.
                  </p>
                </div>
                <div className="grid grid-cols-2 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                  <button
                    type="button"
                    onClick={() => setTemplateFormat("HTML")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                      templateFormat === "HTML"
                        ? "bg-indigo-500 text-white"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateFormat("TEXT")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                      templateFormat === "TEXT"
                        ? "bg-indigo-500 text-white"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Text
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
                {/* Select Predefined/Custom templates */}
                <div className="space-y-3 rounded-2xl border border-zinc-850 bg-zinc-950/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        Saved Templates
                      </h4>
                      <p className="mt-1 text-[11px] text-zinc-600">
                        {templates.length} available
                      </p>
                    </div>
                    <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[10px] font-bold text-zinc-500">
                      Library
                    </span>
                  </div>
                  <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                    {templates.length > 0 ? (
                      templates.map((tpl) => {
                        const attachmentCount = tpl.attachments?.length || 0;
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => {
                              setSelectedTemplateId(tpl.id);
                              setGeneratedTemplate(null);
                              setIsEditingSelectedTemplate(false);
                            }}
                            className={`w-full p-3.5 border rounded-xl cursor-pointer text-left transition-all ${
                              selectedTemplateId === tpl.id
                                ? "border-indigo-500 bg-indigo-500/10 text-white shadow-md shadow-indigo-950/20"
                                : "border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/40"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-bold truncate">
                                  {tpl.name}
                                </p>
                                <p className="text-xs text-zinc-500 truncate mt-1">
                                  {tpl.subject}
                                </p>
                              </div>
                              {selectedTemplateId === tpl.id && (
                                <CheckCircle className="h-4 w-4 flex-shrink-0 text-indigo-400" />
                              )}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-500">
                                {tpl.type || "CUSTOM"}
                              </span>
                              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
                                {attachmentCount} files
                              </span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center">
                        <FileText className="mx-auto h-6 w-6 text-zinc-600" />
                        <p className="mt-2 text-xs font-semibold text-zinc-500">
                          No saved templates yet.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Template Builder Panel */}
                <div className="space-y-4 rounded-2xl border border-zinc-850 bg-zinc-950/30 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        Create New Template
                      </h4>
                      <p className="mt-1 text-[11px] text-zinc-600">
                        Generate with AI or write a reusable template by hand.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                      <button
                        type="button"
                        onClick={() => switchTemplateBuilderMode("AI")}
                        className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                          templateBuilderMode === "AI"
                            ? "bg-purple-500 text-white"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        AI
                      </button>
                      <button
                        type="button"
                        onClick={() => switchTemplateBuilderMode("MANUAL")}
                        className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                          templateBuilderMode === "MANUAL"
                            ? "bg-emerald-500 text-white"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        <PenLine className="h-3.5 w-3.5" />
                        Manual
                      </button>
                    </div>
                  </div>

                  {templateBuilderMode === "AI" ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="block text-[10px] text-zinc-500 mb-1">
                          Goal
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Schedule a demo"
                          value={aiGoal}
                          onChange={(e) => setAiGoal(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-500 mb-1">
                          Audience
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Tech founders"
                          value={aiAudience}
                          onChange={(e) => setAiAudience(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-500 mb-1">
                          Tone
                        </label>
                        <select
                          value={aiTone}
                          onChange={(e) => setAiTone(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
                        >
                          <option>Professional</option>
                          <option>Casual</option>
                          <option>Direct</option>
                          <option>Enthusiastic</option>
                        </select>
                      </div>
                      <div className="md:row-span-2">
                        <label className="block text-[10px] text-zinc-500 mb-1">
                          Instructions
                        </label>
                        <textarea
                          rows={5}
                          placeholder="Mention a portfolio, offer, deadline, or qualification."
                          value={aiInstructions}
                          onChange={(e) => setAiInstructions(e.target.value)}
                          className="h-[116px] w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none resize-none"
                        />
                      </div>
                      <div className="md:col-span-2 overflow-hidden rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60">
                        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-500">
                              <Paperclip className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-zinc-300">
                                Reference PDF for AI
                              </p>
                              <p className="mt-1 text-[11px] text-zinc-600">
                                PDF only, up to 8 MB. Text is used only while
                                generating.
                              </p>
                            </div>
                          </div>
                          <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-[10px] font-bold text-zinc-300 hover:border-purple-500/40 hover:text-white">
                            <Upload className="h-3.5 w-3.5" />
                            {isReadingReferencePdf
                              ? "Reading..."
                              : aiReferencePdfName
                                ? "Replace PDF"
                                : "Upload PDF"}
                            <input
                              type="file"
                              accept="application/pdf,.pdf"
                              className="hidden"
                              disabled={isReadingReferencePdf}
                              onChange={async (e) => {
                                const input = e.currentTarget;
                                await handleReferencePdfChange(input.files);
                                input.value = "";
                              }}
                            />
                          </label>
                        </div>

                        {aiReferencePdfName && (
                          <div className="border-t border-zinc-850 bg-zinc-950 px-4 py-3">
                            <div className="flex flex-col gap-3 rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex min-w-0 items-start gap-3">
                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-300">
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                                    Uploaded Reference
                                  </p>
                                  <p className="mt-1 truncate text-xs font-semibold text-zinc-200">
                                    {aiReferencePdfName}
                                  </p>
                                  <p className="mt-0.5 text-[10px] text-zinc-500">
                                    {aiReferencePdfText.length.toLocaleString()}{" "}
                                    characters extracted
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={removeReferencePdf}
                                className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[10px] font-bold text-rose-300 hover:bg-rose-500/15"
                              >
                                <X className="h-3.5 w-3.5" />
                                Remove
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={isGeneratingTemplate || isReadingReferencePdf}
                        onClick={handleGenerateAiTemplate}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-tr from-purple-500 via-purple-600 to-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-500/10 hover:brightness-110 disabled:opacity-50 md:col-span-2"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {isGeneratingTemplate
                          ? "Generating..."
                          : `Generate ${templateFormat} Template`}
                      </button>
                      {(generationJobId ||
                        createGeneratedTemplateMutation.isPending) && (
                        <div className="md:col-span-2 rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-xs font-bold text-purple-300">
                                {createGeneratedTemplateMutation.isPending
                                  ? "Saving generated template"
                                  : `Generation status: ${generationJob?.status || "PENDING"}`}
                              </p>
                              <p className="mt-1 text-[11px] text-zinc-500">
                                Checking the API every 5 seconds.
                              </p>
                            </div>
                            {generationJobId && (
                              <span className="rounded-full border border-purple-500/20 bg-zinc-950 px-2.5 py-1 text-[10px] font-bold text-purple-300">
                                {generationJobId.slice(0, 8)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {renderStagedAttachmentsPanel()}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="block text-[10px] text-zinc-500 mb-1">
                          Template Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Founder intro"
                          value={manualTemplateName}
                          onChange={(e) => {
                            setManualTemplateName(e.target.value);
                            setGeneratedTemplate(null);
                            setSelectedTemplateId(null);
                          }}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-500 mb-1">
                          Subject
                        </label>
                        <input
                          type="text"
                          placeholder="Hi {{firstName}}, quick idea"
                          value={manualTemplateSubject}
                          onChange={(e) => {
                            setManualTemplateSubject(e.target.value);
                            setGeneratedTemplate(null);
                            setSelectedTemplateId(null);
                          }}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-zinc-500 mb-1">
                          {templateFormat === "HTML"
                            ? "HTML Body"
                            : "Text Body"}
                        </label>
                        <textarea
                          rows={8}
                          placeholder={
                            templateFormat === "HTML"
                              ? "<p>Hi {{firstName}},</p>"
                              : "Hi {{firstName}},"
                          }
                          value={manualTemplateBody}
                          onChange={(e) => {
                            setManualTemplateBody(e.target.value);
                            setGeneratedTemplate(null);
                            setSelectedTemplateId(null);
                          }}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none resize-none font-mono"
                        />
                      </div>
                      {renderStagedAttachmentsPanel("md:col-span-2")}
                      <button
                        type="button"
                        disabled={createManualTemplateMutation.isPending}
                        onClick={handleCreateManualTemplate}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/10 hover:brightness-110 disabled:opacity-50 md:col-span-2"
                      >
                        <PenLine className="h-3.5 w-3.5" />
                        {createManualTemplateMutation.isPending
                          ? "Saving..."
                          : `Save ${templateFormat} Template`}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {selectedTemplate && (
                <div className="rounded-2xl border border-zinc-850 bg-zinc-950/70 p-4">
                  <div className="flex flex-col gap-3 border-b border-zinc-850 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                        Saved Template
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {isEditingSelectedTemplate
                          ? "Edit the selected template and save it back to your library."
                          : "Update the selected template before using it in this campaign."}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {isEditingSelectedTemplate ? (
                        <>
                          <button
                            type="button"
                            onClick={cancelEditingSelectedTemplate}
                            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-[10px] font-bold text-zinc-400 hover:text-zinc-200"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={updateSelectedTemplateMutation.isPending}
                            onClick={handleUpdateSelectedTemplate}
                            className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-[10px] font-bold text-white hover:brightness-110 disabled:opacity-50"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            {updateSelectedTemplateMutation.isPending
                              ? "Saving..."
                              : "Save Changes"}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={startEditingSelectedTemplate}
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-[10px] font-bold text-zinc-300 hover:border-indigo-500/40 hover:text-white"
                        >
                          <PenLine className="h-3.5 w-3.5" />
                          Edit Template
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditingSelectedTemplate && (
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="block text-[10px] text-zinc-500 mb-1">
                          Template Name
                        </label>
                        <input
                          type="text"
                          value={editTemplateName}
                          onChange={(e) => setEditTemplateName(e.target.value)}
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-500 mb-1">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={editTemplateSubject}
                          onChange={(e) =>
                            setEditTemplateSubject(e.target.value)
                          }
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="md:col-span-2 flex w-fit rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (editTemplateFormat === "TEXT") {
                              setEditTemplateBody(textToHtml(editTemplateBody));
                            }
                            setEditTemplateFormat("HTML");
                          }}
                          className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                            editTemplateFormat === "HTML"
                              ? "bg-indigo-500 text-white"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          <Code2 className="h-3.5 w-3.5" />
                          HTML
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (editTemplateFormat === "HTML") {
                              setEditTemplateBody(htmlToText(editTemplateBody));
                            }
                            setEditTemplateFormat("TEXT");
                          }}
                          className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                            editTemplateFormat === "TEXT"
                              ? "bg-indigo-500 text-white"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Text
                        </button>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-zinc-500 mb-1">
                          {editTemplateFormat === "HTML"
                            ? "HTML Body"
                            : "Text Body"}
                        </label>
                        <textarea
                          rows={9}
                          value={editTemplateBody}
                          onChange={(e) => setEditTemplateBody(e.target.value)}
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-300 resize-none focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-zinc-850 bg-zinc-950 p-4 shadow-xl">
                <div className="flex flex-col gap-3 border-b border-zinc-850 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-400">
                      Email Preview
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Review the selected or newly created template before
                      choosing recipients.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {previewSource}
                    </span>
                    <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {previewHtml ? "HTML" : "Text"}
                    </span>
                  </div>
                </div>

                {previewTemplate ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-850 bg-white">
                    <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
                      <div className="flex flex-col gap-1 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                          From:{" "}
                          {settings?.awsSenderEmail ||
                            "Not configured — set one in Settings"}
                        </span>
                        <span>To: {"{{email}}"}</span>
                      </div>
                      <p className="mt-2 text-sm font-bold text-zinc-900">
                        {previewTemplate.subject || "No subject"}
                      </p>
                      <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white">
                        <div className="flex flex-col gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
                            <Paperclip className="h-4 w-4 text-zinc-500" />
                            {selectedTemplate
                              ? "Template Attachments"
                              : "Draft Attachments"}{" "}
                            ({previewAttachments.length})
                          </div>
                          {selectedTemplate && (
                            <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[10px] font-bold text-zinc-600 hover:bg-zinc-100">
                              <Upload className="h-3.5 w-3.5" />
                              Add Files
                              <input
                                type="file"
                                multiple
                                className="hidden"
                                onChange={async (e) => {
                                  const input = e.currentTarget;
                                  await addTemplateAttachmentFiles(
                                    selectedTemplate!,
                                    input.files,
                                  );
                                  input.value = "";
                                }}
                              />
                            </label>
                          )}
                        </div>

                        {previewAttachments.length > 0 ? (
                          <div className="space-y-2 p-3">
                            {previewAttachments.map((attachment) => (
                              <div
                                key={attachment.id}
                                className="grid grid-cols-1 gap-2 rounded-lg border border-zinc-100 bg-zinc-50 p-2 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"
                              >
                                {selectedTemplate ? (
                                  <input
                                    key={`${attachment.id}-${attachment.name}`}
                                    type="text"
                                    defaultValue={attachment.name}
                                    onBlur={(e) => {
                                      if (e.target.value !== attachment.name) {
                                        renameTemplateAttachment(
                                          selectedTemplate!,
                                          attachment.id,
                                          e.target.value,
                                        );
                                      }
                                    }}
                                    className="min-w-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-indigo-400"
                                  />
                                ) : (
                                  <span className="truncate text-xs font-semibold text-zinc-800">
                                    {attachment.name}
                                  </span>
                                )}
                                <span className="text-[10px] text-zinc-500">
                                  {formatAttachmentSize(attachment.size)}
                                </span>
                                {selectedTemplate && (
                                  <label className="flex cursor-pointer items-center justify-center rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-zinc-600 hover:bg-zinc-100">
                                    Replace
                                    <input
                                      type="file"
                                      className="hidden"
                                      onChange={async (e) => {
                                        const input = e.currentTarget;
                                        await replaceTemplateAttachment(
                                          selectedTemplate!,
                                          attachment.id,
                                          input.files,
                                        );
                                        input.value = "";
                                      }}
                                    />
                                  </label>
                                )}
                                {selectedTemplate && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeTemplateAttachment(
                                        selectedTemplate!,
                                        attachment.id,
                                      )
                                    }
                                    className="flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-rose-500 hover:bg-rose-50"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3">
                            <p className="text-[11px] text-zinc-500">
                              No attachments on this template.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    {previewHtml ? (
                      <iframe
                        title="HTML email preview"
                        sandbox=""
                        srcDoc={previewSrcDoc}
                        className="h-80 w-full bg-white"
                      />
                    ) : (
                      <div className="h-80 overflow-y-auto whitespace-pre-wrap bg-white p-5 font-mono text-sm leading-6 text-zinc-800">
                        {previewText || "No preview body yet."}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 flex h-64 items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 text-center">
                    <div>
                      <Mail className="mx-auto h-8 w-8 text-zinc-600" />
                      <p className="mt-3 text-sm font-bold text-zinc-400">
                        No template selected
                      </p>
                      <p className="mt-1 text-xs text-zinc-600">
                        Select a saved template, generate one with AI, or write
                        one manually.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-6 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="px-4 py-2 bg-zinc-950 border border-zinc-850 text-xs font-semibold text-zinc-400 hover:text-zinc-200 rounded-xl"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedTemplateId) {
                      showAlert(
                        "Please choose or create an email template before moving to contacts.",
                        "error",
                      );
                      return;
                    }
                    setWizardStep(3);
                  }}
                  className="flex items-center gap-1 px-5 py-2 bg-gradient-to-tr from-indigo-500 to-purple-600 text-xs font-bold text-white rounded-xl"
                >
                  Select Contacts <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Contacts Selection */}
          {wizardStep === 3 && (
            <div className="space-y-4 py-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Recipient List Selection
                  </h4>
                  <label className="mt-3 block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      <Folder className="h-3 w-3" />
                      Contact Directory
                    </span>
                    <select
                      value={selectedContactDirectoryId}
                      onChange={(e) =>
                        handleContactDirectoryChange(e.target.value)
                      }
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 sm:max-w-xs"
                    >
                      <option value="all">
                        All Contacts ({contacts.length})
                      </option>
                      <option value="uncategorized">
                        Unassigned (
                        {
                          contacts.filter((contact) => !contact.directoryId)
                            .length
                        }
                        )
                      </option>
                      {contactDirectories.map((directory) => (
                        <option key={directory.id} value={directory.id}>
                          {directory.name} (
                          {contacts.filter(
                            (contact) => contact.directoryId === directory.id,
                          ).length ||
                            directory.contactCount ||
                            0}
                          )
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="mt-2 text-[11px] text-zinc-600">
                    {directoryFilteredContacts.length} contacts in this
                    directory, {selectedContactsInDirectory.length} selected.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={selectAllContacts}
                  disabled={directoryFilteredContacts.length === 0}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold disabled:text-zinc-700"
                >
                  {directoryFilteredContacts.length > 0 &&
                  selectedContactsInDirectory.length ===
                    directoryFilteredContacts.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>

              <div className="border border-zinc-850 rounded-xl bg-zinc-950/40 divide-y divide-zinc-850 max-h-[300px] overflow-y-auto">
                {directoryFilteredContacts.length > 0 ? (
                  directoryFilteredContacts.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => toggleContactSelection(c.id)}
                      className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-900/40 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold text-zinc-200">
                          {c.firstName} {c.lastName}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {c.email} • {c.company || "No Company"}
                        </p>
                      </div>
                      <div
                        className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                          selectedContactIds.includes(c.id)
                            ? "border-indigo-500 bg-indigo-500 text-white"
                            : "border-zinc-800 bg-zinc-950"
                        }`}
                      >
                        {selectedContactIds.includes(c.id) && (
                          <CheckSquare className="h-3.5 w-3.5" />
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-500 text-xs">
                    {contacts.length === 0
                      ? "No contacts found. Please import contacts first."
                      : "No contacts found in this directory."}
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-6 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="px-4 py-2 bg-zinc-950 border border-zinc-850 text-xs font-semibold text-zinc-400 hover:text-zinc-200 rounded-xl"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleCreateCampaignSubmit}
                  disabled={createCampaignMutation.isPending}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-tr from-indigo-500 to-purple-600 text-xs font-bold text-white rounded-xl shadow-md disabled:opacity-50"
                >
                  Create and Save Campaign
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Contacts Modal in Campaign Details */}
      {isAddContactsOpen && selectedCampaignId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
              <h3 className="text-lg font-bold text-white">
                Add Contacts to Campaign
              </h3>
              <button
                onClick={() => {
                  setIsAddContactsOpen(false);
                  setAddContactsDirectoryId("all");
                  setAddSelectedContactIds([]);
                }}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  <Folder className="h-3 w-3" />
                  Contact Directory
                </span>
                <select
                  value={addContactsDirectoryId}
                  onChange={(e) =>
                    handleAddContactsDirectoryChange(e.target.value)
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Contacts ({contacts.length})</option>
                  <option value="uncategorized">
                    Unassigned (
                    {contacts.filter((contact) => !contact.directoryId).length})
                  </option>
                  {contactDirectories.map((directory) => (
                    <option key={directory.id} value={directory.id}>
                      {directory.name} (
                      {contacts.filter(
                        (contact) => contact.directoryId === directory.id,
                      ).length ||
                        directory.contactCount ||
                        0}
                      )
                    </option>
                  ))}
                </select>
              </label>

              <input
                type="text"
                placeholder="Search contacts by name or email..."
                value={addContactsSearch}
                onChange={(e) => setAddContactsSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              />

              <div className="border border-zinc-850 rounded-xl bg-zinc-950/40 divide-y divide-zinc-850 max-h-[300px] overflow-y-auto">
                {availableAddContacts.length > 0 ? (
                  availableAddContacts.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => toggleAddContactSelection(c.id)}
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-900/40 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-semibold text-zinc-200">
                          {c.firstName} {c.lastName}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {c.email}
                        </p>
                      </div>
                      <div
                        className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center transition-all ${
                          addSelectedContactIds.includes(c.id)
                            ? "border-indigo-500 bg-indigo-500 text-white"
                            : "border-zinc-800 bg-zinc-950"
                        }`}
                      >
                        {addSelectedContactIds.includes(c.id) && (
                          <CheckSquare className="h-3 w-3" />
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-500 text-xs">
                    No available contacts found in this directory.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800/60">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddContactsOpen(false);
                    setAddContactsDirectoryId("all");
                    setAddSelectedContactIds([]);
                  }}
                  className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-zinc-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={addSelectedContactIds.length === 0}
                  onClick={() =>
                    addContactsMutation.mutate({
                      id: selectedCampaignId,
                      contactIds: addSelectedContactIds,
                    })
                  }
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
