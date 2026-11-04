import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { prefersReducedMotion } from '../../../components/ui/motion';
import { GAMES } from '../../games';
import { PLACES, phaseOf } from '../../mahalle/places';
import type { GameRoute } from '../../slugs';
import { Deck } from './Deck';
import { PALETTES } from './palettes';
import { Scene } from './Scene';
import * as snd from './sounds';
import s from './Vapur.module.css';

/*
 * Fazla mesai vapuru. Saat "…sen çalışmıyorsun, değil mi?" diye sorup oyuncu "Evet" deyince
 * açılır (WelcomeScreen):
 *   1. Sayfa dağılır: yazılar kayarak söner, maket en son plazaya doğru yaklaşıp gider.
 *   2. "Sakin ol." — sonra bir tam nefes: daire büyürken "Nefes al…", küçülürken "…ver."
 *   3. Dairenin içinde 3-2-1; sonunda vapur düdüğü çalar, ekran aşağıdan suyla dolar.
 *   4. Güverte: kıyılar kayar, önde küpeşte, çay ve simit. Yolculuk dört dakika sürer; iskeleye
 *      varınca "Mesaiye dönüyor musun?" diye sorar. "Bir tur daha" vapuru geri yollar.
 * "Geç" düğmesi ve Esc girişi atlar. "Hareketi azalt" diyende her geçiş yalnızca solar, kıyılar
 * durur. Sekme gizliyken yolculuk, sesler ve kayan katmanlar bekler.
 */

type Phase = 'away' | 'calm' | 'in' | 'out' | 'count' | 'horn' | 'ride' | 'arrived' | 'leaving';

const TRIP = 240;
const PIERS = ['Karaköy', 'Kadıköy'];

/** Yolculuk boyunca sırası gelince alt yazıda beliren satırlar (saniye). */
const CAPTIONS: [number, string, string][] = [
  [3, 'Kaptan', 'Hoş geldiniz. Karşıya dört dakika; telefonlar cepte kalabilir.'],
  [45, 'Çaycı', 'Çaaay! Taze çay! Bardağına dokun, tazeleyeyim.'],
  [100, 'Yan koltuktaki amca', 'Bu vapurda kırk yıldır gidip geliyorum, mesai hep bitmedi.'],
  [160, 'Karşıdan gelen vapur', 'Düüüt! (Selam verdi.)'],
  [215, 'Kaptan', 'İskeleye yaklaşıyoruz. Halatı atan abiye selam verin.'],
];

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (sec: number) => `${pad(Math.floor(sec / 3600))}:${pad(Math.floor(sec / 60) % 60)}:${pad(sec % 60)}`;

function lowPower(): boolean {
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return (n.hardwareConcurrency ?? 8) <= 4 || (n.deviceMemory ?? 8) <= 2 || n.connection?.saveData === true;
}

function useVisible() {
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const on = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return visible;
}

/** Açıkken her `ms`de bir (biraz oynayarak) `f`. */
function useEvery(ms: number | null, f: () => void) {
  const ref = useRef(f);
  useEffect(() => {
    ref.current = f;
  });
  useEffect(() => {
    if (ms === null) return;
    let id = 0;
    const tick = () => {
      ref.current();
      id = window.setTimeout(tick, ms * (0.7 + Math.random() * 0.6));
    };
    id = window.setTimeout(tick, ms * (0.3 + Math.random() * 0.4));
    return () => window.clearTimeout(id);
  }, [ms]);
}

interface Props {
  /** Fazla mesainin başladığı an (ms). */
  since: number;
  now: Date;
  muted: boolean;
  onMute: () => void;
  onExit: () => void;
  onPlay: (route: GameRoute) => void;
}

