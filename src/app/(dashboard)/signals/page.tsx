'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { LooseApiResponse } from '@/lib/api';
import { useOutreachStore } from '@/store/useOutreachStore';
import { LoaderOverlay } from '@/components/Loader';
import { useEscapeKey } from '@/lib/useEscapeKey';
import {
  Radar,
  RefreshCw,
  Plus,
  Check,
  X,
  TrendingUp,
  Building2,
  Zap,
  ExternalLink,
  Inbox,
  Rss,
  Sparkles,
  ArrowRight,
  Pause,
  Play,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

type Tab = 'feed' | 'review' | 'watches';
type TabQuery = { data?: LooseApiResponse; isLoading: boolean; isError: boolean };

const TYPE_STYLES: Record<string, string> = {
  funding: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'hiring-surge': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'company-news': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'product-launch': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'job-change': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  'website-change': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  manual: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20',
  'news-other': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

function confidenceBadge(confidence: string) {
  if (confidence === 'high') return 'bg-emerald-500/10 text-emerald-400';
  if (confidence === 'medium') return 'bg-amber-500/10 text-amber-400';
  return 'bg-zinc-700/40 text-zinc-400';
}

export default function SignalsPage() {
  const queryClient = useQueryClient();
  const { showAlert } = useOutreachStore();
  const [tab, setTab] = useState<Tab>('feed');
  const [showManual, setShowManual] = useState(false);

  const statsQuery = useQuery({ queryKey: ['signal-stats'], queryFn: api.signals.stats });
  const feedQuery = useQuery({ queryKey: ['signal-feed'], queryFn: () => api.signals.feed() });
  const reviewQuery = useQuery({ queryKey: ['signal-review'], queryFn: api.signals.reviewQueue });
  const watchQuery = useQuery({ queryKey: ['signal-watches'], queryFn: api.signals.watches.list });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['signal-stats'] });
    queryClient.invalidateQueries({ queryKey: ['signal-feed'] });
    queryClient.invalidateQueries({ queryKey: ['signal-review'] });
    queryClient.invalidateQueries({ queryKey: ['signal-watches'] });
  };

  const pollMutation = useMutation({
    mutationFn: api.signals.poll,
    onSuccess: (res: LooseApiResponse) => {
      invalidateAll();
      showAlert(
        `Poll complete. ${res?.created ?? 0} new signal(s) detected.`,
        'success',
        'Scan finished',
      );
    },
    onError: (err: Error) => showAlert(err.message || 'Poll failed.', 'error'),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ matchId, action }: { matchId: string; action: 'approve' | 'reject' }) =>
      api.signals.review(matchId, action),
    onSuccess: (_res, variables) => {
      invalidateAll();
      showAlert(
        variables.action === 'approve'
          ? 'Outreach launched from this signal.'
          : 'Match dismissed.',
        'success',
      );
    },
    onError: (err: Error) => showAlert(err.message || 'Action failed.', 'error'),
  });

  const stats = statsQuery.data;
  const reviewCount = Array.isArray(reviewQuery.data) ? reviewQuery.data.length : 0;

  return (
    <div className="space-y-8">
      <LoaderOverlay
        show={pollMutation.isPending}
        label="Scanning for signals"
        sublabel="Checking news, filings, and hiring boards across your watched companies…"
      />

      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-zinc-900 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white">
            <Radar className="h-8 w-8 text-indigo-400" />
            Signals
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Campaigns that trigger themselves. We watch your accounts and reach out the moment a buying signal fires.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManual(true)}
            className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-900"
          >
            <Plus className="h-3.5 w-3.5" /> Add signal
          </button>
          <button
            onClick={() => pollMutation.mutate()}
            disabled={pollMutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:brightness-110 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${pollMutation.isPending ? 'animate-spin' : ''}`} />
            Scan now
          </button>
        </div>
      </div>

      {/* Stats band */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Watched companies"
          value={stats?.watchedCompanies ?? '—'}
          tint="text-indigo-400"
        />
        <StatCard icon={Rss} label="Signals detected" value={stats?.totalSignals ?? '—'} tint="text-purple-400" />
        <StatCard
          icon={Zap}
          label="Signal-triggered sends"
          value={stats?.triggeredOutreach ?? '—'}
          tint="text-emerald-400"
        />
        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 p-5 shadow-xl">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <TrendingUp className="h-4 w-4 text-emerald-400" /> Reply rate lift
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-white">
            {stats ? `${stats.triggered?.replyRate ?? 0}%` : '—'}
            {stats && (
              <span className="ml-2 text-sm font-semibold text-zinc-500">
                vs {stats.manual?.replyRate ?? 0}% manual
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-900">
        <TabButton active={tab === 'feed'} onClick={() => setTab('feed')} icon={Rss} label="Signal feed" />
        <TabButton
          active={tab === 'review'}
          onClick={() => setTab('review')}
          icon={Inbox}
          label="Review queue"
          badge={reviewCount}
        />
        <TabButton active={tab === 'watches'} onClick={() => setTab('watches')} icon={Building2} label="Watched companies" />
        <Link
          href="/signals/playbooks"
          className="ml-auto mb-2 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-indigo-400 transition-colors hover:text-indigo-300"
        >
          <Sparkles className="h-3.5 w-3.5" /> Manage playbooks <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Feed */}
      {tab === 'feed' && (
        <FeedTab query={feedQuery} />
      )}

      {/* Review */}
      {tab === 'review' && (
        <ReviewTab
          query={reviewQuery}
          onReview={(matchId, action) => reviewMutation.mutate({ matchId, action })}
          pending={reviewMutation.isPending}
        />
      )}

      {/* Watches */}
      {tab === 'watches' && <WatchesTab query={watchQuery} onChanged={invalidateAll} />}

      {showManual && (
        <ManualSignalModal
          onClose={() => setShowManual(false)}
          onCreated={() => {
            setShowManual(false);
            invalidateAll();
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  tint: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-850 bg-zinc-900/40 p-5 shadow-xl">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        <Icon className={`h-4 w-4 ${tint}`} /> {label}
      </p>
      <p className="mt-2 text-2xl font-black tracking-tight text-white">{value}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`mb-2 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
        active ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-200'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {typeof badge === 'number' && badge > 0 && (
        <span className="rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{badge}</span>
      )}
    </button>
  );
}

