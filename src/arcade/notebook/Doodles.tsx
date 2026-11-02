import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { SOS_N, sosLines, sosMove, xoxMove, xoxWinner, type Letter, type Mark } from './boardGames';
import { bounds, recognize, type Glyph, type Pt } from './glyph';
import { PaperGame } from './PaperBoards';
import { PAPER_TITLES, letterOf, type PaperKind } from './paperGames';
import * as sfx from './sfx';
import s from './Doodles.module.css';

/*
 * Kâğıda karalama: defterin boş bir yerine basılı tutup kalemle X, S ya da O çizilince robotla
 * oyun başlar. X çizen XOX'a, S çizen SOS'a başlar; O çizilince robot hangisini oynayacağını
 * rastgele seçer (XOX'ta oyuncu O, robot X olur). Tahta çizilen işaretin yerine, kâğıdın
 * karelerine oturarak kalemle çizilir; ilk hamle oyuncunun çizdiği işarettir, ortadaki kareye
 * yazılır. Sonraki hamleler kareye dokunarak ya da işareti kareye çizerek yapılır (SOS'ta dokunmak
 * S yazar, O için O çizilir). Oyun bitince yeni bir işaret yeni oyunu başlatır; ✕ tahtayı siler.
 * Telefonda sayfa kaydırması bozulmasın diye çizim kısa bir basılı tutmayla başlar.
 * Tanıma glyph.ts'te, kurallar ve robot boardGames.ts'te.
 *
 * Gizli kâğıt oyunları da böyle açılır, hepsi tek hamlede çizilir: M çizen (ya da sayfada
 * TOPLANTI yazan) toplantı asmacaya, kare çizen (KUTU) noktalar ve kutulara, üçgen çizen (GOL)
 * kâğıt futboluna başlar. Bunlar tam ekran açılır, defter arkada kalır (PaperBoards.tsx);
 * "deftere dön" kapatır.
 */

const CELL = 44;
const GRID = 22;
const BLUE = '#2c4f8f';
const RED = '#b3261e';
const GRAPHITE = '#3b3a36';
/** Ayrı darbeler (X'in iki çizgisi) bu kadar ms içinde gelirse aynı işaret sayılır. */
const GROUP_MS = 550;
/** Dokunmatik ekranda çizime başlamak için basılı tutma süresi. */
const HOLD_MS = 260;
const ROBOT_MS = 650;

/** Gizli kâğıt oyununu açan işaret ve sayfada yazılınca açan sözcükler. */
const PAPER_GLYPH: Partial<Record<Glyph, PaperKind>> = { M: 'asmaca', '□': 'kutu', '△': 'futbol' };
const PAPER_WORDS: [string, PaperKind][] = [
  ['TOPLANTI', 'asmaca'],
  ['ASMACA', 'asmaca'],
  ['KUTU', 'kutu'],
  ['GOL', 'futbol'],
];
interface Paper {
  kind: PaperKind;
  /** Aynı türden yenisi baştan başlasın diye. */
  id: number;
}

/** Bir dokunuşla tıklanır kâğıt kenarı gibi değil, tam ekran: kareli kâğıt, başlık, geri dönüş. */
function PaperScreen({ paper, onClose }: { paper: Paper; onClose: () => void }) {
  // arkadaki defter kaymasın
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return createPortal(
    <div className={s.full} role="dialog" aria-modal="true" aria-label={PAPER_TITLES[paper.kind]} data-no-doodle>
      <div className={s.fullInner}>
        <div className={s.fullTop}>
          <h2 className={s.fullTitle}>{PAPER_TITLES[paper.kind]}</h2>
          <button type="button" className={s.back} onClick={onClose}>
            ← deftere dön
          </button>
        </div>
        <PaperGame key={paper.id} kind={paper.kind} />
      </div>
    </div>,
    document.body,
  );
}

type Who = 'me' | 'pc';

interface Game {
  kind: 'xox' | 'sos';
  /** Tahtanın sol üst köşesi (sayfa koordinatı). */
  x: number;
  y: number;
  n: number;
  cells: (Mark | Letter)[];
  owner: (Who | null)[];
  lines: { cells: number[]; who: Who }[];
  /** XOX'ta oyuncunun işareti. */
  me: 'X' | 'O';
  turn: Who;
  over: boolean;
}

