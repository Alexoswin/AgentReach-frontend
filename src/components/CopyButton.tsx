'use client';

import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** Copies a value to the clipboard — e.g. an email address or UPI ID on the public pages. */
export default function CopyButton({
  value,
  label = 'Copy',
  className = 'sig-btn-ghost justify-center',
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard can be blocked (insecure origin, permissions); the value stays visible to copy by hand.
    }
  };

  return (
    <button type="button" onClick={copy} className={className} aria-live="polite">
      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      {copied ? 'Copied' : label}
    </button>
  );
}
