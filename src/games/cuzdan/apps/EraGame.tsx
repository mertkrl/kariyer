import { useEffect, useMemo, useState } from 'react';
import { ERA_ITEMS, ITEMS, NOW, type Year } from '../data';
import { money, rng, themeOf } from '../model';
import { sfx } from '../sfx';
import a from '../Apps.module.css';
import g from '../EraGame.module.css';

/*
 * Dönemin oyunu: her işletim sistemi döneminin kendi küçük oyunu var, saat geri alınınca o da değişir.
 * - 2002–2005 (mavi pencereler): Eşini Bul — kapalı kartlarda o yılın ürünleri, ikişer ikişer eşlenir.
 * - 2009–2012 (cam): Yapboz Aracı — kenar çubuğu aracı gibi kaydırmalı 3×3 yapboz; boş kareye
 *   komşu parçaya tıklanınca kayar.
 * - 2016 sonrası (düz): Etiket Avı — 20 saniye; ızgarada beliren ürünlerden fiyatı sınırın altında
 *   olanlara dokun.
 * Her açılışta ürünler ve dizilişler rastgeledir.
 */

const newSeed = () => Math.floor(Math.random() * 2 ** 31) + 1;

function shuffle<T>(xs: readonly T[], r: () => number): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** O yılın rafındaki emojiler: dönem ürünleri önce, kalan yer gündelik ürünlerle dolar. */
function eraEmojis(year: Year, r: () => number, n: number): string[] {
  const era = ERA_ITEMS.filter((e) => e.prices[year] !== undefined).map((e) => e.emoji);
  const rest = ITEMS.map((i) => i.emoji);
  return [...new Set([...shuffle(era, r), ...shuffle(rest, r)])].slice(0, n);
}

export function EraGame({ year }: { year: Year }) {
  const theme = themeOf(year);
  const [seed, setSeed] = useState(newSeed);
  const again = () => {
    sfx.click();
    setSeed(newSeed());
  };
  if (theme === 'luna') return <Memory key={seed} year={year} seed={seed} onAgain={again} />;
  if (theme === 'glass') return <Slide key={seed} year={year} seed={seed} onAgain={again} />;
  return <Tags key={seed} year={year} seed={seed} onAgain={again} />;
}

// ── Eşini Bul ────────────────────────────────────────────────────

function Memory({ year, seed, onAgain }: { year: Year; seed: number; onAgain: () => void }) {
  const cards = useMemo(() => {
    const r = rng(seed);
    const e = eraEmojis(year, r, 8);
    return shuffle([...e, ...e], r);
  }, [seed, year]);
  const [open, setOpen] = useState<number[]>([]);
  const [found, setFound] = useState<Set<string>>(() => new Set());
  const [moves, setMoves] = useState(0);
  const done = found.size === cards.length / 2;

  useEffect(() => {
    if (open.length !== 2) return;
    const [x, y] = open;
    const t = window.setTimeout(
      () => {
        if (cards[x] === cards[y]) {
          setFound((f) => new Set(f).add(cards[x]));
          sfx.ok();
        }
        setOpen([]);
      },
      cards[x] === cards[y] ? 250 : 700,
    );
    return () => window.clearTimeout(t);
  }, [open, cards]);

  const flip = (i: number) => {
    if (open.length === 2 || open.includes(i) || found.has(cards[i])) return;
    sfx.click();
    if (open.length === 1) setMoves((m) => m + 1);
    setOpen([...open, i]);
  };

  return (
    <div className={a.pad}>
      <p className={a.dim}>{year} rafından sekiz çift. Kartları ikişer aç, eşlerini bul.</p>
      <div className={g.memory}>
        {cards.map((c, i) => {
          const shown = open.includes(i) || found.has(c);
          return (
            <button key={i} type="button" className={`${g.card} ${shown ? g.cardOpen : ''} ${found.has(c) ? g.cardFound : ''}`} onClick={() => flip(i)} aria-label={shown ? c : 'Kapalı kart'}>
              {shown ? c : '₺'}
            </button>
          );
        })}
      </div>
      <div className={a.between}>
        <span className={a.dim} role="status">
          {done ? `Hepsi bulundu: ${moves} hamle.` : `Hamle: ${moves} · Bulunan: ${found.size}/8`}
        </span>
        <button type="button" className={`${a.btn} ${done ? a.def : ''}`} onClick={onAgain}>
          {done ? 'Yeniden oyna' : 'Karıştır'}
        </button>
      </div>
    </div>
  );
}

