import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { lunchMenus, type LunchMenu, type SoupKind } from '../../game/data/lunchMenus';
import { audioEngine } from '../../audio/audioEngine';
import { Button } from '../../components/ui/Button';
import { FoodPile } from './FoodPile';
import { CityView, WeatherDefs } from './CityView';
import { weatherForDay } from './weather';
import {
  GLASS_HEIGHT,
  TAVSAN_KANI,
  glassHalfWidth,
  heightForVolume,
  planPour,
  runPour,
  teaColors,
  type PourElements,
} from './teaPour';
import styles from './BreakRoom.module.css';

/** One sip takes a fifth of a full glass. */
const SIP_VOLUME = 0.2;
/** How long a reaction line stays up without further interaction. */
const MESSAGE_LINGER_MS = 4200;
const TEA_HOT_MS = 45_000;
const SOUP_SIPS = 5;
const BREAD_BITES = 3;
const AYRAN_SIPS = 4;
const MAX_SUGAR = 5;

const DISH_BITES = { main: 5, side: 4, salad: 3, meze: 3, dessert: 3 } as const;
type DishKey = keyof typeof DISH_BITES;

/** Compartments of the tabldot tray, in the tray's own (unsquished) coordinates. */
const COMPARTMENTS: Record<DishKey, { x: number; y: number; w: number; h: number }> = {
  salad: { x: -240, y: -150, w: 152, h: 108 },
  meze: { x: -76, y: -150, w: 152, h: 108 },
  dessert: { x: 88, y: -150, w: 152, h: 108 },
  main: { x: -240, y: -26, w: 236, h: 176 },
  side: { x: 4, y: -26, w: 236, h: 176 },
};

const SOUP_COLORS: Record<SoupKind, { surface: string; speck: string }> = {
  mercimek: { surface: '#e2922c', speck: '#b8401c' },
  ezogelin: { surface: '#c8612c', speck: '#8f3a17' },
  yayla: { surface: '#f0e8d0', speck: '#6b8f3e' },
  domates: { surface: '#c33a22', speck: '#f3e2c8' },
  tarhana: { surface: '#b9542c', speck: '#7e3316' },
};

const TEA_LINES = [
  'Tavşan kanı, tam kıvamında.',
  'Oh be… İlaç gibi geldi.',
  'İnce belli bardakta sıcacık çay. Mesai unutuldu.',
  'Bir yudum daha. Adaylar biraz bekleyebilir.',
];

const DISH_LINES: Record<DishKey, (name: string) => string[]> = {
  main: (n) => [`${n}… Anneninki kadar olmasa da fena değil.`, `${n} bugün iyi olmuş, aşçıya selam.`],
  side: (n) => [`${n} olmadan tabldot olmaz.`, `${n} tane tane, tam kıvamında.`],
  salad: (n) => [`${n}, üstüne biraz limon iyi giderdi.`, `Taze taze ${n.toLowerCase()}.`],
  meze: (n) => [`${n} ile her şey daha güzel.`, `Bir çatal ${n.toLowerCase()}.`],
  dessert: (n) => [`${n}! Tatlısız mola olmaz.`, `${n} tam da ihtiyacın olan şeydi.`],
};

function pick<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)];
}

const GLASS_PATH =
  'M-28,-120 C-28,-98 -18,-88 -18,-70 C-18,-54 -27,-44 -26,-25 C-25,-9 -20,0 -18,0 L18,0 C20,0 25,-9 26,-25 C27,-44 18,-54 18,-70 C18,-88 28,-98 28,-120 Z';

interface HitProps {
  label: string;
  onActivate: () => void;
  bumped?: boolean;
  children: ReactNode;
}

/** Clickable, keyboard-accessible SVG group. Never put a transform attribute on it — CSS animates it. */
function Hit({ label, onActivate, bumped, children }: HitProps) {
  function onKeyDown(e: KeyboardEvent<SVGGElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  }
  return (
    <g
      className={`${styles.hit} ${bumped ? styles.bump : ''}`}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onActivate}
      onKeyDown={onKeyDown}
    >
      <title>{label}</title>
      {children}
    </g>
  );
}

function Steam({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className={styles.steamGroup} pointerEvents="none">
      {[-9, 0, 9].map((dx, i) => (
        <path
          key={dx}
          d={`M${dx},0 c-6,-8 6,-16 0,-24 c-6,-8 6,-16 0,-24`}
          className={styles.steam}
          style={{ animationDelay: `${i * 0.7}s` }}
        />
      ))}
    </g>
  );
}

interface BreakRoomProps {
  dayIndex: number;
  dayNumber: number;
  onFinish: () => void;
  /** Game minutes until 13:00 — lunch runs on the clock. */
  minutesLeft: number;
}

