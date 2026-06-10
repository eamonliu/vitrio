import LiquidGlassCore, { DEFAULTS } from './vitrio.js';
import type { LiquidGlassParams } from './vitrio.js';
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
}
/** React component driving a LiquidGlass overlay. Renders nothing itself. */
export declare function LiquidGlass(props: LiquidGlassProps): null;
export default LiquidGlass;
export { LiquidGlassCore, DEFAULTS };
export type { LiquidGlassParams, LiquidGlassOptions } from './vitrio.js';
