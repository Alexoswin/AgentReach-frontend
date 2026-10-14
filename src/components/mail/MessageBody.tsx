"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { api } from "@/lib/api";
import type { MailAttachment } from "@/lib/api";

const BASE_STYLE =
  "body{margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111827;background:#ffffff;overflow-wrap:anywhere}" +
  "img{max-width:100%;height:auto}blockquote{margin:0 0 0 .8ex;border-left:1px solid #ccc;padding-left:1ex}pre{white-space:pre-wrap}a{color:#2563eb}";

/**
 * The email as its own document, with no script allowed to run. Images
 * inside the email (cid:) come from the mailbox; remote images load only
 * when allowed, so a sender's tracking pixel does not fire on open.
 */
function emailDocument(html: string, attachments: MailAttachment[], remoteImages: boolean) {
  let body = html;
  for (const attachment of attachments) {
    if (!attachment.contentId) continue;
    const cid = attachment.contentId.replace(/[<>]/g, "");
    body = body.split(`cid:${cid}`).join(api.mail.inlineImageUrl(attachment.id));
  }
  const imageSources = remoteImages ? "* data: blob:" : "'self' data: blob:";
  const policy = `default-src 'none'; img-src ${imageSources}; style-src 'unsafe-inline'${remoteImages ? " *" : ""}; font-src data:${remoteImages ? " *" : ""}`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><base target="_blank"><style>${BASE_STYLE}</style></head><body>${body}</body></html>`;
}

function hasRemoteImages(html: string) {
  return /<img[^>]+src=["']?https?:/i.test(html) || /url\(\s*['"]?https?:/i.test(html);
}

export default function MessageBody({
  html,
  text,
  attachments = [],
  blockRemoteImages = false,
}: {
  html: string;
  text: string;
  attachments?: MailAttachment[];
  blockRemoteImages?: boolean;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [height, setHeight] = useState(80);
  const [showImages, setShowImages] = useState(false);
  const remoteImages = !blockRemoteImages || showImages;
  const imagesHidden = !remoteImages && hasRemoteImages(html);
  const srcDoc = useMemo(
    () => emailDocument(html, attachments, remoteImages),
    [html, attachments, remoteImages],
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  const measure = () => {
    const doc = frameRef.current?.contentDocument;
    if (!doc?.body) return;
    const fit = () => setHeight(Math.min(Math.max(doc.documentElement.scrollHeight, 40), 20000));
    fit();
    observerRef.current?.disconnect();
    observerRef.current = new ResizeObserver(fit);
    observerRef.current.observe(doc.body);
  };

  if (!html.trim()) {
    return (
      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-200">
        {text || <span className="text-zinc-500">(No message body)</span>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {imagesHidden && (
        <button
          type="button"
          onClick={() => setShowImages(true)}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200"
        >
          <ImageOff className="h-3.5 w-3.5" />
          Images are hidden to protect your privacy. Show images
        </button>
      )}
      <iframe
        ref={frameRef}
        title="Email content"
        // No scripts. Same origin only so the frame can be measured.
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        srcDoc={srcDoc}
        onLoad={measure}
        style={{ height }}
        className="mail-canvas block w-full rounded-xl border border-zinc-850 bg-white"
      />
    </div>
  );
}
