/*!
 * vitrio — Cross-browser liquid-glass refraction (Chrome / Safari / Firefox)
 *
 * Built on the SVG feDisplacementMap primitive: a displacement map is generated on the
 * fly from a "height field" optical model, bending the real background pixels — convex
 * surfaces magnify, concave shrink — with chromatic aberration and a normal-based
 * specular highlight.
 *
 * Refraction source = clone mode: the background element you point it at is cloned and
 * refracted, which keeps it working across Chrome, Safari and Firefox.
 *
 * --- Usage A: JavaScript class ---
 *   import LiquidGlass from 'vitrio';
 *   const glass = new LiquidGlass({
 *     background: document.querySelector('#scene'), // element to refract (it gets cloned)
 *     width: 360, height: 220, radius: 48,
 *     scale: 46, chroma: 0.1, tint: 0,              // see DEFAULTS for the full list
 *   });
 *   glass.set({ scale: 60 }); // update params
 *   glass.moveTo(x, y);       // move (screen position of the glass top-left)
 *   glass.refresh();          // re-clone after the background changes
 *   glass.destroy();          // tear down
 *
 * --- Usage B: Web Component ---
 *   import 'vitrio';  // registers <liquid-glass>
 *   <liquid-glass background="#scene" width="360" height="220"
 *                  scale="46" chroma="0.1" tint="0"></liquid-glass>
 *
 * @license MIT
 */

const SVGNS = 'http://www.w3.org/2000/svg';
const XLINK = 'http://www.w3.org/1999/xlink';
const clamp = (v: number, a: number, b: number): number => Math.min(Math.max(v, a), b);

/* Signed distance field of a rounded rectangle: negative inside, 0 on the edge, positive outside. */
function roundedRectSDF(px: number, py: number, hw: number, hh: number, r: number): number {
  const qx = Math.abs(px) - hw + r;
  const qy = Math.abs(py) - hh + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}

/** All tunable glass parameters. */
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

/** Constructor options: every parameter, plus placement/behaviour. */
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

/** Default parameters (based on a "strong refraction" look, with tint 0 and a light chroma). */
export const DEFAULTS: LiquidGlassParams = {
  width: 360, height: 220, radius: 48,
  scale: 46, depth: 40, curvature: 2.2, convexity: 1.0, chroma: 0.1,
  blur: 0, glow: 0.18, edge: 0.7, specAngle: 135,
  tint: 0, tintColor: '#ffffff',
};

/* Params that only touch CSS variables (no map rebuild). Everything else rebuilds the maps. */
const LIVE: ReadonlySet<keyof LiquidGlassParams> = new Set<keyof LiquidGlassParams>([
  'blur', 'glow', 'tint', 'tintColor',
]);

let _uid = 0;
let _styleEl: HTMLStyleElement | null = null;

/* Inject the shared component stylesheet once. */
function injectStyle(): void {
  if (_styleEl || typeof document === 'undefined') return;
  _styleEl = document.createElement('style');
  _styleEl.id = 'liquid-glass-style';
  _styleEl.textContent =
    `.lqg-lens{position:fixed;top:0;left:0;overflow:hidden;pointer-events:none;}` +
    `.lqg-lens-inner{position:absolute;top:0;left:0;}` +
    `.lqg-glass{position:fixed;top:0;left:0;box-sizing:border-box;` +
      `-webkit-backdrop-filter:blur(var(--lqg-blur,0px));backdrop-filter:blur(var(--lqg-blur,0px));` +
      `background:color-mix(in srgb, var(--lqg-tint-color,#fff) calc(var(--lqg-tint,0) * 100%), transparent);` +
      `box-shadow:0 10px 40px rgba(0,0,0,.35),0 2px 8px rgba(0,0,0,.25),` +
        `inset 0 1px 1px rgba(255,255,255,.25),inset 0 0 0 1px rgba(255,255,255,.06),` +
        `0 0 calc(var(--lqg-glow,0) * 60px) rgba(255,255,255, calc(var(--lqg-glow,0) * .55));` +
      `touch-action:none;will-change:transform;}` +
    `.lqg-glass.lqg-draggable{pointer-events:auto;cursor:grab;}` +
    `.lqg-glass.lqg-draggable:active{cursor:grabbing;}`;
  (document.head || document.documentElement).appendChild(_styleEl);
}

