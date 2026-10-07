"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import AuraRing from "@/components/AuraRing";

/** One ring size everywhere, so the loader looks the same wherever it shows. */
const RING_SIZE = 168;

const subscribeNever = () => () => {};

/** False during SSR and hydration, true once mounted in the browser. */
function useIsClient() {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}

interface ScreenLayerProps {
  /** Announced to screen readers; the loader itself shows no text. */
  label: string;
  sublabel?: string;
  className?: string;
  /**
   * Render into <body> so `position: fixed` stays relative to the viewport.
   * Needed inside the app shell: .sig-page keeps a transform after its
   * entrance animation and the sidebar has a backdrop filter, and either
   * would otherwise become the containing block.
   */
  portal?: boolean;
  children: ReactNode;
}

/** Fixed full-viewport layer that keeps its content dead center on screen. */
function ScreenLayer({ label, sublabel, className = "", portal = true, children }: ScreenLayerProps) {
  const isClient = useIsClient();
  const layer = (
    <div
      className={`fixed inset-0 flex items-center justify-center ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{sublabel ? `${label}. ${sublabel}` : label}</span>
      {children}
    </div>
  );
  if (!portal) return layer;
  return isClient ? createPortal(layer, document.body) : null;
}

interface LoaderOverlayProps {
  /** Mount/unmount the overlay. Keep it bound to a mutation's `isPending`. */
  show: boolean;
  label: string;
  sublabel?: string;
}

/**
 * Full-screen blocking loader for in-flight actions (launch / relaunch
 * campaign, etc.). Blurs the app, locks scroll, and announces politely.
 */
export function LoaderOverlay({ show, label, sublabel }: LoaderOverlayProps) {
  useEffect(() => {
    if (!show) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [show]);

  if (!show) return null;

  return (
    <ScreenLayer
      label={label}
      sublabel={sublabel}
      className="l3d-overlay z-[100] bg-zinc-950/80 backdrop-blur-md"
    >
      <AuraRing size={RING_SIZE} />
    </ScreenLayer>
  );
}

interface PageLoaderProps {
  label?: string;
  sublabel?: string;
}

/**
 * Loader for page renders that have no skeleton state. Floats at the
 * center of the screen without blocking the surrounding chrome.
 */
export function PageLoader({ label = "Loading", sublabel }: PageLoaderProps) {
  return (
    <ScreenLayer label={label} sublabel={sublabel} className="pointer-events-none z-40">
      <AuraRing size={RING_SIZE} />
    </ScreenLayer>
  );
}

interface LoadingScreenProps {
  label?: string;
  sublabel?: string;
}

/**
 * Full-viewport boot screen, e.g. the session check. Rendered in place
 * (not portaled) so the ring is already in the server HTML; use it outside
 * the app shell, where no transformed ancestor can trap `position: fixed`.
 */
export function LoadingScreen({ label = "Loading", sublabel }: LoadingScreenProps) {
  return (
    <ScreenLayer label={label} sublabel={sublabel} className="bg-zinc-950" portal={false}>
      <AuraRing size={RING_SIZE} />
    </ScreenLayer>
  );
}

export default AuraRing;
