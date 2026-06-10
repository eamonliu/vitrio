# vitrio

Cross-browser **liquid-glass refraction** for the web — real optical displacement (not a blur fake), with **convex magnification**, **chromatic aberration** and a **normal-based specular highlight**. Zero dependencies. Ships as a JavaScript class **and** a `<liquid-glass>` web component.

[![npm](https://img.shields.io/npm/v/vitrio.svg)](https://www.npmjs.com/package/vitrio)
[![license](https://img.shields.io/npm/l/vitrio.svg)](./LICENSE)
[![size](https://img.shields.io/bundlephobia/minzip/vitrio)](https://bundlephobia.com/package/vitrio)

- 🔬 **Real refraction** via SVG `feDisplacementMap` driven by a height-field optical model — convex surfaces magnify, concave shrink.
- 🌈 Chromatic aberration + specular highlight computed from the surface normal.
- 🧭 **Works in Chrome, Safari and Firefox.** Most demos out there are Chromium-only (they reference an SVG filter from `backdrop-filter`); this one refracts a clone of the background instead, so it runs everywhere.
- 🪶 ~13 kB min, **zero dependencies**, written in **TypeScript** — ships ESM / CJS / UMD + type declarations generated from source.
- 🖱️ Draggable, fully runtime-configurable.

> **Live demo:** open `index.html` (full playground) or `example.html` (one-tag web component) — or visit the [GitHub Pages demo](https://eamonliu.github.io/vitrio/).

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

The glass element does not blur a backdrop — it **bends the actual pixels**. A small displacement map is generated on a canvas from a rounded-rectangle SDF and a thickness profile (`(1 - (1-t)^k)^(1/k)`, a circle→squircle curve). The map's R/G channels encode per-pixel displacement; an SVG filter (`feImage` → `feDisplacementMap`) applies it. Displacement points **inward**, so a convex bezel converges rays and magnifies, exactly like a real lens. Three passes at slightly different scales give chromatic aberration, and a second canvas encodes a specular highlight from the surface normal.

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
| `setBackground(el)` | Swap the refracted element. |
| `refresh()` | Re-clone the background and rebuild (call after it changes). |
| `destroy()` | Remove all DOM, filters and listeners. |

### Web component attributes

Every parameter is an attribute (camelCase → kebab-case, e.g. `spec-angle`, `tint-color`), plus `background` (a CSS selector), `draggable`, `z-index`, `x`, `y`. Attributes are reactive.

---

## Framework usage

Because it's a standard custom element, `<liquid-glass>` works in Vue, Svelte and Angular out of the box. In React (< 19) set attributes as strings, or just use the class in an effect:

```jsx
useEffect(() => {
  const g = new LiquidGlass({ background: ref.current, scale: 46 });
  return () => g.destroy();
}, []);
```

---

## Browser support & caveats

- Needs **SVG filters**, **pointer events**, **`clip-path`** and **custom elements** — all evergreen browsers. `tint > 0` uses `color-mix()` (Chrome 111+, Safari 16.2+, Firefox 113+); `tint: 0` (the default) avoids it.
- **Clone mode** refracts a *clone* of the background, so the background must be clonable DOM/CSS (a known element). It is not a drop-in over arbitrary live app UI — for that you'd want a `backdrop-filter` mode (Chromium-only), which is not included here by design.
- The clone is a **static snapshot**. If the background animates or changes, call `refresh()`.
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
