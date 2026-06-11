/*!
 * vitrio/vue — Vue 3 wrapper for the LiquidGlass effect.
 *
 * <LiquidGlass /> renders no DOM of its own: it creates a LiquidGlass core instance
 * (a fixed-position overlay appended to <body>) and keeps it in sync with the props.
 * Vue is a peer dependency and is not bundled.
 *
 *   <script setup>
 *   import { LiquidGlass } from 'vitrio/vue';
 *   </script>
 *
 *   <template>
 *     <div id="scene">...</div>
 *     <LiquidGlass background="#scene" :width="360" :height="220" :scale="46" :chroma="0.1" />
 *   </template>
 *
 * The core instance is exposed as `glass` on the template ref and emitted via @ready.
 *
 * @license MIT
 */
import { defineComponent, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';
import type { PropType } from 'vue';
import LiquidGlassCore, { DEFAULTS } from './vitrio.js';
import type { AttachPadding, LiquidGlassParams } from './vitrio.js';

/** Anything that can designate the element to refract. */
export type BackgroundProp = Element | string | null;

const PARAM_KEYS = Object.keys(DEFAULTS) as (keyof LiquidGlassParams)[];

const resolveBackground = (bg: BackgroundProp | undefined): Element | null =>
  typeof bg === 'string' ? document.querySelector(bg) : bg ?? null;

/** Vue component driving a LiquidGlass overlay. Renders nothing itself. */
export const LiquidGlass = defineComponent({
  name: 'LiquidGlass',
  props: {
    /** Element to refract: an Element or a CSS selector. */
    background: { type: [Object, String] as PropType<BackgroundProp>, default: null },
    /** Anchor to pin the glass to (element or selector): follows its rect every frame. */
    attachTo: { type: [Object, String] as PropType<BackgroundProp>, default: null },
    /** Extra glass size around the attached anchor's rect, in px. */
    attachPadding: { type: [Number, Object] as PropType<AttachPadding>, default: undefined },
    /** Whether the glass can be dragged. Create-time only. */
    draggable: { type: Boolean, default: true },
    /** z-index of the lens layer (glass sits at z + 1). Create-time only. */
    zIndex: { type: Number, default: undefined },
    /** Screen X/Y of the glass top-left. Reactive. Default centered. */
    x: { type: Number, default: undefined },
    y: { type: Number, default: undefined },
    width: { type: Number, default: undefined },
    height: { type: Number, default: undefined },
    radius: { type: Number, default: undefined },
    scale: { type: Number, default: undefined },
    depth: { type: Number, default: undefined },
    curvature: { type: Number, default: undefined },
    convexity: { type: Number, default: undefined },
    chroma: { type: Number, default: undefined },
    blur: { type: Number, default: undefined },
    glow: { type: Number, default: undefined },
    edge: { type: Number, default: undefined },
    specAngle: { type: Number, default: undefined },
    tint: { type: Number, default: undefined },
    tintColor: { type: String, default: undefined },
  },
  emits: ['ready'],
  setup(props, { emit, expose }) {
    const glass = shallowRef<LiquidGlassCore | null>(null);

    const pickParams = (): Partial<LiquidGlassParams> => {
      const out: Partial<LiquidGlassParams> = {};
      for (const k of PARAM_KEYS) {
        const v = props[k];
        if (v !== undefined) (out as Record<string, number | string>)[k] = v;
      }
      return out;
    };

    onMounted(() => {
      const g = new LiquidGlassCore({
        ...pickParams(),
        background: resolveBackground(props.background),
        attachTo: resolveBackground(props.attachTo),
        attachPadding: props.attachPadding,
        draggable: props.draggable,
        zIndex: props.zIndex,
        x: props.x, y: props.y,
      });
      glass.value = g;
      emit('ready', g);
    });

    onBeforeUnmount(() => {
      glass.value?.destroy();
      glass.value = null;
    });

    /* Sync parameters; only push the ones that actually changed (avoids map rebuilds). */
    watch(
      () => PARAM_KEYS.map((k) => props[k]),
      () => {
        const g = glass.value;
        if (!g) return;
        const partial: Partial<LiquidGlassParams> = {};
        let dirty = false;
        for (const k of PARAM_KEYS) {
          const v = props[k];
          if (v !== undefined && v !== g.params[k]) {
            (partial as Record<string, number | string>)[k] = v;
            dirty = true;
          }
        }
        if (dirty) g.set(partial);
      }
    );

    /* Swap the refracted element when `background` changes. */
    watch(
      () => props.background,
      (bg) => {
        const g = glass.value;
        if (!g) return;
        const el = resolveBackground(bg);
        if (el !== g.background) g.setBackground(el);
      }
    );

    /* Re-attach when the anchor changes. */
    watch(
      () => props.attachTo,
      (anchor) => {
        glass.value?.attach(resolveBackground(anchor), props.attachPadding);
      }
    );

    /* Reposition when x/y change. */
    watch(
      [() => props.x, () => props.y],
      ([x, y]) => {
        const g = glass.value;
        if (!g || x == null || y == null) return;
        if (x !== g.lensX || y !== g.lensY) g.moveTo(x, y);
      }
    );

    expose({ glass });

    return () => null;
  },
});

export default LiquidGlass;
export { LiquidGlassCore, DEFAULTS };
export type { AttachPadding, LiquidGlassParams, LiquidGlassOptions } from './vitrio.js';
