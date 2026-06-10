/* Global (<script>) build entry: exposes window.LiquidGlass and registers <liquid-glass>. */
import LiquidGlass, { LiquidGlassElement, DEFAULTS } from './liquid-glass.js';

if (typeof window !== 'undefined') {
  window.LiquidGlass = LiquidGlass;
  window.LiquidGlassElement = LiquidGlassElement;
  LiquidGlass.DEFAULTS = DEFAULTS;
}
