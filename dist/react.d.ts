import LiquidGlassCore, { DEFAULTS } from './vitrio.js';
import type { AttachPadding, LiquidGlassParams } from './vitrio.js';
/** Anything that can designate the element to refract. */
export type BackgroundProp = Element | string | {
    current: Element | null;
} | null;
/** A place to receive the core instance: a callback or a ref-like object. */
export type GlassRef = ((glass: LiquidGlassCore | null) => void) | {
    current: LiquidGlassCore | null;
};
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
/** React component driving a LiquidGlass overlay. Renders nothing itself. */
export declare function LiquidGlass(props: LiquidGlassProps): null;
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
export declare function useLiquidGlass(anchor: {
    current: Element | null;
}, options?: UseLiquidGlassOptions): {
    current: LiquidGlassCore | null;
};
export default LiquidGlass;
export { LiquidGlassCore, DEFAULTS };
export type { AttachPadding, LiquidGlassParams, LiquidGlassOptions } from './vitrio.js';