/** Elle çekilmiş çizgi: uçları biraz taşan, ortası hafif eğri. */
function hand(x1: number, y1: number, x2: number, y2: number, k: number) {
  const bend = ((k * 37) % 7) - 3;
  const mx = (x1 + x2) / 2 + (y1 === y2 ? 0 : bend);
  const my = (y1 + y2) / 2 + (x1 === x2 ? 0 : bend);
  return `M${x1 - 2} ${y1 - 1} Q${mx} ${my} ${x2 + 2} ${y2 + 1}`;
}

/** Yazılır gibi çizilen darbenin uzunluğu (px): kesik çizgi animasyonu bu boya göre kurulur. */
const dash = (len: number) => ({ ['--len' as string]: Math.ceil(len + 6) });

const pathOf = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');

/** Oyunun sonucu ve durum yazısı. */
function status(g: Game): { over: boolean; text: string } {
  if (g.kind === 'xox') {
    const w = xoxWinner(g.cells as Mark[]);
    if (w === 'draw') return { over: true, text: 'berabere.' };
    if (w) return { over: true, text: w.who === g.me ? 'kazandın!' : 'ben kazandım :)' };
  } else {
    const me = g.lines.filter((l) => l.who === 'me').length;
    const pc = g.lines.length - me;
    if (g.cells.every(Boolean)) return { over: true, text: `${me > pc ? 'kazandın!' : me < pc ? 'ben kazandım :)' : 'berabere.'} sen ${me} · ben ${pc}` };
    return { over: false, text: `${g.turn === 'me' ? 'sıra sende' : 'düşünüyorum…'} · sen ${me} · ben ${pc}` };
  }
  return { over: false, text: g.turn === 'me' ? 'sıra sende' : 'düşünüyorum…' };
}

/** Bir hamle: işaret yazılır; SOS'ta tamamlanan SOS'lar eklenir ve yapan bir daha oynar. */
function move(g: Game, i: number, mark: 'X' | 'O' | 'S', who: Who): Game {
  const made = g.kind === 'sos' ? sosLines(g.cells as Letter[], i, mark as 'S' | 'O') : [];
  const cells = [...g.cells];
  cells[i] = mark as Mark;
  const owner = [...g.owner];
  owner[i] = who;
  const again = made.length > 0;
  const next: Game = { ...g, cells, owner, lines: [...g.lines, ...made.map((c) => ({ cells: c, who }))], turn: again ? who : who === 'me' ? 'pc' : 'me' };
  return { ...next, over: status(next).over };
}

/** Robotun hamlesi. */
function robot(g: Game): Game {
  if (g.kind === 'xox') {
    const i = xoxMove(g.cells as Mark[], Math.random, 0.15, g.me === 'X' ? 'O' : 'X');
    return i < 0 ? g : move(g, i, g.me === 'X' ? 'O' : 'X', 'pc');
  }
  const m = sosMove(g.cells as Letter[], Math.random);
  return m ? move(g, m.i, m.ch, 'pc') : g;
}

/** Sayfada oyunun tahtası: kalem ızgara, işaretler, SOS çizgileri. */
function Board({ g }: { g: Game }) {
  const w = g.n * CELL;
  const center = (i: number) => [g.x + (i % g.n) * CELL + CELL / 2, g.y + Math.floor(i / g.n) * CELL + CELL / 2];
  const strike = (a: number, b: number, color: string, k: number) => {
    const [x1, y1] = center(a);
    const [x2, y2] = center(b);
    return <path key={k} className={s.draw} style={dash(Math.hypot(x2 - x1, y2 - y1))} d={hand(x1, y1, x2, y2, a + b)} stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" opacity=".75" />;
  };
  const win = g.kind === 'xox' ? xoxWinner(g.cells as Mark[]) : null;
  return (
    <g>
      <g stroke={GRAPHITE} strokeWidth="2" strokeLinecap="round" fill="none" opacity=".85">
        {Array.from({ length: g.n - 1 }, (_, i) => (
          <g key={i}>
            <path className={s.draw} style={dash(w)} d={hand(g.x + (i + 1) * CELL, g.y + 4, g.x + (i + 1) * CELL, g.y + w - 4, i + 1)} />
            <path className={s.draw} style={dash(w)} d={hand(g.x + 4, g.y + (i + 1) * CELL, g.x + w - 4, g.y + (i + 1) * CELL, i + 5)} />
          </g>
        ))}
        {g.kind === 'sos' && <rect className={s.draw} style={dash(4 * w)} x={g.x} y={g.y} width={w} height={w} rx="2" opacity=".5" />}
      </g>
      {g.cells.map((m, i) => {
        if (!m) return null;
        const [x, y] = center(i);
        const color = g.owner[i] === 'me' ? BLUE : RED;
        if (g.kind === 'sos')
          return (
            <text key={i} className={s.letter} x={x} y={y + 10} textAnchor="middle" fill={color} transform={`rotate(${((i * 13) % 9) - 4} ${x} ${y})`}>
              {m}
            </text>
          );
        return m === 'X' ? (
          <path key={i} className={s.draw} style={dash(66)} d={`M${x - 11} ${y - 12} L${x + 11} ${y + 11} M${x + 12} ${y - 11} L${x - 10} ${y + 12}`} stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" />
        ) : (
          <path key={i} className={s.draw} style={dash(82)} d={`M${x + 1} ${y - 13} C${x + 16} ${y - 12} ${x + 15} ${y + 13} ${x} ${y + 12} C${x - 15} ${y + 12} ${x - 14} ${y - 12} ${x + 3} ${y - 12}`} stroke={color} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        );
      })}
      {g.lines.map((l, k) => strike(l.cells[0], l.cells[2], l.who === 'me' ? BLUE : RED, k))}
      {win && win !== 'draw' && strike(win.line[0], win.line[2], GRAPHITE, 99)}
    </g>
  );
}