export function BreakRoom({ dayIndex, dayNumber, onFinish, minutesLeft }: BreakRoomProps) {
  const menu: LunchMenu = lunchMenus[dayIndex % lunchMenus.length];
  const weather = weatherForDay(dayIndex);

  // Weather you can hear through the window.
  useEffect(() => audioEngine.startWeatherAmbience(weather.kind), [weather.kind]);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (name: string) => `${name}-${uid}`;

  const [dishes, setDishes] = useState<Record<DishKey, number>>({ ...DISH_BITES });
  const [soup, setSoup] = useState(SOUP_SIPS);
  const [lemonSqueezed, setLemonSqueezed] = useState(false);
  const [lemonPhase, setLemonPhase] = useState<'plate' | 'lift' | 'squeeze'>('plate');
  const [juiceActive, setJuiceActive] = useState(false);
  const [bread, setBread] = useState([BREAD_BITES, BREAD_BITES]);
  const [ayran, setAyran] = useState({ open: false, level: AYRAN_SIPS });

  const [teaVolume, setTeaVolume] = useState(1);
  const [teaConcentration, setTeaConcentration] = useState(TAVSAN_KANI);
  const [teaHotUntil, setTeaHotUntil] = useState(() => Date.now() + TEA_HOT_MS);
  const [now, setNow] = useState(() => Date.now());
  const [sugar, setSugar] = useState(0);
  const [undissolved, setUndissolved] = useState(0);
  const [glasses, setGlasses] = useState(1);
  const [stirring, setStirring] = useState(false);
  const [pouring, setPouring] = useState(false);
  const pourEls = useRef<Partial<PourElements>>({ droplets: [], rings: [], foam: [] });
  const cancelPour = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelPour.current?.(), []);
  const [drops, setDrops] = useState<number[]>([]);

  const [bumped, setBumped] = useState<string | null>(null);
  // No instructions — the table is there to be discovered. Messages only react to what you do.
  const [message, setMessage] = useState<{ text: string; key: number } | null>(null);
  const messageTimer = useRef<number | null>(null);
  const dropSeq = useRef(0);

  const timers = useRef<number[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    const pending = timers.current;
    const interval = window.setInterval(() => setNow(Date.now()), 2000);
    return () => {
      window.clearInterval(interval);
      pending.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  /** Show a reaction line; it fades away on its own if nothing else happens. */
  function say(text: string) {
    setMessage((m) => ({ text, key: (m?.key ?? 0) + 1 }));
    if (messageTimer.current) window.clearTimeout(messageTimer.current);
    messageTimer.current = window.setTimeout(() => setMessage(null), MESSAGE_LINGER_MS);
  }
  useEffect(() => () => {
    if (messageTimer.current) window.clearTimeout(messageTimer.current);
  }, []);

  function bump(key: string) {
    setBumped(key);
    later(() => setBumped((b) => (b === key ? null : b)), 360);
  }

  const teaHot = now < teaHotUntil;

  const foodLeft =
    Object.values(dishes).reduce((a, b) => a + b, 0) + soup + bread[0] + bread[1] + ayran.level;

  function checkAllDone(nextLeft: number) {
    if (nextLeft === 0) {
      later(() => say('Afiyet olsun! Tepsi tertemiz — bulaşıkhane seni sevecek.'), 900);
    }
  }

  // ── Tea ────────────────────────────────────────────────────────────────
  const teaEmpty = teaVolume < 0.02;

  function sipTea() {
    if (pouring || stirring) return;
    if (teaEmpty) {
      say('Bardak boş. Çaydanlıktan bir tane daha koy.');
      return;
    }
    audioEngine.playSip();
    bump('tea');
    const next = Math.max(0, teaVolume - SIP_VOLUME);
    const wasFull = teaVolume > 0.97;
    setTeaVolume(next < 0.02 ? 0 : next);
    if (next < 0.02) say('Bardağın dibini gördün. Bir çay daha?');
    else if (!teaHot) say('Çay soğumuş… Çaydanlıktan tazelesen iyi olur.');
    else if (undissolved > 0) say('Şeker dipte kaldı. Önce bir karıştır.');
    else if (sugar >= 3) say('Bu kadar şeker biraz fazla… ama mola senin.');
    else if (teaConcentration > 0.6) say('Bu çay fazla demli… tavşan kanı değil, zift gibi.');
    else if (teaConcentration < 0.25) say('Biraz açık olmuş, ama içilir.');
    else if (sugar === 0 && wasFull) say('Şekersiz, demli. Tam İK çayı.');
    else say(pick(TEA_LINES));
  }

  function addSugar() {
    if (pouring) return;
    if (teaEmpty) {
      say('Önce çay koy, sonra şeker.');
      return;
    }
    if (sugar >= MAX_SUGAR) {
      say('Şekerlik bitmek üzere. Bu kadarı yeter :)');
      return;
    }
    const dropId = ++dropSeq.current;
    setDrops((d) => [...d, dropId]);
    bump('sugar');
    // Cube arcs from the bowl, plops into the tea (~0.7s), then sinks to the bottom (~1.2s).
    later(() => audioEngine.playClink(), 680);
    later(() => {
      setSugar((s) => s + 1);
      setUndissolved((u) => u + 1);
      setDrops((d) => d.filter((x) => x !== dropId));
    }, 1220);
    const n = sugar + 1;
    say(n === 1 ? 'Bir kesme şeker attın. Karıştırmayı unutma.' : `${n} şeker oldu. Tatlı dil yılanı deliğinden çıkarır.`);
  }

  function stir() {
    if (stirring || pouring) return;
    // Nothing to dissolve, nothing to stir.
    if (teaEmpty || sugar === 0) {
      say(teaEmpty ? 'Bardak boş, karıştıracak bir şey yok.' : 'Çayında şeker yok — karıştırmaya gerek yok.');
      return;
    }
    setStirring(true);
    audioEngine.playClink(5);
    later(() => {
      setStirring(false);
      setUndissolved(0);
    }, 950);
    if (undissolved > 0) say('Şıkır şıkır… Şekerler eridi.');
    else say('Kaşık bardağa çarptı: şıkır şıkır. Yemekhanenin müziği.');
  }

  function pourTea() {
    if (pouring || stirring) return;
    if (teaVolume > 0.97 && teaHot) {
      say('Bardak zaten dolu. Önce bir yudum al.');
      return;
    }
    const els = pourEls.current;
    if (!els.demlik || !els.kettle || !els.stream || !els.fill || !els.surface || !els.stops) return;

    // A full-but-cold glass gets tipped out first.
    let startVolume = teaVolume;
    let startConcentration = teaConcentration;
    const newGlass = teaEmpty;
    if (teaVolume > 0.97) {
      startVolume = 0;
      startConcentration = 0;
      setTeaVolume(0);
    }

    setPouring(true);
    cancelPour.current = runPour(planPour(startVolume, startConcentration), els as PourElements, {
      onStage: (kind) =>
        say(
          kind === 'brew'
            ? 'Önce demlikten koyu çay… (acele etme, dem önemli)'
            : 'Sonra çaydanlıktan kaynar su. Rengine bak: tavşan kanı!',
        ),
      onDone: (volume, concentration) => {
        cancelPour.current = null;
        setTeaVolume(volume);
        setTeaConcentration(concentration);
        setTeaHotUntil(Date.now() + TEA_HOT_MS);
        setNow(Date.now());
        if (newGlass) {
          setGlasses((g) => g + 1);
          setSugar(0);
          setUndissolved(0);
        }
        setPouring(false);
        say(newGlass ? `${glasses + 1}. bardak hazır. Tavşan kanı, ince belli bardakta.` : 'Çayını tazeledin, yine sıcacık.');
      },
    });
  }

  // ── Food ───────────────────────────────────────────────────────────────
  function eatDish(key: DishKey) {
    const name = menu[key].name;
    if (dishes[key] === 0) {
      say(`${name} bitti. Tabak tertemiz.`);
      return;
    }
    audioEngine.playBite();
    bump(key);
    const next = dishes[key] - 1;
    setDishes((d) => ({ ...d, [key]: next }));
    say(next === 0 ? `${name} bitti. Eline sağlık aşçıbaşı!` : pick(DISH_LINES[key](name)));
    checkAllDone(foodLeft - 1);
  }

  function sipSoup() {
    if (soup === 0) {
      say('Çorba kasesi boş. Keşke bir kepçe daha olsa.');
      return;
    }
    audioEngine.playSip();
    bump('soup');
    const next = soup - 1;
    setSoup(next);
    if (next === 0) say(`${menu.soup.name} bitti. İçini ısıttı.`);
    else if (!lemonSqueezed && next === SOUP_SIPS - 2) say('Limon sıksan daha güzel olmaz mı?');
    else say(soup === SOUP_SIPS ? `Sıcacık ${menu.soup.name.toLowerCase()}. Önce çorba, sonra iş.` : 'Bir kaşık daha…');
    checkAllDone(foodLeft - 1);
  }

  function squeezeLemon() {
    if (lemonPhase !== 'plate') return;
    if (lemonSqueezed) {
      say('Limonun suyu kalmadı.');
      return;
    }
    // Lift over the bowl → squeeze (juice drips into the soup) → back to the plate.
    setLemonPhase('lift');
    later(() => {
      setLemonPhase('squeeze');
      audioEngine.playSqueeze();
      if (soup > 0) setJuiceActive(true);
    }, 560);
    later(() => {
      setLemonSqueezed(true);
      setLemonPhase('plate');
    }, 1700);
    later(() => setJuiceActive(false), 2600);
    say(soup > 0 ? 'Limonu çorbanın üstüne sıktın. Şimdi tam oldu.' : 'Limonu sıktın ama çorba çoktan bitmiş.');
  }

  function eatBread(i: number) {
    if (bread[i] === 0) return;
    audioEngine.playBite();
    bump(`bread${i}`);
    const next = bread.map((b, j) => (j === i ? b - 1 : b));
    setBread(next);
    say(next[0] + next[1] === 0 ? 'Ekmek bitti. Sepette hep bir dilim daha vardır…' : 'Ekmeksiz doymaz bu millet.');
    checkAllDone(foodLeft - 1);
  }

  function drinkAyran() {
    bump('ayran');
    if (!ayran.open) {
      audioEngine.playUiClick();
      setAyran({ open: true, level: ayran.level });
      say('Ayranın kapağını açtın. Az kalsın gömleğe sıçrıyordu.');
      return;
    }
    if (ayran.level === 0) {
      say('Ayran bitti. Bıyık yaptı mı?');
      return;
    }
    audioEngine.playSip();
    setAyran({ open: true, level: ayran.level - 1 });
    say(ayran.level === 1 ? 'Son yudum. Köpüklü ayran gibisi yok.' : 'Buz gibi ayran, tam yemeğin üstüne.');
    checkAllDone(foodLeft - 1);
  }

  function setStop(i: 0 | 1 | 2, node: SVGStopElement | null) {
    if (!node) return;
    const stops = (pourEls.current.stops ?? [node, node, node]) as PourElements['stops'];
    stops[i] = node;
    pourEls.current.stops = stops;
  }

  // ── Derived visuals ────────────────────────────────────────────────────
  const teaHeight = heightForVolume(teaVolume);
  const teaFrac = teaHeight / GLASS_HEIGHT;
  const teaSurfaceScale = glassHalfWidth(teaHeight) / 28;
  const teaTint = teaColors(teaConcentration);
  const soupRatio = soup / SOUP_SIPS;
  const soupColors = SOUP_COLORS[menu.soup.kind];
  const ayranRatio = ayran.level / AYRAN_SIPS;

  return (
    <div className={styles.room}>
        <svg
          className={styles.scene}
          viewBox="0 0 1200 740"
          /* Always show the whole scene; the wall and table are drawn far past the viewBox,
             so on any aspect ratio the spare space continues the room instead of letterboxing. */
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Yemekhane masası"
        >
          <defs>
            <WeatherDefs />
            <linearGradient id="teaDepth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#000" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.28" />
            </linearGradient>
            <linearGradient id={id('wall')} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="400">
              <stop offset="0" stopColor="#f1ebdd" />
              <stop offset="1" stopColor="#e4dac4" />
            </linearGradient>
            <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={weather.sky[0]} />
              <stop offset="1" stopColor={weather.sky[1]} />
            </linearGradient>
            <linearGradient id={id('sea')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={weather.sea[0]} />
              <stop offset="1" stopColor={weather.sea[1]} />
            </linearGradient>
            <linearGradient id={id('table')} gradientUnits="userSpaceOnUse" x1="0" y1="396" x2="0" y2="740">
              <stop offset="0" stopColor="#d8c6a0" />
              <stop offset="1" stopColor="#c6ae82" />
            </linearGradient>
            <linearGradient id={id('steel')} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#e3e7ea" />
              <stop offset="0.5" stopColor="#c3c9ce" />
              <stop offset="1" stopColor="#d9dde0" />
            </linearGradient>
            <linearGradient id={id('comp')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#a9b0b6" />
              <stop offset="1" stopColor="#cdd2d6" />
            </linearGradient>
            <linearGradient id={id('tea')} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={teaTint.edge} ref={(n) => setStop(0, n)} />
              <stop offset="0.45" stopColor={teaTint.mid} ref={(n) => setStop(1, n)} />
              <stop offset="1" stopColor={teaTint.edge} ref={(n) => setStop(2, n)} />
            </linearGradient>
            <linearGradient id={id('glass')} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="0.3" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="0.8" stopColor="#ffffff" stopOpacity="0.05" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0.45" />
            </linearGradient>
            <linearGradient id={id('board')} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#34413a" />
              <stop offset="1" stopColor="#26302b" />
            </linearGradient>
            <linearGradient id={id('porcelain')} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#e6e2d8" />
              <stop offset="0.35" stopColor="#ffffff" />
              <stop offset="1" stopColor="#dcd7cb" />
            </linearGradient>
            <linearGradient id={id('kettle')} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#9ba3a9" />
              <stop offset="0.3" stopColor="#eef1f3" />
              <stop offset="0.7" stopColor="#b9c0c5" />
              <stop offset="1" stopColor="#8d959b" />
            </linearGradient>
            <pattern id={id('tiles')} width="36" height="36" patternUnits="userSpaceOnUse">
              <rect width="36" height="36" fill="#e5dcc5" />
              <path d="M0 0H36V36" fill="none" stroke="#d2c6a8" strokeWidth="1.5" />
            </pattern>
            <pattern id={id('iznik')} width="28" height="22" patternUnits="userSpaceOnUse">
              <rect width="28" height="22" fill="#f4efe3" />
              <path d="M14 3 L22 11 L14 19 L6 11 Z" fill="#3e6a9a" />
              <circle cx="14" cy="11" r="3" fill="#f4efe3" />
              <circle cx="14" cy="11" r="1.4" fill="#b8402c" />
              <circle cx="0" cy="11" r="2" fill="#3f8a7a" />
              <circle cx="28" cy="11" r="2" fill="#3f8a7a" />
            </pattern>
            <clipPath id={id('glassClip')}>
              <path d={GLASS_PATH} />
            </clipPath>
            <clipPath id={id('windowClip')}>
              <rect x="82" y="52" width="306" height="206" />
            </clipPath>
            <filter id={id('soft')} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
            {bread.map((b, i) => (
              <clipPath key={i} id={id(`bread${i}`)}>
                <path
                  d={`M-44,${-48 + (1 - b / BREAD_BITES) * 62} q11,12 22,0 q11,12 22,0 q11,12 22,0 q11,12 22,0 L44,44 L-44,44 Z`}
                />
              </clipPath>
            ))}
          </defs>

          {/* ── Wall ── */}
          <rect x="-4000" y="-4000" width="9200" height="4400" fill={`url(#${id('wall')})`} />
          <rect x="-4000" y="314" width="9200" height="80" fill={`url(#${id('tiles')})`} />
          <rect x="-4000" y="292" width="9200" height="22" fill={`url(#${id('iznik')})`} />
          <rect x="-4000" y="290" width="9200" height="3" fill="#b9a57e" />
          <rect x="-4000" y="313" width="9200" height="2" fill="#b9a57e" />

          {/* Window onto the business district across the road */}
          <g>
            <rect x="70" y="40" width="330" height="230" rx="4" fill="#f7f3ea" stroke="#c9bea3" strokeWidth="2" />
            <g clipPath={`url(#${id('windowClip')})`}>
              <CityView weather={weather} skyFill={`url(#${id('sky')})`} />
              {/* Blinds */}
              {Array.from({ length: 9 }).map((_, i) => (
                <rect key={i} x="82" y={52 + i * 7} width="306" height="6" fill="#efe8d8" stroke="#d6ccb4" strokeWidth="0.8" />
              ))}
              <rect x="82" y="115" width="306" height="4" fill="#d6ccb4" />
            </g>
            <rect x="232" y="52" width="6" height="206" fill="#f7f3ea" />
            <rect x="60" y="268" width="350" height="12" rx="2" fill="#efe9dc" stroke="#c9bea3" />
            <line x1="378" y1="56" x2="378" y2="150" stroke="#b4a988" strokeWidth="1.5" />
            <circle cx="378" cy="152" r="3" fill="#b4a988" />
            {/* Plant on the sill */}
            <g transform="translate(360 268)">
              <g className={styles.plantSway}>
                {[
                  [-10, -52, -30],
                  [8, -58, 25],
                  [0, -66, 0],
                  [-16, -44, -55],
                  [16, -44, 55],
                ].map(([x, y, r], i) => (
                  <ellipse key={i} cx={x} cy={y} rx="6" ry="18" fill={i % 2 ? '#5c8c46' : '#4a7a3a'} transform={`rotate(${r} ${x} ${y + 14})`} />
                ))}
              </g>
              <path d="M-15 -26 L-18 0 H18 L15 -26 Z" fill="#b8643e" />
              <rect x="-17" y="-30" width="34" height="6" rx="2" fill="#a2552f" />
            </g>
          </g>

          {/* Pinned notice */}
          <g transform="rotate(-2 560 130)">
            <rect x="478" y="66" width="164" height="124" fill="#fbf8f0" stroke="#e0d7c0" />
            <rect x="478" y="66" width="164" height="124" fill="none" stroke="#000" strokeOpacity="0.04" strokeWidth="6" />
            <circle cx="560" cy="76" r="5" fill="#b8402c" />
            <text x="560" y="104" textAnchor="middle" className={styles.noticeTitle}>
              YEMEKHANE
            </text>
            <text x="560" y="128" textAnchor="middle" className={styles.noticeTime}>
              12:00 – 13:00
            </text>
            <line x1="498" y1="140" x2="622" y2="140" stroke="#e0d7c0" />
            <text x="560" y="158" textAnchor="middle" className={styles.noticeText}>
              Tepsilerinizi lütfen
            </text>
            <text x="560" y="174" textAnchor="middle" className={styles.noticeText}>
              iade ediniz. — İdari İşler
            </text>
          </g>

          {/* Pendant lamp */}
          <g>
            <line x1="700" y1="0" x2="700" y2="54" stroke="#6b6455" strokeWidth="2" />
            <path d="M672 78 Q672 54 700 54 Q728 54 728 78 Z" fill="#3f6b63" />
            <ellipse cx="700" cy="80" rx="12" ry="4" fill="#fff4cf" />
            <ellipse cx="700" cy="120" rx="70" ry="38" fill="#fff4cf" opacity="0.12" />
          </g>

          {/* Menu board */}
          <g>
            <rect x="782" y="30" width="352" height="258" rx="6" fill="#7a5230" />
            <rect x="796" y="44" width="324" height="230" rx="3" fill={`url(#${id('board')})`} />
            <text x="958" y="80" textAnchor="middle" className={styles.boardTitle}>
              GÜNÜN MENÜSÜ
            </text>
            <text x="958" y="100" textAnchor="middle" className={styles.boardSub}>
              Tabldot · {dayNumber}. Gün
            </text>
            <line x1="830" y1="110" x2="1086" y2="110" stroke="#f2efe4" strokeOpacity="0.3" strokeDasharray="4 4" />
            {[menu.soup.name, menu.main.name, menu.side.name, `${menu.salad.name} · ${menu.meze.name}`, menu.dessert.name].map(
              (item, i) => (
                <text key={item} x="830" y={136 + i * 24} className={styles.boardItem}>
                  <tspan className={styles.boardBullet}>◦ </tspan>
                  {item}
                </text>
              ),
            )}
            <text x="958" y="262" textAnchor="middle" className={styles.boardFoot}>
              Ekmek · Ayran · Çay — Afiyet olsun!
            </text>
            <rect x="820" y="274" width="40" height="6" rx="2" fill="#f2efe4" opacity="0.85" />
          </g>

          {/* ── Table ── */}
          <rect x="-4000" y="386" width="9200" height="12" fill="#a88f66" />
          <rect x="-4000" y="396" width="9200" height="4000" fill={`url(#${id('table')})`} />
          {[430, 478, 540, 610].map((y, i) => (
            <path
              key={y}
              d={`M0 ${y} C300 ${y - 8 + i * 3} 700 ${y + 10} 1200 ${y - 4}`}
              stroke="#8a6d45"
              strokeOpacity="0.08"
              strokeWidth="2"
              fill="none"
            />
          ))}

          {/* Soft shadows */}
          <g fill="#3a2a14" opacity="0.18" filter={`url(#${id('soft')})`}>
            <ellipse cx="600" cy="560" rx="250" ry="100" />
            <ellipse cx="220" cy="516" rx="80" ry="14" />
            <ellipse cx="990" cy="596" rx="64" ry="14" />
            <ellipse cx="1102" cy="482" rx="60" ry="10" />
            <ellipse cx="878" cy="504" rx="30" ry="7" />
            <ellipse cx="1112" cy="606" rx="36" ry="8" />
          </g>

          {/* Bread slices */}
          {bread.map((b, i) => {
            const [x, y, r] = i === 0 ? [72, 582, -12] : [128, 612, 8];
            return (
              <Hit key={i} label="Ekmek dilimi" onActivate={() => eatBread(i)} bumped={bumped === `bread${i}`}>
                <g transform={`translate(${x} ${y}) rotate(${r}) scale(1 0.62)`}>
                  {b > 0 ? (
                    <g clipPath={`url(#${id(`bread${i}`)})`}>
                      <path
                        d="M-34,34 L-36,-8 C-44,-40 -12,-48 0,-38 C12,-48 44,-40 36,-8 L34,34 Z"
                        fill="#c4843f"
                        stroke="#a86a2c"
                      />
                      <path
                        d="M-27,28 L-29,-8 C-35,-32 -10,-38 0,-30 C10,-38 35,-32 29,-8 L27,28 Z"
                        fill="#f2deb0"
                      />
                      {[
                        [-12, -10],
                        [8, 4],
                        [-4, 16],
                        [14, -16],
                      ].map(([cx, cy]) => (
                        <ellipse key={`${cx}${cy}`} cx={cx} cy={cy} rx="2.5" ry="1.8" fill="#dcc592" />
                      ))}
                    </g>
                  ) : (
                    <g fill="#c4843f" opacity="0.6">
                      <circle cx="-6" cy="4" r="2" />
                      <circle cx="8" cy="-2" r="1.5" />
                      <circle cx="2" cy="12" r="1.6" />
                    </g>
                  )}
                </g>
              </Hit>
            );
          })}

          {/* Lemon on a small plate */}
          <ellipse cx="96" cy="480" rx="34" ry="9" fill="#f4f1ea" stroke="#d8d2c2" />
          <Hit label="Limon — çorbaya sık" onActivate={squeezeLemon}>
            <g className={`${styles.lemonMover} ${lemonPhase !== 'plate' ? styles.lemonLifted : ''}`}>
              <g transform="translate(96 474)">
                <g className={lemonPhase === 'squeeze' ? styles.lemonSqueezing : undefined}>
                  {lemonSqueezed ? (
                    <path d="M-14 4 Q0 -4 14 4 Q0 8 -14 4 Z" fill="#e9cf4d" stroke="#c7ac2d" />
                  ) : (
                    <>
                      <path d="M-18 4 Q0 -18 18 4 Z" fill="#f0d54c" stroke="#c7ac2d" />
                      <path d="M-13 3 Q0 -11 13 3 Z" fill="#fbeaa0" />
                      <path d="M0 3 L0 -8 M0 3 L-8 -3 M0 3 L8 -3" stroke="#e8cf6a" strokeWidth="1" />
                    </>
                  )}
                </g>
              </g>
            </g>
          </Hit>

          {/* Soup bowl */}
          <Hit label={menu.soup.name} onActivate={sipSoup} bumped={bumped === 'soup'}>
            <g transform="translate(220 512)">
              <ellipse cx="0" cy="0" rx="42" ry="7" fill="#e4dfd2" />
              <path d="M-70,-62 C-68,-20 -40,-4 -30,0 L30,0 C40,-4 68,-20 70,-62 Z" fill={`url(#${id('porcelain')})`} stroke="#cfc8b8" />
              <path d="M-66,-44 C-60,-36 60,-36 66,-44" stroke="#3e6a9a" strokeWidth="3" fill="none" />
              <path d="M-62,-36 C-56,-29 56,-29 62,-36" stroke="#3e6a9a" strokeWidth="1" fill="none" />
              <ellipse cx="0" cy="-62" rx="70" ry="16" fill="#f7f5ef" stroke="#cfc8b8" />
              <ellipse cx="0" cy="-61" rx="62" ry="12.5" fill="#ddd7c8" />
              {soup > 0 && (
                <g
                  className={styles.level}
                  style={{ transform: `translateY(${(1 - soupRatio) * 7}px) scale(${0.72 + 0.28 * soupRatio})` }}
                >
                  <ellipse cx="0" cy="-61" rx="60" ry="11.5" fill={soupColors.surface} />
                  <ellipse cx="-14" cy="-64" rx="22" ry="3.5" fill="#ffffff" opacity="0.18" />
                  {[
                    [-30, -60],
                    [12, -58],
                    [30, -63],
                    [-8, -65],
                    [22, -56],
                  ].map(([cx, cy]) => (
                    <circle key={`${cx}${cy}`} cx={cx} cy={cy} r="2" fill={soupColors.speck} opacity="0.8" />
                  ))}
                  {lemonSqueezed && (
                    <ellipse cx="-2" cy="-61" rx="24" ry="5" fill="#f3dc5a" className={styles.juiceSheen} />
                  )}
                  {juiceActive &&
                    [0, 0.35, 0.7].map((delay) => (
                      <ellipse
                        key={delay}
                        cx="-2"
                        cy="-61"
                        rx="16"
                        ry="3.6"
                        fill="none"
                        stroke="#f7e27a"
                        strokeWidth="1.6"
                        className={styles.juiceRipple}
                        style={{ animationDelay: `${delay}s` }}
                      />
                    ))}
                </g>
              )}
              {/* Soup spoon resting on the rim */}
              <path d="M38,-66 L96,-104" stroke="#aab1b6" strokeWidth="5" strokeLinecap="round" />
              <ellipse cx="30" cy="-62" rx="11" ry="5" fill="#c5cbcf" transform="rotate(-30 30 -62)" />
            </g>
          </Hit>
          {soup > 0 && <Steam x={206} y={444} scale={1.1} />}
          {lemonPhase === 'squeeze' && (
            <g pointerEvents="none">
              {[216, 221, 218, 223, 215, 220].map((x, i) => (
                <g key={i} transform={`translate(${x} 414)`}>
                  <path
                    d="M0,-4 C2,-1 3,1.5 0,3.5 C-3,1.5 -2,-1 0,-4 Z"
                    fill="#f3dc5a"
                    stroke="#d9b92c"
                    strokeWidth="0.6"
                    className={styles.juiceDrop}
                    style={{ animationDelay: `${i * 0.14}s` }}
                  />
                </g>
              ))}
            </g>
          )}

          {/* Napkin with fork & knife */}
          <g transform="translate(328 556) scale(1 0.6)">
            <rect x="-22" y="-110" width="44" height="220" rx="3" fill="#fbfaf5" stroke="#e1dccd" />
            <line x1="0" y1="-110" x2="0" y2="110" stroke="#e8e3d5" />
            <g transform="translate(-8 0)">
              <rect x="-2.5" y="-20" width="5" height="100" rx="2.5" fill="#aab1b6" />
              <path d="M-7 -20 V-70 M-2.5 -20 V-70 M2.5 -20 V-70 M7 -20 V-70" stroke="#aab1b6" strokeWidth="2.4" />
              <path d="M-8 -20 Q0 -8 8 -20" fill="#aab1b6" />
            </g>
            <g transform="translate(9 0)">
              <rect x="-2.5" y="-10" width="5" height="90" rx="2.5" fill="#9aa2a8" />
              <path d="M-4 -10 V-80 Q4 -76 4 -10 Z" fill="#c5cbcf" />
            </g>
          </g>

          {/* ── Tabldot tray ── */}
          <g transform="translate(600 548) scale(0.9 0.56)">
            <rect x="-268" y="-178" width="536" height="356" rx="30" fill="#8d949a" />
            <rect x="-264" y="-174" width="528" height="344" rx="28" fill={`url(#${id('steel')})`} />
            <rect x="-252" y="-162" width="504" height="324" rx="22" fill="none" stroke="#f4f6f7" strokeOpacity="0.7" strokeWidth="2" />
          </g>
          {(Object.keys(COMPARTMENTS) as DishKey[]).map((key, i) => {
            const c = COMPARTMENTS[key];
            return (
              <Hit key={key} label={menu[key].name} onActivate={() => eatDish(key)} bumped={bumped === key}>
                <g transform="translate(600 548) scale(0.9 0.56)">
                  <rect x={c.x} y={c.y} width={c.w} height={c.h} rx="20" fill={`url(#${id('comp')})`} stroke="#8a9096" strokeWidth="2" />
                  <rect x={c.x + 4} y={c.y + c.h - 14} width={c.w - 8} height="8" rx="4" fill="#ffffff" opacity="0.25" />
                  <FoodPile
                    kind={menu[key].kind}
                    x={c.x}
                    y={c.y}
                    w={c.w}
                    h={c.h}
                    ratio={dishes[key] / DISH_BITES[key]}
                    seed={(dayIndex + 1) * 97 + i * 13}
                  />
                </g>
              </Hit>
            );
          })}

          {/* Ayran cup */}
          <Hit label="Ayran" onActivate={drinkAyran} bumped={bumped === 'ayran'}>
            <g transform="translate(878 504)">
              <path d="M-26,-78 L-20,0 L20,0 L26,-78 Z" fill="#fbfbf8" stroke="#d6d9dc" />
              <path d="M-24.5,-58 L-22.5,-30 L22.5,-30 L24.5,-58 Z" fill="#2f6aa6" />
              <text x="0" y="-39" textAnchor="middle" className={styles.ayranLabel}>
                AYRAN
              </text>
              <path d="M-21.5,-18 L-21,-10 L21,-10 L21.5,-18 Z" fill="#2f6aa6" opacity="0.35" />
              <ellipse cx="0" cy="-78" rx="26" ry="6" fill="#e8ecef" stroke="#d6d9dc" />
              {ayran.open ? (
                ayran.level > 0 && (
                  <g className={styles.level} style={{ transform: `translateY(${(1 - ayranRatio) * 4}px) scale(${0.78 + 0.22 * ayranRatio})` }}>
                    <ellipse cx="0" cy="-77" rx="23" ry="4.8" fill="#fdfdf9" />
                    <circle cx="-8" cy="-77" r="1.4" fill="#ecece4" />
                    <circle cx="6" cy="-76" r="1.8" fill="#ecece4" />
                  </g>
                )
              ) : (
                <g>
                  <ellipse cx="0" cy="-79" rx="27" ry="6.5" fill="#d9e3ee" stroke="#9fb3c8" />
                  <ellipse cx="0" cy="-79" rx="16" ry="3.6" fill="#2f6aa6" opacity="0.8" />
                  <path d="M24,-81 L36,-86 L38,-80 L26,-77 Z" fill="#d9e3ee" stroke="#9fb3c8" />
                </g>
              )}
            </g>
          </Hit>

          {/* Çaydanlık (double teapot) — click to pour. The demlik lifts off for the brew,
              then the whole kettle tilts for the water; poses are driven by teaPour.ts. */}
          <Hit label="Çaydanlık — çay koy" onActivate={pourTea} bumped={false}>
            <g transform="translate(1100 480)">
              <g ref={(n) => void (pourEls.current.kettle = n ?? undefined)}>
                {/* Bottom kettle */}
                <path d="M-54,0 C-60,-30 -50,-64 -36,-68 L36,-68 C50,-64 60,-30 54,0 Z" fill={`url(#${id('kettle')})`} stroke="#7d858b" />
                <rect x="-40" y="-74" width="80" height="8" rx="3" fill="#b5bcc1" stroke="#7d858b" />
                <path d="M54,-50 C80,-50 80,-14 52,-12" stroke="#5a4a3a" strokeWidth="6" fill="none" strokeLinecap="round" />
                <path d="M-54,-30 L-74,-50" stroke="#a8afb4" strokeWidth="8" strokeLinecap="round" />
                <path d="M-54,-30 L-74,-50" stroke="#e6e9eb" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
                {/* Porcelain demlik */}
                <g ref={(n) => void (pourEls.current.demlik = n ?? undefined)}>
                  <path d="M-30,-74 C-38,-96 -26,-124 0,-124 C26,-124 38,-96 30,-74 Z" fill={`url(#${id('porcelain')})`} stroke="#cfc8b8" />
                  <path d="M-30,-104 C-44,-106 -52,-116 -62,-126" stroke="#f3f1ea" strokeWidth="7" strokeLinecap="round" fill="none" />
                  <path d="M-30,-104 C-44,-106 -52,-116 -62,-126" stroke="#cfc8b8" strokeWidth="1" fill="none" />
                  <path d="M28,-112 C46,-112 46,-86 30,-84" stroke="#e8e4da" strokeWidth="5" fill="none" />
                  <ellipse cx="0" cy="-124" rx="20" ry="5" fill="#f3f1ea" stroke="#cfc8b8" />
                  <circle cx="0" cy="-131" r="5" fill="#b8402c" />
                  {/* Tulip motif */}
                  <g transform="translate(0 -98)">
                    <path d="M0,6 C-8,0 -7,-10 -3,-12 L0,-7 L3,-12 C7,-10 8,0 0,6 Z" fill="#b8402c" />
                    <path d="M0,6 V14 M0,11 Q-6,8 -8,12 M0,11 Q6,8 8,12" stroke="#3f8a7a" strokeWidth="1.5" fill="none" />
                  </g>
                </g>
              </g>
            </g>
          </Hit>

          {/* Sugar bowl */}
          <Hit label="Şekerlik — kesme şeker at" onActivate={addSugar} bumped={bumped === 'sugar'}>
            <g transform="translate(1112 604)">
              <path d="M-32,-30 C-32,-6 -18,0 -14,0 L14,0 C18,0 32,-6 32,-30 Z" fill={`url(#${id('porcelain')})`} stroke="#cfc8b8" />
              <path d="M-31,-20 C-24,-14 24,-14 31,-20" stroke="#3e6a9a" strokeWidth="2" fill="none" />
              <ellipse cx="0" cy="-30" rx="32" ry="8" fill="#f7f5ef" stroke="#cfc8b8" />
              {[
                [-14, -36],
                [0, -38],
                [13, -35],
                [-6, -31],
                [8, -30],
              ].map(([x, y], i) => (
                <rect
                  key={i}
                  x={x - 5}
                  y={y - 5}
                  width="10"
                  height="10"
                  rx="1.5"
                  fill="#ffffff"
                  stroke="#dcd8cc"
                  transform={`rotate(${i * 17 - 20} ${x} ${y})`}
                />
              ))}
            </g>
          </Hit>

          {/* Tea glass on its saucer */}
          <ellipse cx="990" cy="590" rx="62" ry="14" fill="#fbfaf6" stroke="#c9a227" strokeWidth="2" />
          <ellipse cx="990" cy="588" rx="30" ry="6" fill="#ebe7dc" />
          <Hit label="Çay bardağı — bir yudum al" onActivate={sipTea} bumped={bumped === 'tea'}>
            <g transform="translate(990 586)" className={pouring ? styles.pouring : undefined}>
              <g clipPath={`url(#${id('glassClip')})`}>
                <rect x="-30" y="-120" width="60" height="120" fill="#ffffff" opacity="0.25" />
                <rect
                  x="-30"
                  y="-120"
                  width="60"
                  height="120"
                  fill={`url(#${id('tea')})`}
                  className={styles.teaFill}
                  style={{ transform: `scaleY(${teaFrac})`, opacity: teaTint.opacity }}
                  ref={(n) => void (pourEls.current.fill = n ?? undefined)}
                />
                {/* Depth: the column darkens toward the bottom */}
                <rect x="-30" y={-teaHeight} width="60" height={teaHeight} fill="url(#teaDepth)" pointerEvents="none" />
                <ellipse
                  cx="0"
                  cy="0"
                  rx="28"
                  ry="4"
                  fill={teaTint.surface}
                  className={styles.teaSurface}
                  style={{
                    transform: `translateY(${-teaHeight}px) scaleX(${teaSurfaceScale})`,
                    opacity: teaEmpty ? 0 : 1,
                  }}
                  ref={(n) => void (pourEls.current.surface = n ?? undefined)}
                />
                {/* Pour FX pools (splash droplets, impact rings, foam) — animated by teaPour.ts */}
                <g pointerEvents="none">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <ellipse
                      key={`ring${i}`}
                      rx="0"
                      ry="0"
                      fill="none"
                      stroke="#f6d9c2"
                      strokeWidth="0.8"
                      ref={(n) => {
                        if (n) pourEls.current.rings![i] = n;
                      }}
                    />
                  ))}
                  {Array.from({ length: 14 }).map((_, i) => (
                    <circle
                      key={`foam${i}`}
                      r="0"
                      fill="#f3dcc6"
                      ref={(n) => {
                        if (n) pourEls.current.foam![i] = n;
                      }}
                    />
                  ))}
                  {Array.from({ length: 18 }).map((_, i) => (
                    <circle
                      key={`drop${i}`}
                      r="0"
                      fill={teaTint.surface}
                      ref={(n) => {
                        if (n) pourEls.current.droplets![i] = n;
                      }}
                    />
                  ))}
                </g>
                {Array.from({ length: Math.min(undissolved, 4) }).map((_, i) => (
                  <rect key={i} x={-12 + i * 7} y={-10 - (i % 2) * 5} width="8" height="8" rx="1" fill="#f7f1e6" opacity="0.85" />
                ))}
                {drops.map((d) => (
                  <g key={d}>
                    <ellipse cx="0" cy={-teaHeight} rx="10" ry="2.5" fill="none" stroke="#f3c9a8" strokeWidth="1.4" className={styles.splash} />
                    <rect
                      x="-5"
                      y={-teaHeight - 3}
                      width="10"
                      height="10"
                      rx="1.5"
                      fill="#f7f1e6"
                      className={styles.sugarSink}
                      style={{ '--sink-y': `${Math.max(0, teaHeight - 16)}px` } as CSSProperties}
                    />
                  </g>
                ))}
              </g>
              {drops.map((d) => (
                <rect
                  key={d}
                  x="-5.5"
                  y="-135.5"
                  width="11"
                  height="11"
                  rx="1.5"
                  fill="#ffffff"
                  stroke="#dcd8cc"
                  className={styles.sugarDrop}
                  style={{ '--drop-y': `${132 - teaHeight}px` } as CSSProperties}
                />
              ))}
              {/* The falling stream: in front of the liquid, behind the glass wall */}
              <g pointerEvents="none">
                <path ref={(n) => void (pourEls.current.stream = n ?? undefined)} d="" strokeLinejoin="round" />
                <path
                  ref={(n) => void (pourEls.current.streamHighlight = n ?? undefined)}
                  d=""
                  fill="none"
                  strokeWidth="0.7"
                  strokeLinecap="round"
                />
                <circle ref={(n) => void (pourEls.current.streamHead = n ?? undefined)} r="0" />
              </g>
              <path d={GLASS_PATH} fill={`url(#${id('glass')})`} stroke="#b7c2c8" strokeWidth="1.5" />
              <path d="M-22,-112 C-22,-96 -14,-86 -14,-72" stroke="#ffffff" strokeWidth="3" strokeOpacity="0.7" fill="none" strokeLinecap="round" />
              <ellipse cx="0" cy="-120" rx="28" ry="4" fill="none" stroke="#c9d3d8" strokeWidth="1.5" />
              {stirring && (
                <g className={styles.stir}>
                  <path d="M4,-40 L14,-150" stroke="#b5bcc1" strokeWidth="3.5" strokeLinecap="round" />
                  <ellipse cx="3" cy="-34" rx="5" ry="9" fill="#c5cbcf" />
                </g>
              )}
            </g>
          </Hit>
          {!teaEmpty && teaHot && !pouring && <Steam x={990} y={452} />}

          {/* Teaspoon on the saucer */}
          {!stirring && (
            <Hit label="Çay kaşığı — karıştır" onActivate={stir} bumped={false}>
              <g>
                <path d="M1022,594 L1066,578" stroke="#aab1b6" strokeWidth="3.5" strokeLinecap="round" />
                <ellipse cx="1018" cy="596" rx="8" ry="4.5" fill="#c5cbcf" transform="rotate(-20 1018 596)" />
              </g>
            </Hit>
          )}
          {/* Daylight from outside tints the whole room (dim and cool when it rains, crisp when it snows) */}
          {weather.roomTint && (
            <rect x="-4000" y="-4000" width="9200" height="9000" fill={weather.roomTint} pointerEvents="none" />
          )}
        </svg>

      {message && (
        <div className={styles.toast} key={message.key} role="status">
          {message.text}
        </div>
      )}
      <div className={styles.finishButton}>
        <span className={`${styles.breakTimer} ${minutesLeft <= 10 ? styles.breakTimerLow : ''}`}>
          ⏱ Molanın bitmesine <b className="mono">{Math.max(0, Math.ceil(minutesLeft))} dk</b>
        </span>
        <Button variant="danger" onClick={onFinish}>
          Masaya dön →
        </Button>
      </div>
    </div>
  );
}
