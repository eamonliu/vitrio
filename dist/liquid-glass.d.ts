// Type definitions for liquid-glass-js

export interface LiquidGlassParams {
  /** Glass width in CSS px. */
  width: number;
  /** Glass height in CSS px. */
  height: number;
  /** Corner radius in CSS px. */
  radius: number;
  /** Refraction strength (max edge displacement in px). */
  scale: number;
  /** Bezel width: how far the curved surface reaches inward from the edge, in px. */
  depth: number;
  /** Surface profile exponent: ~2 spherical, ~4 squircle (Apple-like). */
  curvature: number;
  /** Lens shape: +1 convex (magnify), 0 flat, -1 concave (shrink). */
  convexity: number;
  /** Chromatic aberration amount. */
  chroma: number;
  /** Frost / backdrop blur in px (0 = clear). */
  blur: number;
  /** Outer/inner glow strength (0..1). */
  glow: number;
  /** Specular highlight strength (0..1). */
  edge: number;
  /** Specular light angle in degrees. */
  specAngle: number;
  /** Tint opacity (0..1). */
  tint: number;
  /** Tint colour (any CSS colour). */
  tintColor: string;
}

export interface LiquidGlassOptions extends Partial<LiquidGlassParams> {
  /** Element to refract. It is cloned (clone mode), so the effect works cross-browser. */
  background?: Element | null;
  /** z-index of the lens layer; the draggable glass sits at z + 1. Default 100. */
  zIndex?: number;
  /** Whether the glass can be dragged with a pointer. Default true. */
  draggable?: boolean;
  /** Initial screen X of the glass top-left. Defaults to centered. */
  x?: number;
  /** Initial screen Y of the glass top-left. Defaults to centered. */
  y?: number;
}

/** Built-in default parameters. */
export declare const DEFAULTS: LiquidGlassParams;

export declare class LiquidGlass {
  constructor(options?: LiquidGlassOptions);
  static DEFAULTS: LiquidGlassParams;

  readonly params: LiquidGlassParams;
  /** Screen X of the glass top-left. */
  lensX: number;
  /** Screen Y of the glass top-left. */
  lensY: number;
  /** The element being refracted (cloned). */
  background: Element | null;

  /** Update one or more parameters; rebuilds the maps only when needed. */
  set(partial: Partial<LiquidGlassParams>): this;
  /** Get a copy of all parameters. */
  get(): LiquidGlassParams;
  /** Get a single parameter. */
  get<K extends keyof LiquidGlassParams>(key: K): LiquidGlassParams[K];
  /** Move the glass; x/y are the screen coordinates of its top-left corner. */
  moveTo(x: number, y: number): this;
  /** Re-clone the background and rebuild. Call after the background changes. */
  refresh(): this;
  /** Swap the background element being refracted. */
  setBackground(el: Element | null): this;
  /** Remove all DOM, filters and listeners created by this instance. */
  destroy(): void;
}

export interface LiquidGlassHTMLElement extends HTMLElement {
  glass?: LiquidGlass;
}

/** The <liquid-glass> custom element constructor (null in non-DOM environments). */
export declare const LiquidGlassElement: (new () => LiquidGlassHTMLElement) | null;

export default LiquidGlass;

declare global {
  interface HTMLElementTagNameMap {
    'liquid-glass': LiquidGlassHTMLElement;
  }
  interface Window {
    LiquidGlass: typeof LiquidGlass;
    LiquidGlassElement: (new () => LiquidGlassHTMLElement) | null;
  }
}
