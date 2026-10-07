'use client';

import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** Copies an address to the clipboard — a fallback for visitors without a mail client. */
export default function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
    } catch {
      // Clipboard can be blocked (insecure origin, permissions); the address stays visible to copy by hand.
    }
  };

  return (
    <button type="button" onClick={copy} className="sig-btn-ghost justify-center" aria-live="polite">
      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      {copied ? 'Copied' : 'Copy address'}
    </button>
  );
}
