/* Playground (index.html) — consumes the library through its public API only.
   Loaded after dist/vitrio.umd.min.js, so it uses the window.LiquidGlass global
   (type-only import below; nothing from the library is bundled into the demo). */
import type { LiquidGlassParams } from './vitrio.js';

const LiquidGlass = window.LiquidGlass;

/* Demo state covers every numeric parameter; the tint colour has its own <input type=color>. */
type DemoParams = Omit<LiquidGlassParams, 'tintColor'>;

/* Defaults = strong-refraction look with tint 0 and a light chroma (same as the component's). */
const DEFAULTS: DemoParams = {
  width: 360, height: 220, radius: 48,
  scale: 46, depth: 40, curvature: 2.2, convexity: 1.0, chroma: 0.1,
  blur: 0, glow: 0.18, edge: 0.7, specAngle: 135, tint: 0,
};

/* label = display name, en = the API parameter key. */
interface SliderConfig {
  key: keyof DemoParams;
  label: string;
  en: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

const CONTROLS: Record<'shape' | 'refract' | 'finish' | 'tint', SliderConfig[]> = {
  shape: [
    { key: 'width',  label: 'Width',  en: 'width',  min: 120, max: 560, step: 1, unit: 'px' },
    { key: 'height', label: 'Height', en: 'height', min: 80,  max: 440, step: 1, unit: 'px' },
    { key: 'radius', label: 'Radius', en: 'radius', min: 0,   max: 220, step: 1, unit: 'px' },
  ],
  refract: [
    { key: 'scale',     label: 'Scale',     en: 'scale',     min: 0,   max: 90, step: 0.5, unit: 'px' },
    { key: 'depth',     label: 'Bezel',     en: 'depth',     min: 2,   max: 200, step: 1,  unit: 'px' },
    { key: 'curvature', label: 'Curvature', en: 'curvature', min: 1.2, max: 6,  step: 0.1, unit: '' },
    { key: 'convexity', label: 'Convexity', en: 'convexity', min: -1,  max: 1,  step: 0.05, unit: '' },
    { key: 'chroma',    label: 'Chroma',    en: 'chroma',    min: 0,   max: 0.6, step: 0.01, unit: '' },
  ],
  finish: [
    { key: 'blur',      label: 'Blur',     en: 'blur',      min: 0, max: 24,  step: 0.5, unit: 'px' },
    { key: 'glow',      label: 'Glow',     en: 'glow',      min: 0, max: 1,   step: 0.01, unit: '' },
    { key: 'edge',      label: 'Specular', en: 'edge',      min: 0, max: 1,   step: 0.01, unit: '' },
    { key: 'specAngle', label: 'Angle',    en: 'specAngle', min: 0, max: 360, step: 1,    unit: '°' },
  ],
  tint: [
    { key: 'tint', label: 'Tint opacity', en: 'tint', min: 0, max: 0.4, step: 0.01, unit: '' },
  ],
};

const PRESETS: Record<string, Partial<DemoParams>> = {
  'Default':   { },
  'Subtle':    { scale: 12, depth: 34, curvature: 2.4, convexity: 1.0, chroma: 0.08, blur: 0, glow: 0.10, edge: 0.5, radius: 70 },
  'Strong':    { scale: 46, depth: 40, curvature: 2.2, convexity: 1.0, chroma: 0.34, blur: 0, glow: 0.18, edge: 0.7, radius: 48 },
  'Magnifier': { width: 300, height: 300, radius: 150, scale: 64, depth: 150, curvature: 2.0, convexity: 1.0, chroma: 0.12, blur: 0, glow: 0.08, edge: 0.35 },
  'Frosted':   { scale: 10, depth: 34, curvature: 2.6, convexity: 1.0, chroma: 0.05, blur: 14, glow: 0.14, edge: 0.5, radius: 40, tint: 0.10 },
  'Concave':   { scale: 34, depth: 44, curvature: 2.2, convexity: -1.0, chroma: 0.16, blur: 0, glow: 0.10, edge: 0.5, radius: 60 },
};

/* ====== Create the component instance ====== */
const bgEl = document.getElementById('bg')!;
const glass = new LiquidGlass({ background: bgEl, zIndex: 50, ...DEFAULTS });

const state: DemoParams = { ...DEFAULTS };

/* ====== Control panel (consumes the component API: glass.set / moveTo / refresh) ====== */
interface SliderEntry { input: HTMLInputElement; cfg: SliderConfig; val: HTMLElement; }
const sliders: Partial<Record<keyof DemoParams, SliderEntry>> = {};

function buildGroup(id: string, list: SliderConfig[]): void {
  const host = document.getElementById(id)!;
  list.forEach((cfg) => {
    const wrap = document.createElement('div');
    wrap.className = 'ctrl';
    wrap.innerHTML =
      `<div class="ctrl-row"><label>${cfg.label}<span class="en">${cfg.en}</span></label>` +
      `<span class="val" id="val-${cfg.key}"></span></div>` +
      `<input type="range" min="${cfg.min}" max="${cfg.max}" step="${cfg.step}">`;
    host.appendChild(wrap);
    const input = wrap.querySelector('input')!;
    sliders[cfg.key] = { input, cfg, val: wrap.querySelector<HTMLElement>('.val')! };
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      state[cfg.key] = v;
      updateLabel(cfg.key);
      glass.set({ [cfg.key]: v } as Partial<LiquidGlassParams>);
    });
  });
}
buildGroup('group-shape', CONTROLS.shape);
buildGroup('group-refract', CONTROLS.refract);
buildGroup('group-finish', CONTROLS.finish);
buildGroup('group-tint', CONTROLS.tint);

