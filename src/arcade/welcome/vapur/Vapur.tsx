import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { prefersReducedMotion } from '../../../components/ui/motion';
import { phaseOf } from '../../mahalle/places';
import { Deck } from './Deck';
import { LANDMARKS, PALETTES, TRIP } from './palettes';
import { Scene } from './Scene';
import * as snd from './sounds';
import s from './Vapur.module.css';

/*
 * Fazla mesai vapuru. Saat "…sen çalışmıyorsun, değil mi?" diye sorup oyuncu "Evet" deyince
 * açılır (WelcomeScreen):
 *   1. Sayfa dağılır: yazılar kayarak söner, maket en son plazaya doğru yaklaşıp gider.
 *   2. "Sakin ol." — sonra bir tam nefes: daire büyürken "Nefes al…", küçülürken "…ver."
 *   3. Dairenin içinde 3-2-1; sonunda vapur düdüğü çalar, ekran aşağıdan suyla dolar.
 *   4. Güverte: Karaköy'den Kadıköy'e gerçek rota (Panorama.tsx) dört dakikada bir kez kayar;
 *      önde küpeşte, çay ve simit (Deck.tsx). İskeleye varınca "Mesaiye dönüyor musun?" diye
 *      sorar. "Bir tur daha" aynı yolu geri gider.
 * "Geç" düğmesi ve Esc girişi atlar. "Hareketi azalt" diyende her geçiş yalnızca solar, kıyılar
 * durur. Sekme gizliyken yolculuk, sesler ve kayan katmanlar bekler.
 */

type Phase = 'away' | 'calm' | 'in' | 'out' | 'count' | 'horn' | 'ride' | 'arrived' | 'leaving';

const PIERS = ['Karaköy', 'Kadıköy'];

/** Karşıdan gelen vapurun ekranın ortasından geçtiği an (Scene.module.css: 120 sn bekler, 70 sn sürer). */
const FERRY_AT = 149;

/** Yolculuk boyunca sırası gelince alt yazıda beliren satırlar (saniye): rotadaki yerlere göre. */
function captions(leg: number): [number, string, string][] {
  const back = leg % 2 === 1;
  const at = (f: number) => Math.round((back ? 1 - f : f) * TRIP);
  const list: [number, string, string][] = [
    [4, 'Kaptan', back ? 'Kadıköy’den Karaköy’e hareket ettik. Yolculuk dört dakika, çay ocağı açık.' : 'Karaköy’den Kadıköy’e hareket ettik. Yolculuk dört dakika, çay ocağı açık.'],
    [at(LANDMARKS.suleymaniye), 'Yan koltuktaki amca', 'Şu tepedeki Süleymaniye. Mimar Sinan “kalfalık eserim” demiş; düşün ustalığını.'],
    [at(LANDMARKS.topkapi), 'Simitçi', 'Sarayburnu’ndayız. Martılar simit kokusunu aldı, simidine sahip çık.'],
    [at(LANDMARKS.sultanahmet), 'Turist', '“Is that the Blue Mosque?” Amca: “Sultanahmet, evladım. Altı minareli.”'],
    [FERRY_AT, 'Karşıdan gelen vapur', 'Düüüt! (Selam verdi, bizimki de cevap verdi.)'],
    [at(LANDMARKS.kizKulesi), 'Kaptan', 'Kız Kulesi göründü. Kız yılandan kaçamamış, sen mesaiden kaçtın; daha şanslısın.'],
    [at(LANDMARKS.haydarpasa), 'Yan koltuktaki amca', 'Haydarpaşa Garı. Yüz yıldır aynı yerde bekliyor; senin kadar sabırlı.'],
    [TRIP - 22, 'Kaptan', back ? 'Karaköy iskelesine yanaşıyoruz. Halatı atan abiye selam verin.' : 'Kadıköy iskelesine yanaşıyoruz. Halatı atan abiye selam verin.'],
  ];
  // aynı saniyeye düşen iki satır olmasın
  const seen = new Set<number>();
  return list.map(([t, who, text]) => {
    let u = Math.max(1, Math.min(TRIP - 1, t));
    while (seen.has(u)) u += 7;
    seen.add(u);
    return [u, who, text];
  });
}

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
}

export default function Vapur({ since, now, muted, onMute, onExit }: Props) {
  const [still] = useState(prefersReducedMotion);
  const [low] = useState(lowPower);
  const visible = useVisible();
  const [phase, setPhase] = useState<Phase>('away');
  const [count, setCount] = useState(3);
  const [t, setT] = useState(0);
  const [leg, setLeg] = useState(0);
  const [tick, setTick] = useState(() => Date.now());
  const [caption, setCaption] = useState<{ who: string; text: string; key: number } | null>(null);
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
        snd.horn(false);
        return;
      }
      const line = captions(leg).find(([at]) => at === next);
      if (!line) return;
      // oyuncunun dokunup açtığı satır (anahtarı zaman damgası) sırası gelen satıra yenilmez
      setCaption((cur) => (cur && cur.key > TRIP ? cur : { who: line[1], text: line[2], key: next }));
      if (line[0] === FERRY_AT) {
        // karşıdan gelen vapurun düdüğü uzaktan; bizimki cevap verir
        snd.horn(false, true);
        window.setTimeout(() => snd.horn(false), 2200);
      }
    }, 1000);
    return () => window.clearInterval(id);
    // t yalnızca vapur kalkarken okunur (yeni turda 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, leg]);

  useEffect(() => {
    if (!caption) return;
    const id = window.setTimeout(() => setCaption(null), 6000);
    return () => window.clearTimeout(id);
  }, [caption]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (intro) setPhase('ride');
      else setPhase('leaving');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [intro]);

  useEffect(() => {
    if (phase === 'ride' || phase === 'arrived') root.current?.focus();
  }, [phase]);

  // güvertenin sesleri: dalga, makine, uzak martılar
  const sound = visible && !muted && (phase === 'ride' || phase === 'arrived');
  useEffect(() => (sound ? snd.startAmbience() : undefined), [sound]);
  useEvery(sound ? 14000 : null, () => snd.gull(0.25 + Math.random() * 0.3));

  const say = (who: string, text: string) => setCaption({ who, text, key: Date.now() });
  const from = PIERS[leg % 2];
  const to = PIERS[(leg + 1) % 2];
  const left = Math.max(0, Math.ceil((TRIP - t) / 60));

  const classes = [s.vapur, visible ? '' : s.paused, still ? s.still : '', phase === 'leaving' ? s.leaving : ''].join(' ');

  return (
    <div ref={root} className={classes} role="dialog" aria-modal="true" aria-label="Fazla mesai vapuru" tabIndex={-1} style={{ '--text': p.text, '--halo': p.lit ? 'rgba(10,14,24,.6)' : 'rgba(255,250,238,.7)', '--flood': p.water, '--flood-deep': p.waterDeep } as CSSProperties}>
      {sceneOn && (
        <>
          <Scene key={leg} p={p} low={low} reverse={leg % 2 === 1} still={still} moving={phase === 'ride'} trip={TRIP} />
          <Deck still={still} tint={p.gull} facing={leg % 2 === 1 ? -1 : 1} onSay={say} />
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
          </footer>

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