/** LiquidGlass — programmatic API. */
export class LiquidGlass {
  /** Built-in default parameters. */
  static DEFAULTS: LiquidGlassParams = DEFAULTS;

  /** Current parameters (mutate via `set()`). */
  readonly params: LiquidGlassParams;
  /** Screen X of the glass top-left. */
  lensX = 0;
  /** Screen Y of the glass top-left. */
  lensY = 0;
  /** The element being refracted (cloned). */
  background: Element | null;

  private uid: string;
  private zIndex: number;
  private draggable: boolean;
  private margin = 60;
  private bgX = 0;
  private bgY = 0;
  private _seq = 0;
  private _dragMode = false;
  private _raf = 0;
  private _syncRaf = 0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private specCanvas: HTMLCanvasElement;
  private specCtx: CanvasRenderingContext2D;

  private svg!: SVGSVGElement;
  private filterFull!: SVGFilterElement;
  private filterDrag!: SVGFilterElement;
  private feImage!: SVGFEImageElement;
  private feImageDrag!: SVGFEImageElement;
  private feSpec!: SVGFEImageElement;
  private feSpecDrag!: SVGFEImageElement;
  private dispR!: SVGFEDisplacementMapElement;
  private dispG!: SVGFEDisplacementMapElement;
  private dispB!: SVGFEDisplacementMapElement;
  private dispDrag!: SVGFEDisplacementMapElement;
  private lensEl!: HTMLDivElement;
  private lensInner!: HTMLDivElement;
  private glassEl!: HTMLDivElement;
  private _onSync!: () => void;

  constructor(opts: LiquidGlassOptions = {}) {
    injectStyle();
    this.uid = 'lqg' + (++_uid);
    this.background = opts.background || null;
    this.zIndex = opts.zIndex != null ? opts.zIndex : 100;
    this.draggable = opts.draggable !== false;

    this.params = { ...DEFAULTS };
    for (const k of Object.keys(DEFAULTS) as (keyof LiquidGlassParams)[]) {
      const v = opts[k];
      if (v != null) (this.params as Record<keyof LiquidGlassParams, number | string>)[k] = v;
    }

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.specCanvas = document.createElement('canvas');
    this.specCtx = this.specCanvas.getContext('2d', { willReadFrequently: true })!;

    this._build();
    this._bindEvents();

    const x = opts.x != null ? opts.x : (window.innerWidth - this.params.width) / 2;
    const y = opts.y != null ? opts.y : (window.innerHeight - this.params.height) / 2;
    this.lensX = x; this.lensY = y;
    this.refresh();
  }