function updateLabel(key: keyof DemoParams): void {
  const s = sliders[key]; if (!s) return;
  const v = state[key];
  const txt = Number.isInteger(v) ? v : parseFloat(v.toFixed(2));
  s.val.textContent = txt + (s.cfg.unit || '');
}
function syncSliders(): void {
  (Object.keys(sliders) as (keyof DemoParams)[]).forEach((k) => {
    sliders[k]!.input.value = String(state[k]);
    updateLabel(k);
  });
}
function centerGlass(): void {
  glass.moveTo((window.innerWidth - state.width) / 2, (window.innerHeight - state.height) / 2);
}

/* Presets */
const presetHost = document.getElementById('presets')!;
const tintColorInput = document.getElementById('tint-color') as HTMLInputElement;
Object.keys(PRESETS).forEach((name) => {
  const b = document.createElement('button');
  b.className = 'btn'; b.textContent = name;
  b.addEventListener('click', () => {
    Object.assign(state, DEFAULTS, PRESETS[name]);
    syncSliders();
    glass.set(state);
    centerGlass();
  });
  presetHost.appendChild(b);
});
document.getElementById('reset')!.addEventListener('click', () => {
  Object.assign(state, DEFAULTS);
  tintColorInput.value = '#ffffff';
  syncSliders();
  glass.set({ tintColor: '#ffffff', ...state });
  centerGlass();
});

/* Tint colour */
tintColorInput.addEventListener('input', () => {
  glass.set({ tintColor: tintColorInput.value });
});

/* Background switch: update #bg, then glass.refresh() to re-clone */
const sceneEl = bgEl.querySelector('.scene')!;
const decoEl = bgEl.querySelector('.scene-deco')!;
const photoEl = bgEl.querySelector<HTMLImageElement>('.photo-img')!;
const sceneSelect = document.getElementById('scene-select') as HTMLSelectElement;
photoEl.addEventListener('load', () => glass.refresh());
sceneSelect.addEventListener('change', () => {
  const v = sceneSelect.value;
  sceneEl.className = 'scene ' + v;
  decoEl.classList.toggle('hide', v === 'photo');
  if (v === 'photo' && !photoEl.src) photoEl.src = 'https://picsum.photos/seed/liquidglass/1600/1000';
  glass.refresh();
});

window.addEventListener('resize', centerGlass);

/* Start */
syncSliders();
centerGlass();
