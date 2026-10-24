import { lazy, Suspense, useEffect, useState, type MouseEvent } from 'react';
import { audioEngine } from '../audio/audioEngine';
import { hasSave } from '../game/store/save';
import { GAMES, SITE_NAME } from './games';
import { dayGame, dayIndex, toneOf, TONE_LINES } from './notebook/notebook';
import * as sfx from './notebook/sfx';
import { loadProgress } from './progress';
import type { GameRoute } from './slugs';
import { GameCard, PunchClock, SoonCard } from './SalonParts';
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
 * sonra boş yerlere keçeli kalemle kenar süsü çizilir (notebook/Decor). Esc ya da klavye tuşu
 * "patron geliyor" modunu açar; kâğıt ve bant sesleri.
 */

const BossSheet = lazy(() => import('./notebook/BossSheet').then((m) => ({ default: m.BossSheet })));
// süsleme bir süre sonra çizilir: ilk ekranda gerekmez, sonradan iner
const DailyNote = lazy(() => import('./notebook/DailyNote').then((m) => ({ default: m.DailyNote })));
const Decor = lazy(() => import('./notebook/Decor').then((m) => ({ default: m.Decor })));
const BOSS_TITLE = 'Q3_rapor_v14_SON_son.xlsx · Tablolar';

/** Kartların üstündeki sabit el yazısı notlar (günün dosyasının notu bunların önüne geçer). */
const NOTES: Partial<Record<GameRoute, string>> = {
  asfalt: 'yeni çıktı! ★',
  test: 'buradan başla',
  iseAlim: 'en uzunu, 45 dk',
  bakkal: 'fiyatı sen söylüyorsun',
};

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
  const [root, track] = usePointerVars<HTMLDivElement>(true);
  const [now] = useState(() => new Date());
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
    if (!boss) return;
    const title = document.title;
    document.title = BOSS_TITLE;
    sfx.boss();
    return () => {
      document.title = title;
    };
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
      <Suspense fallback={null}>
        <Decor page={root} day={dayIndex(now)} />
      </Suspense>

      <header className={s.top}>
        <div className={s.brand}>
          <h1 className={s.title}>
            <span>{SITE_NAME}</span>
          </h1>
          <p className={s.hand}>{TONE_LINES[tone].sub} ✎</p>
        </div>
        <Suspense fallback={<span />}>
          <DailyNote now={now} className={s.daily} />
        </Suspense>
        <div className={s.side}>
          <div className={s.clockWrap}>
            <PunchClock />
            <svg className={s.circle} viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true">
              <path d="M150 6 C 260 4, 296 22, 290 40 C 282 62, 60 70, 16 52 C -6 40, 30 8, 160 5" />
            </svg>
          </div>
          <button type="button" className={`${s.bossBtn} ${tone === 'work' ? s.alert : ''}`} onClick={() => setBoss(true)} aria-keyshortcuts="Escape">
            <span className={s.key} aria-hidden="true">
              <small>esc</small>
            </span>
            <span className={s.bossText}>
              <b>patron geliyor!</b>
              <small>{tone === 'work' ? 'mesai saati, hazır ol' : 'gelirse bas, tablo açılır'}</small>
            </span>
          </button>
        </div>
      </header>

      <main aria-labelledby="dolap">
        <h2 id="dolap" className={s.shelf}>
          <span className="mono">Dosya dolabı</span>
          <span className={s.todo}>
            <span className={s.hand}>
              yapılacaklar: {done}/{GAMES.length}
            </span>
            <span className={s.todoBar} aria-hidden="true">
              <i style={{ width: `${(done / GAMES.length) * 100}%` }} />
            </span>
          </span>
          <span className={s.hand}>{TONE_LINES[tone].shelf}</span>
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
                <GameCard game={g} isNew={i === 0} preload={preload} resume={g.route === 'iseAlim' && saved} />
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
            <SoonCard />
          </li>
        </ul>
      </main>

      {boss && (
        <Suspense fallback={null}>
          <BossSheet onClose={() => setBoss(false)} />
        </Suspense>
      )}
      <StudioMark />
    </div>
  );
}
