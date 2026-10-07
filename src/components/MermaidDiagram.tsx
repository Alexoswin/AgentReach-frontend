'use client';

import { useEffect, useId, useState } from 'react';
import { AlertTriangle, ListChecks } from 'lucide-react';
import { isLightTheme, onThemeChange } from '@/lib/themeColors';

const DARK_THEME_VARIABLES = {
  background: '#071014',
  mainBkg: '#102128',
  primaryColor: '#102128',
  primaryTextColor: '#f5fafb',
  primaryBorderColor: '#55d7ff',
  lineColor: '#c2d8df',
  secondaryColor: '#17313a',
  tertiaryColor: '#0d1b21',
  clusterBkg: '#0b171c',
  clusterBorder: '#3a5963',
  edgeLabelBackground: '#0f2027',
  actorBkg: '#17313a',
  actorBorder: '#55d7ff',
  actorTextColor: '#f5fafb',
  labelTextColor: '#f5fafb',
  noteBkgColor: '#182e24',
  noteTextColor: '#f5fafb',
  noteBorderColor: '#37e8a6',
};

const LIGHT_THEME_VARIABLES = {
  background: '#ffffff',
  mainBkg: '#eef4f6',
  primaryColor: '#eef4f6',
  primaryTextColor: '#10151b',
  primaryBorderColor: '#0886b3',
  lineColor: '#4a545f',
  secondaryColor: '#e7ebef',
  tertiaryColor: '#f3f5f7',
  clusterBkg: '#f3f5f7',
  clusterBorder: '#c1cad4',
  edgeLabelBackground: '#ffffff',
  actorBkg: '#eef4f6',
  actorBorder: '#0886b3',
  actorTextColor: '#10151b',
  labelTextColor: '#10151b',
  noteBkgColor: '#e9fbf3',
  noteTextColor: '#10151b',
  noteBorderColor: '#0b7d55',
};

interface MermaidDiagramProps {
  chart: string;
  caption?: string;
}

export default function MermaidDiagram({ chart, caption }: MermaidDiagramProps) {
  const rawId = useId();
  const diagramId = `reachconvert-doc-diagram-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [light, setLight] = useState<boolean | null>(null);

  // Mermaid bakes colors into the SVG, so re-render when the theme family flips.
  useEffect(() => {
    const update = () => setLight(isLightTheme());
    update();
    return onThemeChange(update);
  }, []);

  useEffect(() => {
    if (light === null) return;
    let cancelled = false;

    async function renderDiagram() {
      setError(null);
      setSvg('');

      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          maxTextSize: 90000,
          securityLevel: 'strict',
          // Only the base theme fully honors custom themeVariables.
          theme: light ? 'base' : 'dark',
          flowchart: {
            curve: 'basis',
            htmlLabels: true,
            nodeSpacing: 52,
            rankSpacing: 74,
            padding: 18,
          },
          sequence: {
            boxMargin: 14,
            boxTextMargin: 8,
            diagramMarginX: 24,
            diagramMarginY: 18,
            messageMargin: 48,
          },
          themeVariables: {
            ...(light ? LIGHT_THEME_VARIABLES : DARK_THEME_VARIABLES),
            fontSize: '16px',
            fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          },
        });

        const { svg: renderedSvg } = await mermaid.render(diagramId, chart);
        if (!cancelled) setSvg(renderedSvg);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to render diagram.');
        }
      }
    }

    void renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [chart, diagramId, light]);

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-xl shadow-black/20">
      {caption && (
        <div className="flex items-center gap-2 border-b border-zinc-850 bg-zinc-900/50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          <ListChecks className="h-3.5 w-3.5" /> {caption}
        </div>
      )}

      <div className="overflow-x-auto p-3 sm:p-5">
        {error ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <span>{error}</span>
            </div>
            <pre className="overflow-x-auto rounded-xl border border-zinc-850 bg-zinc-900/40 p-4 text-xs leading-6 text-zinc-300">
              <code>{chart}</code>
            </pre>
          </div>
        ) : svg ? (
          <div
            className="doc-mermaid min-w-[720px] sm:min-w-0 [&_.edgeLabel]:rounded-md [&_.edgeLabel]:bg-zinc-950 [&_.label]:text-[15px] [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:w-full [&_svg]:max-w-none [&_text]:font-sans"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="flex min-h-48 items-center justify-center text-sm text-zinc-500">
            Rendering architecture diagram...
          </div>
        )}
      </div>
    </div>
  );
}
