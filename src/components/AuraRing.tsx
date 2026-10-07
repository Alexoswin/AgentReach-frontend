'use client';

import { useEffect, useId, useRef } from 'react';
import { isLightTheme, onThemeChange, resolveCssColors } from '@/lib/themeColors';

const TAU = Math.PI * 2;
/** Default size: scales with the viewport, from 64px on phones to 104px on large screens. */
const RESPONSIVE_SIZE = 'clamp(64px, 10vmin, 104px)';
/** Points per loop. */
const STEPS = 180;
/**
 * Ribbon cross-section semi-axes, in mean radii: the ribbon is 2·A wide
 * where it lies flat (the lobes) and 2·B where it turns edge-on (between
 * them).
 */
const TUBE_A = 0.17;
const TUBE_B = 0.05;
/** How fast the ring turns and the threads roll around the ribbon, in rad/s. */
const SPIN = 0.45;
const ROLL = 1.1;
/** Breathing period in seconds; matches the aura-breathe halo in globals.css. */
const BREATH_S = 3.6;
/** Color stops in the lit conic gradient. */
const HUE_STOPS = 36;
/** Canvas resolution cap: the ribbon is soft, so higher ratios only cost fill rate. */
const MAX_DPR = 1.5;
/** Layers overflow the layout box by this fraction per side so the bloom isn't clipped (.aura-layer). */
const BLEED = 0.2;
/** Mean ring radius as a fraction of the layer box. */
const RADIUS = 0.29;
/** Frames arriving faster than ~60fps (120Hz+ screens) are skipped. */
const MIN_FRAME_MS = 1000 / 60 - 1;

const ACCENT_TOKENS = { from: '--a3-500', via: '--a2-500', to: '--a-400' };

/** Angle samples around the loop; fixed, so computed once. */
const ANGLES = Array.from({ length: STEPS }, (_, k) => {
  const theta = (k / STEPS) * TAU;
  return { theta, cos: Math.cos(theta), sin: Math.sin(theta) };
});

/** The ribbon sampled at every step for one frame. */
interface Spine {
  /** Radius of the ribbon's center line, in mean radii. */
  center: Float64Array;
  /** Half the ribbon's apparent width. */
  half: Float64Array;
  /** Twist of the ribbon around its center line. */
  cosT: Float64Array;
  sinT: Float64Array;
  /** Breathing scale. */
  scale: number;
}

function createSpine(): Spine {
  return {
    center: new Float64Array(STEPS),
    half: new Float64Array(STEPS),
    cosT: new Float64Array(STEPS),
    sinT: new Float64Array(STEPS),
    scale: 1,
  };
}

/**
 * Samples the ribbon at time `t` (seconds). Its center line is a soft
 * four-lobed "rounded diamond" that turns and breathes. Around it the ribbon
 * is a flattened tube, twisted in step with the lobes so it always lies flat
 * across them and edge-on between them: the silhouette never degrades, and
 * the threads cross between the lobes without pinching shut.
 */
function sampleSpine(spine: Spine, t: number) {
  const breath = Math.sin((TAU * t) / BREATH_S);
  const scale = 1 + 0.02 * breath;
  const lobe = 0.08 + 0.01 * breath;
  spine.scale = scale;
  for (let k = 0; k < STEPS; k++) {
    const twist = 2 * (ANGLES[k].theta - t * SPIN);
    const cosT = Math.cos(twist);
    const sinT = Math.sin(twist);
    spine.cosT[k] = cosT;
    spine.sinT[k] = sinT;
    spine.center[k] = scale * (1 + lobe * (2 * cosT * cosT - 1)); // cos 4φ
    spine.half[k] = scale * Math.hypot(TUBE_A * cosT, TUBE_B * sinT);
  }
}

/** Radius (in mean radii) of thread `i` of `count` at each step; threads roll around the ribbon. */
function threadRadius(spine: Spine, i: number, count: number, t: number) {
  const angle = (TAU * (i + 0.5)) / count + t * ROLL;
  const a = TUBE_A * spine.scale * Math.cos(angle);
  const b = TUBE_B * spine.scale * Math.sin(angle);
  return (k: number) => spine.center[k] + a * spine.cosT[k] - b * spine.sinT[k];
}

