'use client';

import { useEffect, useId, useRef } from 'react';
import { isLightTheme, onThemeChange, resolveCssColors } from '@/lib/themeColors';

const TAU = Math.PI * 2;
/** Points per loop, and threads wound around the ribbon. */
const STEPS = 180;
const THREADS = 44;
/**
 * Ribbon cross-section semi-axes, in mean radii: the ribbon is 2·A wide
 * where it lies flat (the lobes) and 2·B where it turns edge-on (the
 * twists between them).
 */
const TUBE_A = 0.17;
const TUBE_B = 0.05;
/** Breathing period in seconds; matches the aura-breathe halo in globals.css. */
const BREATH_S = 3.6;
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
  return {
    theta,
    cos: Math.cos(theta),
    sin: Math.sin(theta),
    cos4: Math.cos(4 * theta),
    sin4: Math.sin(4 * theta),
  };
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
 * four-lobed "rounded diamond" that slowly turns and breathes. Around it the
 * ribbon is a flattened tube that lies flat at the lobes and twists edge-on
 * between them, so its threads cross there without pinching shut.
 */
function sampleSpine(spine: Spine, t: number) {
  const scale = 1 + 0.018 * Math.sin((TAU * t) / BREATH_S);
  spine.scale = scale;
  for (let k = 0; k < STEPS; k++) {
    const { theta } = ANGLES[k];
    const phi = theta - t * 0.32; // slow rotation
    spine.center[k] =
      scale * (1 + 0.075 * Math.cos(4 * phi) + 0.025 * Math.sin(3 * theta - t * 0.6 + 1.3));
    const twist = 2 * phi + t * 0.7;
    const cosT = Math.cos(twist);
    const sinT = Math.sin(twist);
    spine.cosT[k] = cosT;
    spine.sinT[k] = sinT;
    spine.half[k] = scale * Math.hypot(TUBE_A * cosT, TUBE_B * sinT);
  }
}

/** Radius (in mean radii) of thread `i` of `count` at each step. */
function threadRadius(spine: Spine, i: number, count: number, t: number) {
  const angle = (TAU * (i + 0.5)) / count; // position around the tube
  const a = TUBE_A * spine.scale * Math.cos(angle);
  const b = TUBE_B * spine.scale * Math.sin(angle);
  // A slow per-thread drift (0.005·sin(4θ + p)) keeps neighbours from fusing.
  const p = 0.9 * i + 0.8 * t;
  const driftSin = 0.005 * Math.cos(p);
  const driftCos = 0.005 * Math.sin(p);
  return (k: number) =>
    spine.center[k] +
    a * spine.cosT[k] -
    b * spine.sinT[k] +
    ANGLES[k].sin4 * driftSin +
    ANGLES[k].cos4 * driftCos;
}

/** Accent gradient axis through a `box`-sized layer, tilted by `angle`: violet → cyan. */
function gradientAxis(box: number, angle: number) {
  const c = box / 2;
  const half = box * RADIUS * 1.3;
  const dx = Math.cos(angle) * half;
  const dy = Math.sin(angle) * half;
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
const POSTER_AXIS = gradientAxis(POSTER_BOX, 0.35);
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

interface Palette {
  from: string;
  via: string;
  to: string;
  light: boolean;
}

function readPalette(): Palette {
  return { ...resolveCssColors(ACCENT_TOKENS), light: isLightTheme() };
}

/** Draws one frame of the ribbon into a canvas that is `box` css px square. */
function drawRing(
  ctx: CanvasRenderingContext2D,
  box: number,
  dpr: number,
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

  const { x1, y1, x2, y2 } = gradientAxis(box, 0.35 + 0.22 * Math.sin(t * 0.4));
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  gradient.addColorStop(0, palette.from);
  gradient.addColorStop(0.5, palette.via);
  gradient.addColorStop(1, palette.to);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, box, box);
  // Additive blending makes crossings glow on dark themes but washes out
  // to white on light ones, where plain alpha blending reads better.
  ctx.globalCompositeOperation = palette.light ? 'source-over' : 'lighter';
  ctx.fillStyle = gradient;
  ctx.strokeStyle = gradient;

  // Silk body: everything between the two edges.
  ctx.globalAlpha = palette.light ? 0.16 : 0.22;
  ctx.fill(band, 'evenodd');

  // Threads wound around the ribbon.
  ctx.lineWidth = 0.6;
  for (let i = 0; i < THREADS; i++) {
    ctx.globalAlpha = (palette.light ? 0.2 : 0.12) + 0.04 * Math.sin(i * 1.7);
    ctx.beginPath();
    traceLoop(ctx, c, R, threadRadius(spine, i, THREADS, t));
    ctx.stroke();
  }

  // Bright rims along both edges.
  ctx.globalAlpha = palette.light ? 0.8 : 0.62;
  ctx.lineWidth = 1.1;
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
  /** Ring diameter in pixels. The glow spills past it without affecting layout. */
  size?: number;
  className?: string;
}

/**
 * Loader visual: a silk ribbon of fine threads looping around a soft rounded
 * diamond in the accent gradient. It turns, twists and breathes, with a sheen
 * travelling along it, a bloom from two blurred copies of the canvas and an
 * ambient halo (`aura-*` in globals.css). A static SVG frame is
 * server-rendered and cross-fades to the canvas once it draws; with reduced
 * motion the canvas draws a single still frame.
 */
export default function AuraRing({ size = 120, className = '' }: AuraRingProps) {
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

    const box = size * (1 + 2 * BLEED);
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    main.width = Math.round(box * dpr);
    main.height = main.width;
    // The blooms get blurred anyway, so half resolution is plenty.
    for (const bloom of [near, far]) {
      bloom.canvas.width = Math.round(main.width / 2);
      bloom.canvas.height = bloom.canvas.width;
    }

    const spine = createSpine();
    let palette = readPalette();
    const render = (t: number) => {
      drawRing(ctx, box, dpr, t, palette, spine);
      for (const bloom of [near, far]) {
        bloom.clearRect(0, 0, bloom.canvas.width, bloom.canvas.height);
        bloom.drawImage(main, 0, 0, bloom.canvas.width, bloom.canvas.height);
      }
    };

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    render(0);
    if (!still) {
      const start = performance.now();
      let last = start;
      const tick = (now: number) => {
        frame = requestAnimationFrame(tick);
        if (now - last < MIN_FRAME_MS) return;
        last = now;
        render((now - start) / 1000);
      };
      frame = requestAnimationFrame(tick);
    }
    // Swap the poster for the canvas (cross-fade in globals.css).
    scene.setAttribute('data-live', '');

    const stopWatching = onThemeChange(() => {
      palette = readPalette();
      if (still) render(0);
    });
    return () => {
      cancelAnimationFrame(frame);
      stopWatching();
    };
  }, [size]);

  return (
    <div
      ref={sceneRef}
      className={`aura-scene ${className}`}
      style={{ width: size, height: size, ['--aura-size' as string]: `${size}px` }}
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
