'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Search, X } from 'lucide-react';
import {
  DOC_CATEGORIES,
  type DocPage,
  getDocTrack,
  type DocTrack,
} from '@/lib/docs';
import { DOC_ICON_MAP } from '@/app/documentation/docIcons';

function displayTitle(title: string) {
  return title.split(' — ')[0];
}

function searchableText(doc: DocPage) {
  return [
    doc.title,
    doc.tagline,
    doc.category,
    doc.audience,
    ...(doc.prerequisites ?? []),
    ...doc.intro,
    ...doc.sections.flatMap((section) => [
      section.heading,
      ...(section.body ?? []),
      ...(section.steps ?? []),
      ...(section.capabilities?.flatMap((capability) => [capability.title, capability.text]) ?? []),
    ]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export default function DocumentationBrowser({ docs }: { docs: DocPage[] }) {
  const [query, setQuery] = useState('');
  const [track, setTrack] = useState<'All' | DocTrack>('All');
  const [category, setCategory] = useState<'All' | (typeof DOC_CATEGORIES)[number]>('All');

  const filteredDocs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return docs.filter((doc) => {
      const matchesQuery = !normalizedQuery || searchableText(doc).includes(normalizedQuery);
      const matchesTrack = track === 'All' || getDocTrack(doc) === track;
      const matchesCategory = category === 'All' || doc.category === category;
      return matchesQuery && matchesTrack && matchesCategory;
    });
  }, [category, docs, query, track]);

  const grouped = useMemo(() => {
    const groups = new Map<string, DocPage[]>();
    for (const doc of filteredDocs) {
      const key = `${getDocTrack(doc)}::${doc.category}`;
      groups.set(key, [...(groups.get(key) ?? []), doc]);
    }

    return Array.from(groups.entries()).map(([key, groupDocs]) => {
      const [groupTrack, groupCategory] = key.split('::') as [DocTrack, string];
      return { track: groupTrack, category: groupCategory, docs: groupDocs };
    });
  }, [filteredDocs]);

  const clearFilters = () => {
    setQuery('');
    setTrack('All');
    setCategory('All');
  };

  return (
    <div className="mt-10">
      <div className="rounded-2xl border border-zinc-850 bg-zinc-900/50 p-4 shadow-xl shadow-black/10 sm:p-5">
        <label htmlFor="documentation-search" className="sr-only">
          Search documentation
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            id="documentation-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search guides, features, integrations, or concepts"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 py-3 pl-10 pr-10 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 transition-colors hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2" aria-label="Filter by documentation track">
            {(['All', 'User Documentation', 'Technical Documentation'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTrack(option)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  track === option
                    ? 'bg-indigo-500/15 text-indigo-300'
                    : 'text-zinc-500 hover:bg-zinc-800/70 hover:text-zinc-300'
                }`}
              >
                {option === 'All' ? 'All docs' : option.replace(' Documentation', '')}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="sr-only">Filter by category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as typeof category)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-300 outline-none focus:border-indigo-500/70"
            >
              <option value="All">All categories</option>
              {DOC_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between text-xs text-zinc-500">
        <span>
          {filteredDocs.length} {filteredDocs.length === 1 ? 'page' : 'pages'}
          {query.trim() ? ` matching “${query.trim()}”` : ''}
        </span>
        {(query || track !== 'All' || category !== 'All') && (
          <button type="button" onClick={clearFilters} className="font-semibold text-indigo-400 hover:text-indigo-300">
            Clear filters
          </button>
        )}
      </div>

      {grouped.length > 0 ? (
        <div className="mt-7 space-y-10">
          {grouped.map((group) => (
            <section key={`${group.track}-${group.category}`}>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-400">{group.track}</p>
                  <h2 className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">{group.category}</h2>
                </div>
                <span className="text-xs text-zinc-600">{group.docs.length}</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {group.docs.map((doc) => {
                  const Icon = DOC_ICON_MAP[doc.icon];
                  return (
                    <Link
                      key={doc.slug}
                      href={`/documentation/${doc.slug}`}
                      className="group flex items-start gap-4 rounded-2xl border border-zinc-850 bg-zinc-900/40 p-5 shadow-xl transition-all hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-900/70"
                    >
                      <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 text-indigo-400 transition-transform group-hover:scale-110">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="flex items-center gap-1.5 text-base font-bold text-white">
                          {displayTitle(doc.title)}
                          <ArrowRight className="h-4 w-4 text-zinc-600 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-400" />
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-zinc-400">{doc.tagline}</p>
                        {doc.audience && <p className="mt-3 text-xs text-zinc-600">For {doc.audience}</p>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-7 rounded-2xl border border-dashed border-zinc-800 px-6 py-14 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-zinc-600" />
          <h2 className="mt-4 text-base font-bold text-zinc-200">No documentation found</h2>
          <p className="mt-2 text-sm text-zinc-500">Try a different search term or clear the active filters.</p>
          <button type="button" onClick={clearFilters} className="mt-5 text-sm font-semibold text-indigo-400 hover:text-indigo-300">
            Show all pages
          </button>
        </div>
      )}
    </div>
  );
}
