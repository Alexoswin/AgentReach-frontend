"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckSquare, Folder, Search, Square } from "lucide-react";
import type { Contact, ContactDirectory } from "./shared";

/**
 * Pick recipients from the contact list, a directory at a time, with search
 * and select-all. Contacts in `excludeIds` (already in the campaign) are hidden.
 */
export default function AudiencePicker({
  contacts,
  directories,
  selectedIds,
  onChange,
  excludeIds,
  maxHeight = "max-h-[360px]",
}: {
  contacts: Contact[];
  directories: ContactDirectory[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  excludeIds?: Set<string>;
  maxHeight?: string;
}) {
  const [directoryId, setDirectoryId] = useState("all");
  const [search, setSearch] = useState("");
  const selected = new Set(selectedIds);
  const term = search.trim().toLowerCase();

  const available = contacts.filter((contact) => !excludeIds?.has(contact.id));
  const inDirectory = available.filter((contact) =>
    directoryId === "all"
      ? true
      : directoryId === "uncategorized"
        ? !contact.directoryId
        : contact.directoryId === directoryId,
  );
  const visible = inDirectory.filter(
    (contact) =>
      !term ||
      `${contact.firstName} ${contact.lastName} ${contact.email} ${contact.company || ""}`
        .toLowerCase()
        .includes(term),
  );
  const allVisibleSelected = visible.length > 0 && visible.every((contact) => selected.has(contact.id));

  const toggle = (id: string) =>
    onChange(selected.has(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id]);

  const toggleAll = () => {
    if (allVisibleSelected) {
      const hide = new Set(visible.map((contact) => contact.id));
      onChange(selectedIds.filter((id) => !hide.has(id)));
    } else {
      onChange(Array.from(new Set([...selectedIds, ...visible.map((contact) => contact.id)])));
    }
  };

  const countIn = (id: string) =>
    available.filter((contact) =>
      id === "uncategorized" ? !contact.directoryId : contact.directoryId === id,
    ).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="block sm:w-64">
          <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <Folder className="h-3 w-3" />
            Contact list
          </span>
          <select
            value={directoryId}
            onChange={(event) => setDirectoryId(event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All contacts ({available.length})</option>
            <option value="uncategorized">Unassigned ({countIn("uncategorized")})</option>
            {directories.map((directory) => (
              <option key={directory.id} value={directory.id}>
                {directory.name} ({countIn(directory.id)})
              </option>
            ))}
          </select>
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email or company…"
            aria-label="Search contacts"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2 pl-8 pr-3 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-500">
        <span>
          {selectedIds.length} selected · {visible.length} shown
        </span>
        <button
          type="button"
          onClick={toggleAll}
          disabled={visible.length === 0}
          className="font-bold text-indigo-400 hover:text-indigo-300 disabled:text-zinc-700"
        >
          {allVisibleSelected ? "Deselect shown" : "Select all shown"}
        </button>
      </div>

      <div className={`${maxHeight} divide-y divide-zinc-850 overflow-y-auto rounded-xl border border-zinc-850 bg-zinc-950/40`}>
        {visible.length > 0 ? (
          visible.map((contact) => {
            const isSelected = selected.has(contact.id);
            return (
              <button
                key={contact.id}
                type="button"
                onClick={() => toggle(contact.id)}
                className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-zinc-900/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-200">
                    {contact.firstName} {contact.lastName}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {contact.email}
                    {contact.company ? ` · ${contact.company}` : ""}
                  </p>
                </div>
                {isSelected ? (
                  <CheckSquare className="h-4 w-4 shrink-0 text-indigo-400" />
                ) : (
                  <Square className="h-4 w-4 shrink-0 text-zinc-700" />
                )}
              </button>
            );
          })
        ) : (
          <div className="p-8 text-center text-xs text-zinc-500">
            {contacts.length === 0 ? (
              <>
                No contacts yet.{" "}
                <Link href="/contacts" className="font-semibold text-indigo-300 underline">
                  Import contacts
                </Link>{" "}
                to start a campaign.
              </>
            ) : (
              "No contacts match."
            )}
          </div>
        )}
      </div>
    </div>
  );
}
