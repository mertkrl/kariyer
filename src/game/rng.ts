/*
 * Seeded randomness for the game's own decisions (who shows up on which day, which favours
 * the manager asks, hard mode's surprises). One seed per playthrough; every use draws from its
 * own stream named by a label, so the same seed gives the same week no matter in which order
 * things are asked for. Visual and audio noise keeps using Math.random: it changes nothing.
 */

function hashLabel(label: string) {
  let h = 2166136261;
  for (let i = 0; i < label.length; i++) h = Math.imul(h ^ label.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A stream of numbers in [0, 1) for this seed and label (mulberry32). */
export function rngFor(seed: number, label: string): () => number {
  let a = (seed ^ hashLabel(label)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A copy of `list` in random order (Fisher–Yates: every order equally likely). */
export function shuffle<T>(list: readonly T[], rand: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A new playthrough's seed: `?seed=123` in the address replays that week, otherwise a fresh one. */
export function newSeed(): number {
  const asked = Number(new URLSearchParams(window.location.search).get('seed'));
  return Number.isInteger(asked) && asked > 0 ? asked : Math.floor(Math.random() * 1e9) + 1;
}