/** Accent gradient axis through a `box`-sized layer, tilted down-right: violet → cyan. */
function gradientAxis(box: number) {
  const c = box / 2;
  const half = box * RADIUS * 1.3;
  const dx = Math.cos(0.35) * half;
  const dy = Math.sin(0.35) * half;
  return { x1: c - dx, y1: c - dy, x2: c + dx, y2: c + dy };
}

type PathSink = Pick<CanvasPath, 'moveTo' | 'lineTo' | 'closePath'>;

/** Adds one closed loop around center `c` to `path`; `radiusAt(k)` is in mean radii `R`. */
function traceLoop(path: PathSink, c: number, R: number, radiusAt: (k: number) => number, stride = 1) {
  for (let k = 0; k < STEPS; k += stride) {
    const r = R * radiusAt(k);
    const x = c + ANGLES[k].cos * r;
    const y = c + ANGLES[k].sin * r;
    if (k === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.closePath();
}

/** Collects loops as SVG path data with integer coordinates. */
class SvgPath implements PathSink {
  d = '';
  moveTo(x: number, y: number) {
    this.d += `M${Math.round(x)} ${Math.round(y)}`;
  }
  lineTo(x: number, y: number) {
    this.d += ` ${Math.round(x)} ${Math.round(y)}`;
  }
  closePath() {
    this.d += 'Z';
  }
}

/* Static t=0 frame, server-rendered so the ring shows before hydration. */
const POSTER_BOX = 1000; // viewBox units; integer coordinates give 0.1% precision
const POSTER_THREADS = 10;
const POSTER_STRIDE = 3; // 60 points per loop
const POSTER_AXIS = gradientAxis(POSTER_BOX);
const POSTER = (() => {
  const spine = createSpine();
  sampleSpine(spine, 0);
  const c = POSTER_BOX / 2;
  const R = POSTER_BOX * RADIUS;
  const band = new SvgPath();
  traceLoop(band, c, R, (k) => spine.center[k] + spine.half[k], POSTER_STRIDE);
  traceLoop(band, c, R, (k) => spine.center[k] - spine.half[k], POSTER_STRIDE);
  const threads = Array.from({ length: POSTER_THREADS }, (_, i) => {
    const thread = new SvgPath();
    traceLoop(thread, c, R, threadRadius(spine, i, POSTER_THREADS, 0), POSTER_STRIDE);
    return thread.d;
  });
  return { band: band.d, threads };
})();

type Rgb = [number, number, number];

interface Palette {
  from: string;
  via: string;
  to: string;
  /** Hue anchors around the ring (right, bottom, left, top), if the colors parse as rgb(). */
  anchors: Rgb[] | null;
  light: boolean;
}

function parseRgb(color: string): Rgb | null {
  const m = color.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function mixRgb(a: Rgb, b: Rgb, f: number): Rgb {
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

function readPalette(): Palette {
  const colors = resolveCssColors(ACCENT_TOKENS);
  const from = parseRgb(colors.from);
  const via = parseRgb(colors.via);
  const to = parseRgb(colors.to);
  return {
    ...colors,
    // Cyan on the right, blue below, violet on the left, indigo above.
    anchors: from && via && to ? [to, via, from, mixRgb(from, via, 0.5)] : null,
    light: isLightTheme(),
  };
}

/** Color at screen angle `a`, easing between the four anchors. */
function hueAt(anchors: Rgb[], a: number): Rgb {
  const u = (((a % TAU) + TAU) % TAU) / (TAU / 4);
  const k = Math.floor(u);
  const f = u - k;
  return mixRgb(anchors[k % 4], anchors[(k + 1) % 4], f * f * (3 - 2 * f));
}

/**
 * Paint for the ribbon. The conic version colors it by screen angle and
 * lights it by how flat it lies there, so the lobes catch the light and the
 * twists fall into shade; browsers without conic gradients get a plain
 * linear one.
 */
function ringPaint(ctx: CanvasRenderingContext2D, box: number, t: number, palette: Palette) {
  const c = box / 2;
  if (palette.anchors && typeof ctx.createConicGradient === 'function') {
    const gradient = ctx.createConicGradient(0, c, c);
    const drift = 0.3 * Math.sin(t * 0.3);
    for (let j = 0; j <= HUE_STOPS; j++) {
      const a = (j / HUE_STOPS) * TAU;
      const [r, g, b] = hueAt(palette.anchors, a + drift);
      const light = 0.45 + 0.55 * Math.abs(Math.cos(2 * (a - t * SPIN)));
      gradient.addColorStop(
        j / HUE_STOPS,
        `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${light.toFixed(3)})`
      );
    }
    return gradient;
  }
  const { x1, y1, x2, y2 } = gradientAxis(box);
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  gradient.addColorStop(0, palette.from);
  gradient.addColorStop(0.5, palette.via);
  gradient.addColorStop(1, palette.to);
  return gradient;
}

interface Layout {
  /** Canvas size in css px (the ring plus its bleed). */
  box: number;
  dpr: number;
  threads: number;
  rimWidth: number;
}

/** Draws one frame of the ribbon into the main canvas. */
function drawRing(
  ctx: CanvasRenderingContext2D,
  { box, dpr, threads, rimWidth }: Layout,
  t: number,
  palette: Palette,
  spine: Spine
) {
  sampleSpine(spine, t);
  const c = box / 2;
  const R = box * RADIUS;
  const band = new Path2D();
  traceLoop(band, c, R, (k) => spine.center[k] + spine.half[k]);
  traceLoop(band, c, R, (k) => spine.center[k] - spine.half[k]);
  const paint = ringPaint(ctx, box, t, palette);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, box, box);
  // Additive blending makes crossings glow on dark themes but washes out
  // to white on light ones, where plain alpha blending reads better.
  ctx.globalCompositeOperation = palette.light ? 'source-over' : 'lighter';
  ctx.fillStyle = paint;
  ctx.strokeStyle = paint;

  // Silk body: everything between the two edges.
  ctx.globalAlpha = palette.light ? 0.22 : 0.28;
  ctx.fill(band, 'evenodd');

  // Threads wound around the ribbon.
  ctx.lineWidth = 0.55;
  for (let i = 0; i < threads; i++) {
    ctx.globalAlpha = (palette.light ? 0.14 : 0.16) + 0.04 * Math.sin(i * 1.7);
    ctx.beginPath();
    traceLoop(ctx, c, R, threadRadius(spine, i, threads, t));
    ctx.stroke();
  }

  // Bright rims along both edges.
  ctx.globalAlpha = palette.light ? 0.85 : 0.7;
  ctx.lineWidth = rimWidth;
  ctx.stroke(band);

  // A soft sheen travelling around the silk (it would vanish on light themes).
  if (!palette.light) {
    const h = t * 0.9 - 2.2;
    const hx = c + Math.cos(h) * R;
    const hy = c + Math.sin(h) * R;
    const sheen = ctx.createRadialGradient(hx, hy, 0, hx, hy, R * 0.9);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = sheen;
    ctx.fill(band, 'evenodd');
  }
}

interface AuraRingProps {
  /**
   * Ring diameter, in px or any CSS length (defaults to a viewport-relative
   * clamp). The glow spills past it without affecting layout.
   */
  size?: number | string;
  className?: string;
}

/**
 * Loader visual: a silk ribbon of fine threads looping around a soft rounded
 * diamond, lit in the accent colors. It turns and breathes while its threads
 * roll along it, with a travelling sheen, a bloom from two blurred copies of
 * the canvas and an ambient halo (`aura-*` in globals.css). A static SVG
 * frame is server-rendered and cross-fades to the canvas once it draws; with
 * reduced motion the canvas draws a single still frame.
 */
export default function AuraRing({ size = RESPONSIVE_SIZE, className = '' }: AuraRingProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLCanvasElement>(null);
  const nearRef = useRef<HTMLCanvasElement>(null);
  const farRef = useRef<HTMLCanvasElement>(null);
  const gradientId = `aura-${useId().replace(/[^\w-]/g, '')}`;

  useEffect(() => {
    const scene = sceneRef.current;
    const main = mainRef.current;
    const ctx = main?.getContext('2d');
    const near = nearRef.current?.getContext('2d');
    const far = farRef.current?.getContext('2d');
    if (!scene || !main || !ctx || !near || !far) return;

    const layout: Layout = { box: 0, dpr: Math.min(window.devicePixelRatio || 1, MAX_DPR), threads: 0, rimWidth: 1 };
    const spine = createSpine();
    let palette = readPalette();
    let t = 0;
    const render = () => {
      if (!layout.box) return;
      drawRing(ctx, layout, t, palette, spine);
      for (const bloom of [near, far]) {
        bloom.clearRect(0, 0, bloom.canvas.width, bloom.canvas.height);
        bloom.drawImage(main, 0, 0, bloom.canvas.width, bloom.canvas.height);
      }
    };

    // The ring's size comes from CSS (it tracks the viewport), so the
    // canvases follow its layout width; transforms don't affect that.
    const resize = (width: number) => {
      const box = width * (1 + 2 * BLEED);
      if (!width || box === layout.box) return;
      layout.box = box;
      layout.threads = Math.round(Math.min(44, Math.max(18, width / 4)));
      layout.rimWidth = Math.min(1.2, Math.max(0.8, width / 150));
      main.width = Math.round(box * layout.dpr);
      main.height = main.width;
      // The blooms get blurred anyway, so half resolution is plenty.
      for (const bloom of [near, far]) {
        bloom.canvas.width = Math.round(main.width / 2);
        bloom.canvas.height = bloom.canvas.width;
      }
      render();
    };
    resize(parseFloat(getComputedStyle(scene).width));
    const observer = new ResizeObserver(([entry]) => resize(entry.contentRect.width));
    observer.observe(scene);

    let frame = 0;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const start = performance.now();
      let last = start;
      const tick = (now: number) => {
        frame = requestAnimationFrame(tick);
        if (now - last < MIN_FRAME_MS) return;
        last = now;
        t = (now - start) / 1000;
        render();
      };
      frame = requestAnimationFrame(tick);
    }
    // Swap the poster for the canvas (cross-fade in globals.css).
    scene.setAttribute('data-live', '');

    const stopWatching = onThemeChange(() => {
      palette = readPalette();
      render();
    });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      stopWatching();
    };
  }, []);

  return (
    <div
      ref={sceneRef}
      className={`aura-scene ${className}`}
      style={{ ['--aura-size' as string]: typeof size === 'number' ? `${size}px` : size }}
      aria-hidden="true"
    >
      <svg className="aura-layer aura-poster" viewBox={`0 0 ${POSTER_BOX} ${POSTER_BOX}`}>
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1={Math.round(POSTER_AXIS.x1)}
            y1={Math.round(POSTER_AXIS.y1)}
            x2={Math.round(POSTER_AXIS.x2)}
            y2={Math.round(POSTER_AXIS.y2)}
          >
            <stop offset="0" style={{ stopColor: 'var(--a3-500)' }} />
            <stop offset="0.5" style={{ stopColor: 'var(--a2-500)' }} />
            <stop offset="1" style={{ stopColor: 'var(--a-400)' }} />
          </linearGradient>
        </defs>
        <g fill={`url(#${gradientId})`} stroke={`url(#${gradientId})`}>
          <path className="aura-poster-band" d={POSTER.band} />
          {POSTER.threads.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </svg>
      <div className="aura-layer aura-live">
        <canvas ref={farRef} className="aura-bloom-far" />
        <canvas ref={nearRef} className="aura-bloom-near" />
        <canvas ref={mainRef} />
      </div>
    </div>
  );
}
