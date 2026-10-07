'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { LooseApiResponse } from '@/lib/api';
import { onThemeChange, resolveCssColors } from '@/lib/themeColors';
import { TiltCard } from '@/components/fx';
import {
  Mail,
  Phone,
  Percent,
  Clock,
  TrendingUp,
  Award,
  Users2,
  Settings,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const CHART_TOKENS = {
  accent: '--a-400',
  accent2: '--a2-400',
  accent3: '--a3-400',
  grid: '--z-800',
  muted: '--z-500',
  surface: '--z-900',
  border: '--z-700',
  ink: '--z-100',
};

/**
 * Resolves theme CSS variables (including light-dark() values) into
 * concrete colors recharts can consume, re-resolving whenever the
 * user's theme or accent changes.
 */
function useChartPalette() {
  const [palette, setPalette] = useState<Record<keyof typeof CHART_TOKENS, string> | null>(null);

  useEffect(() => {
    const update = () => setPalette(resolveCssColors(CHART_TOKENS));
    update();
    return onThemeChange(update);
  }, []);

  return palette;
}

export default function DashboardPage() {
  const palette = useChartPalette();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['analytics'],
    queryFn: api.analytics.get,
    refetchInterval: 10000, // Refetch every 10 seconds for real-time campaign tracking!
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-850 pb-4">
          <div className="h-8 w-1/4 rounded bg-zinc-800"></div>
          <div className="h-10 w-32 rounded bg-zinc-800"></div>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl border border-zinc-850 bg-zinc-900"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-96 rounded-2xl border border-zinc-850 bg-zinc-900 lg:col-span-2"></div>
          <div className="h-96 rounded-2xl border border-zinc-850 bg-zinc-900"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-zinc-900/20 px-4 py-20 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
          <Settings className="h-6 w-6" />
        </div>
        <h3 className="mb-1 text-lg font-bold text-zinc-100">Failed to load analytics</h3>
        <p className="max-w-sm text-sm text-zinc-400">{(error as Error).message || 'Make sure the NestJS backend is running and database is connected.'}</p>
      </div>
    );
  }

  const { emailMetrics, callingMetrics, campaignPerformance, templatePerformance, segmentPerformance } = data;

  const cardStats = [
    {
      name: 'Emails Sent',
      value: emailMetrics.sent,
      description: `${emailMetrics.delivered} Delivered • ${emailMetrics.failed} Failed`,
      icon: Mail,
      tone: 'var(--a-400)',
    },
    {
      name: 'Email Open Rate',
      value: `${emailMetrics.openRate}%`,
      description: `Reply Rate: ${emailMetrics.replyRate}%`,
      icon: Percent,
      tone: 'var(--a2-400)',
    },
    {
      name: 'Calls Made',
      value: callingMetrics.callsMade,
      description: 'AI Voice Campaigns',
      icon: Phone,
      tone: 'var(--a3-400)',
    },
    {
      name: 'Call Success Rate',
      value: `${callingMetrics.successRate}%`,
      description: `Avg Duration: ${callingMetrics.averageDuration}s`,
      icon: Clock,
      tone: 'var(--a-400)',
    },
  ];

  return (
    <div className="sig-stagger space-y-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-zinc-850 pb-5 sm:flex-row sm:items-center">
        <div>
          <p className="sig-label text-indigo-400">[ COMMAND CENTER ]</p>
          <h2 className="sig-display mt-1.5 text-3xl font-extrabold text-white">Outreach Dashboard</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Overview of your active campaigns, mail deliverability, and calling agents performance.
          </p>
        </div>
        <div className="sig-label flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 text-zinc-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          LIVE SYNC
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cardStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <TiltCard key={stat.name} strength={5}>
              <div className="tilt-body sig-card sig-ticks flex h-full flex-col justify-between p-6 transition-shadow duration-300">
                <div className="tilt-glare" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="sig-label text-zinc-500">{stat.name}</p>
                    <p
                      className="mt-2 font-mono text-3xl font-bold tracking-tight text-white"
                      style={{ textShadow: `0 0 22px color-mix(in oklab, ${stat.tone} 30%, transparent)` }}
                    >
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className="rounded-xl border p-3"
                    style={{
                      color: stat.tone,
                      background: `color-mix(in oklab, ${stat.tone} 12%, transparent)`,
                      borderColor: `color-mix(in oklab, ${stat.tone} 25%, transparent)`,
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-4 text-xs font-medium text-zinc-400">{stat.description}</p>
              </div>
            </TiltCard>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Campaign Performance Bar Chart */}
        <div className="sig-card flex flex-col p-6 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-white">
                <TrendingUp className="h-5 w-5 text-indigo-400" />
                Campaign Performance
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500">Compares emails sent versus open responses and replies</p>
            </div>
          </div>
          <div className="h-80 min-h-[300px] w-full flex-1">
            {campaignPerformance.length > 0 && palette ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
                  <XAxis dataKey="name" stroke={palette.muted} fontSize={11} tickLine={false} />
                  <YAxis stroke={palette.muted} fontSize={11} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: palette.grid, opacity: 0.35 }}
                    contentStyle={{
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                      borderRadius: '12px',
                      color: palette.ink,
                    }}
                    labelStyle={{ color: palette.ink, fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="sent" fill={palette.accent} radius={[4, 4, 0, 0]} name="Sent" />
                  <Bar dataKey="opens" fill={palette.accent2} radius={[4, 4, 0, 0]} name="Opens" />
                  <Bar dataKey="replies" fill={palette.accent3} radius={[4, 4, 0, 0]} name="Replies" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-zinc-500">
                <p className="text-sm">No campaign data available yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Contact Segment Performance */}
        <div className="sig-card flex flex-col p-6">
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-base font-bold text-white">
              <Users2 className="h-5 w-5 text-purple-400" />
              Top Company Segments
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">Responsiveness sorted by contact organization</p>
          </div>

          <div className="flex-1 space-y-4">
            {segmentPerformance.length > 0 ? (
              segmentPerformance.map((seg: LooseApiResponse) => (
                <div key={seg.segment} className="space-y-2 rounded-xl border border-zinc-850/50 bg-zinc-950/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="truncate pr-2 text-sm font-semibold text-zinc-200">{seg.segment}</span>
                    <span className="sig-label rounded-full border border-indigo-500/10 bg-indigo-500/10 px-2 py-0.5 text-indigo-400">
                      {seg.sent} SENT
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-1 text-xs">
                    <div>
                      <p className="sig-label text-zinc-600">OPEN</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                          <div className="h-full bg-purple-500" style={{ width: `${seg.openRate}%` }} />
                        </div>
                        <span className="font-mono font-bold text-zinc-300">{seg.openRate}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="sig-label text-zinc-600">REPLY</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                          <div className="h-full bg-emerald-500" style={{ width: `${seg.replyRate}%` }} />
                        </div>
                        <span className="font-mono font-bold text-zinc-300">{seg.replyRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">
                <p className="text-sm">No segment data available yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Template Performance Table */}
      <div className="sig-card p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-white">
              <Award className="h-5 w-5 text-emerald-400" />
              Outreach Template Performance
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">Click-through metrics grouped by selected message templates</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm text-zinc-300">
            <thead className="border-b border-zinc-800">
              <tr>
                <th className="sig-label pb-3 text-zinc-500">Template Name</th>
                <th className="sig-label pb-3 text-zinc-500">Campaign Uses</th>
                <th className="sig-label pb-3 text-zinc-500">Open Rate</th>
                <th className="sig-label pb-3 text-zinc-500">Reply Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {templatePerformance.length > 0 ? (
                templatePerformance.map((tpl: LooseApiResponse) => (
                  <tr key={tpl.name} className="transition-colors hover:bg-zinc-900/30">
                    <td className="py-3.5 font-medium text-white">{tpl.name}</td>
                    <td className="py-3.5 font-mono text-zinc-400">{tpl.sent} sent</td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-zinc-200">{tpl.openRate}%</span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-800">
                          <div className="h-full bg-purple-500" style={{ width: `${tpl.openRate}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-zinc-200">{tpl.replyRate}%</span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-800">
                          <div className="h-full bg-emerald-500" style={{ width: `${tpl.replyRate}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-xs text-zinc-500">
                    No templates have been dispatched in campaigns yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
