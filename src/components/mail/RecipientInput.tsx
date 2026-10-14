"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { useDebouncedValue } from "@/lib/pagination";
import { EMAIL_PATTERN } from "./mail-utils";

type ContactSuggestion = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  company?: string;
};

/** Takes "Jane <jane@acme.com>", "jane@acme.com" or a pasted list. */
function splitAddresses(raw: string) {
  return raw
    .split(/[,;\n]+/)
    .map((entry) => {
      const match = /<([^<>]+)>/.exec(entry);
      return (match ? match[1] : entry).trim().toLowerCase();
    })
    .filter(Boolean);
}

/**
 * To/Cc/Bcc entry: typed addresses become chips on Enter, comma, Tab or
 * blur, and matching contacts are suggested as you type.
 */
export default function RecipientInput({
  label,
  values,
  onChange,
  autoFocus,
  trailing,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  autoFocus?: boolean;
  trailing?: React.ReactNode;
}) {
  const [draft, setDraft] = useState("");
  // What is typed right now, for the delayed blur handler.
  const draftRef = useRef("");
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const search = useDebouncedValue(draft.trim(), 200);

  const { data: suggestions } = useQuery({
    queryKey: ["contact-suggestions", search],
    queryFn: () => api.contacts.listPage({ page: 1, limit: 6, search }),
    enabled: focused && search.length >= 2,
    staleTime: 30_000,
  });
  const options = ((suggestions?.items || []) as ContactSuggestion[]).filter(
    (contact) => !values.includes(contact.email.toLowerCase()),
  );
  const showOptions = focused && search.length >= 2 && options.length > 0;

  const updateDraft = (next: string) => {
    draftRef.current = next;
    setDraft(next);
  };

  const commit = (raw: string) => {
    const entries = splitAddresses(raw);
    if (entries.length === 0) return;
    onChange(Array.from(new Set([...values, ...entries])));
    updateDraft("");
    setHighlight(0);
  };

  const pick = (contact: ContactSuggestion) => commit(contact.email);

  return (
    <div className="relative flex items-start gap-2 border-b border-zinc-850 px-4 py-1.5">
      <span className="mt-1.5 w-8 shrink-0 text-xs text-zinc-500">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {values.map((address) => (
          <span
            key={address}
            className={`flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
              EMAIL_PATTERN.test(address)
                ? "bg-zinc-850 text-zinc-200"
                : "bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/40"
            }`}
          >
            <span className="truncate">{address}</span>
            <button
              type="button"
              aria-label={`Remove ${address}`}
              onClick={() => onChange(values.filter((value) => value !== address))}
              className="text-zinc-500 hover:text-rose-300"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          autoFocus={autoFocus}
          aria-label={label}
          onChange={(event) => {
            updateDraft(event.target.value);
            setHighlight(0);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            // Leave time for a click on a suggestion to land first.
            window.setTimeout(() => {
              setFocused(false);
              commit(draftRef.current);
            }, 150);
          }}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text");
            if (/[,;\n]/.test(text)) {
              event.preventDefault();
              commit(text);
            }
          }}
          onKeyDown={(event) => {
            if (showOptions && event.key === "ArrowDown") {
              event.preventDefault();
              setHighlight((index) => Math.min(index + 1, options.length - 1));
            } else if (showOptions && event.key === "ArrowUp") {
              event.preventDefault();
              setHighlight((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" || event.key === "," || event.key === ";" || (event.key === "Tab" && draft.trim())) {
              event.preventDefault();
              if (showOptions && options[highlight]) pick(options[highlight]);
              else commit(draft);
            } else if (event.key === "Backspace" && !draft && values.length > 0) {
              onChange(values.slice(0, -1));
            }
          }}
          className="min-w-32 flex-1 bg-transparent py-1 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
        />
      </div>
      {trailing}

      {showOptions && (
        <ul className="absolute left-12 right-4 top-full z-30 mt-1 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
          {options.map((contact, index) => (
            <li key={contact.id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(contact)}
                className={`flex w-full flex-col px-3 py-2 text-left ${
                  index === highlight ? "bg-zinc-800" : "hover:bg-zinc-850"
                }`}
              >
                <span className="text-sm text-zinc-100">
                  {`${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.email}
                </span>
                <span className="text-xs text-zinc-500">
                  {contact.email}
                  {contact.company ? ` · ${contact.company}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
