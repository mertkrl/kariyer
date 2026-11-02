import { useEffect, useRef, useState } from 'react';
import {
  ALPHABET,
  DOT_N,
  INVITES,
  MAX_WRONG,
  allLines,
  dotsMove,
  dotsOver,
  dotsScore,
  drawLine,
  guess,
  hangmanState,
  letterOf,
  newDots,
  newHangman,
  wrongOf,
  type Dots,
  type Hangman,
  type PaperKind,
} from './paperGames';
import { CoinFootball } from './CoinFootball';
import * as sfx from './sfx';
import s from './PaperBoards.module.css';

/*
 * Defterin gizli kâğıt kalem oyunları: adam asmaca kurumsal sözcüklerle oynanır, her yanlış harf
 * takvime bir toplantı daveti ekler; noktalar ve kutular bilgisayara karşıdır; demir para futbolunda masadaki paraya fiske vurulur.
 * Karalama katmanı (Doodles) bunları kâğıda T, kare ya da + çizilince (ya da TOPLANTI, KUTU, GOL
 * yazılınca) çizildiği yerde açar. Kurallar ve bilgisayar paperGames.ts'te.
 */

const BLUE = '#2c4f8f';
const RED = '#b3261e';
const GRAPHITE = '#3b3a36';
const ROBOT_MS = 600;


/** Elle çekilmiş çizgi: ortası hafif eğri. */
function hand(x1: number, y1: number, x2: number, y2: number, k: number) {
  const bend = ((k * 37) % 5) - 2;
  const mx = (x1 + x2) / 2 + (y1 === y2 ? 0 : bend);
  const my = (y1 + y2) / 2 + (x1 === x2 ? 0 : bend);
  return `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`;
}

// --- Adam asmaca ---

