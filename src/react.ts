/*!
 * vitrio/react — React wrapper for the LiquidGlass effect.
 *
 * <LiquidGlass /> renders no DOM of its own: it creates a LiquidGlass core instance
 * (a fixed-position overlay appended to <body>) and keeps it in sync with the props.
 * React is a peer dependency and is not bundled.
 *
 *   import { useRef } from 'react';
 *   import { LiquidGlass } from 'vitrio/react';
 *
 *   function App() {
 *     const bgRef = useRef(null);
 *     return (
 *       <>
 *         <div ref={bgRef} className="scene">...</div>
 *         <LiquidGlass background={bgRef} width={360} height={220} scale={46} chroma={0.1} />
 *       </>
 *     );
 *   }
 *
 * @license MIT
 */
import { useEffect, useRef } from 'react';
import LiquidGlassCore, { DEFAULTS } from './vitrio.js';
import type { LiquidGlassParams } from './vitrio.js';

/** Anything that can designate the element to refract. */
export type BackgroundProp = Element | string | { current: Element | null } | null;

/** A place to receive the core instance: a callback or a ref-like object. */
export type GlassRef =
  | ((glass: LiquidGlassCore | null) => void)
  | { current: LiquidGlassCore | null };

export interface LiquidGlassProps extends Partial<LiquidGlassParams> {
  /** Element to refract: an Element, a CSS selector, or a React ref to an element. */
  background?: BackgroundProp;
  /** Whether the glass can be dragged. Create-time only. Default true. */
  draggable?: boolean;
  /** z-index of the lens layer (glass sits at z + 1). Create-time only. Default 100. */
  zIndex?: number;
  /** Screen X of the glass top-left. Reactive. Defaults to centered. */
  x?: number;
  /** Screen Y of the glass top-left. Reactive. Defaults to centered. */
  y?: number;
  /** Receives the LiquidGlass core instance (and null on unmount). */
  glassRef?: GlassRef;
  /** Called once the instance has been created. */
  onReady?: (glass: LiquidGlassCore) => void;
}

const PARAM_KEYS = Object.keys(DEFAULTS) as (keyof LiquidGlassParams)[];

function resolveBackground(bg: BackgroundProp | undefined): Element | null {
  if (!bg) return null;
  if (typeof bg === 'string') return document.querySelector(bg);
  if (bg instanceof Element) return bg;
  return bg.current;
}

function pickParams(props: LiquidGlassProps): Partial<LiquidGlassParams> {
  const out: Partial<LiquidGlassParams> = {};
  for (const k of PARAM_KEYS) {
    const v = props[k];
    if (v !== undefined) (out as Record<string, number | string>)[k] = v;
  }
  return out;
}

function assignGlassRef(ref: GlassRef | undefined, value: LiquidGlassCore | null): void {
  if (!ref) return;
  if (typeof ref === 'function') ref(value);
  else ref.current = value;
}

/** React component driving a LiquidGlass overlay. Renders nothing itself. */
export function LiquidGlass(props: LiquidGlassProps): null {
  const glassRef = useRef<LiquidGlassCore | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  /* Create once on mount, destroy on unmount (StrictMode-safe: destroy is complete). */
  useEffect(() => {
    const p = propsRef.current;
    const glass = new LiquidGlassCore({
      ...pickParams(p),
      background: resolveBackground(p.background),
      draggable: p.draggable,
      zIndex: p.zIndex,
      x: p.x, y: p.y,
    });
    glassRef.current = glass;
    assignGlassRef(p.glassRef, glass);
    p.onReady?.(glass);
    return () => {
      glass.destroy();
      glassRef.current = null;
      assignGlassRef(propsRef.current.glassRef, null);
    };
  }, []);

  /* Sync parameters; only push the ones that actually changed (avoids map rebuilds). */
  useEffect(() => {
    const glass = glassRef.current;
    if (!glass) return;
    const partial: Partial<LiquidGlassParams> = {};
    let dirty = false;
    for (const k of PARAM_KEYS) {
      const v = props[k];
      if (v !== undefined && v !== glass.params[k]) {
        (partial as Record<string, number | string>)[k] = v;
        dirty = true;
      }
    }
    if (dirty) glass.set(partial);
  }, PARAM_KEYS.map((k) => props[k])); // constant length, one slot per parameter

  /* Swap the refracted element when `background` changes. */
  const bg = props.background;
  useEffect(() => {
    const glass = glassRef.current;
    if (!glass) return;
    const el = resolveBackground(bg);
    if (el !== glass.background) glass.setBackground(el);
  }, [bg]);

  /* Reposition when x/y change. */
  const { x, y } = props;
  useEffect(() => {
    const glass = glassRef.current;
    if (!glass || x == null || y == null) return;
    if (x !== glass.lensX || y !== glass.lensY) glass.moveTo(x, y);
  }, [x, y]);

  return null;
}

export default LiquidGlass;
export { LiquidGlassCore, DEFAULTS };
export type { LiquidGlassParams, LiquidGlassOptions } from './vitrio.js';
