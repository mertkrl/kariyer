import { lazy, Suspense, useEffect, useState, type MouseEvent } from 'react';
import { audioEngine } from '../audio/audioEngine';
import { hasSave } from '../game/store/save';
import { GAMES, isWorkHours, SITE_NAME } from './games';
import { dayGame, dayIndex, toneOf } from './notebook/notebook';
import * as sfx from './notebook/sfx';
import { loadProgress } from './progress';
import type { GameRoute } from './slugs';
import { GameCard, PunchClock, SoonCard } from './SalonParts';
import { PencilFilter } from './notebook/PencilFilter';
import { StudioMark } from './Studio';
import { usePointerVars } from './usePointerVars';
import s from './Salon.module.css';

/*
 * Oyun salonu, bir defter sayfası gibi: kareli kâğıt, kırmızı kenar çizgisi; imleç sayfada
 * fosforlu kalem gibi bir ışık bırakır. Başlığın altına fosforlu bir şerit çekilir, saatin
 * etrafına kalemle halka çizilir, kartların üstüne el yazısıyla notlar düşülür ve oklar sayfa
 * açılırken çizilir. Dosyalar (SalonParts) köşelerinden bantla tutturulmuştur; en yenisi başta.
 *
 * Defter seni hatırlar: bitirdiğin oyuna kalemle tik atılır ve sonucu yazılır (progress.ts).
 * Defter konuşur: günün notu, günün dosyası ve saate göre ton (notebook/notebook.ts); bir süre
 * sonra boş yerlere keçeli kalemle kenar süsü çizilir (notebook/Decor). Mesai saatinde kapıdan
 * bakan patron çizimi (ya da Esc) "patron geliyor" modunu açar; kâğıt ve bant sesleri.
 */

const BossSheet = lazy(() => import('./notebook/BossSheet').then((m) => ({ default: m.BossSheet })));
// süsleme bir süre sonra çizilir: ilk ekranda gerekmez, sonradan iner
const Decor = lazy(() => import('./notebook/Decor').then((m) => ({ default: m.Decor })));
const Doodles = lazy(() => import('./notebook/Doodles').then((m) => ({ default: m.Doodles })));

/** Kartların üstündeki sabit el yazısı notlar (günün dosyasının notu bunların önüne geçer). */
const NOTES: Partial<Record<GameRoute, string>> = {
  cuzdan: 'yeni çıktı! ★',
  test: 'buradan başla',
  iseAlim: 'en uzunu, 45 dk',
  bakkal: 'fiyatı sen söylüyorsun',
};

/** Kalemle çizilmiş patron: aralık kapıdan kafasını uzatır, üstünde kırmızı ünlem. */
function BossDoodle() {
  return (
    <svg className={s.doodle} viewBox="0 0 70 64" aria-hidden="true">
      <path className={s.door} d="M8 60 L 9 6 L 34 4 L 35 61" />
      <path className={s.door} d="M30 33 l 2 0" />
      <g className={s.peek}>
        <path d="M34 22 C 34 12, 46 10, 50 16 C 54 22, 52 32, 44 34 C 38 35, 34 30, 34 26" />
        <path d="M38 14 C 42 9, 50 10, 52 15" />
        <circle cx="42" cy="22" r="3.2" />
        <circle cx="50" cy="22" r="3.2" />
        <path d="M45 22 l 2 0 M41 29 C 43 28, 46 28, 48 29" />
        <path d="M36 35 L 34 60 M48 34 L 56 60 M41 36 L 44 46 L 47 36" />
      </g>
      <path className={s.bang} d="M62 6 L 60 22 M60 28 l 0 1" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg className={s.arrow} viewBox="0 0 60 40" aria-hidden="true">
      <path d="M4 6 C 22 4, 40 12, 46 32" />
      <path d="M38 27 L 46 33 L 51 23" />
    </svg>
  );
}

/** Kalemle atılmış tik: oyun bitirilince kartın köşesine çizilir. */
function Tick() {
  return (
    <svg className={s.tick} viewBox="0 0 60 50" aria-hidden="true">
      <path d="M6 26 C 12 30, 18 38, 22 44 C 30 26, 42 12, 56 4" pathLength={1} />
    </svg>
  );
}