  /* ---------- Build DOM and the per-instance SVG filters (unique ids) ---------- */
  private _build(): void {
    const u = this.uid;
    const cm = (ch: number): string => { // feColorMatrix that keeps a single colour channel
      const m = ['0 0 0 0 0', '0 0 0 0 0', '0 0 0 0 0', '0 0 0 1 0'];
      m[ch] = ch === 0 ? '1 0 0 0 0' : ch === 1 ? '0 1 0 0 0' : '0 0 1 0 0';
      return m.join('  ');
    };
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    svg.innerHTML =
      `<defs>` +
      `<filter id="${u}-full" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
        `<feFlood flood-color="rgb(128,128,128)" result="neutral"/>` +
        `<feImage id="${u}-map" x="0" y="0" preserveAspectRatio="none" result="raw"/>` +
        `<feComposite in="raw" in2="neutral" operator="over" result="map"/>` +
        `<feDisplacementMap id="${u}-dr" in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G" result="dr"/>` +
        `<feColorMatrix in="dr" type="matrix" values="${cm(0)}" result="cr"/>` +
        `<feDisplacementMap id="${u}-dg" in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G" result="dg"/>` +
        `<feColorMatrix in="dg" type="matrix" values="${cm(1)}" result="cg"/>` +
        `<feDisplacementMap id="${u}-db" in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G" result="db"/>` +
        `<feColorMatrix in="db" type="matrix" values="${cm(2)}" result="cb"/>` +
        `<feBlend in="cr" in2="cg" mode="screen" result="rg"/>` +
        `<feBlend in="rg" in2="cb" mode="screen" result="rgb"/>` +
        `<feImage id="${u}-spec" x="0" y="0" preserveAspectRatio="none" result="spec"/>` +
        `<feBlend in="spec" in2="rgb" mode="screen"/>` +
      `</filter>` +
      `<filter id="${u}-drag" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
        `<feFlood flood-color="rgb(128,128,128)" result="neutral"/>` +
        `<feImage id="${u}-map-d" x="0" y="0" preserveAspectRatio="none" result="raw"/>` +
        `<feComposite in="raw" in2="neutral" operator="over" result="map"/>` +
        `<feDisplacementMap id="${u}-dd" in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G" result="rgb"/>` +
        `<feImage id="${u}-spec-d" x="0" y="0" preserveAspectRatio="none" result="spec"/>` +
        `<feBlend in="spec" in2="rgb" mode="screen"/>` +
      `</filter>` +
      `</defs>`;
    document.body.appendChild(svg);
    this.svg = svg;
    const q = <T extends Element>(id: string): T => svg.querySelector('#' + CSS.escape(id)) as T;
    this.filterFull = q<SVGFilterElement>(u + '-full');
    this.filterDrag = q<SVGFilterElement>(u + '-drag');
    this.feImage = q<SVGFEImageElement>(u + '-map');
    this.feImageDrag = q<SVGFEImageElement>(u + '-map-d');
    this.feSpec = q<SVGFEImageElement>(u + '-spec');
    this.feSpecDrag = q<SVGFEImageElement>(u + '-spec-d');
    this.dispR = q<SVGFEDisplacementMapElement>(u + '-dr');
    this.dispG = q<SVGFEDisplacementMapElement>(u + '-dg');
    this.dispB = q<SVGFEDisplacementMapElement>(u + '-db');
    this.dispDrag = q<SVGFEDisplacementMapElement>(u + '-dd');

    this.lensEl = document.createElement('div');
    this.lensEl.className = 'lqg-lens';
    this.lensEl.style.zIndex = String(this.zIndex);
    this.lensInner = document.createElement('div');
    this.lensInner.className = 'lqg-lens-inner';
    this.lensEl.appendChild(this.lensInner);

    this.glassEl = document.createElement('div');
    this.glassEl.className = 'lqg-glass' + (this.draggable ? ' lqg-draggable' : '');
    this.glassEl.style.zIndex = String(this.zIndex + 1);

    document.body.appendChild(this.lensEl);
    document.body.appendChild(this.glassEl);
    this._applyVars();
  }

  /* ---------- Background clone + alignment ---------- */
  private _cloneBackground(): void {
    this.lensInner.innerHTML = '';
    const bg = this.background;
    if (!bg) return;
    // Keep ids: the background's styling may rely on id selectors (e.g. #bg / #bg h1).
    // The clone is an aria-hidden static snapshot; duplicate ids only affect CSS matching,
    // not the page's own getElementById/querySelector (the original comes first in the DOM).
    const clone = bg.cloneNode(true) as HTMLElement;
    clone.style.position = 'absolute';
    clone.style.inset = '0';
    clone.style.margin = '0';
    clone.setAttribute('aria-hidden', 'true');
    this.lensInner.appendChild(clone);
  }

  private _syncBg(): void {
    if (this.background) {
      const r = this.background.getBoundingClientRect();
      this.bgX = r.left; this.bgY = r.top;
      this.lensInner.style.width = r.width + 'px';
      this.lensInner.style.height = r.height + 'px';
    } else {
      this.bgX = 0; this.bgY = 0;
      this.lensInner.style.width = window.innerWidth + 'px';
      this.lensInner.style.height = window.innerHeight + 'px';
    }
  }

  /** Re-clone the background, rebuild the maps and re-align. Call after the background changes. */
  refresh(): this {
    this._cloneBackground();
    this._syncBg();
    this.generateMap(); // also calls placeLens + commit
    return this;
  }

