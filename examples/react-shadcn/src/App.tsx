/* vitrio × shadcn/ui — glass surfaces attached to real shadcn components.
 *
 * Every component keeps its normal shadcn structure, accessibility and behaviour
 * (Radix primitives); a vitrio glass plate is pinned to it with useLiquidGlass().
 * Attached plates have pointer-events: none, so interaction hits the real DOM.
 *
 * Everything that should be refractable lives inside the #scene element, which
 * the glass instances clone. Clones are static snapshots, so state-driven visual
 * changes are followed by refresh() (see the effect below).
 */
import { useEffect, useRef, useState } from 'react';
import { LiquidGlass, useLiquidGlass } from 'vitrio/react';
import { Button } from './components/ui/button';
import { Switch } from './components/ui/switch';
import { Slider } from './components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';

const SCENE_BG = [
  'radial-gradient(42% 52% at 18% 22%, rgba(120, 80, 255, .50), transparent 70%)',
  'radial-gradient(45% 55% at 84% 18%, rgba(0, 200, 255, .38), transparent 70%)',
  'radial-gradient(52% 62% at 62% 88%, rgba(255, 70, 160, .38), transparent 70%)',
  'radial-gradient(40% 50% at 8% 86%, rgba(60, 255, 190, .28), transparent 70%)',
  '#07070f',
].join(',');

const GRID_BG = [
  'repeating-linear-gradient(0deg, rgba(255,255,255,.07) 0 1px, transparent 1px 42px)',
  'repeating-linear-gradient(90deg, rgba(255,255,255,.07) 0 1px, transparent 1px 42px)',
].join(',');

export default function App() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const switchThumbRef = useRef<HTMLSpanElement>(null);
  const sliderThumbRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [wifi, setWifi] = useState(false);
  const [volume, setVolume] = useState([35]);
  const [playing, setPlaying] = useState(false);

  /* Glass surfaces, pinned to the shadcn components. */
  const btnGlass = useLiquidGlass(btnRef, {
    background: sceneRef, padding: { x: 12, y: 8 }, zIndex: 10,
    radius: 26, scale: 22, depth: 20, curvature: 2.4, chroma: 0.12, glow: 0.14, edge: 0.6,
  });
  const knobGlass = useLiquidGlass(switchThumbRef, {
    background: sceneRef, padding: 8, zIndex: 11,
    radius: 99, scale: 24, depth: 18, chroma: 0.16, glow: 0.1, edge: 0.55,
  });
  const lensGlass = useLiquidGlass(sliderThumbRef, {
    background: sceneRef, padding: 17, zIndex: 11,
    radius: 99, scale: 28, depth: 25, chroma: 0.3, glow: 0.08, edge: 0.5,
  });
  const cardGlass = useLiquidGlass(cardRef, {
    background: sceneRef, padding: 0, zIndex: 9,
    radius: 14, scale: 16, depth: 22, curvature: 2.6, chroma: 0.08, glow: 0.12, edge: 0.5,
  });

  /* Clones are static snapshots: re-clone once state-driven visuals have settled. */
  useEffect(() => {
    const refresh = () =>
      [btnGlass, knobGlass, lensGlass, cardGlass].forEach((g) => g.current?.refresh());
    const t = setTimeout(refresh, 240); // wait for the CSS transitions
    return () => clearTimeout(t);
  }, [wifi, playing]); // volume needs no refresh: the track is a static gradient

  return (
    <div
      id="scene"
      ref={sceneRef}
      className="fixed inset-0 overflow-hidden"
      style={{ background: SCENE_BG }}
    >
      <div className="absolute -inset-0.5" style={{ backgroundImage: GRID_BG }} />

      <main className="relative flex h-full flex-col items-center justify-center gap-12 p-6">
        <header className="text-center">
          <h1
            className="m-0 text-5xl font-extrabold tracking-tight text-transparent"
            style={{
              background: 'linear-gradient(90deg, #ff8a5b, #ff5bb0, #8a7bff, #58c4ff)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
            }}
          >
            vitrio × shadcn/ui
          </h1>
          <p className="mt-2 text-sm uppercase tracking-[0.24em] text-muted-foreground">
            glass surfaces on real components
          </p>
        </header>

        <div className="flex flex-wrap items-center justify-center gap-16">
          {/* shadcn Button — the glass plate is its surface */}
          <div className="flex flex-col items-center gap-6">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Button</span>
            <Button
              ref={btnRef}
              variant="ghost"
              size="lg"
              className="text-base font-semibold hover:bg-transparent"
              onPointerEnter={() => btnGlass.current?.set({ glow: 0.38 })}
              onPointerLeave={() => btnGlass.current?.set({ glow: 0.14 })}
              onPointerDown={() => btnGlass.current?.set({ scale: 36 })}
              onPointerUp={() => btnGlass.current?.set({ scale: 22 })}
            >
              Get started <span className="text-sky-300">→</span>
            </Button>
          </div>

          {/* shadcn Switch — a glass knob rides the Radix thumb (transition included) */}
          <div className="flex flex-col items-center gap-6">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Switch</span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Wi-Fi</span>
              <Switch
                checked={wifi}
                onCheckedChange={setWifi}
                thumbRef={switchThumbRef}
                className="data-[state=checked]:bg-emerald-400/60"
                thumbClassName="bg-white/25 shadow-none"
              />
            </div>
          </div>

          {/* shadcn Slider — a glass lens rides the Radix thumb over a rainbow track */}
          <div className="flex flex-col items-center gap-6">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Slider</span>
            <Slider
              value={volume}
              onValueChange={setVolume}
              max={100}
              step={1}
              thumbRef={sliderThumbRef}
              className="w-64"
              trackClassName="h-2.5 [background:linear-gradient(90deg,#ff5b8a,#ffb45b,#f4f76e,#58ffa1,#58c4ff,#8a7bff)] shadow-[0_0_0_1px_rgba(255,255,255,.18)]"
              rangeClassName="bg-transparent"
              thumbClassName="border-white/40 bg-white/20 shadow-none"
            />
          </div>
        </div>

        {/* shadcn Card — one wide glass plate as the card surface */}
        <Card ref={cardRef} className="w-[380px] border-transparent bg-transparent shadow-none">
          <CardHeader className="pb-3">
            <CardTitle>Now playing</CardTitle>
            <CardDescription>{playing ? 'Refraction — vitrio (playing)' : 'Refraction — vitrio (paused)'}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl text-xl"
                style={{ background: 'linear-gradient(135deg, #8a7bff, #ff5bb0)' }}
              >
                🫧
              </div>
              <div className="text-sm text-muted-foreground">liquid glass</div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="rounded-full text-lg">⏮</Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-xl"
                aria-label={playing ? 'Pause' : 'Play'}
                onClick={() => setPlaying((p) => !p)}
              >
                {playing ? '⏸' : '▶'}
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full text-lg">⏭</Button>
            </div>
          </CardContent>
        </Card>

        <p className="absolute bottom-4 left-4 rounded-full bg-black/30 px-3.5 py-2 text-xs text-white/50">
          shadcn structure &amp; behaviour · vitrio surfaces · drag the floating lens
        </p>
      </main>

      {/* The component API also works: a free, draggable magnifier */}
      <LiquidGlass
        background={sceneRef}
        draggable
        zIndex={40}
        width={150}
        height={150}
        radius={75}
        scale={56}
        depth={75}
        curvature={2}
        convexity={1}
        chroma={0.14}
        glow={0.1}
        edge={0.45}
        x={Math.round(window.innerWidth * 0.78)}
        y={Math.round(window.innerHeight * 0.14)}
      />
    </div>
  );
}