// ── Yapboz Aracı ─────────────────────────────────────────────────

const SIZE = 3;
const SOLVED = [...Array(SIZE * SIZE - 1).keys()].map((i) => i + 1).concat(0);

/** Çözülmüş hâlden geriye rastgele kaydırarak karıştırılır: her dizilim çözülebilir kalır. */
function scramble(r: () => number): number[] {
  const b = [...SOLVED];
  let hole = b.indexOf(0);
  let prev = -1;
  for (let k = 0; k < 120; k++) {
    const nb = neighbors(hole).filter((n) => n !== prev);
    const pick = nb[Math.floor(r() * nb.length)];
    [b[hole], b[pick]] = [b[pick], b[hole]];
    prev = hole;
    hole = pick;
  }
  return b.join() === SOLVED.join() ? scramble(r) : b;
}

function neighbors(i: number): number[] {
  const x = i % SIZE;
  const y = Math.floor(i / SIZE);
  const out: number[] = [];
  if (x > 0) out.push(i - 1);
  if (x < SIZE - 1) out.push(i + 1);
  if (y > 0) out.push(i - SIZE);
  if (y < SIZE - 1) out.push(i + SIZE);
  return out;
}

function Slide({ year, seed, onAgain }: { year: Year; seed: number; onAgain: () => void }) {
  const [board, setBoard] = useState(() => scramble(rng(seed)));
  const [moves, setMoves] = useState(0);
  const emoji = useMemo(() => eraEmojis(year, rng(seed + 1), 1)[0], [seed, year]);
  const done = board.join() === SOLVED.join();

  const move = (i: number) => {
    if (done) return;
    const hole = board.indexOf(0);
    if (!neighbors(hole).includes(i)) return;
    const b = [...board];
    [b[hole], b[i]] = [b[i], b[hole]];
    setBoard(b);
    setMoves(moves + 1);
    (b.join() === SOLVED.join() ? sfx.ok : sfx.click)();
  };

  return (
    <div className={a.pad}>
      <p className={a.dim}>Boş kareye komşu parçaya tıkla, kaysın. Resmi tamamla.</p>
      <div className={g.gadget}>
        <div className={g.slide}>
          {board.map((v, i) => (
            <button
              key={v}
              type="button"
              className={`${g.tile} ${v === 0 ? g.hole : ''}`}
              style={{ gridRow: Math.floor(i / SIZE) + 1, gridColumn: (i % SIZE) + 1, ['--x' as string]: ((v || SIZE * SIZE) - 1) % SIZE, ['--y' as string]: Math.floor(((v || SIZE * SIZE) - 1) / SIZE) }}
              onClick={() => move(i)}
              disabled={v === 0 && !done}
              aria-label={v === 0 ? 'Boş' : `Parça ${v}`}
            >
              <span className={g.piece} aria-hidden="true">
                {emoji}
              </span>
              {!done && v !== 0 && <small className={g.num}>{v}</small>}
            </button>
          ))}
        </div>
      </div>
      <div className={a.between}>
        <span className={a.dim} role="status">
          {done ? `Tamamlandı: ${moves} hamle.` : `Hamle: ${moves}`}
        </span>
        <button type="button" className={`${a.btn} ${done ? a.def : ''}`} onClick={onAgain}>
          {done ? 'Yeni yapboz' : 'Karıştır'}
        </button>
      </div>
    </div>
  );
}

