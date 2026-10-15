"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  Code2,
  FileText,
  Mail,
  Paperclip,
  PenLine,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useOutreachStore } from "@/store/useOutreachStore";
import {
  formatBytes,
  getErrorMessage,
  htmlToText,
  MAX_REFERENCE_PDF_BYTES,
  MAX_TEMPLATE_ATTACHMENT_BYTES,
  MAX_TEMPLATE_ATTACHMENTS,
  MAX_TEMPLATE_ATTACHMENTS_TOTAL_BYTES,
  textToHtml,
} from "./shared";
import type {
  ReferencePdfResult,
  Template,
  TemplateAttachment,
  TemplateBuilderMode,
  TemplateFormat,
  TemplateGenerationJob,
  TemplateGenerationPayload,
  TemplateGenerationResult,
} from "./shared";

/**
 * The campaign's email: pick a saved template, generate one with AI or write
 * one by hand, manage its attachments and preview it.
 */
export default function TemplateWorkspace({
  selectedTemplateId,
  onSelect,
  senderEmail,
}: {
  selectedTemplateId: string | null;
  onSelect: (id: string | null) => void;
  senderEmail?: string;
}) {
  const queryClient = useQueryClient();
  const { showAlert } = useOutreachStore();
  const setSelectedTemplateId = onSelect;

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

  // Fetch templates for selection
  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["templates"],
    queryFn: () => api.templates.list() as Promise<Template[]>,
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
      queryClient.invalidateQueries({ queryKey: ["email-campaign"] });
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

  const formatAttachmentSize = (size: number) => {
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    if (size >= 1024) return `${Math.round(size / 1024)} KB`;
    return `${size || 0} B`;
  };

  return (
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
          <div className="mail-canvas mt-4 overflow-hidden rounded-2xl border border-zinc-850 bg-white">
            <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
              <div className="flex flex-col gap-1 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  From:{" "}
                  {senderEmail ||
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
    </div>
  );
}
