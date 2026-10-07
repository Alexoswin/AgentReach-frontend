'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { LooseApiResponse } from '@/lib/api';
import { useState } from 'react';
import {
  History,
  Mail,
  PhoneCall,
  Calendar,
  Filter,
  CheckCircle,
  Clock,
} from 'lucide-react';

const getDialedNetworkRange = (phoneNumber?: string) => {
  const digits = String(phoneNumber || '').replace(/\D/g, '');
  if (!digits) return 'Unknown';
  if (digits.startsWith('91') && digits.length >= 12) {
    return `+91 ${digits.slice(2, 7)}****`;
  }
  if (digits.startsWith('1') && digits.length >= 11) {
    return `+1 ${digits.slice(1, 4)}-${digits.slice(4, 7)}***`;
  }
  const prefixLength = Math.min(Math.max(digits.length - 4, 4), 7);
  return `+${digits.slice(0, prefixLength)}${'*'.repeat(
    Math.max(0, digits.length - prefixLength),
  )}`;
};

export default function HistoryPage() {
  const [tab, setTab] = useState<'emails' | 'calls'>('emails');

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [status, setStatus] = useState(''); // Email status
  const [outcome, setOutcome] = useState(''); // Call outcome

  // Fetch campaign list for dropdown filter
  const { data: emailCampaigns = [] } = useQuery({
    queryKey: ['email-campaigns-list'],
    queryFn: api.emailCampaigns.list,
  });

  const { data: callingCampaigns = [] } = useQuery({
    queryKey: ['calling-campaigns-list'],
    queryFn: api.callingCampaigns.list,
  });

  // Fetch email history
  const { data: emailHistory = [], isLoading: isEmailsLoading } = useQuery({
    queryKey: ['history-emails', { startDate, endDate, campaignId, status }],
    queryFn: () => api.history.emails({ startDate, endDate, campaignId, status }),
    enabled: tab === 'emails',
  });

  // Fetch call history
  const { data: callHistory = [], isLoading: isCallsLoading } = useQuery({
    queryKey: ['history-calls', { startDate, endDate, campaignId, outcome }],
    queryFn: () => api.history.calls({ startDate, endDate, campaignId, outcome }),
    enabled: tab === 'calls',
  });

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setCampaignId('');
    setStatus('');
    setOutcome('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-zinc-900">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <History className="h-8 w-8 text-indigo-400" />
            Outreach Logs
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Browse and filter historical records of email messages and voice call recordings.
          </p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-2 p-1 bg-zinc-900/60 border border-zinc-850 rounded-xl w-fit">
        <button
          onClick={() => {
            setTab('emails');
            clearFilters();
          }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            tab === 'emails'
              ? 'bg-zinc-800 text-white border border-zinc-700 shadow-md'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          Email Logs
        </button>
        <button
          onClick={() => {
            setTab('calls');
            clearFilters();
          }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            tab === 'calls'
              ? 'bg-zinc-800 text-white border border-zinc-700 shadow-md'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <PhoneCall className="h-3.5 w-3.5" />
          Call Logs
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-2xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
        {/* Date Start */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
          />
        </div>

        {/* Date End */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
          />
        </div>

        {/* Campaign Filter */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Campaign
          </label>
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
          >
            <option value="">All Campaigns</option>
            {tab === 'emails'
              ? emailCampaigns.map((c: LooseApiResponse) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))
              : callingCampaigns.map((c: LooseApiResponse) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Status / Outcome
          </label>
          {tab === 'emails' ? (
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="SENT">SENT</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="FAILED">FAILED</option>
            </select>
          ) : (
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
            >
              <option value="">All Outcomes</option>
              <option value="PENDING">PENDING</option>
              <option value="ANSWERED">ANSWERED</option>
              <option value="NO_ANSWER">NO_ANSWER</option>
              <option value="BUSY">BUSY</option>
              <option value="FAILED">FAILED</option>
            </select>
          )}
        </div>

        {/* Clear Action */}
        <button
          onClick={clearFilters}
          className="w-full py-2 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-all text-center"
        >
          Reset Filters
        </button>
      </div>

      {/* History Tables */}
      <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl overflow-hidden shadow-xl">
        {tab === 'emails' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="text-xs text-zinc-500 uppercase border-b border-zinc-850 bg-zinc-900/60">
                <tr>
                  <th className="px-6 py-4 font-semibold">Recipient</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold">Subject</th>
                  <th className="px-6 py-4 font-semibold">Campaign</th>
                  <th className="px-6 py-4 font-semibold">Sent Time</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Opens</th>
                  <th className="px-6 py-4 font-semibold">Replies</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {isEmailsLoading ? (
                  [1, 2, 3].map((n) => (
                    <tr key={n} className="animate-pulse">
                      <td colSpan={8} className="h-12 bg-zinc-900/50"></td>
                    </tr>
                  ))
                ) : emailHistory.length > 0 ? (
                  emailHistory.map((item: LooseApiResponse) => {
                    const contactName = item.contact
                      ? `${item.contact.firstName || ''} ${item.contact.lastName || ''}`.trim() || 'Unnamed Contact'
                      : 'Removed Contact';
                    const deliveryColors: Record<string, string> = {
                      PENDING: 'bg-zinc-850 text-zinc-400 border-zinc-800',
                      SENT: 'bg-blue-500/10 text-blue-400 border-blue-500/10',
                      DELIVERED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10',
                      FAILED: 'bg-rose-500/10 text-rose-400 border-rose-500/10',
                    };

                    return (
                      <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="px-6 py-4 font-medium text-white">
                          {contactName}
                        </td>
                        <td className="px-6 py-4 text-zinc-400">{item.contact?.email || 'N/A'}</td>
                        <td className="px-6 py-4 text-zinc-300 truncate max-w-xs">{item.subject || 'N/A'}</td>
                        <td className="px-6 py-4 text-zinc-400">{item.campaign?.name || 'N/A'}</td>
                        <td className="px-6 py-4 text-zinc-500 text-xs">
                          {item.sentTime ? new Date(item.sentTime).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${deliveryColors[item.deliveryStatus]}`}>
                            {item.deliveryStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {item.openStatus ? (
                            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5" /> Opened
                            </span>
                          ) : (
                            <span className="text-zinc-650">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {item.replyStatus ? (
                            <span className="text-xs text-indigo-400 font-bold flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5" /> Replied
                            </span>
                          ) : (
                            <span className="text-zinc-650">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-zinc-500">
                      No matching email logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="text-xs text-zinc-500 uppercase border-b border-zinc-850 bg-zinc-900/60">
                <tr>
                  <th className="px-6 py-4 font-semibold">Recipient</th>
                  <th className="px-6 py-4 font-semibold">Phone</th>
                  <th className="px-6 py-4 font-semibold">Network Range</th>
                  <th className="px-6 py-4 font-semibold">Campaign</th>
                  <th className="px-6 py-4 font-semibold">Duration</th>
                  <th className="px-6 py-4 font-semibold">Outcome</th>
                  <th className="px-6 py-4 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {isCallsLoading ? (
                  [1, 2, 3].map((n) => (
                    <tr key={n} className="animate-pulse">
                      <td colSpan={7} className="h-12 bg-zinc-900/50"></td>
                    </tr>
                  ))
                ) : callHistory.length > 0 ? (
                  callHistory.map((item: LooseApiResponse) => {
                    const contactName = item.contact
                      ? `${item.contact.firstName || ''} ${item.contact.lastName || ''}`.trim() || 'Unnamed Contact'
                      : 'Removed Contact';
                    const outcomeColors: Record<string, string> = {
                      PENDING: 'bg-zinc-850 text-zinc-400 border-zinc-800',
                      ANSWERED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10',
                      NO_ANSWER: 'bg-zinc-800 text-zinc-500 border-zinc-800',
                      BUSY: 'bg-amber-500/10 text-amber-400 border-amber-500/10',
                      FAILED: 'bg-rose-500/10 text-rose-400 border-rose-500/10',
                    };

                    return (
                      <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="px-6 py-4 font-medium text-white">
                          {contactName}
                        </td>
                        <td className="px-6 py-4 text-zinc-400">{item.contact?.phoneNumber || 'N/A'}</td>
                        <td className="px-6 py-4 text-zinc-400">
                          {item.dialedNetworkRange ||
                            getDialedNetworkRange(item.contact?.phoneNumber)}
                        </td>
                        <td className="px-6 py-4 text-zinc-400">{item.campaign?.name || 'N/A'}</td>
                        <td className="px-6 py-4 text-zinc-400">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-zinc-500" /> {item.duration}s
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${outcomeColors[item.outcome]}`}>
                            {item.outcome}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-500 text-xs">
                          {new Date(item.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                      No matching call logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
