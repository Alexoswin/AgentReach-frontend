"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { LooseApiResponse } from "@/lib/api";
import { useOutreachStore } from "@/store/useOutreachStore";
import { MissingCredentials } from "@/components/MissingCredentials";
import { useEscapeKey } from "@/lib/useEscapeKey";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CircleHelp,
  ExternalLink,
  Loader2,
  Mail,
  Pause,
  Phone,
  Play,
  Plus,
  Radar,
  Telescope,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

type Profile = {
  summary: string;
  industries: string[];
  keywords: string[];
  companySize: { min?: number; max?: number };
  locations: string[];
  jobTitles: string[];
  signals: string[];
  exclusions: string[];
  exampleDomains: string[];
};

type Search = {
  id: string;
  description: string;
  status: string;
  stage: string;
  counts: Record<string, number>;
  note?: string;
  error?: string;
  maxCompanies: number;
  peoplePerCompany: number;
  createdAt: string;
  profile: Profile;
  mode?: "icp" | "companies";
  targets?: string[];
};

type Criterion = {
  key: string;
  label: string;
  verdict: "yes" | "no" | "unknown";
  evidence: string;
  url: string;
};

type CompanyContact = {
  value: string;
  label: string;
  url: string;
  type?: string;
};

type Company = {
  id: string;
  name: string;
  domain: string;
  summary?: string;
  criteria: Criterion[];
  score: number;
  status: string;
  reason?: string;
  emailPattern?: string;
  emails?: CompanyContact[];
  phones?: CompanyContact[];
  linkedinUrl?: string;
};

type Person = {
  id: string;
  companyId: string;
  companyName: string;
  domain: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  phoneType?: string;
  linkedinUrl?: string;
  sourceUrl?: string;
  score: number;
  reasons: string[];
  status: string;
};

type Estimate = { companies: number; costUsd: { min: number; max: number } };
type PeopleFilter =
  "ready" | "needs_email" | "added" | "duplicate" | "dismissed";
type CompanyFilter = "qualified" | "rejected" | "unreachable";

const SIGNAL_OPTIONS = ["hiring", "funding", "expansion", "product launch"];
const STATUS_LABELS: Record<string, string> = {
  ready: "Ready to run",
  running: "Running",
  paused: "Paused",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};
const STATUS_STYLES: Record<string, string> = {
  ready: "bg-zinc-700/40 text-zinc-300",
  running: "bg-indigo-500/10 text-indigo-300",
  paused: "bg-amber-500/10 text-amber-400",
  completed: "bg-emerald-500/10 text-emerald-400",
  failed: "bg-rose-500/10 text-rose-400",
  cancelled: "bg-zinc-700/40 text-zinc-400",
};
const INPUT_CLASS =
  "w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-indigo-500/50";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const splitList = (text: string) =>
  text
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
const personName = (person: Person) => `${person.firstName} ${person.lastName}`;
const formatPattern = (pattern: string, domain: string) =>
  `${pattern}@${domain}`;
const PHONE_LABELS: Record<string, string> = {
  mobile: "Mobile",
  landline: "Landline",
  toll_free: "Toll-free",
  main: "Main line",
  whatsapp: "WhatsApp",
};
const phoneLabel = (phone: { type?: string; label?: string }) =>
  [phone.label, phone.type === "phone" ? "" : phone.type]
    .filter(Boolean)
    .map((key) => PHONE_LABELS[key as string] || (key as string))
    .map((text) => text.charAt(0).toUpperCase() + text.slice(1))
    .join(" · ");

function scoreStyle(score: number) {
  if (score >= 80) return "bg-emerald-500/10 text-emerald-400";
  if (score >= 60) return "bg-amber-500/10 text-amber-400";
  return "bg-zinc-700/40 text-zinc-400";
}

function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const next = draft.trim();
    if (next && !values.includes(next)) onChange([...values, next]);
    setDraft("");
  };
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 p-2">
        {values.map((value) => (
          <span
            key={value}
            className="flex items-center gap-1 rounded-lg bg-indigo-500/10 px-2 py-1 text-xs text-indigo-200"
          >
            {value}
            <button
              type="button"
              aria-label={`Remove ${value}`}
              onClick={() => onChange(values.filter((item) => item !== value))}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              add();
            }
          }}
          onBlur={add}
          placeholder={values.length ? "" : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm text-zinc-200 outline-none"
        />
      </div>
    </div>
  );
}

function NewSearchModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { showAlert } = useOutreachStore();
  const [kind, setKind] = useState<"icp" | "companies">("icp");
  const [companiesText, setCompaniesText] = useState("");
  const [lookupTitles, setLookupTitles] = useState<string[]>([]);
  const [lookupPeople, setLookupPeople] = useState(5);
  const [step, setStep] = useState<"describe" | "review">("describe");
  const [description, setDescription] = useState("");
  const [examples, setExamples] = useState("");
  const [maxCompanies, setMaxCompanies] = useState(25);
  const [peoplePerCompany, setPeoplePerCompany] = useState(2);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);

  useEscapeKey(true, onClose);

  const profileMutation = useMutation({
    mutationFn: () =>
      api.prospects.buildProfile({
        description: description.trim(),
        exampleDomains: splitList(examples),
        maxCompanies,
      }),
    onSuccess: (res: LooseApiResponse) => {
      setProfile(res.profile);
      setEstimate(res.estimate);
      setStep("review");
    },
    onError: (err: Error) =>
      showAlert(err.message || "Could not build the profile.", "error"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.prospects.createSearch({
        description: description.trim(),
        profile: { ...profile },
        maxCompanies,
        peoplePerCompany,
      }),
    onSuccess: (search: LooseApiResponse) => onCreated(search.id),
    onError: (err: Error) =>
      showAlert(err.message || "Could not create the search.", "error"),
  });

  const lookupMutation = useMutation({
    mutationFn: () =>
      api.prospects.createSearch({
        mode: "companies",
        companies: splitList(companiesText),
        profile: { jobTitles: lookupTitles },
        peoplePerCompany: lookupPeople,
      }),
    onSuccess: (search: LooseApiResponse) => onCreated(search.id),
    onError: (err: Error) =>
      showAlert(err.message || "Could not create the search.", "error"),
  });

  const patch = (change: Partial<Profile>) =>
    setProfile((current) => (current ? { ...current, ...change } : current));
  const sizeValue = (value?: number) => (value === undefined ? "" : value);
  const parseSize = (text: string) => {
    const value = Number(text);
    return text && Number.isFinite(value) && value > 0
      ? Math.round(value)
      : undefined;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New prospect search"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <Telescope className="h-5 w-5 text-indigo-400" />
            {kind === "companies"
              ? "Which companies?"
              : step === "describe"
                ? "Who do you want to reach?"
                : "Review the profile"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-500 hover:text-zinc-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
          {(
            [
              ["icp", "Find matching companies"],
              ["companies", "Contacts at specific companies"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                kind === value
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {kind === "companies" && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
                Companies (one per line, up to 20)
              </label>
              <textarea
                value={companiesText}
                onChange={(event) => setCompaniesText(event.target.value)}
                rows={5}
                placeholder={"acme.com\nglobex.io\nInitech"}
                className={INPUT_CLASS}
              />
              <p className="mt-1.5 text-[11px] text-zinc-500">
                Websites are the most reliable. A company name works too, but we
                have to look up its website first.
              </p>
            </div>
            <TagInput
              label="Roles you care about (optional)"
              values={lookupTitles}
              onChange={setLookupTitles}
              placeholder="Head of HR, CTO"
            />
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
                People per company
              </label>
              <select
                value={lookupPeople}
                onChange={(event) =>
                  setLookupPeople(Number(event.target.value))
                }
                className={INPUT_CLASS}
              >
                {[3, 5, 10, 20].map((count) => (
                  <option key={count} value={count}>
                    Up to {count}
                  </option>
                ))}
              </select>
            </div>
            <p className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-[11px] leading-5 text-zinc-400">
              We read each company&apos;s public team, leadership and contact
              pages. People are listed when they are named there, and an email,
              phone number or LinkedIn profile is only filled in when the site
              lists it with that person.
            </p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => lookupMutation.mutate()}
                disabled={
                  splitList(companiesText).length === 0 ||
                  lookupMutation.isPending
                }
                className="flex items-center gap-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:brightness-110 disabled:opacity-60"
              >
                {lookupMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                Find contacts
              </button>
            </div>
          </div>
        )}

        {kind === "icp" && step === "describe" && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
                Describe your ideal customer
              </label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="HR heads at Indian IT services companies with 200–1,000 employees that are hiring fast"
                className={INPUT_CLASS}
              />
              <p className="mt-1.5 text-[11px] text-zinc-500">
                Mention industry, company size, location, who to contact and
                what makes a company a good fit right now.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
                Example customers (optional, up to 3 websites)
              </label>
              <input
                value={examples}
                onChange={(event) => setExamples(event.target.value)}
                placeholder="acme.com, globex.io"
                className={INPUT_CLASS}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
                  Companies to find
                </label>
                <select
                  value={maxCompanies}
                  onChange={(event) =>
                    setMaxCompanies(Number(event.target.value))
                  }
                  className={INPUT_CLASS}
                >
                  {[10, 25, 50, 100].map((count) => (
                    <option key={count} value={count}>
                      Up to {count}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
                  People per company
                </label>
                <select
                  value={peoplePerCompany}
                  onChange={(event) =>
                    setPeoplePerCompany(Number(event.target.value))
                  }
                  className={INPUT_CLASS}
                >
                  {[1, 2, 3, 5].map((count) => (
                    <option key={count} value={count}>
                      Up to {count}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => profileMutation.mutate()}
                disabled={
                  description.trim().length < 10 || profileMutation.isPending
                }
                className="flex items-center gap-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:brightness-110 disabled:opacity-60"
              >
                {profileMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
                Build profile
              </button>
            </div>
          </div>
        )}

        {kind === "icp" && step === "review" && profile && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
                Summary
              </label>
              <input
                value={profile.summary}
                onChange={(event) => patch({ summary: event.target.value })}
                className={INPUT_CLASS}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TagInput
                label="Industries"
                values={profile.industries}
                onChange={(industries) => patch({ industries })}
                placeholder="IT services"
              />
              <TagInput
                label="Locations"
                values={profile.locations}
                onChange={(locations) => patch({ locations })}
                placeholder="India"
              />
              <TagInput
                label="People to contact (job titles)"
                values={profile.jobTitles}
                onChange={(jobTitles) => patch({ jobTitles })}
                placeholder="Head of HR"
              />
              <TagInput
                label="Keywords on their website"
                values={profile.keywords}
                onChange={(keywords) => patch({ keywords })}
                placeholder="digital transformation"
              />
              <TagInput
                label="Exclude"
                values={profile.exclusions}
                onChange={(exclusions) => patch({ exclusions })}
                placeholder="Competitor name or industry"
              />
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
                  Company size (employees)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={sizeValue(profile.companySize.min)}
                    onChange={(event) =>
                      patch({
                        companySize: {
                          ...profile.companySize,
                          min: parseSize(event.target.value),
                        },
                      })
                    }
                    placeholder="Min"
                    className={INPUT_CLASS}
                  />
                  <span className="text-zinc-600">–</span>
                  <input
                    type="number"
                    min={1}
                    value={sizeValue(profile.companySize.max)}
                    onChange={(event) =>
                      patch({
                        companySize: {
                          ...profile.companySize,
                          max: parseSize(event.target.value),
                        },
                      })
                    }
                    placeholder="Max"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-zinc-400">
                Buying signals that make a company a better fit
              </p>
              <div className="flex flex-wrap gap-2">
                {SIGNAL_OPTIONS.map((signal) => {
                  const active = profile.signals.includes(signal);
                  return (
                    <button
                      key={signal}
                      type="button"
                      onClick={() =>
                        patch({
                          signals: active
                            ? profile.signals.filter((item) => item !== signal)
                            : [...profile.signals, signal],
                        })
                      }
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-200"
                          : "border-zinc-800 text-zinc-400 hover:bg-zinc-900"
                      }`}
                    >
                      {signal}
                    </button>
                  );
                })}
              </div>
            </div>

            {estimate && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-xs leading-5 text-zinc-400">
                <p className="font-semibold text-zinc-200">
                  Estimated Gemini cost: ${estimate.costUsd.min.toFixed(2)}–$
                  {estimate.costUsd.max.toFixed(2)} for up to{" "}
                  {estimate.companies} companies
                </p>
                <p className="mt-1">
                  Companies are suggested by Gemini and then checked against
                  their own public website. Work emails, phone numbers and
                  LinkedIn profiles are only kept when they are published on
                  that website, and every match shows the page it came from.
                </p>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button
                onClick={() => setStep("describe")}
                className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-900"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:brightness-110 disabled:opacity-60"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                Create and run
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AddToContactsModal({
  ids,
  onClose,
  onDone,
}: {
  ids: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { showAlert } = useOutreachStore();
  const [directoryId, setDirectoryId] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  useEscapeKey(true, onClose);

  const { data: directories } = useQuery({
    queryKey: ["contact-directories"],
    queryFn: api.contacts.directories.list,
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.prospects.addToContacts({
        ids,
        directoryId: directoryId || undefined,
        duplicateStrategy: overwrite ? "OVERWRITE" : "SKIP",
      }),
    onSuccess: (res: LooseApiResponse) => {
      showAlert(
        `${res.added} added, ${res.duplicates} already in contacts, ${res.skipped.length} skipped.`,
        "success",
        "Contacts updated",
      );
      onDone();
    },
    onError: (err: Error) =>
      showAlert(err.message || "Could not add contacts.", "error"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add to contacts"
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <UserPlus className="h-5 w-5 text-indigo-400" />
            Add {ids.length} to contacts
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-500 hover:text-zinc-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
              Contact list
            </label>
            <select
              value={directoryId}
              onChange={(event) => setDirectoryId(event.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">No list</option>
              {(Array.isArray(directories) ? directories : []).map(
                (directory: LooseApiResponse) => (
                  <option key={directory.id} value={directory.id}>
                    {directory.name}
                  </option>
                ),
              )}
            </select>
          </div>
          <label className="flex items-center gap-3 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(event) => setOverwrite(event.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-indigo-500"
            />
            Update people who are already in my contacts
          </label>
          <p className="text-[11px] leading-5 text-zinc-500">
            Each contact keeps its match score and the page it was found on. You
            are responsible for having a lawful reason to contact them; see the{" "}
            <Link href="/compliance" className="text-indigo-400 underline">
              compliance guide
            </Link>
            .
          </p>
          <div className="flex justify-end">
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:brightness-110 disabled:opacity-60"
            >
              {mutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              Add to contacts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompanyCard({
  company,
  onWatch,
  watching,
  lookup,
}: {
  company: Company;
  onWatch: (id: string) => void;
  watching: boolean;
  lookup: boolean;
}) {
  const verdictIcon = {
    yes: <Check className="h-3.5 w-3.5 text-emerald-400" />,
    no: <X className="h-3.5 w-3.5 text-rose-400" />,
    unknown: <CircleHelp className="h-3.5 w-3.5 text-zinc-500" />,
  };
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 font-bold text-white">
            <Building2 className="h-4 w-4 text-indigo-400" />
            {company.name}
          </h4>
          <a
            href={`https://${company.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
          >
            {company.domain} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        {!lookup &&
        (company.status === "qualified" || company.status === "rejected") ? (
          <span
            className={`rounded-md px-2 py-1 text-xs font-bold ${scoreStyle(company.score)}`}
          >
            {company.score}% match
          </span>
        ) : null}
      </div>
      {company.summary && (
        <p className="mt-3 text-sm text-zinc-400">{company.summary}</p>
      )}
      {company.reason && (
        <p className="mt-2 text-xs text-amber-400">{company.reason}</p>
      )}
      {company.emailPattern && (
        <p className="mt-2 text-xs text-zinc-400">
          Published emails here look like{" "}
          <span className="font-mono text-zinc-200">
            {formatPattern(company.emailPattern, company.domain)}
          </span>
          . Confirm an address before you use it.
        </p>
      )}
      {Boolean(
        company.phones?.length ||
          company.emails?.length ||
          company.linkedinUrl,
      ) && (
        <div className="mt-3 space-y-1.5 text-xs text-zinc-300">
          {company.phones?.map((phone) => (
            <p key={phone.value} className="flex flex-wrap items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-zinc-500" />
              <a href={`tel:${phone.value}`} className="hover:underline">
                {phone.value}
              </a>
              {phoneLabel(phone) && (
                <span className="text-zinc-500">{phoneLabel(phone)}</span>
              )}
              <a
                href={phone.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:underline"
              >
                source
              </a>
            </p>
          ))}
          {company.emails?.map((email) => (
            <p key={email.value} className="flex flex-wrap items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-zinc-500" />
              <a href={`mailto:${email.value}`} className="hover:underline">
                {email.value}
              </a>
              <a
                href={email.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:underline"
              >
                source
              </a>
            </p>
          ))}
          {company.linkedinUrl && (
            <a
              href={company.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-indigo-400 hover:underline"
            >
              LinkedIn page <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
      {company.criteria.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {company.criteria.map((criterion) => (
            <li
              key={criterion.key}
              className="flex items-start gap-2 text-xs text-zinc-300"
            >
              <span className="mt-0.5">{verdictIcon[criterion.verdict]}</span>
              <span>
                <span className="font-semibold">{criterion.label}</span>
                {criterion.evidence ? (
                  <>
                    {" "}
                    <span className="text-zinc-400">
                      “{criterion.evidence}”
                    </span>{" "}
                    {criterion.url && (
                      <a
                        href={criterion.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:underline"
                      >
                        source
                      </a>
                    )}
                  </>
                ) : (
                  <span className="text-zinc-500"> not found on the site</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {company.status === "qualified" && (
        <button
          onClick={() => onWatch(company.id)}
          disabled={watching}
          className="mt-4 flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-900 disabled:opacity-60"
        >
          <Radar className="h-3.5 w-3.5" /> Watch in Signals
        </button>
      )}
    </div>
  );
}

function PersonRow({
  person,
  selected,
  onToggle,
  onSaveEmail,
  onAction,
  busy,
  showMatch,
  pattern,
}: {
  person: Person;
  showMatch: boolean;
  pattern?: string;
  selected: boolean;
  onToggle: () => void;
  onSaveEmail: (email: string) => void;
  onAction: (action: "dismissed" | "restore") => void;
  busy: boolean;
}) {
  const [email, setEmail] = useState("");
  return (
    <tr className="border-t border-zinc-900 align-top text-xs text-zinc-300">
      <td className="px-3 py-3">
        {person.status === "ready" && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            aria-label={`Select ${personName(person)}`}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-indigo-500"
          />
        )}
      </td>
      <td className="px-3 py-3">
        <p className="font-semibold text-white">{personName(person)}</p>
        <p className="text-zinc-500">{person.jobTitle || "—"}</p>
        {person.linkedinUrl && (
          <a
            href={person.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-indigo-400 hover:underline"
          >
            LinkedIn <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </td>
      <td className="px-3 py-3">
        <p>{person.companyName}</p>
        <p className="text-zinc-500">{person.domain}</p>
      </td>
      <td className="px-3 py-3">
        {person.email ? (
          <p className="break-all">{person.email}</p>
        ) : person.status === "needs_email" ? (
          <div>
            <div className="flex items-center gap-1.5">
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={`name@${person.domain}`}
                className="w-44 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500/50"
              />
              <button
                onClick={() => onSaveEmail(email.trim())}
                disabled={!email.trim() || busy}
                className="rounded-lg border border-zinc-800 px-2 py-1.5 font-semibold hover:bg-zinc-900 disabled:opacity-50"
              >
                Save
              </button>
            </div>
            {pattern && (
              <p className="mt-1 text-[11px] text-zinc-500">
                Published emails at this company look like{" "}
                {formatPattern(pattern, person.domain)}
              </p>
            )}
          </div>
        ) : (
          <span className="text-zinc-500">—</span>
        )}
      </td>
      <td className="px-3 py-3">
        {person.phone ? (
          <>
            <a href={`tel:${person.phone}`} className="hover:underline">
              {person.phone}
            </a>
            {phoneLabel({ type: person.phoneType }) && (
              <p className="text-zinc-500">
                {phoneLabel({ type: person.phoneType })}
              </p>
            )}
          </>
        ) : (
          <span className="text-zinc-500">—</span>
        )}
      </td>
      {showMatch && (
        <td className="px-3 py-3">
          <span
            className={`rounded-md px-2 py-1 font-bold ${scoreStyle(person.score)}`}
          >
            {person.score}%
          </span>
        </td>
      )}
      <td className="px-3 py-3">
        {person.sourceUrl ? (
          <a
            href={person.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-indigo-400 hover:underline"
          >
            Page <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          "—"
        )}
      </td>
      <td className="px-3 py-3 text-right">
        {person.status === "dismissed" ? (
          <button
            onClick={() => onAction("restore")}
            disabled={busy}
            className="font-semibold text-indigo-400 hover:underline"
          >
            Restore
          </button>
        ) : person.status === "ready" || person.status === "needs_email" ? (
          <button
            onClick={() => onAction("dismissed")}
            disabled={busy}
            className="font-semibold text-zinc-500 hover:text-zinc-300"
          >
            Dismiss
          </button>
        ) : null}
      </td>
    </tr>
  );
}

export default function ProspectsPage() {
  const queryClient = useQueryClient();
  const { showAlert } = useOutreachStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [tab, setTab] = useState<"companies" | "people">("people");
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>("ready");
  const [companyFilter, setCompanyFilter] =
    useState<CompanyFilter>("qualified");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const stopRef = useRef(false);

  useEffect(() => {
    return () => {
      stopRef.current = true;
    };
  }, []);

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: api.settings.get,
  });

  const searchesQuery = useQuery({
    queryKey: ["prospect-searches"],
    queryFn: api.prospects.searches,
    refetchInterval: runningId ? 3000 : false,
  });
  const searches: Search[] = Array.isArray(searchesQuery.data)
    ? searchesQuery.data
    : [];
  const selected = searches.find((search) => search.id === selectedId) || null;
  const live = Boolean(selected) && runningId === selectedId;
  const lookup = selected?.mode === "companies";

  const companiesQuery = useQuery({
    queryKey: ["prospect-companies", selectedId],
    queryFn: () => api.prospects.companies(selectedId as string),
    enabled: Boolean(selectedId),
    refetchInterval: live ? 3000 : false,
  });
  const peopleQuery = useQuery({
    queryKey: ["prospect-people", selectedId],
    queryFn: () => api.prospects.people(selectedId as string),
    enabled: Boolean(selectedId),
    refetchInterval: live ? 3000 : false,
  });
  const companies = useMemo<Company[]>(
    () => (Array.isArray(companiesQuery.data) ? companiesQuery.data : []),
    [companiesQuery.data],
  );
  const people = useMemo<Person[]>(
    () => (Array.isArray(peopleQuery.data) ? peopleQuery.data : []),
    [peopleQuery.data],
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["prospect-searches"] });
    queryClient.invalidateQueries({ queryKey: ["prospect-companies"] });
    queryClient.invalidateQueries({ queryKey: ["prospect-people"] });
  };

  const drive = async (id: string) => {
    stopRef.current = false;
    setRunningId(id);
    let failures = 0;
    try {
      while (!stopRef.current) {
        try {
          const result = await api.prospects.run(id);
          failures = 0;
          refresh();
          if (result.done) {
            if (result.error) showAlert(result.error, "error", "Search failed");
            break;
          }
        } catch (error) {
          if (error instanceof ApiError && error.status === 409) {
            await sleep(3000);
            continue;
          }
          failures++;
          if (failures >= 3) throw error;
          await sleep(2000);
        }
      }
    } catch (error) {
      showAlert(
        error instanceof Error ? error.message : "The search stopped.",
        "error",
      );
    } finally {
      setRunningId(null);
      refresh();
    }
  };

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.prospects.cancel(id),
    onSuccess: () => {
      stopRef.current = true;
      refresh();
    },
    onError: (err: Error) =>
      showAlert(err.message || "Could not cancel.", "error"),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.prospects.remove(id),
    onSuccess: () => {
      setSelectedId(null);
      refresh();
    },
    onError: (err: Error) =>
      showAlert(err.message || "Could not delete.", "error"),
  });

  const watchMutation = useMutation({
    mutationFn: (id: string) => api.prospects.watchCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signal-watches"] });
      showAlert("Company added to your Signals watch list.", "success");
    },
    onError: (err: Error) =>
      showAlert(err.message || "Could not watch.", "error"),
  });

  const personMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { email?: string; action?: "dismissed" | "restore" };
    }) => api.prospects.updatePerson(id, data),
    onSuccess: refresh,
    onError: (err: Error) =>
      showAlert(err.message || "Could not update.", "error"),
  });

  const patternByCompany = useMemo(
    () =>
      new Map(
        companies
          .filter((company) => company.emailPattern)
          .map((company) => [company.id, company.emailPattern as string]),
      ),
    [companies],
  );

  const visiblePeople = useMemo(
    () => people.filter((person) => person.status === peopleFilter),
    [people, peopleFilter],
  );
  const visibleCompanies = useMemo(
    () => companies.filter((company) => company.status === companyFilter),
    [companies, companyFilter],
  );
  const peopleCount = (status: string) =>
    people.filter((person) => person.status === status).length;
  const companyCount = (status: string) =>
    companies.filter((company) => company.status === status).length;
  const selectedReady = visiblePeople.filter(
    (person) => person.status === "ready" && picked.has(person.id),
  );

  const togglePicked = (id: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (settings && !settings.geminiApiKey) {
    return (
      <MissingCredentials
        title="Gemini API key required"
        description="Prospect Finder uses your Gemini key to understand your ideal customer and read company websites. Add it in Settings."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-zinc-900 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white">
            <Telescope className="h-8 w-8 text-indigo-400" />
            Prospect Finder
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Find matching companies from a description, or get the contacts at
            companies you name. Every person comes from the company&apos;s own
            website, and only the people you approve are added to Contacts.
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" /> New search
        </button>
      </div>

      {!selected && (
        <div className="space-y-3">
          {searchesQuery.isLoading && (
            <p className="text-sm text-zinc-500">Loading searches…</p>
          )}
          {!searchesQuery.isLoading && searches.length === 0 && (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center">
              <Telescope className="mx-auto h-8 w-8 text-zinc-600" />
              <p className="mt-3 font-semibold text-zinc-200">
                No searches yet
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
                Start with a sentence about who you want to reach, for example
                “founders of seed-stage fintechs in Bengaluru”.
              </p>
            </div>
          )}
          {searches.map((search) => (
            <button
              key={search.id}
              onClick={() => {
                setSelectedId(search.id);
                setPicked(new Set());
              }}
              className="block w-full rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 text-left transition-colors hover:border-zinc-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-white">
                  {search.profile?.summary || search.description}
                </p>
                <span
                  className={`rounded-md px-2 py-1 text-xs font-semibold ${STATUS_STYLES[search.status] || ""}`}
                >
                  {STATUS_LABELS[search.status] || search.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {search.counts?.companies ?? 0} companies ·{" "}
                {search.counts?.qualified ?? 0} qualified ·{" "}
                {search.counts?.people ?? 0} people ·{" "}
                {search.counts?.withEmail ?? 0} with email ·{" "}
                {search.counts?.withPhone ?? 0} with phone ·{" "}
                {new Date(search.createdAt).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="space-y-5">
          <button
            onClick={() => setSelectedId(null)}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All searches
          </button>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-2xl">
                <p className="font-semibold text-white">
                  {selected.profile?.summary || selected.description}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {selected.description}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-md px-2 py-1 text-xs font-semibold ${STATUS_STYLES[live ? "running" : selected.status] || ""}`}
                >
                  {STATUS_LABELS[live ? "running" : selected.status] ||
                    selected.status}
                </span>
                {!live &&
                  ["ready", "paused", "failed", "running"].includes(
                    selected.status,
                  ) && (
                    <button
                      onClick={() => void drive(selected.id)}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-3 py-2 text-xs font-semibold text-white hover:brightness-110"
                    >
                      <Play className="h-3.5 w-3.5" />
                      {selected.status === "ready" ? "Run" : "Resume"}
                    </button>
                  )}
                {live && (
                  <button
                    onClick={() => cancelMutation.mutate(selected.id)}
                    className="flex items-center gap-2 rounded-xl border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-900"
                  >
                    <Pause className="h-3.5 w-3.5" /> Stop
                  </button>
                )}
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        "Delete this search and everything it found? Contacts you already added are kept.",
                      )
                    ) {
                      removeMutation.mutate(selected.id);
                    }
                  }}
                  aria-label="Delete search"
                  className="rounded-xl border border-zinc-800 p-2 text-zinc-500 hover:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
              {live && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>
                {selected.counts?.companies ?? 0}{" "}
                {lookup ? "companies" : "companies found"}
              </span>
              {!lookup && (
                <span>→ {selected.counts?.qualified ?? 0} qualified</span>
              )}
              <span>→ {selected.counts?.people ?? 0} people</span>
              <span>
                → {selected.counts?.withEmail ?? 0} with a published email
              </span>
              <span>· {selected.counts?.withPhone ?? 0} with a phone</span>
            </div>
            {selected.note && (
              <p className="mt-2 text-xs text-amber-400">{selected.note}</p>
            )}
            {selected.error && (
              <p className="mt-2 text-xs text-rose-400">{selected.error}</p>
            )}
            {selected.status === "completed" &&
              (selected.counts?.companies ?? 0) === 0 && (
                <p className="mt-2 text-xs text-zinc-400">
                  No companies were found. Try a broader description or fewer
                  exclusions.
                </p>
              )}
          </div>

          <div className="flex gap-2">
            {(["people", "companies"] as const).map((name) => (
              <button
                key={name}
                onClick={() => setTab(name)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold capitalize transition-colors ${
                  tab === name
                    ? "bg-indigo-500/10 text-indigo-200"
                    : "text-zinc-500 hover:bg-zinc-900"
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          {tab === "people" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["ready", "Ready to add"],
                      ["needs_email", "Needs email"],
                      ["added", "Added"],
                      ["duplicate", "Already a contact"],
                      ["dismissed", "Dismissed"],
                    ] as [PeopleFilter, string][]
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setPeopleFilter(value)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                        peopleFilter === value
                          ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-200"
                          : "border-zinc-800 text-zinc-400 hover:bg-zinc-900"
                      }`}
                    >
                      {label} ({peopleCount(value)})
                    </button>
                  ))}
                </div>
                {peopleFilter === "ready" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setPicked(
                          picked.size === visiblePeople.length
                            ? new Set()
                            : new Set(visiblePeople.map((person) => person.id)),
                        )
                      }
                      className="text-xs font-semibold text-zinc-400 hover:text-zinc-200"
                    >
                      {picked.size === visiblePeople.length && picked.size > 0
                        ? "Clear"
                        : "Select all"}
                    </button>
                    <button
                      onClick={() => setAdding(true)}
                      disabled={selectedReady.length === 0}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-3 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Add {selectedReady.length || ""} to contacts
                    </button>
                  </div>
                )}
              </div>

              {peopleFilter === "needs_email" && (
                <p className="text-xs text-zinc-500">
                  These people have no email published on their company website.
                  We never guess addresses. Add one you know is correct, and it
                  moves to Ready to add.
                </p>
              )}

              {visiblePeople.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
                  {live
                    ? "Searching… people appear here as companies are checked."
                    : "Nobody in this group yet."}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-zinc-800">
                  <table className="w-full min-w-220 text-left">
                    <thead className="text-[11px] uppercase tracking-wider text-zinc-500">
                      <tr>
                        <th className="w-10 px-3 py-2" />
                        <th className="px-3 py-2">Person</th>
                        <th className="px-3 py-2">Company</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Phone</th>
                        {!lookup && <th className="px-3 py-2">Match</th>}
                        <th className="px-3 py-2">Found on</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePeople.map((person) => (
                        <PersonRow
                          key={person.id}
                          person={person}
                          selected={picked.has(person.id)}
                          onToggle={() => togglePicked(person.id)}
                          busy={personMutation.isPending}
                          showMatch={!lookup}
                          pattern={patternByCompany.get(person.companyId)}
                          onSaveEmail={(email) =>
                            personMutation.mutate({
                              id: person.id,
                              data: { email },
                            })
                          }
                          onAction={(action) =>
                            personMutation.mutate({
                              id: person.id,
                              data: { action },
                            })
                          }
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "companies" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["qualified", lookup ? "Looked up" : "Qualified"],
                    ["rejected", "Rejected"],
                    ["unreachable", "Could not read"],
                  ] as [CompanyFilter, string][]
                )
                  .filter(([value]) => !(lookup && value === "rejected"))
                  .map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setCompanyFilter(value)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                        companyFilter === value
                          ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-200"
                          : "border-zinc-800 text-zinc-400 hover:bg-zinc-900"
                      }`}
                    >
                      {label} ({companyCount(value)})
                    </button>
                  ))}
              </div>
              {visibleCompanies.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
                  {live
                    ? "Searching… companies appear here as they are checked."
                    : "No companies in this group."}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {visibleCompanies.map((company) => (
                    <CompanyCard
                      key={company.id}
                      company={company}
                      watching={watchMutation.isPending}
                      lookup={lookup}
                      onWatch={(id) => watchMutation.mutate(id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showWizard && (
        <NewSearchModal
          onClose={() => setShowWizard(false)}
          onCreated={(id) => {
            setShowWizard(false);
            setSelectedId(id);
            setTab("people");
            setPicked(new Set());
            refresh();
            void drive(id);
          }}
        />
      )}

      {adding && selected && (
        <AddToContactsModal
          ids={selectedReady.map((person) => person.id)}
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            setPicked(new Set());
            refresh();
            queryClient.invalidateQueries({ queryKey: ["contacts"] });
          }}
        />
      )}
    </div>
  );
}