function TypePill({ type, label }: { type: string; label: string }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
        TYPE_STYLES[type] || TYPE_STYLES['news-other']
      }`}
    >
      {label}
    </span>
  );
}

function EmptyState({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 px-4 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-zinc-500">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-zinc-200">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-zinc-500">{body}</p>
    </div>
  );
}

function LoadError({ what }: { what: string }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title={`Could not load ${what}`}
      body="Something went wrong while fetching this list. Please try again in a moment."
    />
  );
}

function FeedTab({ query }: { query: TabQuery }) {
  if (query.isError) return <LoadError what="signals" />;
  if (query.isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-zinc-850 bg-zinc-900/40" />
        ))}
      </div>
    );
  }
  const signals: LooseApiResponse[] = query.data || [];
  if (signals.length === 0) {
    return (
      <EmptyState
        icon={Rss}
        title="No signals yet"
        body="Add contacts to start watching their companies, then hit “Scan now” to detect funding, hiring, and news signals."
      />
    );
  }
  return (
    <div className="space-y-3">
      {signals.map((s) => (
        <div
          key={s.id}
          className="group rounded-2xl border border-zinc-850 bg-zinc-900/40 p-5 shadow-xl transition-all hover:border-zinc-700 hover:bg-zinc-900/60"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <TypePill type={s.type} label={s.typeLabel} />
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${confidenceBadge(s.confidence)}`}>
                  {s.confidence}
                </span>
                {s.companyName && (
                  <span className="text-xs font-semibold text-zinc-400">{s.companyName}</span>
                )}
              </div>
              <h3 className="mt-2 truncate text-base font-bold text-white">{s.title}</h3>
              {s.summary && <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{s.summary}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                <span>{new Date(s.occurredAt).toLocaleString()}</span>
                <span className="text-zinc-700">•</span>
                <span>{s.matchedContacts} matched contact(s)</span>
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                  >
                    Source <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {s.triggeredCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
                  <Zap className="h-3 w-3" /> {s.triggeredCount} triggered
                </span>
              )}
              {s.pendingCount > 0 && (
                <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-400">
                  {s.pendingCount} to review
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewTab({
  query,
  onReview,
  pending,
}: {
  query: TabQuery;
  onReview: (matchId: string, action: 'approve' | 'reject') => void;
  pending: boolean;
}) {
  if (query.isError) return <LoadError what="the review queue" />;
  if (query.isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl border border-zinc-850 bg-zinc-900/40" />
        ))}
      </div>
    );
  }
  const items: LooseApiResponse[] = query.data || [];
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Review queue is clear"
        body="When a playbook in review mode matches a signal, the drafted outreach will appear here for your approval before it sends."
      />
    );
  }
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.matchId} className="overflow-hidden rounded-2xl border border-zinc-850 bg-zinc-900/40 shadow-xl">
          <div className="flex flex-wrap items-center gap-2 border-b border-zinc-850 px-5 py-3">
            <TypePill type={item.signal.type} label={item.signal.typeLabel} />
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${confidenceBadge(item.confidence)}`}>
              {item.confidence} match
            </span>
            <span className="text-xs font-semibold text-zinc-300">{item.signal.title}</span>
            <span className="ml-auto rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-bold text-indigo-400">
              {item.playbook.name}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-[220px_1fr]">
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">{item.contact.name}</p>
              <p className="text-xs text-zinc-400">{item.contact.jobTitle}</p>
              <p className="text-xs text-zinc-500">{item.contact.company}</p>
              <p className="truncate text-xs text-indigo-400">{item.contact.email}</p>
            </div>
            <div className="rounded-xl border border-zinc-850 bg-zinc-950/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Drafted email</p>
              <p className="mt-2 text-sm font-bold text-white">{item.preview.subject || '(no subject)'}</p>
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-zinc-400">
                {item.preview.bodyText || '(empty body)'}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-zinc-850 px-5 py-3">
            <button
              disabled={pending}
              onClick={() => onReview(item.matchId, 'reject')}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-900 disabled:opacity-60"
            >
              <X className="h-3.5 w-3.5" /> Dismiss
            </button>
            <button
              disabled={pending}
              onClick={() => onReview(item.matchId, 'approve')}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:brightness-110 disabled:opacity-60"
            >
              <Check className="h-3.5 w-3.5" /> Approve & send
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function WatchesTab({
  query,
  onChanged,
}: {
  query: TabQuery;
  onChanged: () => void;
}) {
  const { showAlert } = useOutreachStore();
  const toggle = useMutation({
    mutationFn: (id: string) => api.signals.watches.toggle(id),
    onSuccess: onChanged,
    onError: (e: Error) => showAlert(e.message, 'error'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.signals.watches.delete(id),
    onSuccess: onChanged,
    onError: (e: Error) => showAlert(e.message, 'error'),
  });

  if (query.isError) return <LoadError what="watched companies" />;
  if (query.isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl border border-zinc-850 bg-zinc-900/40" />;
  }
  const watches: LooseApiResponse[] = query.data || [];
  if (watches.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No companies watched yet"
        body="Company watches are created automatically when you import contacts. Each unique work email domain becomes a watched account."
      />
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-850 bg-zinc-900/40 shadow-xl">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-zinc-850 text-xs uppercase text-zinc-500">
          <tr>
            <th className="px-5 py-3 font-semibold">Company</th>
            <th className="px-5 py-3 font-semibold">Domain</th>
            <th className="px-5 py-3 font-semibold">Sources</th>
            <th className="px-5 py-3 font-semibold">Status</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-850">
          {watches.map((w) => (
            <tr key={w.id} className="hover:bg-zinc-900/40">
              <td className="px-5 py-3 font-semibold text-white">{w.companyName}</td>
              <td className="px-5 py-3 text-zinc-400">{w.domain}</td>
              <td className="px-5 py-3 text-xs text-zinc-500">
                {(w.sourcesEnabled || []).length} enabled
              </td>
              <td className="px-5 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    w.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-zinc-700/40 text-zinc-400'
                  }`}
                >
                  {w.status}
                </span>
              </td>
              <td className="px-5 py-3">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => toggle.mutate(w.id)}
                    className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 hover:text-zinc-200"
                    title={w.status === 'active' ? 'Pause' : 'Resume'}
                  >
                    {w.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => remove.mutate(w.id)}
                    className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 hover:text-rose-400"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ManualSignalModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { showAlert } = useOutreachStore();
  const [form, setForm] = useState({
    title: '',
    summary: '',
    url: '',
    companyName: '',
    contactEmail: '',
    type: 'manual',
  });

  const create = useMutation({
    mutationFn: () => api.signals.createManual(form),
    onSuccess: (res: LooseApiResponse) => {
      if (res?.deduped) {
        showAlert('That signal was already recorded.', 'error');
        return;
      }
      showAlert('Signal added and matched to contacts.', 'success');
      onCreated();
    },
    onError: (err: Error) => showAlert(err.message || 'Could not add signal.', 'error'),
  });

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  useEscapeKey(true, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add a manual signal"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <Sparkles className="h-5 w-5 text-indigo-400" /> Add a manual signal
          </h3>
          <button onClick={onClose} aria-label="Close" className="text-zinc-500 hover:text-zinc-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <Field label="Headline">
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Acme raised a $12M Series A"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
            />
          </Field>
          <Field label="Summary">
            <textarea
              value={form.summary}
              onChange={(e) => set('summary', e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company name">
              <input
                value={form.companyName}
                onChange={(e) => set('companyName', e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
              />
            </Field>
            <Field label="Type">
              <select
                value={form.type}
                onChange={(e) => set('type', e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
              >
                <option value="funding">Funding round</option>
                <option value="hiring-surge">Hiring surge</option>
                <option value="company-news">Company news</option>
                <option value="product-launch">Product launch</option>
                <option value="job-change">Job change</option>
                <option value="manual">Manual</option>
              </select>
            </Field>
          </div>
          <Field label="Contact email (to match)">
            <input
              value={form.contactEmail}
              onChange={(e) => set('contactEmail', e.target.value)}
              placeholder="jane@acme.com"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
            />
          </Field>
          <Field label="Source URL (optional)">
            <input
              value={form.url}
              onChange={(e) => set('url', e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
            />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-950">
            Cancel
          </button>
          <button
            onClick={() => create.mutate()}
            disabled={!form.title.trim() || create.isPending}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:brightness-110 disabled:opacity-60"
          >
            {create.isPending ? 'Adding…' : 'Add signal'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</label>
      {children}
    </div>
  );
}
