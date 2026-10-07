'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export interface DocTocItem {
  id: string;
  label: string;
}

export default function DocTableOfContents({ items }: { items: DocTocItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? '');

  useEffect(() => {
    if (items.length === 0) return;
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((heading): heading is HTMLElement => Boolean(heading));
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-96px 0px -65% 0px', threshold: 0 },
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <aside className="hidden xl:block">
      <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto border-l border-zinc-850 pl-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">On this page</p>
        <nav className="mt-3 space-y-1.5" aria-label="On this page">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`#${item.id}`}
              className={`block rounded-md px-2 py-1 text-xs leading-5 transition-colors ${
                activeId === item.id
                  ? 'bg-indigo-500/10 font-semibold text-indigo-300'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              aria-current={activeId === item.id ? 'location' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