/** Sayfanın etkileşimli olmayan yeri mi: dosyalar, düğmeler, başlık ve tablo karalanmaz. */
const blank = (t: EventTarget | null) => t instanceof Element && !t.closest('a, button, input, textarea, select, label, header, li, [role="dialog"], [data-no-doodle]');

export function Doodles({ page }: { page: RefObject<HTMLDivElement | null> }) {
  const [game, setGame] = useState<Game | null>(null);
  const [ink, setInk] = useState<Pt[][]>([]);
  const [fading, setFading] = useState(false);
  const [paper, setPaper] = useState<Paper | null>(null);
  const paperRef = useRef<Paper | null>(null);
  const gameRef = useRef<Game | null>(null);
  useEffect(() => {
    paperRef.current = paper;
  }, [paper]);
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    const root = page.current;
    if (!root) return;
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    let group: Pt[][] = [];
    let stroke: Pt[] | null = null;
    let groupTimer = 0;
    let hold = 0;
    let start: Pt | null = null;
    let tapped = false;

    const at = (e: PointerEvent): Pt => {
      const r = root.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };

    const play = (next: Game) => {
      sfx.scribble();
      setGame(next);
      // tahta bu arada silindiyse ya da yenisi başladıysa robot oynamaz
      if (!next.over && next.turn === 'pc') later(ROBOT_MS, () => gameRef.current === next && play(robot(next)));
    };

    /** Bir hücreye oyuncunun hamlesi; hücre tahtada ve boşsa. */
    const tryMove = (p: Pt, mark: 'X' | 'O' | 'S' | null) => {
      const g = gameRef.current;
      if (!g || g.over || g.turn !== 'me') return false;
      const c = Math.floor((p[0] - g.x) / CELL);
      const r = Math.floor((p[1] - g.y) / CELL);
      if (c < 0 || r < 0 || c >= g.n || r >= g.n) return false;
      const i = r * g.n + c;
      if (g.cells[i]) return true;
      const m = g.kind === 'xox' ? g.me : mark === 'O' ? 'O' : 'S';
      play(move(g, i, m, 'me'));
      return true;
    };

    /** Yeni tahta: çizilen işaret ortadaki kareye oturur, tahta kâğıdın karelerine hizalanır. */
    const startGame = (glyph: 'X' | 'S' | 'O', cx: number, cy: number) => {
      const kind = glyph === 'X' ? 'xox' : glyph === 'S' ? 'sos' : Math.random() < 0.5 ? 'xox' : 'sos';
      const n = kind === 'xox' ? 3 : SOS_N;
      const mid = (n - 1) / 2;
      const w = root.clientWidth;
      const x = Math.max(70, Math.min(w - n * CELL - 16, Math.round((cx - CELL / 2) / GRID) * GRID - mid * CELL));
      // tahta ve altındaki not sayfanın içinde kalır
      const bottom = Math.floor((root.clientHeight - n * CELL - 90) / GRID) * GRID;
      const y = Math.max(GRID, Math.min(bottom, Math.round((cy - CELL / 2) / GRID) * GRID - mid * CELL));
      setPaper(null);
      const fresh: Game = { kind, x, y, n, cells: Array(n * n).fill(null), owner: Array(n * n).fill(null), lines: [], me: glyph === 'O' ? 'O' : 'X', turn: 'me', over: false };
      play(move(fresh, Math.floor((n * n) / 2), kind === 'xox' ? fresh.me : glyph === 'O' ? 'O' : 'S', 'me'));
    };

    /** Gizli kâğıt oyunu: tam ekran açılır; defterdeki tahta silinir. */
    const startPaper = (kind: PaperKind) => {
      sfx.scribble();
      setGame(null);
      setPaper({ kind, id: Date.now() });
    };

    // sayfada yazılan gizli sözcük (bir alana yazılmıyorsa); asmaca açıkken harfler ona gider
    let typed = '';
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.target !== document.body || paperRef.current?.kind === 'asmaca') return;
      const c = letterOf(e.key);
      typed = c ? (typed + c).slice(-12) : '';
      const hit = PAPER_WORDS.find(([w]) => typed.endsWith(w));
      if (!hit) return;
      typed = '';
      startPaper(hit[1]);
    };

    const finish = () => {
      const strokes = group;
      group = [];
      setInk([]);
      if (!strokes.length) return;
      const glyph = recognize(strokes);
      const box = bounds(strokes);
      const g = gameRef.current;
      const paperKind = glyph && PAPER_GLYPH[glyph];
      if (g && !g.over && tryMove([box.cx, box.cy], paperKind ? null : (glyph as 'X' | 'S' | 'O' | null))) return;
      if (paperKind) return startPaper(paperKind);
      if (glyph && (!g || g.over)) return startGame(glyph as 'X' | 'S' | 'O', box.cx, box.cy);
      // tanınmayan karalama silinir gibi solar
      setInk(strokes);
      setFading(true);
      later(700, () => {
        setInk([]);
        setFading(false);
      });
    };

    const begin = (p: Pt) => {
      window.clearTimeout(groupTimer);
      stroke = [p];
      setFading(false);
      setInk([...group, stroke]);
    };

    const down = (e: PointerEvent) => {
      if (e.button !== 0 || !blank(e.target)) return;
      start = at(e);
      tapped = true;
      if (e.pointerType === 'mouse') {
        e.preventDefault();
        begin(start);
      } else {
        // dokunmatik: kısa basılı tutunca kalem iner, hemen kayan parmak sayfayı kaydırır
        hold = window.setTimeout(() => {
          if (start) begin(start);
        }, HOLD_MS);
      }
    };

    const moveP = (e: PointerEvent) => {
      if (!start) return;
      const p = at(e);
      if (Math.hypot(p[0] - start[0], p[1] - start[1]) > 4) tapped = false;
      if (!stroke) {
        if (!tapped) {
          window.clearTimeout(hold);
          start = null;
        }
        return;
      }
      stroke.push(p);
      setInk([...group, stroke]);
    };

    const up = () => {
      window.clearTimeout(hold);
      const tap = tapped && start;
      const p = start;
      start = null;
      tapped = false;
      if (stroke && stroke.length > 2) group.push(stroke);
      stroke = null;
      if (tap && p && !group.length && tryMove(p, null)) {
        setInk([]);
        return;
      }
      window.clearTimeout(groupTimer);
      groupTimer = window.setTimeout(finish, GROUP_MS);
    };

    // çizerken dokunmatik ekran sayfayı kaydırmasın
    const touch = (e: TouchEvent) => stroke && e.preventDefault();

    root.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', moveP);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    root.addEventListener('touchmove', touch, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      root.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', moveP);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      root.removeEventListener('touchmove', touch);
      window.clearTimeout(groupTimer);
      window.clearTimeout(hold);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [page]);

  const st = game ? status(game) : null;
  return (
    <>
      <svg className={s.layer} aria-hidden="true">
        {game && <Board g={game} />}
        {ink.map((pts, i) => (
          <path key={i} className={fading ? s.fade : undefined} d={pathOf(pts)} stroke={BLUE} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        ))}
      </svg>
      {paper && <PaperScreen paper={paper} onClose={() => setPaper(null)} />}
      {game && st && (
        <div className={s.note} style={{ left: game.x, top: game.y + game.n * CELL + 8 }} data-no-doodle>
          <span className={s.kind}>{game.kind === 'xox' ? 'XOX' : 'SOS'}</span>
          <span aria-live="polite">{st.text}</span>
          {st.over && <small>yeni oyun için kâğıda X, S ya da O çiz</small>}
          <button type="button" className={s.erase} onClick={() => setGame(null)} aria-label="Tahtayı sil">
            ✕ sil
          </button>
        </div>
      )}
    </>
  );
}
