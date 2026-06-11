/* Liquid-glass UI components — button, toggle, slider, media player, floating lens.
   Consumes the library through its public API only (window.LiquidGlass global from
   ../dist/vitrio.umd.min.js; the imports below are type-only and erased at build).

   The whole page lives inside #scene, which every glass instance refracts. Non-draggable
   glass plates have pointer-events: none, so clicks land on the real elements beneath
   them — the components stay ordinary interactive DOM. */
import type { LiquidGlass as Glass } from '../src/vitrio.js';

const LiquidGlass = window.LiquidGlass;
const scene = document.getElementById('scene')!;
const $ = (id: string): HTMLElement => document.getElementById(id)!;

/* ====== Button: the glass plate IS the button surface ======
   attachTo pins the plate to the label and live-tracks its rect — no glue code. */
const btnEl = $('btn');
const btnGlass = new LiquidGlass({
  background: scene, zIndex: 10,
  attachTo: btnEl, attachPadding: { x: 30, y: 15 },
  radius: 34, scale: 24, depth: 22, curvature: 2.4, chroma: 0.12, glow: 0.14, edge: 0.6,
});
btnEl.addEventListener('pointerenter', () => btnGlass.set({ glow: 0.38 }));
btnEl.addEventListener('pointerleave', () => btnGlass.set({ glow: 0.14 }));
btnEl.addEventListener('pointerdown', () => btnGlass.set({ scale: 38 })); // press: bend harder
window.addEventListener('pointerup', () => btnGlass.set({ scale: 24 }));

/* ====== Toggle: a glass knob slides across the printed track ====== */
const track = $('toggle');
const KNOB = 62;
let toggledOn = false;
let knobT = 0; // 0 = off ... 1 = on
const knob = new LiquidGlass({
  background: scene, draggable: false, zIndex: 11,
  width: KNOB, height: KNOB, radius: KNOB / 2,
  scale: 34, depth: KNOB / 2, curvature: 2, convexity: 1, chroma: 0.16, glow: 0.1, edge: 0.55,
});
function placeKnob(): void {
  const r = track.getBoundingClientRect();
  const x0 = r.left - 5, x1 = r.right - KNOB + 5;
  knob.moveTo(Math.round(x0 + (x1 - x0) * knobT), Math.round(r.top + r.height / 2 - KNOB / 2));
}
let knobRaf = 0;
function animateKnob(target: number): void {
  cancelAnimationFrame(knobRaf);
  const from = knobT;
  const t0 = performance.now();
  const DUR = 280;
  const tick = (now: number): void => {
    const u = Math.min(1, (now - t0) / DUR);
    knobT = from + (target - from) * (1 - Math.pow(1 - u, 3)); // ease-out cubic
    placeKnob();
    if (u < 1) knobRaf = requestAnimationFrame(tick);
  };
  knobRaf = requestAnimationFrame(tick);
}
track.addEventListener('click', () => {
  toggledOn = !toggledOn;
  track.classList.toggle('on', toggledOn);
  refreshAll(); // clones are static snapshots — re-clone so the lit track shows through
  animateKnob(toggledOn ? 1 : 0);
});
placeKnob();

/* ====== Slider: a glass lens as the thumb, magnifying the rainbow track ====== */
const sliderHit = $('slider');
const sliderTrack = sliderHit.querySelector<HTMLElement>('.slider-track')!;
const THUMB = 56;
let value = 0.35;
const thumb = new LiquidGlass({
  background: scene, draggable: false, zIndex: 11,
  width: THUMB, height: THUMB, radius: THUMB / 2,
  scale: 30, depth: THUMB / 2, curvature: 2, convexity: 1, chroma: 0.3, glow: 0.08, edge: 0.5,
});
function placeThumb(): void {
  const r = sliderTrack.getBoundingClientRect();
  thumb.moveTo(Math.round(r.left + value * r.width - THUMB / 2),
               Math.round(r.top + r.height / 2 - THUMB / 2));
}
function setSliderFromEvent(ev: PointerEvent): void {
  const r = sliderTrack.getBoundingClientRect();
  value = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
  placeThumb();
}
let sliding = false;
sliderHit.addEventListener('pointerdown', (ev: PointerEvent) => {
  sliding = true;
  sliderHit.setPointerCapture(ev.pointerId);
  setSliderFromEvent(ev);
});
sliderHit.addEventListener('pointermove', (ev: PointerEvent) => { if (sliding) setSliderFromEvent(ev); });
const endSlide = (): void => { sliding = false; };
sliderHit.addEventListener('pointerup', endSlide);
sliderHit.addEventListener('pointercancel', endSlide);
placeThumb();

/* ====== Media player: one wide glass plate as the card surface ====== */
const playerEl = $('player');
const playerGlass = new LiquidGlass({
  background: scene, zIndex: 10,
  attachTo: playerEl, attachPadding: { x: 16, y: 12 },
  radius: 30, scale: 18, depth: 24, curvature: 2.6, chroma: 0.08, glow: 0.12, edge: 0.5,
});
const playBtn = $('play');
let playing = false;
playBtn.addEventListener('click', () => {
  playing = !playing;
  playBtn.textContent = playing ? '⏸' : '▶';
  playerEl.classList.toggle('playing', playing);
  refreshAll(); // show the new glyph / spinning cover through the glass
});

/* ====== Floating lens: draggable — try it over the components ====== */
const lens = new LiquidGlass({
  background: scene, draggable: true, zIndex: 40,
  width: 150, height: 150, radius: 75,
  scale: 56, depth: 75, curvature: 2, convexity: 1, chroma: 0.14, glow: 0.1, edge: 0.45,
  x: Math.round(window.innerWidth * 0.76), y: Math.round(window.innerHeight * 0.14),
});

/* ---------- shared upkeep ---------- */
const all: Glass[] = [btnGlass, knob, thumb, playerGlass, lens];
function refreshAll(): void { for (const g of all) g.refresh(); }

/* Attached plates follow their anchors automatically; only the free-positioned
   knob and thumb need re-placing on resize. */
window.addEventListener('resize', () => {
  placeKnob();
  placeThumb();
});
