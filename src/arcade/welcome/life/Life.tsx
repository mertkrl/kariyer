import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { prefersReducedMotion } from '../../../components/ui/motion';
import { audioEngine } from '../../../audio/audioEngine';
import { IMG_H, IMG_W, toBox } from '../stops';
import { quipsFor, type Quip } from './quips';
import * as snd from './sounds';
import s from './Life.module.css';

/*
 * Maketin canlı katmanı: ilk açılış paketine girmez, maket göründükten sonra iner.
 *  - Az ama sürekli hareket: bacalardan duman, plazanın çatısında güvercinler, kaldırımda kuyruğunu
 *    sallayan kedi, simitçinin buharı, ara ara yoldan geçen dolmuş.
 *  - Pencerelerden laflar: saate, güne ve fazla mesaiye göre değişen balonlar (quips.ts).
 *  - Gizli şakalar: maketin bazı yerlerine dokununca bir şey olur; bulunan sırlar sayılır ve
 *    tarayıcıda saklanır ("Mahallenin sırları 3/11").
 *  - Ses: yalnızca açıkken. Açan kişiyi kısa bir nağme ve pencereden bir teyze karşılar; sonra
 *    gündüz kuşlar, gece cırcır böcekleri, fazla mesaide klavye ve floresan.
 *  - Sekme görünmezken her şey durur; "hareketi azalt" diyende hareket yok, laflar yine gelir;
 *    zayıf cihazda daha az duman, daha seyrek dolmuş ve laf.
 */

type EggId = 'kedi' | 'guvercin' | 'simit' | 'kepce' | 'tabela' | 'vinc' | 'wifi' | 'dolmus' | 'anten' | 'bekle' | 'itiraf';

interface Egg {
  /** Balonun çıktığı yer (görsel koordinatı, 1152 × 928). */
  at: [number, number];
  who: string;
  text: string;
  sound?: () => void;
}

const EGGS: Record<EggId, Egg> = {
  kedi: { at: [232, 618], who: 'Tekir', text: 'Miyav. (Mahallenin kedisi seni onayladı.)', sound: snd.meow },
  guvercin: { at: [482, 112], who: 'Güvercinler', text: 'Pırrr! Plazanın çatısı boşaldı, biri yem getirsin.', sound: snd.flap },
  simit: { at: [632, 650], who: 'Simitçi', text: 'Taze simiiit! Mesai dışına özel: iki simit, bir simit fiyatına.', sound: snd.bell },
  kepce: { at: [950, 505], who: 'Kepçe operatörü', text: 'Abi şu an çay molasındayım, sonra kazarız.', sound: snd.rumble },
  tabela: { at: [815, 465], who: 'Riskli yapı', text: 'Tabelanın kendisi de riskli, dikkat et.', sound: snd.thud },
  vinc: { at: [900, 70], who: 'Vinççi', text: 'Biraz sağa… biraz daha… tamam, öyle kalsın.', sound: snd.creak },
  wifi: { at: [537, 60], who: 'Plaza anteni', text: 'Wi-Fi: KASM_Misafir · Şifre: mesaibitti', sound: snd.blip },
  dolmus: { at: [560, 640], who: 'Dolmuşçu', text: 'Kadıköy, Kadıköy! Arkaya doğru ilerleyelim!', sound: snd.horn },
  anten: { at: [240, 262], who: 'Çanak anten', text: 'Maç çekmiyor. Amca balkona çıktı, anteni çeviriyor.', sound: snd.blip },
  bekle: { at: [600, 330], who: 'Plazadan biri', text: 'Hâlâ buradasın. Patron da aynısını düşünüyor.' },
  itiraf: { at: [597, 200], who: 'Patron', text: 'Madem buradasın, bir şey daha soracağım…' },
};
const EGG_COUNT = Object.keys(EGGS).length;
const STORE = 'kasm-mahalle-sirlari';

/** Lafların çıktığı pencereler. */
const WINDOWS: [number, number][] = [
  [192, 430],
  [250, 495],
  [300, 450],
  [365, 465],
  [470, 425],
  [700, 520],
  [745, 485],
  [560, 230],
];

/** Duman çıkan bacalar (önce en görünürler: zayıf cihazda yalnız ilk ikisi tüter). */
const CHIMNEYS: [number, number][] = [
  [388, 252],
  [762, 404],
  [225, 304],
  [310, 300],
  [433, 350],
];

