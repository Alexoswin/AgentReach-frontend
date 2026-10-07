/**
 * Hand-drawn SVG primitives for the architecture docs. Every diagram is laid
 * out on a fixed viewBox and styled entirely by the `.arch-svg` rules in
 * globals.css, so it follows the active theme and accent without re-rendering.
 */

export type BoxKind =
  | 'client'
  | 'code'
  | 'model'
  | 'provider'
  | 'cron'
  | 'tool'
  | 'store'
  | 'ok'
  | 'bad';

/** req = a call or request · live = audio or a long-lived socket · hook = provider callback */
export type EdgeKind = 'req' | 'live' | 'hook';

const EDGE_KINDS: readonly EdgeKind[] = ['req', 'live', 'hook'];

/** Arrowhead markers. `id` must be unique per SVG on the page. */
export function Markers({ id }: { id: string }) {
  return (
    <defs>
      {EDGE_KINDS.map((kind) => (
        <marker
          key={kind}
          id={`${id}-${kind}`}
          viewBox="0 0 10 10"
          refX={9}
          refY={5}
          markerWidth={9}
          markerHeight={9}
          markerUnits="userSpaceOnUse"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" className={`mk mk-${kind}`} />
        </marker>
      ))}
    </defs>
  );
}

export function Box({
  x,
  y,
  w,
  h,
  kind = 'code',
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  kind?: BoxKind;
}) {
  return <rect x={x} y={y} width={w} height={h} rx={8} className={`box box-${kind}`} />;
}

/** Dashed outline that groups related boxes, with a mono caption. */
export function Group({
  x,
  y,
  w,
  h,
  label,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx={12} className="group" />
      <text x={x + 14} y={y + 20} className="cap">
        {label}
      </text>
    </>
  );
}

/** Stacked text lines at a fixed step, the way every box body is laid out. */
export function Lines({
  x,
  y,
  lines,
  step = 18,
  className,
}: {
  x: number;
  y: number;
  lines: readonly string[];
  step?: number;
  className?: string;
}) {
  return (
    <>
      {lines.map((line, i) => (
        <text key={`${i}-${line}`} x={x} y={y + i * step} className={className}>
          {line}
        </text>
      ))}
    </>
  );
}

/** A box title with an optional right-aligned mono note (file or function). */
export function Title({
  x,
  y,
  w,
  text,
  note,
  className = 'title',
}: {
  x: number;
  y: number;
  w: number;
  text: string;
  note?: string;
  className?: string;
}) {
  return (
    <>
      <text x={x + 16} y={y} className={className}>
        {text}
      </text>
      {note && (
        <text x={x + w - 16} y={y} textAnchor="end" className="mono note">
          {note}
        </text>
      )}
    </>
  );
}

function edgeProps(id: string, kind: EdgeKind, both: boolean) {
  const marker = `url(#${id}-${kind})`;
  return {
    className: `edge edge-${kind}`,
    markerEnd: marker,
    markerStart: both ? marker : undefined,
  };
}

export function Arrow({
  id,
  x1,
  y1,
  x2,
  y2,
  kind = 'req',
  both = false,
}: {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind?: EdgeKind;
  both?: boolean;
}) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} {...edgeProps(id, kind, both)} />;
}

/** An arrow along an elbowed path (`d` in SVG path syntax). */
export function PathArrow({
  id,
  d,
  kind = 'req',
  both = false,
}: {
  id: string;
  d: string;
  kind?: EdgeKind;
  both?: boolean;
}) {
  return <path d={d} {...edgeProps(id, kind, both)} />;
}

export type KeyItem =
  | { box: BoxKind; label: string }
  | { edge: EdgeKind; label: string };

/** Legend laid out in columns, top to bottom then left to right. */
export function Key({
  id,
  x,
  y,
  items,
  rows,
  colWidth,
}: {
  id: string;
  x: number;
  y: number;
  items: readonly KeyItem[];
  rows: number;
  colWidth: number;
}) {
  return (
    <g>
      <text x={x} y={y} className="cap">
        KEY
      </text>
      {items.map((item, i) => {
        const cx = x + Math.floor(i / rows) * colWidth;
        const cy = y + 18 + (i % rows) * 24;
        return (
          <g key={item.label}>
            {'box' in item ? (
              <rect x={cx} y={cy} width={28} height={16} rx={4} className={`box box-${item.box}`} />
            ) : (
              <Arrow id={id} x1={cx + 1} y1={cy + 8} x2={cx + 27} y2={cy + 8} kind={item.edge} />
            )}
            <text x={cx + 38} y={cy + 12.5} className="key-label">
              {item.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
