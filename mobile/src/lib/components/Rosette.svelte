<script lang="ts" module>
  // A guilloche rosette: two superimposed hypotrochoids, the security-print linework.
  function hypotrochoid(R: number, r: number, d: number, scale: number, steps = 720): string {
    const turns = r / gcd(R, r);
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2 * turns;
      const x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
      const y = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
      pts.push(`${(50 + x * scale).toFixed(2)},${(50 + y * scale).toFixed(2)}`);
    }
    return `M${pts.join("L")}Z`;
  }
  function gcd(a: number, b: number): number { return b ? gcd(b, a % b) : a; }
  const OUTER = hypotrochoid(10, 7, 6.2, 5.2);
  const INNER = hypotrochoid(9, 4, 3.4, 4.1);
</script>

<script lang="ts">
  type State = "idle" | "streaming" | "waiting" | "disconnected" | "connecting";
  let { state = "idle", size = 24, faint = false }: { state?: State; size?: number; faint?: boolean } = $props();
</script>

<svg class="rosette {state}" class:faint width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
  <path class="outer" d={OUTER} pathLength="1000" />
  <path class="inner" d={INNER} pathLength="1000" />
</svg>

<style>
  .rosette { display: block; flex: none; overflow: visible; }
  path { fill: none; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
  .outer { stroke: var(--md-primary); stroke-width: 1.1; }
  .inner { stroke: var(--ctp-teal); stroke-width: 0.9; opacity: 0.85; }
  .faint path { stroke-width: 0.8; }
  .faint { opacity: 0.22; }

  /* Running: the linework engraves itself, endlessly, while the plate turns. */
  .streaming { animation: turn 24s linear infinite; }
  .streaming path { stroke-dasharray: 1000; animation: engrave 2.6s var(--ease-emph) infinite alternate; }
  .streaming .inner { animation-delay: -1.3s; }
  /* Needs the user: whole, but pulsing in peach. */
  .waiting .outer { stroke: var(--ctp-peach); }
  .waiting { animation: pulse 1.6s ease-in-out infinite; }
  /* Offline: drawn with a broken line. */
  .disconnected path, .connecting path { stroke: var(--md-outline); stroke-dasharray: 6 10; }
  .connecting { animation: turn 4s linear infinite; }

  @keyframes engrave { from { stroke-dashoffset: 1000; } to { stroke-dashoffset: 0; } }
  @keyframes turn { to { transform: rotate(360deg); } }
  @keyframes pulse { 50% { opacity: 0.55; } }
  @media (prefers-reduced-motion: reduce) { .rosette, .rosette path { animation: none !important; stroke-dasharray: none; } }
</style>