function Hangmen() {
  const [h, setH] = useState<Hangman>(() => newHangman(Math.random));
  const box = useRef<HTMLDivElement>(null);
  const state = hangmanState(h);
  const wrong = wrongOf(h);

  const press = (c: string) => {
    setH((cur) => {
      const next = guess(cur, c);
      if (next !== cur) sfx.scribble();
      return next;
    });
  };

  // fiziksel klavye: sayfada ya da bu bölümde yazınca harf seçilir
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t !== document.body && !(t instanceof Node && box.current?.contains(t))) return;
      if (e.key === 'Enter' && hangmanState(h)) return setH(newHangman(Math.random));
      const c = letterOf(e.key);
      if (c) press(c);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [h]);

  return (
    <div ref={box} className={s.hang}>
      <div>
        <p className={s.word} aria-label={state ? `Sözcük: ${h.word}` : 'Bulunacak sözcük'}>
          {[...h.word].map((c, i) =>
            c === ' ' ? (
              <span key={i} className={s.gap} />
            ) : (
              <span key={i} className={`${s.slot} ${!h.guessed.includes(c) && state === 'lost' ? s.missed : ''}`}>
                {h.guessed.includes(c) || state === 'lost' ? c : ''}
              </span>
            ),
          )}
        </p>
        <div className={s.keys} role="group" aria-label="Harfler">
          {ALPHABET.map((c) => {
            const used = h.guessed.includes(c);
            const hit = used && h.word.includes(c);
            return (
              <button key={c} type="button" className={`${s.key} ${used ? (hit ? s.hit : s.miss) : ''}`} disabled={used || !!state} onClick={() => press(c)}>
                {c}
              </button>
            );
          })}
        </div>
        <p className={s.status} aria-live="polite">
          {state === 'won'
            ? `Kurtuldun! Takvimde ${MAX_WRONG - wrong} saat boş kaldı.`
            : state === 'lost'
              ? 'Takvim doldu. Bugün iş yapılmayacak.'
              : wrong
                ? `${wrong} davet geldi, ${MAX_WRONG - wrong} boş saat kaldı.`
                : 'Bir harf seç ya da klavyeden yaz. Yanlış harf = yeni toplantı.'}
          {state && (
            <button type="button" className={s.again} onClick={() => setH(newHangman(Math.random))}>
              yeni sözcük →
            </button>
          )}
        </p>
      </div>
      <ol className={s.calendar} aria-label="Bugünün takvimi">
        {INVITES.map(([time, title], i) => (
          <li key={time} className={i < wrong ? s.invite : s.free} style={{ ['--r' as string]: `${((i * 7) % 5) - 2}deg` }}>
            <span className={s.time}>{time}</span>
            {i < wrong ? (
              <span>
                <b>{title}</b>
                <small>Davet: tüm ekip · Zorunlu</small>
              </span>
            ) : (
              <span className={s.empty}>boş</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

// --- Noktalar ve kutular ---

const SP = 52;
const PAD = 18;

function lineEnds(id: string): [number, number, number, number] {
  const n = Number(id.slice(1));
  if (id[0] === 'h') {
    const r = Math.floor(n / (DOT_N - 1));
    const c = n % (DOT_N - 1);
    return [PAD + c * SP, PAD + r * SP, PAD + (c + 1) * SP, PAD + r * SP];
  }
  const r = Math.floor(n / DOT_N);
  const c = n % DOT_N;
  return [PAD + c * SP, PAD + r * SP, PAD + c * SP, PAD + (r + 1) * SP];
}

function Boxes() {
  const [d, setD] = useState<Dots>(newDots);
  const over = dotsOver(d);
  const sc = dotsScore(d);

  useEffect(() => {
    if (over || d.turn !== 'pc') return;
    const t = window.setTimeout(() => {
      const l = dotsMove(d, Math.random);
      if (!l) return;
      sfx.scribble();
      setD(drawLine(d, l, 'pc'));
    }, ROBOT_MS);
    return () => window.clearTimeout(t);
  }, [d, over]);

  const play = (id: string) => {
    if (over || d.turn !== 'me' || d.lines[id]) return;
    sfx.scribble();
    setD(drawLine(d, id, 'me'));
  };

  const size = PAD * 2 + SP * (DOT_N - 1);
  const B = DOT_N - 1;
  return (
    <div className={s.board}>
      <svg className={s.svg} viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`Noktalar ve kutular: sen ${sc.me}, ben ${sc.pc}`}>
        {d.boxes.map((who, i) => {
          if (!who) return null;
          const x = PAD + (i % B) * SP;
          const y = PAD + Math.floor(i / B) * SP;
          const color = who === 'me' ? BLUE : RED;
          return (
            <g key={i} className={s.pop}>
              <rect x={x + 4} y={y + 4} width={SP - 8} height={SP - 8} fill={color} opacity=".1" />
              <text x={x + SP / 2} y={y + SP / 2 + 9} textAnchor="middle" className={s.mark} fill={color}>
                {who === 'me' ? 'S' : 'B'}
              </text>
            </g>
          );
        })}
        {allLines().map((id, k) => {
          const [x1, y1, x2, y2] = lineEnds(id);
          const who = d.lines[id];
          if (who) return <path key={id} className={s.ink} d={hand(x1, y1, x2, y2, k)} stroke={who === 'me' ? BLUE : RED} strokeWidth="3" strokeLinecap="round" fill="none" />;
          const horiz = y1 === y2;
          return (
            <g key={id} className={s.hitLine} onClick={() => play(id)}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={BLUE} strokeWidth="3" strokeLinecap="round" />
              <rect x={horiz ? x1 + 8 : x1 - 12} y={horiz ? y1 - 12 : y1 + 8} width={horiz ? SP - 16 : 24} height={horiz ? 24 : SP - 16} fill="transparent" />
            </g>
          );
        })}
        {Array.from({ length: DOT_N * DOT_N }, (_, i) => (
          <circle key={i} cx={PAD + (i % DOT_N) * SP} cy={PAD + Math.floor(i / DOT_N) * SP} r="3.6" fill={GRAPHITE} />
        ))}
      </svg>
      <p className={s.status} aria-live="polite">
        {over ? `${sc.me > sc.pc ? 'Kazandın!' : sc.me < sc.pc ? 'Ben kazandım :)' : 'Berabere.'} ` : d.turn === 'me' ? 'Sıra sende: iki noktanın arasına çizgi çek. ' : 'Düşünüyorum… '}
        <span className={s.score}>
          sen {sc.me} · ben {sc.pc}
        </span>
        {over && (
          <button type="button" className={s.again} onClick={() => setD(newDots())}>
            yeni sayfa →
          </button>
        )}
      </p>
    </div>
  );
}

export function PaperGame({ kind }: { kind: PaperKind }) {
  return kind === 'asmaca' ? <Hangmen /> : kind === 'kutu' ? <Boxes /> : <CoinFootball />;
}
