# vitrio × shadcn/ui example

Liquid-glass surfaces attached to real [shadcn/ui](https://ui.shadcn.com) components
(Button, Switch, Slider, Card — vendored per the shadcn copy-paste model, built on
Radix primitives + Tailwind v4). The glass is pinned with `useLiquidGlass()` from
`vitrio/react`, so each plate follows its component's rect every frame — including
the Radix switch/slider thumb transitions.

```bash
npm install
npm run dev      # local dev server
npm run build    # production build -> dist/
```

Key points:

- Components keep their normal shadcn structure, behaviour and accessibility; the
  glass plates are `pointer-events: none` overlays, so interaction hits the real DOM.
- Everything refractable lives inside `#scene`, which the glass clones. Clones are
  static snapshots, so state-driven visual changes call `refresh()` once settled.
- The vendored Switch/Slider gain a tiny `thumbRef` prop so the glass can attach to
  the Radix thumb element.
