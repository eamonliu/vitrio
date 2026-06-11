import type { PropType } from 'vue';
import LiquidGlassCore, { DEFAULTS } from './vitrio.js';
import type { AttachPadding } from './vitrio.js';
/** Anything that can designate the element to refract. */
export type BackgroundProp = Element | string | null;
/** Vue component driving a LiquidGlass overlay. Renders nothing itself. */
export declare const LiquidGlass: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    /** Element to refract: an Element or a CSS selector. */
    background: {
        type: PropType<BackgroundProp>;
        default: null;
    };
    /** Anchor to pin the glass to (element or selector): follows its rect every frame. */
    attachTo: {
        type: PropType<BackgroundProp>;
        default: null;
    };
    /** Extra glass size around the attached anchor's rect, in px. */
    attachPadding: {
        type: PropType<AttachPadding>;
        default: undefined;
    };
    /** Pause refraction while moving ('auto' = non-Blink engines only). Create-time only. */
    liteMotion: {
        type: PropType<boolean | "auto">;
        default: string;
    };
    /** Whether the glass can be dragged. Create-time only. */
    draggable: {
        type: BooleanConstructor;
        default: boolean;
    };
    /** z-index of the lens layer (glass sits at z + 1). Create-time only. */
    zIndex: {
        type: NumberConstructor;
        default: undefined;
    };
    /** Screen X/Y of the glass top-left. Reactive. Default centered. */
    x: {
        type: NumberConstructor;
        default: undefined;
    };
    y: {
        type: NumberConstructor;
        default: undefined;
    };
    width: {
        type: NumberConstructor;
        default: undefined;
    };
    height: {
        type: NumberConstructor;
        default: undefined;
    };
    radius: {
        type: NumberConstructor;
        default: undefined;
    };
    scale: {
        type: NumberConstructor;
        default: undefined;
    };
    depth: {
        type: NumberConstructor;
        default: undefined;
    };
    curvature: {
        type: NumberConstructor;
        default: undefined;
    };
    convexity: {
        type: NumberConstructor;
        default: undefined;
    };
    chroma: {
        type: NumberConstructor;
        default: undefined;
    };
    blur: {
        type: NumberConstructor;
        default: undefined;
    };
    glow: {
        type: NumberConstructor;
        default: undefined;
    };
    edge: {
        type: NumberConstructor;
        default: undefined;
    };
    specAngle: {
        type: NumberConstructor;
        default: undefined;
    };
    tint: {
        type: NumberConstructor;
        default: undefined;
    };
    tintColor: {
        type: StringConstructor;
        default: undefined;
    };
}>, () => null, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "ready"[], "ready", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    /** Element to refract: an Element or a CSS selector. */
    background: {
        type: PropType<BackgroundProp>;
        default: null;
    };
    /** Anchor to pin the glass to (element or selector): follows its rect every frame. */
    attachTo: {
        type: PropType<BackgroundProp>;
        default: null;
    };
    /** Extra glass size around the attached anchor's rect, in px. */
    attachPadding: {
        type: PropType<AttachPadding>;
        default: undefined;
    };
    /** Pause refraction while moving ('auto' = non-Blink engines only). Create-time only. */
    liteMotion: {
        type: PropType<boolean | "auto">;
        default: string;
    };
    /** Whether the glass can be dragged. Create-time only. */
    draggable: {
        type: BooleanConstructor;
        default: boolean;
    };
    /** z-index of the lens layer (glass sits at z + 1). Create-time only. */
    zIndex: {
        type: NumberConstructor;
        default: undefined;
    };
    /** Screen X/Y of the glass top-left. Reactive. Default centered. */
    x: {
        type: NumberConstructor;
        default: undefined;
    };
    y: {
        type: NumberConstructor;
        default: undefined;
    };
    width: {
        type: NumberConstructor;
        default: undefined;
    };
    height: {
        type: NumberConstructor;
        default: undefined;
    };
    radius: {
        type: NumberConstructor;
        default: undefined;
    };
    scale: {
        type: NumberConstructor;
        default: undefined;
    };
    depth: {
        type: NumberConstructor;
        default: undefined;
    };
    curvature: {
        type: NumberConstructor;
        default: undefined;
    };
    convexity: {
        type: NumberConstructor;
        default: undefined;
    };
    chroma: {
        type: NumberConstructor;
        default: undefined;
    };
    blur: {
        type: NumberConstructor;
        default: undefined;
    };
    glow: {
        type: NumberConstructor;
        default: undefined;
    };
    edge: {
        type: NumberConstructor;
        default: undefined;
    };
    specAngle: {
        type: NumberConstructor;
        default: undefined;
    };
    tint: {
        type: NumberConstructor;
        default: undefined;
    };
    tintColor: {
        type: StringConstructor;
        default: undefined;
    };
}>> & Readonly<{
    onReady?: ((...args: any[]) => any) | undefined;
}>, {
    width: number;
    height: number;
    radius: number;
    scale: number;
    depth: number;
    curvature: number;
    convexity: number;
    chroma: number;
    blur: number;
    glow: number;
    edge: number;
    specAngle: number;
    tint: number;
    tintColor: string;
    background: BackgroundProp;
    zIndex: number;
    draggable: boolean;
    x: number;
    y: number;
    attachTo: BackgroundProp;
    attachPadding: AttachPadding;
    liteMotion: boolean | "auto";
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default LiquidGlass;
export { LiquidGlassCore, DEFAULTS };
export type { AttachPadding, LiquidGlassParams, LiquidGlassOptions } from './vitrio.js';
