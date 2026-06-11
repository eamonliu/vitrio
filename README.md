# vitrio

Cross-browser **liquid-glass refraction** for the web — real optical displacement (not a blur fake), with **convex magnification**, **chromatic aberration** and a **normal-based specular highlight**. Zero dependencies. Ships as a JavaScript class **and** a `<liquid-glass>` web component.

[![npm](https://img.shields.io/npm/v/vitrio.svg)](https://www.npmjs.com/package/vitrio)
[![license](https://img.shields.io/npm/l/vitrio.svg)](./LICENSE)
[![size](https://img.shields.io/bundlephobia/minzip/vitrio)](https://bundlephobia.com/package/vitrio)

- 🔬 **Real refraction** via SVG `feDisplacementMap` driven by a height-field optical model — convex surfaces magnify, concave shrink.
- 🌈 Chromatic aberration + specular highlight computed from the surface normal.
- 🧭 **Cross-browser, tiered.** Full per-pixel refraction in Chrome/Edge (Blink) and Firefox (Gecko). WebKit (Safari and every iOS browser) cannot render `feImage` — the primitive that feeds the displacement map — so vitrio automatically renders a **compositor-only glass approximation** there (edge-matched transform magnification + specular overlay + blur). Same API everywhere, and always smooth.
- 🪶 ~13 kB min, **zero dependencies**, written in **TypeScript** — ships ESM / CJS / UMD + type declarations generated from source.
- 🖱️ Draggable, fully runtime-configurable.
- ⚛️ First-class **React** and **Vue 3** wrappers: `vitrio/react`, `vitrio/vue`.

> **Live demo:** open `index.html` (full playground), `examples/ui-components.html` (glass applied to real UI — button, toggle, slider, media player), `examples/video-player.html` (a glass control panel floating over a playing video) or `examples/web-component.html` (one-tag web component) — or visit the [GitHub Pages demo](https://eamonliu.github.io/vitrio/).

---

## Install

```bash
npm install vitrio
```

Or via CDN (no build step):

```html
<script src="https://unpkg.com/vitrio"></script>
```

## Quick start

### A. JavaScript class

```js
import LiquidGlass from 'vitrio';

const glass = new LiquidGlass({
  background: document.querySelector('#scene'), // element to refract (it gets cloned)
  width: 360, height: 220, radius: 48,
  scale: 46, chroma: 0.1, tint: 0,
});

glass.set({ scale: 60 });  // update params
glass.moveTo(120, 80);     // move it
glass.refresh();           // re-clone after the background changes
glass.destroy();           // tear down
```

### B. Web component

```html
<div id="scene"><!-- the background to refract --></div>

<liquid-glass background="#scene" width="360" height="220"
              scale="46" chroma="0.1" tint="0"></liquid-glass>

<script src="https://unpkg.com/vitrio"></script>
```

Importing the module (or the UMD script) registers the `<liquid-glass>` element automatically.

---

## How it works

The glass element does not blur a backdrop — it **bends the actual pixels**. A small displacement map is generated on a canvas from a rounded-rectangle SDF and a thickness profile (`(1 - (1-t)^k)^(1/k)`, a circle→squircle curve). The map's R/G channels encode per-pixel displacement; an SVG filter (`feImage` → `feDisplacementMap`) applies it. Displacement points **inward**, so a convex bezel converges rays and magnifies, exactly like a real lens. Three passes at slightly different scales give chromatic aberration, and a second canvas encodes a specular highlight from the surface normal, applied as a screen-blended overlay.

To stay cross-browser it uses **clone mode**: the background element you point it at is cloned into a small, clipped overlay that the filter is applied to (Safari/Firefox don't support referencing an SVG filter from `backdrop-filter`). The clone is kept pixel-aligned with the real background.

---

## API

### `new LiquidGlass(options)`

`options` is the parameter table below **plus**:

| option | type | default | description |
| --- | --- | --- | --- |
| `background` | `Element \| null` | `null` | Element to refract. It is cloned. |
| `draggable` | `boolean` | `true` | Allow pointer dragging. |
| `zIndex` | `number` | `100` | z-index of the lens layer (glass sits at `z+1`). |
| `x`, `y` | `number` | centered | Initial screen position of the glass top-left. |
| `attachTo` | `Element \| null` | `null` | Anchor element: the glass follows its screen rect every frame (transitions included). Overrides x/y/width/height; disables dragging. |
| `attachPadding` | `number \| {x, y}` | `0` | Extra glass size around the attached anchor's rect, in px. |
| `liteMotion` | `boolean \| 'auto'` | `'auto'` | Pause refraction while the glass is moving (a cheap transform-based magnification stands in), restoring it on settle. `'auto'` enables it on Gecko (Firefox), where re-rasterizing SVG filters every frame can't hold 60 fps. WebKit ignores it — its rendering is always the compositor approximation. |

### Parameters

| param | range | default | description |
| --- | --- | --- | --- |
| `width` / `height` | px | `360` / `220` | Glass size. |
| `radius` | px | `48` | Corner radius. |
| `scale` | `0..90` | `46` | Refraction strength (max edge displacement). |
| `depth` | px | `40` | Bezel width — how far the curve reaches inward. Large ≈ full dome. |
| `curvature` | `1.2..6` | `2.2` | Profile exponent: ~2 spherical, ~4 squircle. |
| `convexity` | `-1..1` | `1` | `+1` convex (magnify), `0` flat, `-1` concave (shrink). |
| `chroma` | `0..0.6` | `0.1` | Chromatic aberration. |
| `blur` | px | `0` | Frost / backdrop blur (0 = clear). |
| `glow` | `0..1` | `0.18` | Glow strength. |
| `edge` | `0..1` | `0.7` | Specular highlight strength. |
| `specAngle` | `0..360` | `135` | Specular light angle. |
| `tint` | `0..1` | `0` | Tint opacity. |
| `tintColor` | CSS color | `#ffffff` | Tint color. |

### Methods

| method | description |
| --- | --- |
| `set(partial)` | Update one or more parameters (rebuilds maps only when needed). |
| `get(key?)` | Get one parameter, or a copy of all. |
| `moveTo(x, y)` | Move the glass (screen coords of its top-left). |
| `attach(el, padding?)` | Pin the glass to an anchor element (follows its rect every frame). `null` detaches. |
| `setBackground(el)` | Swap the refracted element. |
| `refresh()` | Re-clone the background and rebuild (call after it changes). |
| `destroy()` | Remove all DOM, filters and listeners. |

### Web component attributes

Every parameter is an attribute (camelCase → kebab-case, e.g. `spec-angle`, `tint-color`), plus `background` (a CSS selector), `attach-to` (a CSS selector), `attach-padding`, `lite-motion` (`true` / `false` / `auto`), `draggable`, `z-index`, `x`, `y`. Attributes are reactive (`lite-motion` and `draggable` are create-time).

---

## Framework usage

First-class wrappers ship as subpath exports: `vitrio/react` and `vitrio/vue`. Both render no DOM of their own — they drive the fixed-position glass overlay from props, and every parameter is reactive. React/Vue are optional peer dependencies (not bundled).

### React — `vitrio/react`

```jsx
import { useRef } from 'react';
import { LiquidGlass } from 'vitrio/react';

function App() {
  const bgRef = useRef(null);
  return (
    <>
      <div ref={bgRef} className="scene">…</div>
      <LiquidGlass background={bgRef} width={360} height={220} scale={46} chroma={0.1} />
    </>
  );
}
```

`background` accepts an element, a CSS selector or a React ref. Extra props: `attachTo` / `attachPadding` (pin the glass to an anchor), `draggable` / `zIndex` / `liteMotion` (create-time only), `x` / `y` (reactive position), `glassRef` (a ref or callback that receives the core instance) and `onReady`.

To give an **existing component** a glass surface, use the `useLiquidGlass` hook — it pins a plate to an anchor ref and follows it every frame (CSS transitions included):

```jsx
import { useLiquidGlass } from 'vitrio/react';

const btnRef = useRef(null);
const glass = useLiquidGlass(btnRef, { background: sceneRef, padding: { x: 12, y: 8 }, scale: 22 });
// glass.current?.refresh() after the scene's appearance changes

<button ref={btnRef}>Get started</button>
```

See **`examples/react-shadcn/`** for a full app where glass surfaces are attached to real [shadcn/ui](https://ui.shadcn.com) components (Button, Switch, Slider, Card) without changing their behaviour.

### Vue 3 — `vitrio/vue`

```vue
<script setup>
import { LiquidGlass } from 'vitrio/vue';
</script>

<template>
  <div id="scene">…</div>
  <LiquidGlass background="#scene" :width="360" :height="220" :scale="46" :chroma="0.1" @ready="g => {}" />
</template>
```

Props mirror the parameters (kebab-case works in templates, e.g. `:spec-angle`); `background` and `attach-to` accept an element or a CSS selector (`attach-to` pins the glass to that element's rect). The core instance is emitted via `@ready` and exposed as `glass` on the template ref.

### Other frameworks

Because it's a standard custom element, `<liquid-glass>` works in Svelte and Angular out of the box — or use the core class in any lifecycle hook:

```js
const g = new LiquidGlass({ background: el, scale: 46 });
// ...later
g.destroy();
```

---

## Browser support & caveats

- Needs **pointer events**, **`clip-path`** and **custom elements** — all evergreen browsers. `tint > 0` uses `color-mix()` (Chrome 111+, Safari 16.2+, Firefox 113+); `tint: 0` (the default) avoids it.
- **Rendering tiers.** Full refraction requires SVG filters with a working `feImage` — that's Chrome/Edge (Blink) and Firefox (Gecko). **WebKit (Safari, all iOS browsers) does not render `feImage` at all** (verified against Safari 26: static markup, dynamic DOM, `data:`/`blob:`/`http:` sources all yield an empty result), so true per-pixel displacement is impossible there. vitrio detects WebKit and renders an **approximation with zero SVG-filter cost**: the cloned background is magnified by a transform whose edge sampling matches the real refraction, plus the normal-based specular overlay, glow, tint and backdrop blur. `chroma` has no visible effect on WebKit. Because nothing is re-rasterized, glass on Safari tracks anchors at full frame rate.
- **Motion performance**: filter engines re-rasterize the chain on every frame the filtered content moves. Blink keeps up at 60 fps; Gecko doesn't, so by default (`liteMotion: 'auto'`) Firefox **pauses refraction during continuous motion** — the same compositor transform stands in — and restores the filter ~120 ms after the glass rests. `liteMotion: false` keeps the filter on always; `true` forces the behaviour on Blink too. WebKit ignores the option (its rendering is already compositor-only).
- **Opening the examples from disk**: Safari's local-file restrictions block a `file://` page from loading sibling scripts, so the example pages appear without any glass when double-clicked. Serve the repo instead: `python3 -m http.server` → `http://localhost:8000/examples/…` (Chrome and Firefox are fine with `file://`).
- **Clone mode** refracts a *clone* of the background, so the background must be clonable DOM/CSS (a known element). It is not a drop-in over arbitrary live app UI — for that you'd want a `backdrop-filter` mode (Chromium-only), which is not included here by design.
- The clone is a **static snapshot**. If the background animates or changes, call `refresh()`. Exception: a cloned `<video>` is itself a live player — keep it in sync with the original (mirror play state + clock onto `.lqg-lens video`) and the glass refracts moving footage; see `examples/video-player.html`.
- The clone keeps element **ids** so id-based styles survive; this means ids are briefly duplicated in the DOM (the clone is `aria-hidden`; your own `getElementById`/`querySelector` still return the original).
- No cross-origin canvas reads are performed (the maps are procedural), so cross-origin images in the background are fine.

---

## Build from source

The library is written in TypeScript (`src/*.ts`); esbuild produces the bundles and `tsc` emits the type declarations.

```bash
npm install
npm run build       # typecheck + dist/ (esm, cjs, umd, minified, sourcemaps, d.ts)
npm run typecheck   # tsc --noEmit only
```

## License

[MIT](./LICENSE) © Eamon Liu
