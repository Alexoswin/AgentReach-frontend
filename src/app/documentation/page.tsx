import { DOC_PAGES } from '@/lib/docs';
import DocumentationBrowser from '@/components/docs/DocumentationBrowser';
import { Sparkles } from 'lucide-react';

export default function DocumentationIndex() {
  return (
    <div className="mx-auto max-w-4xl">
      <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-300">
        <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Documentation
      </span>
      <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-white">ReachConvert Documentation</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
        Find practical guides for operators and technical references for implementation architecture, integrations, and code flow. Search across all pages or browse by track and category.
      </p>

      <DocumentationBrowser docs={DOC_PAGES} />
    </div>
  );
}