export default function Vapur({ since, now, muted, onMute, onExit, onPlay }: Props) {
  const [still] = useState(prefersReducedMotion);
  const [low] = useState(lowPower);
  const visible = useVisible();
  const [phase, setPhase] = useState<Phase>('away');
  const [count, setCount] = useState(3);
  const [t, setT] = useState(0);
  const [leg, setLeg] = useState(0);
  const [tick, setTick] = useState(() => Date.now());
  const [caption, setCaption] = useState<{ who: string; text: string; key: number } | null>(null);
  const [tea, setTea] = useState(0);
  const [simit, setSimit] = useState<'here' | 'gone'>('here');
  const [pier, setPier] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  // ana ekran her yeniden çizildiğinde yeni bir onExit gelir; adımların sayacı sıfırlanmasın
  const exit = useRef(onExit);
  useEffect(() => {
    exit.current = onExit;
  });
  const skip = useRef<HTMLButtonElement>(null);
  const p = PALETTES[phaseOf(now)];
  const intro = phase !== 'ride' && phase !== 'arrived' && phase !== 'leaving';
  const sceneOn = !['away', 'calm', 'in'].includes(phase);

  // açılırken: sayfa kaymasın, odak "Geç"e
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    skip.current?.focus();
    return () => {
      html.style.overflow = prev;
    };
  }, []);

  // giriş: her adım bir sonrakini kurar; "Geç" doğrudan güverteye atlar
  useEffect(() => {
    const at = (ms: number, f: () => void) => window.setTimeout(f, still ? Math.min(ms, 900) : ms);
    let id = 0;
    const ticks: number[] = [];
    switch (phase) {
      case 'away':
        snd.wave();
        id = at(1100, () => setPhase('calm'));
        break;
      case 'calm':
        id = at(1900, () => setPhase('in'));
        break;
      case 'in':
        snd.breath(true);
        id = window.setTimeout(() => setPhase('out'), 4000);
        break;
      case 'out':
        snd.breath(false);
        id = window.setTimeout(() => setPhase('count'), 4000);
        break;
      case 'count':
        [3, 2, 1].forEach((n, i) =>
          ticks.push(
            window.setTimeout(() => {
              setCount(n);
              snd.tick(n === 1);
            }, i * 900),
          ),
        );
        id = window.setTimeout(() => setPhase('horn'), 2700);
        break;
      case 'horn':
        snd.horn(true);
        window.setTimeout(snd.wave, 500);
        id = at(1700, () => setPhase('ride'));
        break;
      case 'leaving':
        id = window.setTimeout(() => exit.current(), still ? 250 : 750);
        break;
    }
    return () => {
      window.clearTimeout(id);
      ticks.forEach(window.clearTimeout);
    };
  }, [phase, still]);

  // yolculuk saati ve fazla mesai sayacı: sekme gizliyken vapur da bekler. Sırası gelen alt yazı
  // ve iskeleye varış da bu saniyelikte kurulur.
  const trip = useRef(0);
  useEffect(() => {
    if (phase === 'ride') trip.current = t;
    const id = window.setInterval(() => {
      setTick(Date.now());
      if (document.hidden || phase !== 'ride') return;
      const next = ++trip.current;
      setT(next);
      if (next >= TRIP) {
        setPhase('arrived');
        setPier(false);
        snd.horn(false);
        return;
      }
      const line = CAPTIONS.find(([at]) => at === next);
      if (!line) return;
      // oyuncunun dokunup açtığı satır (anahtarı zaman damgası) sırası gelen satıra yenilmez
      setCaption((cur) => (cur && cur.key > TRIP ? cur : { who: line[1], text: line[2], key: next }));
      if (line[0] === 160) snd.horn(false);
    }, 1000);
    return () => window.clearInterval(id);
    // t yalnızca vapur kalkarken okunur (yeni turda 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (!caption) return;
    const id = window.setTimeout(() => setCaption(null), 6000);
    return () => window.clearTimeout(id);
  }, [caption]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (pier) setPier(false);
      else if (intro) setPhase('ride');
      else setPhase('leaving');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [intro, pier]);

  useEffect(() => {
    if (phase === 'ride' || phase === 'arrived') root.current?.focus();
  }, [phase]);

  // güvertenin sesleri: dalga, makine, uzak martılar
  const sound = visible && !muted && (phase === 'ride' || phase === 'arrived');
  useEvery(sound ? 3200 : null, snd.wave);
  useEvery(sound && phase === 'ride' ? 3600 : null, snd.engine);
  useEvery(sound ? 15000 : null, snd.gull);

  const say = (who: string, text: string) => setCaption({ who, text, key: Date.now() });
  const from = PIERS[leg % 2];
  const to = PIERS[(leg + 1) % 2];
  const left = Math.max(0, Math.ceil((TRIP - t) / 60));

  const go = (route: GameRoute) => {
    setPier(false);
    setPhase('leaving');
    window.setTimeout(() => onPlay(route), still ? 0 : 450);
  };

  const classes = [s.vapur, visible ? '' : s.paused, still ? s.still : '', phase === 'leaving' ? s.leaving : ''].join(' ');

  return (
    <div ref={root} className={classes} role="dialog" aria-modal="true" aria-label="Fazla mesai vapuru" tabIndex={-1} style={{ '--text': p.text, '--halo': p.lit ? 'rgba(10,14,24,.6)' : 'rgba(255,250,238,.7)', '--flood': p.water, '--flood-deep': p.waterDeep } as CSSProperties}>
      {sceneOn && (
        <>
          <Scene p={p} low={low} reverse={leg % 2 === 1} still={still} />
          <Deck
            tea={tea}
            still={still}
            simit={simit}
            onTea={() => {
              snd.clink();
              setTea((n) => n + 1);
              say('Çaycı', tea === 0 ? 'Taze çay geldi abi, şekeri tabağında.' : tea < 3 ? `${tea + 1}. çay. Mesai uzun, haklısın.` : 'Abi çay ocağında da bu kadar içilmez.');
            }}
            onSimit={() => {
              if (simit === 'gone') return;
              snd.snatch();
              setSimit('gone');
              say('Martı', 'Simidi havada kaptı. Mesai dışında herkes serbest.');
              window.setTimeout(() => setSimit('here'), 9000);
            }}
          />
        </>
      )}

      {/* giriş perdesi: sakin ol, nefes, geri sayım; sonunda su yükselir */}
      <div className={`${s.curtain} ${intro ? '' : s.curtainGone}`} aria-live="polite">
        <p className={`${s.calm} ${phase === 'calm' ? s.on : ''}`}>Sakin ol.</p>
        <div className={`${s.breath} ${phase === 'in' ? s.inhale : ''} ${phase === 'out' ? s.exhale : ''} ${['in', 'out', 'count'].includes(phase) ? s.on : ''}`}>
          <span className={s.ring} aria-hidden="true" />
          <span className={s.breathText} key={phase === 'count' ? `c${count}` : phase}>
            {phase === 'in' ? 'Nefes al…' : phase === 'out' ? '…ver.' : phase === 'count' ? count : ''}
          </span>
        </div>
        {phase === 'horn' && <div className={s.flood} aria-hidden="true" />}
        {intro && (
          <button ref={skip} type="button" className={s.skip} onClick={() => setPhase('ride')}>
            Geç
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        )}
      </div>

      {(phase === 'ride' || phase === 'arrived') && (
        <div className={s.ui}>
          <header className={s.head}>
            <div>
              <p className={s.kicker}>Mesai bitmedi</p>
              <h2 className={s.title}>
                ama en azından
                <br />
                vapurdasın.
              </h2>
              <p className={s.overtime}>
                <span className={s.dot} aria-hidden="true" />
                Fazla mesai <b>{clock(Math.max(0, Math.floor((tick - since) / 1000)))}</b>
              </p>
            </div>
            <div className={s.tools}>
              <button type="button" className={s.tool} aria-label={muted ? 'Sesi aç' : 'Sesi kapat'} aria-pressed={muted} onClick={onMute}>
                <svg viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M12 6.75a3.75 3.75 0 0 1 0 4.5M14.52 13.77a6.75 6.75 0 0 0 0-9.54M8.25 3.53a.53.53 0 0 0-.9-.37L4.8 5.69a1.05 1.05 0 0 1-.75.31H2.25a.75.75 0 0 0-.75.75v4.5c0 .41.34.75.75.75h1.81c.28 0 .55.11.75.31l2.54 2.54a.53.53 0 0 0 .9-.38z" />
                  {muted && <path d="M2 2l14 14" />}
                </svg>
              </button>
              <button type="button" className={s.back} onClick={() => setPhase('leaving')}>
                Mahalleye dön
              </button>
            </div>
          </header>

          {caption && (
            <p className={s.caption} key={caption.key} role="status">
              <b>{caption.who}:</b> {caption.text}
            </p>
          )}

          <footer className={s.foot}>
            <div className={s.route} aria-label={`${from} iskelesinden ${to} iskelesine, ${left} dakika kaldı`}>
              <span>{from}</span>
              <span className={s.line}>
                <span className={s.boat} style={{ left: `${(Math.min(t, TRIP) / TRIP) * 100}%` }} aria-hidden="true">
                  <svg viewBox="0 0 30 16">
                    <path d="M2 9h26l-4 6H6z" />
                    <path d="M8 9V5h12v4M12 5V2h3v3" />
                  </svg>
                </span>
              </span>
              <span>{to}</span>
              <small>{phase === 'arrived' ? 'vardık' : `${left} dk`}</small>
            </div>
            <button type="button" className={s.pierBtn} aria-expanded={pier} onClick={() => setPier((v) => !v)}>
              İskele tabelası
            </button>
          </footer>

          {pier && (
            <section className={s.pier} aria-label="İskele tabelası: oyunlar">
              <h3>Bu vapur nerelere uğrar?</h3>
              <ul>
                {GAMES.map((g) => {
                  const place = PLACES.find((pl) => pl.routes.includes(g.route));
                  return (
                    <li key={g.route}>
                      <button type="button" onClick={() => go(g.route)}>
                        <small>{place ? `${place.name} iskelesi` : 'Ara iskele'}</small>
                        <b>{g.title}</b>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {phase === 'arrived' && (
            <div className={s.arrive} role="alertdialog" aria-label="İskeleye vardık">
              <p className={s.kicker}>{to} iskelesi</p>
              <h3>İskeleye vardık.</h3>
              <p>Mesaiye dönüyor musun?</p>
              <div className={s.arriveActions}>
                <button type="button" className={s.primary} onClick={() => setPhase('leaving')}>
                  Mahalleye dön
                </button>
                <button
                  type="button"
                  className={s.secondary}
                  onClick={() => {
                    setLeg((n) => n + 1);
                    setT(0);
                    setPhase('ride');
                    snd.horn(false);
                  }}
                >
                  Bir tur daha
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