  /* ---------- Displacement + specular maps (height-field optical model) ---------- */
  private generateMap(): void {
    const p = this.params;
    const W = p.width, H = p.height;
    const M = Math.max(16, Math.ceil(p.scale * (1 + clamp(p.chroma, 0, 0.95))) + 12);
    this.margin = M;
    const OW = W + 2 * M, OH = H + 2 * M;
    const hw = W / 2, hh = H / 2;
    const rr = Math.min(p.radius, hw, hh);

    // Thickness profile: linear blend between convex (squircle) and concave. Displacement is
    // proportional to the slope and points inward, so a convex surface magnifies.
    const bezel = Math.max(1, p.depth);
    const k = Math.max(1.2, p.curvature);
    const blend = (clamp(p.convexity, -1, 1) + 1) / 2;
    const profile = (t: number): number => {
      t = clamp(t, 0, 1);
      const q = 1 - t;
      const convex = Math.pow(1 - Math.pow(q, k), 1 / k);
      return (1 - convex) + (convex - (1 - convex)) * blend;
    };
    const dpp = 0.5 / bezel;

    const res = Math.min(1, 360 / Math.max(OW, OH));
    const mw = Math.max(2, Math.round(OW * res));
    const mh = Math.max(2, Math.round(OH * res));
    const cv = this.canvas; cv.width = mw; cv.height = mh;
    const img = this.ctx.createImageData(mw, mh);
    const data = img.data;
    const N = mw * mh;
    const rx = new Float32Array(N), ry = new Float32Array(N), sp = new Float32Array(N);
    let maxAbs = 1e-6, maxSpec = 1e-6;
    const la = p.specAngle * Math.PI / 180;
    const Lx = Math.cos(la), Ly = -Math.sin(la);
    const SHININESS = 4;
    const e = Math.max(0.75, 0.75 / res);
    const sdf = (x: number, y: number): number => roundedRectSDF(x, y, hw, hh, rr);

    let idx = 0;
    for (let y = 0; y < mh; y++) {
      for (let x = 0; x < mw; x++, idx++) {
        const px = (x + 0.5) / mw * OW - OW / 2;
        const py = (y + 0.5) / mh * OH - OH / 2;
        const d = sdf(px, py);
        const din = -d; // depth inside the lens (>= 0 inside)
        let mag = 0;
        if (din >= 0 && din <= bezel) {
          const t = din / bezel;
          mag = (profile(t + dpp) - profile(t - dpp)) / (2 * dpp); // signed slope
        }
        let gx = sdf(px + e, py) - sdf(px - e, py);
        let gy = sdf(px, py + e) - sdf(px, py - e);
        const gl = Math.hypot(gx, gy) || 1; gx /= gl; gy /= gl;

        // Specular: brighter where the surface is steep and its normal faces the light.
        const align = gx * Lx + gy * Ly;
        const sv = Math.abs(mag) * (Math.pow(Math.max(0, align), SHININESS) + 0.3 * Math.pow(Math.max(0, -align), SHININESS));
        sp[idx] = sv; if (sv > maxSpec) maxSpec = sv;

        const dx = -gx * mag, dy = -gy * mag; // inward = magnify (convex), outward = shrink (concave)
        rx[idx] = dx; ry[idx] = dy;
        const m = Math.max(Math.abs(dx), Math.abs(dy));
        if (m > maxAbs) maxAbs = m;
      }
    }

    for (let i = 0; i < N; i++) {
      data[i * 4]     = clamp(rx[i] / maxAbs * 0.5 + 0.5, 0, 1) * 255;
      data[i * 4 + 1] = clamp(ry[i] / maxAbs * 0.5 + 0.5, 0, 1) * 255;
      data[i * 4 + 2] = 128;
      data[i * 4 + 3] = 255;
    }
    this.ctx.putImageData(img, 0, 0);
    const url = cv.toDataURL();

    // Specular image: white, alpha = strength * edge.
    this.specCanvas.width = mw; this.specCanvas.height = mh;
    const simg = this.specCtx.createImageData(mw, mh);
    const sd = simg.data;
    for (let i = 0; i < N; i++) {
      const a = clamp(Math.pow(sp[i] / maxSpec, 0.9) * p.edge, 0, 1);
      sd[i * 4] = 255; sd[i * 4 + 1] = 255; sd[i * 4 + 2] = 255; sd[i * 4 + 3] = a * 255;
    }
    this.specCtx.putImageData(simg, 0, 0);
    const specUrl = this.specCanvas.toDataURL();

    this.lensEl.style.width = OW + 'px';
    this.lensEl.style.height = OH + 'px';
    this.lensEl.style.clipPath = `inset(${M}px round ${rr}px)`; // show only the lens shape
    this._setImg([this.feImage, this.feImageDrag], OW, OH, url);
    this._setImg([this.feSpec, this.feSpecDrag], OW, OH, specUrl);

    this.placeLens();
    this.updateScales();
    this.commit();
  }

  private _setImg(list: SVGFEImageElement[], w: number, h: number, href: string): void {
    for (const fe of list) {
      fe.setAttribute('width', String(w));
      fe.setAttribute('height', String(h));
      fe.setAttribute('href', href);
      fe.setAttributeNS(XLINK, 'href', href);
    }
  }

