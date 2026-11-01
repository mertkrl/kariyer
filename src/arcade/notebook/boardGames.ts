/*
 * Defter kenarı oyunları: XOX (üç taş) ve SOS. Oyuncu bilgisayara karşı oynar. Saf mantıktır,
 * test edilebilir; rastgelelik dışarıdan verilir.
 *
 * XOX: 3×3, oyuncu X, bilgisayar O (oyuncu O ile başlarsa tersi). Bilgisayar kazanabiliyorsa kazanır, oyuncu kazanacaksa keser,
 * yoksa ortayı, köşeleri, sonra kalanı seçer; ara sıra (`slip`) dalgınlıkla rastgele oynar ki
 * yenilebilsin.
 *
 * SOS: 5×5. Sırası gelen boş bir kareye S ya da O yazar; yazdığı harfle yatay, dikey ya da çapraz
 * bir S-O-S tamamlanırsa her biri bir puandır ve aynı oyuncu bir daha oynar. Kareler dolunca çok
 * puanı olan kazanır. Bilgisayar en çok puan getiren hamleyi yapar; puan yoksa rakibine hazır SOS
 * bırakmayan bir hamle arar.
 */

export type Mark = 'X' | 'O' | null;

const LINES3 = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** Kazanan ve kazandıran çizgi; berabereyse 'draw', oyun sürüyorsa null. */
export function xoxWinner(b: Mark[]): { who: 'X' | 'O'; line: number[] } | 'draw' | null {
  for (const l of LINES3) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return { who: b[l[0]] as 'X' | 'O', line: l };
  return b.every(Boolean) ? 'draw' : null;
}

/** Bilgisayarın hamlesi; `pc` bilgisayarın işareti (oyuncu O ile başladıysa bilgisayar X olur). */
export function xoxMove(b: Mark[], r: () => number, slip = 0.15, pc: 'X' | 'O' = 'O'): number {
  const empty = b.map((m, i) => (m ? -1 : i)).filter((i) => i >= 0);
  if (!empty.length) return -1;
  const finishing = (who: Mark) => empty.find((i) => LINES3.some((l) => l.includes(i) && l.filter((j) => j !== i).every((j) => b[j] === who)));
  const win = finishing(pc);
  if (win !== undefined) return win;
  if (r() < slip) return empty[Math.floor(r() * empty.length)];
  const block = finishing(pc === 'O' ? 'X' : 'O');
  if (block !== undefined) return block;
  if (!b[4]) return 4;
  const corners = [0, 2, 6, 8].filter((i) => !b[i]);
  if (corners.length) return corners[Math.floor(r() * corners.length)];
  return empty[Math.floor(r() * empty.length)];
}

// --- SOS ---

export const SOS_N = 5;
export type Letter = 'S' | 'O' | null;

const DIRS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

const at = (b: Letter[], r: number, c: number): Letter | undefined => (r >= 0 && r < SOS_N && c >= 0 && c < SOS_N ? b[r * SOS_N + c] : undefined);

/** `i` karesine `ch` yazılınca tamamlanan S-O-S'lar (her biri üç karenin sırası). */
export function sosLines(b: Letter[], i: number, ch: 'S' | 'O'): number[][] {
  const r = Math.floor(i / SOS_N);
  const c = i % SOS_N;
  const g = [...b];
  g[i] = ch;
  const out: number[][] = [];
  for (const [dr, dc] of DIRS) {
    if (ch === 'O') {
      if (at(g, r - dr, c - dc) === 'S' && at(g, r + dr, c + dc) === 'S') out.push([(r - dr) * SOS_N + c - dc, i, (r + dr) * SOS_N + c + dc]);
    } else
      for (const k of [1, -1]) {
        if (at(g, r + dr * k, c + dc * k) === 'O' && at(g, r + 2 * dr * k, c + 2 * dc * k) === 'S') out.push([i, (r + dr * k) * SOS_N + c + dc * k, (r + 2 * dr * k) * SOS_N + c + 2 * dc * k]);
      }
  }
  return out;
}

/** Bu tahtada sıradakinin bir hamlede yapabileceği en çok SOS. */
const bestScore = (b: Letter[]) => {
  let best = 0;
  b.forEach((m, i) => {
    if (m) return;
    for (const ch of ['S', 'O'] as const) best = Math.max(best, sosLines(b, i, ch).length);
  });
  return best;
};

/** Bilgisayarın SOS hamlesi: kare ve harf. */
export function sosMove(b: Letter[], r: () => number): { i: number; ch: 'S' | 'O' } | null {
  const moves: { i: number; ch: 'S' | 'O'; gain: number }[] = [];
  b.forEach((m, i) => {
    if (m) return;
    for (const ch of ['S', 'O'] as const) moves.push({ i, ch, gain: sosLines(b, i, ch).length });
  });
  if (!moves.length) return null;
  const top = Math.max(...moves.map((m) => m.gain));
  const pick = (list: typeof moves) => {
    const m = list[Math.floor(r() * list.length)];
    return { i: m.i, ch: m.ch };
  };
  if (top > 0) return pick(moves.filter((m) => m.gain === top));
  // puan yoksa rakibe hazır SOS bırakmayan hamleler
  const safe = moves.filter((m) => {
    const g = [...b];
    g[m.i] = m.ch;
    return bestScore(g) === 0;
  });
  return pick(safe.length ? safe : moves);
}