// ── Etiket Avı ───────────────────────────────────────────────────

const HUNT_SECONDS = 20;
const CELLS = 9;

interface Pop {
  key: number;
  cell: number;
  emoji: string;
  name: string;
  price: number;
}

function Tags({ year, seed, onAgain }: { year: Year; seed: number; onAgain: () => void }) {
  const r = useMemo(() => rng(seed), [seed]);
  // sınır: rafın ortasındaki fiyat, böylece yarısı ucuz yarısı pahalı
  const pool = useMemo(() => ITEMS.filter((i) => i.prices[NOW] <= 500), []);
  const limit = useMemo(() => {
    const ps = pool.map((i) => i.prices[year]).sort((x, y) => x - y);
    return ps[Math.floor(ps.length / 2)];
  }, [pool, year]);
  const [started, setStarted] = useState(false);
  const [left, setLeft] = useState(HUNT_SECONDS);
  const [pops, setPops] = useState<Pop[]>([]);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState<{ cell: number; ok: boolean } | null>(null);
  const over = started && left <= 0;

  useEffect(() => {
    if (!started || over) return;
    const t = window.setInterval(() => setLeft((l) => l - 1), 1000);
    return () => window.clearInterval(t);
  }, [started, over]);

  useEffect(() => {
    if (!started || over) return;
    let key = 0;
    const t = window.setInterval(() => {
      setPops((ps) => {
        const free = [...Array(CELLS).keys()].filter((c) => !ps.some((p) => p.cell === c));
        const kept = ps.length >= 4 ? ps.slice(1) : ps;
        if (!free.length) return kept;
        const it = pool[Math.floor(r() * pool.length)];
        return [...kept, { key: ++key + Date.now(), cell: free[Math.floor(r() * free.length)], emoji: it.emoji, name: it.name, price: it.prices[year] }];
      });
    }, 650);
    return () => window.clearInterval(t);
  }, [started, over, pool, r, year]);

  const hit = (p: Pop) => {
    const ok = p.price <= limit;
    setScore((s) => s + (ok ? 1 : -1));
    (ok ? sfx.ok : sfx.error)();
    setFlash({ cell: p.cell, ok });
    setPops((ps) => ps.filter((x) => x.key !== p.key));
  };

  if (!started)
    return (
      <div className={a.pad}>
        <p>
          <b>{HUNT_SECONDS} saniye.</b> Izgarada ürünler belirecek. Fiyatı <b>{money(limit, year)}</b> ya da altındaysa dokun; pahalıya dokunursan puan gider.
        </p>
        <div className={a.buttons}>
          <button type="button" className={`${a.btn} ${a.def}`} onClick={() => setStarted(true)} autoFocus>
            Başla
          </button>
        </div>
      </div>
    );

  return (
    <div className={a.pad}>
      <div className={a.between}>
        <b>Sınır: {money(limit, year)}</b>
        <span>
          ⏱ {Math.max(0, left)} sn · Puan {score}
        </span>
      </div>
      <div className={g.hunt}>
        {[...Array(CELLS).keys()].map((c) => {
          const p = pops.find((x) => x.cell === c);
          const f = flash?.cell === c ? (flash.ok ? g.flashOk : g.flashNo) : '';
          return (
            <button key={c} type="button" className={`${g.spot} ${f}`} disabled={!p || over} onClick={() => p && hit(p)} onAnimationEnd={() => setFlash(null)}>
              {p && (
                <>
                  <span className={g.spotEmoji}>{p.emoji}</span>
                  <small>{p.name}</small>
                  <b>{money(p.price, year)}</b>
                </>
              )}
            </button>
          );
        })}
      </div>
      {over && (
        <div className={a.between}>
          <span role="status">
            Süre bitti! <b>{score}</b> puan.
          </span>
          <button type="button" className={`${a.btn} ${a.def}`} onClick={onAgain} autoFocus>
            Yeniden oyna
          </button>
        </div>
      )}
    </div>
  );
}