  private updateScales(): void {
    const s = this.params.scale, c = clamp(this.params.chroma, 0, 0.95), base = 2 * s;
    this.dispR.setAttribute('scale', (base * (1 + c)).toFixed(2));
    this.dispG.setAttribute('scale', base.toFixed(2));
    this.dispB.setAttribute('scale', (base * (1 - c)).toFixed(2));
    this.dispDrag.setAttribute('scale', base.toFixed(2));
  }

  /* Safari caches filter output by id; bump the id after a map update to force a refresh. */
  private commit(): void {
    this._seq++;
    const el = this._dragMode ? this.filterDrag : this.filterFull;
    const id = (this._dragMode ? this.uid + '-drag-' : this.uid + '-full-') + this._seq;
    el.setAttribute('id', id);
    this.lensEl.style.filter = 'url(#' + id + ')';
  }

  private setDragMode(on: boolean): void { this._dragMode = on; this.commit(); }

  /* Position the lens window and align the cloned background to the real one. Integer-snapped
     so the clone shares the pixel grid with the original (avoids text shimmer). */
  private placeLens(): void {
    const M = this.margin;
    const lx = Math.round(this.lensX) - M, ly = Math.round(this.lensY) - M;
    this.lensEl.style.left = lx + 'px';
    this.lensEl.style.top = ly + 'px';
    this.lensInner.style.left = (this.bgX - lx) + 'px';
    this.lensInner.style.top = (this.bgY - ly) + 'px';
    const p = this.params;
    const g = this.glassEl.style;
    g.width = p.width + 'px';
    g.height = p.height + 'px';
    g.borderRadius = Math.min(p.radius, p.width / 2, p.height / 2) + 'px';
    g.transform = `translate(${Math.round(this.lensX)}px, ${Math.round(this.lensY)}px)`;
  }

  private _applyVars(): void {
    const g = this.glassEl.style, p = this.params;
    g.setProperty('--lqg-blur', p.blur + 'px');
    g.setProperty('--lqg-glow', String(p.glow));
    g.setProperty('--lqg-tint', String(p.tint));
    g.setProperty('--lqg-tint-color', p.tintColor);
  }

  /* ---------- Public API ---------- */

  /** Update one or more parameters. Rebuilds the maps only when needed. */
  set(partial: Partial<LiquidGlassParams>): this {
    let regen = false;
    for (const key of Object.keys(partial) as (keyof LiquidGlassParams)[]) {
      if (!(key in this.params)) continue;
      const v = partial[key];
      if (v === undefined) continue;
      (this.params as Record<keyof LiquidGlassParams, number | string>)[key] = v;
      if (!LIVE.has(key)) regen = true;
    }
    this._applyVars();
    if (regen) { cancelAnimationFrame(this._raf); this._raf = requestAnimationFrame(() => this.generateMap()); }
    else { this.placeLens(); this.updateScales(); this.commit(); }
    return this;
  }

  /** Get a copy of all parameters. */
  get(): LiquidGlassParams;
  /** Get a single parameter. */
  get<K extends keyof LiquidGlassParams>(key: K): LiquidGlassParams[K];
  get(key?: keyof LiquidGlassParams): LiquidGlassParams | LiquidGlassParams[keyof LiquidGlassParams] {
    return key ? this.params[key] : { ...this.params };
  }

  /** Move the glass. x/y are the screen coordinates of its top-left corner. */
  moveTo(x: number, y: number): this { this.lensX = x; this.lensY = y; this.placeLens(); return this; }

  /** Swap the background element being refracted. */
  setBackground(el: Element | null): this { this.background = el; this.refresh(); return this; }

  /** Remove all DOM, filters and listeners created by this instance. */
  destroy(): void {
    cancelAnimationFrame(this._raf); cancelAnimationFrame(this._syncRaf);
    window.removeEventListener('scroll', this._onSync, true);
    window.removeEventListener('resize', this._onSync);
    this.glassEl.remove(); this.lensEl.remove(); this.svg.remove();
  }