export function ArcadeScreen({ preload }: { preload: (route: string) => void }) {
  // bir oyundan geri dönülünce onun müziği susar
  useEffect(() => {
    audioEngine.setMusicMood('off');
  }, []);
  const [saved] = useState(hasSave);
  // Cüzdan Zamanı: profil seçilip oturum açıldıysa kart "devam et" der
  const [cuzdanSaved] = useState(() => {
    try {
      return localStorage.getItem('kariyerweb-cuzdan-oturum-v1') !== null;
    } catch {
      return false;
    }
  });
  const [root, track] = usePointerVars<HTMLDivElement>(true);
  const [now] = useState(() => new Date());
  // patron yalnızca mesai saatinde gelir: düğme dakikada bir yeniden bakar
  const [work, setWork] = useState(() => isWorkHours(now));
  useEffect(() => {
    const t = window.setInterval(() => setWork(isWorkHours(new Date())), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const tone = toneOf(now);
  const today = dayGame(now);

  // defter: hangi oyunlar bitirildi, sonuçları ne
  const [progress] = useState(loadProgress);
  const done = GAMES.filter((g) => progress.played[g.route]).length;

  // patron geliyor: Esc defteri tabloya çevirir, bir daha basınca geri getirir
  const [boss, setBoss] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setBoss((b) => !b);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    // sekmenin başlığını tablo kendisi değiştirir: dosya adı her açılışta uzar (officeLore.ts)
    if (boss) sfx.boss();
  }, [boss]);

  // bant hareketi: karta tıklayınca bant kopar, sonra oyuna geçilir
  const [tearing, setTearing] = useState<string | null>(null);
  const open = (e: MouseEvent<HTMLLIElement>, route: string) => {
    const a = (e.target as HTMLElement).closest('a');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    sfx.rip();
    setTearing(route);
    const href = a.getAttribute('href') ?? '#/';
    window.setTimeout(() => (window.location.hash = href), 220);
  };

  return (
    <div ref={root} className={`${s.page} ${s[tone]}`} onPointerMove={track} onPointerDown={sfx.wake}>
      <div className={s.marker} aria-hidden="true" />
      <PencilFilter />
      <Suspense fallback={null}>
        <Decor page={root} day={dayIndex(now)} />
      </Suspense>

      <header className={s.top}>
        <h1 className={s.title}>
          <span>{SITE_NAME}</span>
        </h1>
        <div className={s.clockWrap}>
          <PunchClock />
          <svg className={s.circle} viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true">
            <path d="M150 6 C 260 4, 296 22, 290 40 C 282 62, 60 70, 16 52 C -6 40, 30 8, 160 5" />
          </svg>
        </div>
        <div className={s.side}>
          {work && (
            <button type="button" className={s.bossBtn} onClick={() => setBoss(true)} aria-keyshortcuts="Escape">
              <BossDoodle />
              <span className={s.bossText}>
                <b>patron geliyor!</b>
                <small>gelirse bas, tablo açılır</small>
              </span>
            </button>
          )}
        </div>
      </header>

      <main aria-labelledby="dolap">
        <h2 id="dolap" className={s.shelf}>
          <span className="mono">Dosya dolabı</span>
        </h2>
        {done === GAMES.length && (
          <p className={s.master} aria-label="Bütün dosyalar kapandı">
            MESAİ DIŞI USTASI
          </p>
        )}
        <ul className={s.grid}>
          {GAMES.map((g, i) => {
            const played = progress.played[g.route];
            const isToday = g.route === today;
            const note = isToday ? 'bugün bunu oyna!' : NOTES[g.route];
            return (
              <li
                key={g.route}
                className={`${s.slot} ${isToday ? s.today : ''} ${tearing === g.route ? s.tearing : ''}`}
                style={{ ['--tilt' as string]: `${i % 2 ? 1.2 : -1}deg`, ['--i' as string]: i }}
                onPointerEnter={sfx.rustle}
                onClick={(e) => open(e, g.route)}
              >
                {note && (
                  <span className={s.note} aria-hidden="true">
                    {note}
                    <Arrow />
                  </span>
                )}
                {isToday && (
                  <svg className={s.ring} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M50 2 C 88 1, 99 22, 98 52 C 97 86, 80 99, 48 98 C 12 97, 1 80, 2 46 C 3 14, 24 3, 58 4" pathLength={1} />
                  </svg>
                )}
                <GameCard sketch game={g} isNew={i === 0} preload={preload} resume={(g.route === 'iseAlim' && saved) || (g.route === 'cuzdan' && cuzdanSaved)} />
                {played && (
                  <>
                    <Tick />
                    <span className={s.result}>
                      <span className="sr-only">Bitirildi: </span>
                      {played.result}
                    </span>
                  </>
                )}
              </li>
            );
          })}
          <li className={s.slot} style={{ ['--tilt' as string]: '0.6deg' }}>
            <span className={s.note} aria-hidden="true">
              yakında…
            </span>
            <SoonCard sketch />
          </li>
        </ul>
      </main>
      <Suspense fallback={null}>
        <Doodles page={root} />
      </Suspense>

      {boss && (
        <Suspense fallback={null}>
          <BossSheet onClose={() => setBoss(false)} />
        </Suspense>
      )}
      <StudioMark inFlow />
    </div>
  );
}