const ROAD = 'M600 512 C 592 560 578 606 558 648 S 522 716 512 752';

function loadFound(): Set<EggId> {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? '[]');
    return new Set((Array.isArray(raw) ? raw : []).filter((id): id is EggId => id in EGGS));
  } catch {
    return new Set();
  }
}

function saveFound(found: Set<EggId>) {
  try {
    localStorage.setItem(STORE, JSON.stringify([...found]));
  } catch {
    // saklanamadıysa bu ziyaretlik kalır
  }
}

/** Zayıf cihaz: az çekirdek, az bellek ya da veri tasarrufu. */
function lowPower(): boolean {
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return (n.hardwareConcurrency ?? 8) <= 4 || (n.deviceMemory ?? 8) <= 2 || n.connection?.saveData === true;
}

interface Bubble {
  key: number;
  at: [number, number];
  who: string;
  text: string;
  egg: boolean;
}

/** Görünürlük: sekme arka plandayken false. */
function useVisible() {
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const on = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return visible;
}

/** Görünürken her `ms`de bir (biraz oynayarak) `f`'i çağırır. */
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
    id = window.setTimeout(tick, ms * (0.4 + Math.random() * 0.4));
    return () => window.clearTimeout(id);
  }, [ms]);
}

export default function Life({ night, overtime, muted, quiet }: { night: boolean; overtime: boolean; muted: boolean; quiet: boolean }) {
  const visible = useVisible();
  const [still] = useState(prefersReducedMotion);
  const [low] = useState(lowPower);
  const [found, setFound] = useState(loadFound);
  const foundRef = useRef(found);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [pop, setPop] = useState(false);
  const [fx, setFx] = useState<Partial<Record<EggId, number>>>({});
  // tarayıcı ilk dokunuştan önce ses çalmaz: ortam sesi o zamana kadar bekler
  const [armed, setArmed] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const lastTouch = useRef(0);
  const seq = useRef(0);
  const deck = useRef<Quip[]>([]);

  const say = useCallback((b: Omit<Bubble, 'key'>) => setBubble({ ...b, key: ++seq.current }), []);

  // balon birkaç saniye kalır
  useEffect(() => {
    if (!bubble) return;
    const id = window.setTimeout(() => setBubble(null), bubble.egg ? 5200 : 4800);
    return () => window.clearTimeout(id);
  }, [bubble]);

  const discover = useCallback(
    (id: EggId) => {
      const egg = EGGS[id];
      egg.sound?.();
      say({ at: egg.at, who: egg.who, text: egg.text, egg: true });
      setFx((cur) => ({ ...cur, [id]: (cur[id] ?? 0) + 1 }));
      if (foundRef.current.has(id)) return;
      const next = new Set(foundRef.current).add(id);
      foundRef.current = next;
      setFound(next);
      saveFound(next);
      snd.found();
      setPop(true);
      window.setTimeout(() => setPop(false), 1600);
    },
    [say],
  );

  // sekme gizliyken SVG'nin kendi animasyonları (dolmuş) da durur
  useEffect(() => {
    if (!svg.current) return;
    if (visible) svg.current.unpauseAnimations();
    else svg.current.pauseAnimations();
  }, [visible]);

  // ilk dokunuş: ses motoru uyanır; her dokunuş "bekleme" sayacını sıfırlar
  useEffect(() => {
    lastTouch.current = Date.now();
    const touch = () => {
      lastTouch.current = Date.now();
      setArmed(true);
    };
    window.addEventListener('pointerdown', touch);
    window.addEventListener('pointermove', touch, { passive: true });
    window.addEventListener('keydown', touch);
    return () => {
      window.removeEventListener('pointerdown', touch);
      window.removeEventListener('pointermove', touch);
      window.removeEventListener('keydown', touch);
    };
  }, []);

  // fazla mesai itirafı da bir sır sayılır
  const wasOvertime = useRef(overtime);
  useEffect(() => {
    if (overtime && !wasOvertime.current) window.setTimeout(() => discover('itiraf'), 1400);
    wasOvertime.current = overtime;
  }, [overtime, discover]);

  // sesi açana ödül
  const wasMuted = useRef(muted);
  useEffect(() => {
    if (wasMuted.current && !muted) {
      snd.fanfare();
      say({ at: WINDOWS[1], who: 'Teyze', text: night ? 'Kısın şunu, gece yarısı! …Yok yok, açık kalsın.' : 'Kısın şunu! …Yok yok, güzelmiş, açık kalsın.', egg: false });
    }
    wasMuted.current = muted;
  }, [muted, night, say]);

  const live = visible && !quiet;

  // pencereden laflar
  useEvery(live ? (low ? 30_000 : 16_000) : null, () => {
    if (bubble) return;
    if (!deck.current.length) deck.current = quipsFor(new Date(), overtime).sort(() => Math.random() - 0.5);
    const quip = deck.current.pop()!;
    say({ at: WINDOWS[Math.floor(Math.random() * WINDOWS.length)], who: quip.who, text: quip.text, egg: false });
  });

  // uzun süre kıpırdamayana
  useEvery(visible ? 10_000 : null, () => {
    if (Date.now() - lastTouch.current > 45_000 && !foundRef.current.has('bekle')) discover('bekle');
  });

  // ortam sesi: yalnızca ses açıkken, sekme görünürken ve ilk dokunuştan sonra
  const sound = visible && armed && !muted && !audioEngine.isMuted();
  useEvery(sound ? (night ? 3_500 : 5_500) : null, night ? snd.crickets : snd.birds);
  useEvery(sound && !overtime ? 24_000 : null, snd.farHorn);
  useEffect(() => {
    if (!sound || !overtime || still) return;
    let alive = true;
    const timers: number[] = [];
    const burst = () => {
      if (!alive) return;
      const n = 3 + Math.floor(Math.random() * 7);
      for (let i = 0; i < n; i++) timers.push(window.setTimeout(snd.keyTap, i * (70 + Math.random() * 90)));
      timers.push(window.setTimeout(burst, 1400 + Math.random() * 2600));
    };
    for (let i = 0; i < 8; i++) timers.push(window.setTimeout(snd.lampOn, 400 + i * 180));
    burst();
    snd.hum();
    const hum = window.setInterval(snd.hum, 3600);
    return () => {
      alive = false;
      timers.forEach(window.clearTimeout);
      window.clearInterval(hum);
    };
  }, [sound, overtime, still]);

  const hit = (id: EggId) => (e: React.MouseEvent) => {
    e.stopPropagation();
    audioEngine.init();
    discover(id);
  };
  const flown = (fx.guvercin ?? 0) % 2 === 1;
  const moving = !still;
  const chimneys = CHIMNEYS.slice(0, low ? 2 : CHIMNEYS.length);
  const puffs = low ? 2 : 3;

  return (
    <div className={`${s.life} ${visible ? '' : s.paused} ${night ? s.night : ''} ${moving ? '' : s.still}`}>
      <svg ref={svg} className={s.layer} viewBox={`0 0 ${IMG_W} ${IMG_H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {moving &&
          chimneys.map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              {Array.from({ length: puffs }, (_, k) => (
                <circle key={k} className={s.puff} r={7} style={{ animationDelay: `${-(k * 4.2) / puffs - i * 0.9}s` }} />
              ))}
            </g>
          ))}

        {/* simitçinin buharı */}
        {moving && (
          <g transform="translate(632 660)">
            <circle className={`${s.puff} ${s.steam}`} r={4} />
            <circle className={`${s.puff} ${s.steam}`} r={4} style={{ animationDelay: '-2s' }} />
          </g>
        )}

        {/* plazanın çatısında güvercinler: dokununca uçar, bir daha dokununca döner */}
        <g className={`${s.pigeons} ${flown ? s.flown : ''}`}>
          {[
            [466, 129],
            [484, 133],
            [503, 137],
          ].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <g className={s.bird} style={{ animationDelay: `${i * -1.3}s` }}>
                <ellipse rx={6.5} ry={4} fill="#8d9098" stroke="#2a2420" strokeWidth={1.1} />
                <circle className={s.head} cx={5.5} cy={-4} r={2.8} fill="#6f737c" stroke="#2a2420" strokeWidth={1} />
              </g>
            </g>
          ))}
        </g>
        <circle data-egg className={s.hit} cx={484} cy={130} r={26} onClick={hit('guvercin')} />

        {/* kaldırımdaki kedi */}
        <g transform="translate(232 640)" className={(fx.kedi ?? 0) > 0 ? s.catJump : undefined} key={`kedi${fx.kedi ?? 0}`}>
          <path className={s.tail} d="M6 -2 q 12 -2 10 -16" fill="none" stroke="#3a3330" strokeWidth={3} strokeLinecap="round" />
          <ellipse cx={0} cy={-6} rx={8} ry={7} fill="#3a3330" />
          <circle cx={-6} cy={-15} r={5} fill="#3a3330" />
          <path d="M-10 -18 l1 -6 l3 4 M-5 -19 l2 -5 l1 5" fill="#3a3330" stroke="#3a3330" strokeWidth={1.4} strokeLinejoin="round" />
          <circle cx={-7.5} cy={-15.5} r={0.9} fill="#e9d36a" />
        </g>
        <circle data-egg className={s.hit} cx={232} cy={630} r={20} onClick={hit('kedi')} />

        {/* yoldan geçen dolmuş */}
        {moving && (
          <g data-egg className={s.dolmus} onClick={hit('dolmus')}>
            <animateMotion dur={low ? '48s' : '26s'} repeatCount="indefinite" rotate="auto" path={ROAD} keyPoints="0;0;1;1" keyTimes="0;0.55;0.8;1" calcMode="linear" />
            <animate attributeName="opacity" dur={low ? '48s' : '26s'} repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="0;0.54;0.57;0.78;0.81;1" />
            <circle r={22} fill="transparent" />
            <rect x={-13} y={-7.5} width={26} height={15} rx={4} fill="#e9b730" stroke="#2a2420" strokeWidth={1.4} />
            <rect x={-6} y={-5.5} width={11} height={11} rx={2} fill="#f6e3a2" stroke="#2a2420" strokeWidth={1} />
            <rect x={8} y={-5} width={3} height={10} rx={1} fill="#bfe0ee" />
          </g>
        )}

        {/* riskli yapının sıvası düşer */}
        {(fx.tabela ?? 0) > 0 && <rect key={`sıva${fx.tabela}`} className={s.plaster} x={806} y={560} width={9} height={6} fill="#cbbfa8" stroke="#2a2420" strokeWidth={1} />}
        {/* kepçenin tozu */}
        {(fx.kepce ?? 0) > 0 && (
          <g key={`toz${fx.kepce}`} transform="translate(925 565)">
            {[0, 1, 2].map((k) => (
              <circle key={k} className={s.dust} r={9} cx={k * 14 - 14} style={{ animationDelay: `${k * 0.08}s` }} />
            ))}
          </g>
        )}

        <circle data-egg className={s.hit} cx={632} cy={690} r={26} onClick={hit('simit')} />
        <circle data-egg className={s.hit} cx={950} cy={540} r={36} onClick={hit('kepce')} />
        <circle data-egg className={s.hit} cx={815} cy={515} r={34} onClick={hit('tabela')} />
        <circle data-egg className={s.hit} cx={895} cy={45} r={30} onClick={hit('vinc')} />
        <circle data-egg className={s.hit} cx={537} cy={38} r={22} onClick={hit('wifi')} />
        <circle data-egg className={s.hit} cx={240} cy={272} r={22} onClick={hit('anten')} />
      </svg>

      {bubble && <Speech key={bubble.key} bubble={bubble} />}

      {found.size > 0 && (
        <p className={`${s.secrets} ${pop ? s.pop : ''}`} role="status">
          Mahallenin sırları <b>{found.size}/{EGG_COUNT}</b>
        </p>
      )}
    </div>
  );
}

function Speech({ bubble }: { bubble: Bubble }) {
  const p = toBox(bubble.at[0], bubble.at[1]);
  // balon maketin kenarından taşmasın: sağ yarıdakiler sola, soldakiler sağa doğru açılır
  const side = p.x > 62 ? s.toLeft : p.x < 30 ? s.toRight : '';
  const style = { left: `${p.x}%`, top: `${Math.max(9, p.y)}%` } as CSSProperties;
  return (
    <div className={`${s.bubble} ${side} ${bubble.egg ? s.eggBubble : ''}`} style={style} role={bubble.egg ? 'status' : undefined} aria-hidden={bubble.egg ? undefined : true}>
      <b>{bubble.who}</b>
      <span>{bubble.text}</span>
    </div>
  );
}