  /* ---------- Events ---------- */
  private _bindEvents(): void {
    this._onSync = () => {
      if (this._syncRaf) return;
      this._syncRaf = requestAnimationFrame(() => { this._syncRaf = 0; this._syncBg(); this.placeLens(); });
    };
    window.addEventListener('scroll', this._onSync, true);
    window.addEventListener('resize', this._onSync);

    if (!this.draggable) return;
    let dragging = false, ox = 0, oy = 0, px = 0, py = 0, raf = 0;
    this.glassEl.addEventListener('pointerdown', (ev: PointerEvent) => {
      ev.preventDefault();
      dragging = true; ox = ev.clientX - this.lensX; oy = ev.clientY - this.lensY;
      this.glassEl.setPointerCapture(ev.pointerId);
      this.setDragMode(true); // single-pass (no chroma) while dragging — lighter
    });
    this.glassEl.addEventListener('pointermove', (ev: PointerEvent) => {
      if (!dragging) return;
      px = ev.clientX - ox; py = ev.clientY - oy;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; this.moveTo(px, py); });
    });
    const up = (): void => {
      if (!dragging) return;
      dragging = false;
      if (raf) { cancelAnimationFrame(raf); raf = 0; this.moveTo(px, py); }
      this.setDragMode(false); // restore full chroma on release
    };
    this.glassEl.addEventListener('pointerup', up);
    this.glassEl.addEventListener('pointercancel', up);
  }
}

/* ============================================================
   Web Component: <liquid-glass> — a thin declarative wrapper.
   Defined only in a DOM environment (SSR-safe).
============================================================ */
const ATTRS: Record<string, keyof LiquidGlassParams> = {
  width: 'width', height: 'height', radius: 'radius', scale: 'scale',
  depth: 'depth', curvature: 'curvature', convexity: 'convexity', chroma: 'chroma',
  blur: 'blur', glow: 'glow', edge: 'edge', 'spec-angle': 'specAngle',
  tint: 'tint', 'tint-color': 'tintColor',
};

/** Instance shape of the <liquid-glass> custom element. */
export interface LiquidGlassHTMLElement extends HTMLElement {
  /** The underlying LiquidGlass instance (null until connected). */
  glass: LiquidGlass | null;
}

/** The <liquid-glass> custom element constructor (null in non-DOM environments). */
export let LiquidGlassElement: (new () => LiquidGlassHTMLElement) | null = null;

if (typeof HTMLElement !== 'undefined') {
  class LiquidGlassElementImpl extends HTMLElement implements LiquidGlassHTMLElement {
    glass: LiquidGlass | null = null;

    static get observedAttributes(): string[] {
      return Object.keys(ATTRS).concat(['background', 'draggable', 'x', 'y', 'z-index']);
    }
    connectedCallback(): void {
      if (this.glass) return;
      this.style.display = 'none';
      const at = (n: string): string | null => this.getAttribute(n);
      const num = (n: string): number | undefined => { const v = at(n); return v == null ? undefined : parseFloat(v); };
      const bgSel = at('background');
      const zIdx = at('z-index');
      const opts: LiquidGlassOptions = {
        background: bgSel ? document.querySelector(bgSel) : null,
        draggable: at('draggable') !== 'false',
        zIndex: zIdx != null ? parseInt(zIdx, 10) : undefined,
        x: num('x'), y: num('y'),
        tintColor: at('tint-color') || undefined,
      };
      for (const attr of Object.keys(ATTRS)) {
        if (attr === 'tint-color') continue;
        const v = num(attr);
        if (v !== undefined) (opts as Record<string, unknown>)[ATTRS[attr]] = v;
      }
      this.glass = new LiquidGlass(opts);
    }
    disconnectedCallback(): void { if (this.glass) { this.glass.destroy(); this.glass = null; } }
    attributeChangedCallback(name: string, _old: string | null, val: string | null): void {
      if (!this.glass) return;
      if (name === 'background') { this.glass.setBackground(val ? document.querySelector(val) : null); return; }
      if (name === 'x' || name === 'y') {
        const x = this.getAttribute('x'), y = this.getAttribute('y');
        this.glass.moveTo(x != null ? parseFloat(x) : this.glass.lensX, y != null ? parseFloat(y) : this.glass.lensY);
        return;
      }
      if (val == null || !(name in ATTRS)) return;
      this.glass.set({ [ATTRS[name]]: name === 'tint-color' ? val : parseFloat(val) } as Partial<LiquidGlassParams>);
    }
  }
  LiquidGlassElement = LiquidGlassElementImpl;
  if (typeof customElements !== 'undefined' && !customElements.get('liquid-glass')) {
    customElements.define('liquid-glass', LiquidGlassElementImpl);
  }
}

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
