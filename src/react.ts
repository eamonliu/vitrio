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
import type { AttachPadding, LiquidGlassParams } from './vitrio.js';

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
  /**
   * Anchor to pin the glass to (element / selector / React ref). The glass follows the
   * anchor's screen rect every frame. Overrides x/y/width/height and disables dragging.
   */
  attachTo?: BackgroundProp;
  /** Extra glass size around the attached anchor's rect, in px. */
  attachPadding?: AttachPadding;
  /**
   * Pause refraction while the glass is moving (a cheap transform stands in), restoring
   * it on settle — keeps motion at 60 fps on engines with slow SVG filters.
   * 'auto' (default) = enabled on Gecko/Firefox. WebKit ignores it (always renders the
   * compositor approximation — Safari can't render feImage). Create-time only.
   */
  liteMotion?: boolean | 'auto';
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
      attachTo: resolveBackground(p.attachTo),
      attachPadding: p.attachPadding,
      liteMotion: p.liteMotion,
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

  /* Keep the anchor bound to the latest element. The anchor may resolve to null on the
     first attempts (refs and selector targets can appear after a later render in another
     subtree), so retry on animation frames until it exists. */
  const boundAnchor = useRef<Element | null>(null);
  const retryRaf = useRef(0);
  useEffect(() => {
    const bind = (): void => {
      retryRaf.current = 0;
      const glass = glassRef.current;
      const p = propsRef.current;
      if (!glass || p.attachTo === undefined) return;
      const el = resolveBackground(p.attachTo);
      if (!el && !boundAnchor.current) { retryRaf.current = requestAnimationFrame(bind); return; }
      if (el && el !== boundAnchor.current) {
        boundAnchor.current = el;
        glass.attach(el, p.attachPadding);
      }
    };
    cancelAnimationFrame(retryRaf.current);
    bind();
  });

  /* Reposition when x/y change. */
  const { x, y } = props;
  useEffect(() => {
    const glass = glassRef.current;
    if (!glass || x == null || y == null) return;
    if (x !== glass.lensX || y !== glass.lensY) glass.moveTo(x, y);
  }, [x, y]);

  return null;
}

/** Options for `useLiquidGlass` — every glass parameter plus overlay behaviour. */
export interface UseLiquidGlassOptions extends Partial<LiquidGlassParams> {
  /** Element to refract (element / selector / React ref). */
  background?: BackgroundProp;
  /** z-index of the lens layer. Default 100. */
  zIndex?: number;
  /** Extra glass size around the anchor's rect, in px. */
  padding?: AttachPadding;
  /** Pause refraction while moving ('auto' = Gecko only; WebKit always approximates). Create-time only. */
  liteMotion?: boolean | 'auto';
}

/**
 * Pin a glass plate to an anchor element — the idiomatic way to give an existing
 * component (a button, a card, a slider thumb...) a liquid-glass surface.
 *
 *   const btnRef = useRef<HTMLButtonElement>(null);
 *   const glass = useLiquidGlass(btnRef, { background: sceneRef, padding: 10, scale: 24 });
 *
 * The glass follows the anchor's rect every frame (transitions included), parameters are
 * reactive, and the returned ref holds the core instance (e.g. `glass.current?.refresh()`).
 */
export function useLiquidGlass(
  anchor: { current: Element | null },
  options: UseLiquidGlassOptions = {},
): { current: LiquidGlassCore | null } {
  const glassRef = useRef<LiquidGlassCore | null>(null);
  const boundAnchor = useRef<Element | null>(null);
  const retryRaf = useRef(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  /* Destroy on unmount. */
  useEffect(() => () => {
    cancelAnimationFrame(retryRaf.current);
    glassRef.current?.destroy();
    glassRef.current = null;
  }, []);

  /* Create lazily once the anchor element exists, then keep anchor + background bound.
     The anchor ref may still be null here — e.g. Radix slider thumbs mount only after
     measuring, and that re-render happens inside the Radix subtree where this hook
     can't see it — so when it's missing we retry on animation frames. */
  useEffect(() => {
    const tryBind = (): void => {
      retryRaf.current = 0;
      const o = optionsRef.current;
      const el = anchor.current;
      let glass = glassRef.current;
      if (!glass) {
        if (!el) { retryRaf.current = requestAnimationFrame(tryBind); return; }
        glass = new LiquidGlassCore({
          ...pickParams(o),
          background: resolveBackground(o.background),
          attachTo: el,
          attachPadding: o.padding,
          liteMotion: o.liteMotion,
          draggable: false,
          zIndex: o.zIndex,
        });
        glassRef.current = glass;
        boundAnchor.current = el;
        return;
      }
      if (el !== boundAnchor.current && el) {
        boundAnchor.current = el;
        glass.attach(el, o.padding);
      }
      const bg = resolveBackground(o.background);
      if (bg !== glass.background) glass.setBackground(bg);
    };
    cancelAnimationFrame(retryRaf.current);
    tryBind();
  });

  /* Sync parameters; only push the ones that actually changed. */
  useEffect(() => {
    const glass = glassRef.current;
    if (!glass) return;
    const partial: Partial<LiquidGlassParams> = {};
    let dirty = false;
    for (const k of PARAM_KEYS) {
      const v = options[k];
      if (v !== undefined && v !== glass.params[k]) {
        (partial as Record<string, number | string>)[k] = v;
        dirty = true;
      }
    }
    if (dirty) glass.set(partial);
  }, PARAM_KEYS.map((k) => options[k]));

  return glassRef;
}

export default LiquidGlass;
export { LiquidGlassCore, DEFAULTS };
export type { AttachPadding, LiquidGlassParams, LiquidGlassOptions } from './vitrio.js';
