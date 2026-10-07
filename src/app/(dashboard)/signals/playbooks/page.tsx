'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { LooseApiResponse } from '@/lib/api';
import { useOutreachStore } from '@/store/useOutreachStore';
import { useEscapeKey } from '@/lib/useEscapeKey';
import {
  Sparkles,
  ArrowLeft,
  Plus,
  Zap,
  Eye,
  Trash2,
  Check,
  X,
  Rss,
  Users,
  Mail,
  ShieldCheck,
} from 'lucide-react';

const SIGNAL_TYPES = [
  { id: 'funding', label: 'Funding round' },
  { id: 'hiring-surge', label: 'Hiring surge' },
  { id: 'company-news', label: 'Company news' },
  { id: 'product-launch', label: 'Product launch' },
  { id: 'job-change', label: 'Job change' },
  { id: 'website-change', label: 'Website change' },
];

export default function PlaybooksPage() {
  const queryClient = useQueryClient();
  const { showAlert } = useOutreachStore();
  const [showWizard, setShowWizard] = useState(false);

  const playbooksQuery = useQuery({ queryKey: ['playbooks'], queryFn: api.signals.playbooks.list });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['playbooks'] });

  const toggle = useMutation({
    mutationFn: (id: string) => api.signals.playbooks.toggle(id),
    onSuccess: invalidate,
    onError: (e: Error) => showAlert(e.message, 'error'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.signals.playbooks.delete(id),
    onSuccess: () => {
      invalidate();
      showAlert('Playbook deleted.', 'success');
    },
    onError: (e: Error) => showAlert(e.message, 'error'),
  });

  const playbooks: LooseApiResponse[] = playbooksQuery.data || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b border-zinc-900 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/signals"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to signals
          </Link>
          <h2 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white">
            <Sparkles className="h-8 w-8 text-indigo-400" />
            Playbooks
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Rules that turn a signal into outreach: when <em>this</em> happens for <em>these</em> contacts, send <em>that</em>.
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" /> New playbook
        </button>
      </div>

      {playbooksQuery.isError ? (
        <div className="rounded-2xl border border-rose-500/20 bg-zinc-900/20 px-4 py-16 text-center">
          <h3 className="text-base font-bold text-zinc-200">Could not load playbooks</h3>
          <p className="mt-1 text-sm text-zinc-500">Please try again in a moment.</p>
        </div>
      ) : playbooksQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-zinc-850 bg-zinc-900/40" />
          ))}
        </div>
      ) : playbooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 px-4 py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-zinc-500">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-zinc-200">No playbooks yet</h3>
          <p className="mt-1 max-w-md text-sm text-zinc-500">
            Create your first playbook to start auto-triggering outreach when signals fire.
          </p>
          <button
            onClick={() => setShowWizard(true)}
            className="mt-5 flex items-center gap-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" /> New playbook
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {playbooks.map((p) => (
            <div key={p.id} className="rounded-2xl border border-zinc-850 bg-zinc-900/40 p-5 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-white">{p.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(p.signalTypes || []).map((t: string) => (
                      <span key={t} className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400">
                        {SIGNAL_TYPES.find((s) => s.id === t)?.label || t}
                      </span>
                    ))}
                  </div>
                </div>
                <span
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    p.mode === 'auto'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}
                >
                  {p.mode === 'auto' ? <Zap className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {p.mode === 'auto' ? 'Auto-send' : 'Review'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> {p.cooldownDays}d cooldown
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {p.dailyCap}/day cap
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-zinc-850 pt-4">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    p.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-700/40 text-zinc-400'
                  }`}
                >
                  {p.active ? 'Active' : 'Paused'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggle.mutate(p.id)}
                    className="rounded-lg border border-zinc-800 px-3 py-1.5 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-950"
                  >
                    {p.active ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => remove.mutate(p.id)}
                    aria-label="Delete playbook"
                    title="Delete playbook"
                    className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 hover:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showWizard && (
        <PlaybookWizard
          onClose={() => setShowWizard(false)}
          onCreated={() => {
            setShowWizard(false);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

function PlaybookWizard({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { showAlert } = useOutreachStore();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [signalTypes, setSignalTypes] = useState<string[]>([]);
  const [directoryIds, setDirectoryIds] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [mode, setMode] = useState<'auto' | 'review'>('review');
  const [cooldownDays, setCooldownDays] = useState(30);
  const [dailyCap, setDailyCap] = useState(50);

  const directoriesQuery = useQuery({ queryKey: ['contact-directories'], queryFn: api.contacts.directories.list });
  const templatesQuery = useQuery({ queryKey: ['templates'], queryFn: api.templates.list });

  const directories: LooseApiResponse[] = directoriesQuery.data || [];
  const templates: LooseApiResponse[] = templatesQuery.data || [];

  const create = useMutation({
    mutationFn: () =>
      api.signals.playbooks.create({
        name,
        signalTypes,
        directoryIds,
        templateId,
        mode,
        cooldownDays,
        dailyCap,
        active: true,
      }),
    onSuccess: () => {
      showAlert('Playbook created.', 'success');
      onCreated();
    },
    onError: (e: Error) => showAlert(e.message || 'Could not create playbook.', 'error'),
  });

  const toggleType = (id: string) =>
    setSignalTypes((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  const toggleDir = (id: string) =>
    setDirectoryIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));

  const canNext =
    (step === 1 && name.trim() && signalTypes.length > 0) ||
    (step === 2) ||
    (step === 3 && templateId);

  useEscapeKey(true, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New playbook"
        className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-850 px-6 py-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <Sparkles className="h-5 w-5 text-indigo-400" /> New playbook
          </h3>
          <button onClick={onClose} aria-label="Close" className="text-zinc-500 hover:text-zinc-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 px-6 py-4">
          {[
            { n: 1, label: 'Trigger', icon: Rss },
            { n: 2, label: 'Audience', icon: Users },
            { n: 3, label: 'Action', icon: Mail },
          ].map((s, i) => (
            <div key={s.n} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-xs font-bold ${
                  step >= s.n ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                {step > s.n ? <Check className="h-4 w-4" /> : s.n}
              </div>
              <span className={`text-xs font-semibold ${step >= s.n ? 'text-white' : 'text-zinc-500'}`}>
                {s.label}
              </span>
              {i < 2 && <div className="mx-1 h-px flex-1 bg-zinc-800" />}
            </div>
          ))}
        </div>

        <div className="max-h-[52vh] overflow-y-auto px-6 pb-2">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Playbook name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Funding congrats — SaaS founders"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Trigger on these signals
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SIGNAL_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => toggleType(t.id)}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                        signalTypes.includes(t.id)
                          ? 'border-indigo-500/50 bg-indigo-500/10 text-white'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {t.label}
                      {signalTypes.includes(t.id) && <Check className="h-4 w-4 text-indigo-400" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Audience (leave empty for all contacts)
              </label>
              {directories.length === 0 ? (
                <p className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-6 text-center text-sm text-zinc-500">
                  No contact directories yet — this playbook will apply to all contacts.
                </p>
              ) : (
                <div className="space-y-2">
                  {directories.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => toggleDir(d.id)}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                        directoryIds.includes(d.id)
                          ? 'border-indigo-500/50 bg-indigo-500/10 text-white'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span>
                        {d.name}
                        <span className="ml-2 text-xs text-zinc-500">{d.contactCount} contacts</span>
                      </span>
                      {directoryIds.includes(d.id) && <Check className="h-4 w-4 text-indigo-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Email template
                </label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
                >
                  <option value="">Select a template…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  Use <code className="text-indigo-400">{'{{signal.summary}}'}</code>,{' '}
                  <code className="text-indigo-400">{'{{signal.type}}'}</code>, and{' '}
                  <code className="text-indigo-400">{'{{signal.date}}'}</code> in your template to reference the event.
                </p>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode('review')}
                    className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                      mode === 'review' ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-zinc-800 bg-zinc-950'
                    }`}
                  >
                    <p className="flex items-center gap-1.5 text-sm font-bold text-white">
                      <Eye className="h-4 w-4 text-amber-400" /> Review first
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500">Queue drafts for your approval.</p>
                  </button>
                  <button
                    onClick={() => setMode('auto')}
                    className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                      mode === 'auto' ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-zinc-800 bg-zinc-950'
                    }`}
                  >
                    <p className="flex items-center gap-1.5 text-sm font-bold text-white">
                      <Zap className="h-4 w-4 text-emerald-400" /> Auto-send
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500">Fire instantly on high-confidence matches.</p>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Cooldown (days)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={cooldownDays}
                    onChange={(e) => setCooldownDays(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Daily send cap
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={dailyCap}
                    onChange={(e) => setDailyCap(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-850 px-6 py-4">
          <button
            onClick={() => (step === 1 ? onClose() : setStep((s) => s - 1))}
            className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-950"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:brightness-110 disabled:opacity-50"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={() => create.mutate()}
              disabled={!templateId || create.isPending}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:brightness-110 disabled:opacity-50"
            >
              {create.isPending ? 'Creating…' : 'Create playbook'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
