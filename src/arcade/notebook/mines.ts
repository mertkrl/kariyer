/*
 * Tablonun içindeki gizli oyun (=OYNA()): hücrelerle oynanan mayın tarlası. İlk açılan hücre ve
 * komşuları hiçbir zaman mayın değildir; mayınlar o ilk tıkta dizilir. Boş hücre açılınca
 * çevresindeki boşluklar da kendiliğinden açılır. Saf mantıktır, test edilebilir.
 */

export type Mines = {
  w: number;
  h: number;
  count: number;
  /** Mayınlar dizildi mi (ilk tıktan önce dizilmez). */
  laid: boolean;
  mine: boolean[];
  open: boolean[];
  flag: boolean[];
  state: 'play' | 'won' | 'lost';
};

export function newMines(w = 9, h = 9, count = 10): Mines {
  const n = w * h;
  return { w, h, count, laid: false, mine: Array(n).fill(false), open: Array(n).fill(false), flag: Array(n).fill(false), state: 'play' };
}

export function neighbours(m: Pick<Mines, 'w' | 'h'>, i: number): number[] {
  const x = i % m.w;
  const y = Math.floor(i / m.w);
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < m.w && ny < m.h) out.push(ny * m.w + nx);
    }
  return out;
}

export const around = (m: Mines, i: number) => neighbours(m, i).filter((j) => m.mine[j]).length;

function lay(m: Mines, safe: number, rand: () => number): boolean[] {
  const keep = new Set([safe, ...neighbours(m, safe)]);
  const spots = m.mine.map((_, i) => i).filter((i) => !keep.has(i));
  const mine = Array(m.mine.length).fill(false);
  for (let k = 0; k < Math.min(m.count, spots.length); k++) {
    const j = k + Math.floor(rand() * (spots.length - k));
    [spots[k], spots[j]] = [spots[j], spots[k]];
    mine[spots[k]] = true;
  }
  return mine;
}

/** Hücreyi açar; mayınsa oyun biter, boşsa çevresi de açılır. */
export function reveal(m: Mines, i: number, rand: () => number = Math.random): Mines {
  if (m.state !== 'play' || m.open[i] || m.flag[i]) return m;
  const mine = m.laid ? m.mine : lay(m, i, rand);
  const next: Mines = { ...m, laid: true, mine, open: [...m.open] };
  if (mine[i]) {
    mine.forEach((b, j) => b && (next.open[j] = true));
    return { ...next, state: 'lost' };
  }
  const stack = [i];
  while (stack.length) {
    const j = stack.pop()!;
    if (next.open[j] || next.flag[j]) continue;
    next.open[j] = true;
    if (around(next, j) === 0) stack.push(...neighbours(next, j));
  }
  const won = next.open.every((o, j) => o || mine[j]);
  return won ? { ...next, state: 'won' } : next;
}

export function toggleFlag(m: Mines, i: number): Mines {
  if (m.state !== 'play' || m.open[i]) return m;
  const flag = [...m.flag];
  flag[i] = !flag[i];
  return { ...m, flag };
}
