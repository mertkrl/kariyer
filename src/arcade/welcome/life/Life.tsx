import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { prefersReducedMotion } from '../../../components/ui/motion';
import { audioEngine } from '../../../audio/audioEngine';
import { City } from './city/city';
import { H as IMG_H, W as IMG_W, type Pt } from './city/core';
import { quipsFor, type Quip } from './quips';
import { isSecret, loadFound, saveFound, SECRETS, type SecretId } from './secrets';
import * as snd from './sounds';
import s from './Life.module.css';

/*
 * Maketin yaşayan katmanı (ilk açılış paketine girmez, maket göründükten sonra iner). Tek bir
 * tuval görselin üstüne aynı ölçekle oturur; şehir (city/) her kare güncellenip çizilir:
 * trafik ve ışık, yayalar, simitçi, çaycı, top oynayan çocuklar, baloncu, sepet sarkıtan teyze,
 * güvercinler, kedi, köpek, martılar, çamaşır ipi, cam silme sepeti, kaynakçı, duman, yağmur.
 *
 * Dokunulan şey kendi tepkisini verir; bazı tepkiler bir "sır"dır. Bulunanlar sayılır ama ekranda
 * adları yazmaz: köşedeki nazar boncuğunun çevresindeki halka dolar.
 *
 * Pencerelerden laflar (quips.ts), ses açılınca ödül ve ortam sesleri, fazla mesaide klavye ve
 * floresan. Sekme gizliyken kare çizilmez; "hareketi azalt" diyende şehir donmuş bir an olarak
 * çizilir, dokununca yine konuşur; zayıf cihazda daha az kişi ve parçacık, saniyede 30 kare.
 */

interface Bubble {
  key: number;
  at: Pt;
  who: string;
  text: string;
  egg: boolean;
}

/** Lafların çıktığı pencereler. */
const WINDOWS: Pt[] = [
  { x: 192, y: 430 },
  { x: 250, y: 495 },
  { x: 300, y: 450 },
  { x: 365, y: 465 },
  { x: 470, y: 425 },
  { x: 700, y: 520 },
  { x: 745, y: 485 },
  { x: 560, y: 230 },
];

/** Dokunmadan bulunanların sözleri. */
const PASSIVE: Partial<Record<SecretId, { who: string; text: string; at: Pt }>> = {
  bekle: { who: 'Plazadan biri', text: 'Hâlâ buradasın. Patron da aynısını düşünüyor.', at: { x: 600, y: 330 } },
  itiraf: { who: 'Patron', text: 'Madem buradasın, bir şey daha soracağım…', at: { x: 597, y: 200 } },
  klavye: { who: 'Simitçi', text: 'Duydum seni! Klavyeden simit sipariş edilmez ama olsun, ayırdım.', at: { x: 632, y: 652 } },
  'gece-yarisi': { who: 'Bekçi', text: 'Gece yarısı oldu. Şükrü kepengi indirdi, sen hâlâ buradasın.', at: { x: 470, y: 600 } },
};

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

/** Görünürken her `ms`de bir (biraz oynayarak) `f`. */
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

interface View {
  scale: number;
  ox: number;
  oy: number;
  w: number;
  h: number;
  dpr: number;
}

const FIRST_VIEW: View = { scale: 1, ox: 0, oy: 0, w: 1, h: 1, dpr: 1 };

export default function Life({ night, dark, overtime, muted, quiet }: { night: boolean; dark: number; overtime: boolean; muted: boolean; quiet: boolean }) {
  const visible = useVisible();
  const [still] = useState(prefersReducedMotion);
  const [low] = useState(lowPower);
  const [found, setFound] = useState(loadFound);
  const foundRef = useRef(found);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [pop, setPop] = useState(0);
  const [armed, setArmed] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const view = useRef<View>(FIRST_VIEW);
  // balonların yeri için aynı ölçek (çizim ve dokunuş ref'ten okur, yerleşim bundan)
  const [box, setBox] = useState<View>(FIRST_VIEW);
  const lastTouch = useRef(0);
  const seq = useRef(0);
  const deck = useRef<Quip[]>([]);
  const busy = useRef(0);

  const say = useCallback((who: string, text: string, at: Pt, egg = false) => {
    setBubble({ key: ++seq.current, at, who, text, egg });
    busy.current = Date.now() + 5000;
  }, []);

  const discover = useCallback((id: SecretId) => {
    if (foundRef.current.has(id)) return;
    const next = new Set(foundRef.current).add(id);
    foundRef.current = next;
    setFound(next);
    saveFound(next);
    snd.found();
    setPop((n) => n + 1);
  }, []);

  // şehir ilk kullanıldığında bir kez kurulur; sözleri ve sırları React'e kancalarla iletir
  const hooks = useRef({ say, discover });
  useEffect(() => {
    hooks.current = { say, discover };
  }, [say, discover]);
  const cityRef = useRef<City | null>(null);
  const getCity = useCallback(() => {
    if (!cityRef.current) {
      const c = new City(
        {
          say: (who, text, at) => hooks.current.say(who, text, at, true),
          secret: (id) => {
            if (isSecret(id)) hooks.current.discover(id);
          },
        },
        low,
      );
      // açılışta şehir zaten yaşıyor olsun: birkaç saniyeyi sessizce ileri sar
      for (let i = 0; i < 200; i++) c.update(0.05);
      cityRef.current = c;
    }
    return cityRef.current;
  }, [low]);

  // balon birkaç saniye kalır
  useEffect(() => {
    if (!bubble) return;
    const id = window.setTimeout(() => setBubble(null), bubble.egg ? 5200 : 4800);
    return () => window.clearTimeout(id);
  }, [bubble]);

  // ses: açık, görünür ve ilk dokunuştan sonra
  const sound = visible && armed && !muted && !audioEngine.isMuted();
  const live = useRef({ dark, sound, quiet });
  useEffect(() => {
    live.current = { dark, sound, quiet };
  }, [dark, sound, quiet]);

  /** Tuvali görselin kapladığı kutuya oturt (object-fit: cover ile aynı hesap). */
  const paint = useCallback(() => {
    const cv = canvas.current;
    const g = cv?.getContext('2d');
    if (!cv || !g) return;
    const v = view.current;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    g.setTransform(v.scale * v.dpr, 0, 0, v.scale * v.dpr, v.ox * v.dpr, v.oy * v.dpr);
    getCity().draw(g);
  }, [getCity]);

  useEffect(() => {
    const el = root.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const fit = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      const scale = Math.max(w / IMG_W, h / IMG_H);
      const dpr = Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2);
      view.current = { scale, ox: (w - IMG_W * scale) / 2, oy: (h - IMG_H * scale) / 2, w, h, dpr };
      setBox(view.current);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      paint();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [low, paint]);

  // kare döngüsü: zayıf cihazda saniyede 30, sekme gizliyken tarayıcı zaten durdurur
  useEffect(() => {
    const city = getCity();
    city.dark = live.current.dark;
    city.night.set(city.dark);
    if (still) {
      paint();
      return;
    }
    if (import.meta.env.DEV) {
      (window as unknown as { __mahalle?: City }).__mahalle = city;
      if (new URLSearchParams(window.location.search).get('hava') === 'yagmur') city.forceRain();
    }
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      let dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (low) {
        acc += dt;
        if (acc < 1 / 30) return;
        dt = acc;
        acc = 0;
      }
      city.dark = live.current.dark;
      city.sound = live.current.sound;
      city.update(dt);
      paint();
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [getCity, still, low, paint]);

  // hareketi azalt: karanlık değişince yeniden çiz
  useEffect(() => {
    if (!still) return;
    const city = getCity();
    city.dark = dark;
    city.night.set(dark);
    paint();
  }, [still, dark, getCity, paint]);

  // dokunuş ve imleç: maketin kendi tıklamasından önce (yakalama evresinde) bakılır
  useEffect(() => {
    const el = root.current;
    const model = el?.parentElement?.parentElement;
    if (!el || !model) return;
    const city = getCity();
    const toImg = (e: MouseEvent): Pt => {
      const r = el.getBoundingClientRect();
      const v = view.current;
      const lx = (e.clientX - r.left) * (v.w / (r.width || 1));
      const ly = (e.clientY - r.top) * (v.h / (r.height || 1));
      return { x: (lx - v.ox) / v.scale, y: (ly - v.oy) / v.scale };
    };
    const skip = (t: EventTarget | null) => t instanceof Element && !!t.closest('button, a, [role="dialog"], [role="group"]');
    const onClick = (e: MouseEvent) => {
      if (skip(e.target)) return;
      const p = toImg(e);
      audioEngine.init();
      if (!city.tap(p.x, p.y)) return;
      e.stopPropagation();
      e.preventDefault();
      if (still) paint();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const p = toImg(e);
      const hit = !skip(e.target) && city.hover(p.x, p.y);
      if (hit) {
        model.dataset.egg = '';
        model.style.cursor = 'pointer';
      } else if ('egg' in model.dataset) {
        delete model.dataset.egg;
        model.style.cursor = '';
      }
    };
    model.addEventListener('click', onClick, true);
    model.addEventListener('pointermove', onMove, true);
    return () => {
      model.removeEventListener('click', onClick, true);
      model.removeEventListener('pointermove', onMove, true);
      delete model.dataset.egg;
      model.style.cursor = '';
    };
  }, [getCity, still, paint]);

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

  /** Dokunmadan bulunan sır: sözüyle birlikte. */
  const passive = useCallback(
    (id: SecretId) => {
      const p = PASSIVE[id];
      if (p) say(p.who, p.text, p.at, true);
      discover(id);
    },
    [say, discover],
  );

  // fazla mesai itirafı
  const wasOvertime = useRef(overtime);
  useEffect(() => {
    if (overtime && !wasOvertime.current) window.setTimeout(() => passive('itiraf'), 1400);
    wasOvertime.current = overtime;
  }, [overtime, passive]);

  // klavyeden "simit" yazana simitçi seslenir
  useEffect(() => {
    let buf = '';
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key.length !== 1) return;
      buf = (buf + e.key.toLocaleLowerCase('tr-TR')).slice(-8);
      if (buf.endsWith('simit')) {
        buf = '';
        getCity().simitci.call = 1.6;
        if (live.current.sound) snd.bell();
        passive('klavye');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [getCity, passive]);

  // sesi açana ödül
  const wasMuted = useRef(muted);
  useEffect(() => {
    if (wasMuted.current && !muted) {
      snd.fanfare();
      say('Teyze', night ? 'Kısın şunu, gece yarısı! …Yok yok, açık kalsın.' : 'Kısın şunu! …Yok yok, güzelmiş, açık kalsın.', WINDOWS[1]);
    }
    wasMuted.current = muted;
  }, [muted, night, say]);

  const quietNow = visible && !quiet;
  // pencereden laflar
  useEvery(quietNow ? (low ? 30_000 : 17_000) : null, () => {
    if (Date.now() < busy.current) return;
    if (!deck.current.length) deck.current = quipsFor(new Date(), overtime).sort(() => Math.random() - 0.5);
    const quip = deck.current.pop()!;
    say(quip.who, quip.text, WINDOWS[Math.floor(Math.random() * WINDOWS.length)]);
  });

  // uzun süre kıpırdamayana; gece yarısında burada olana
  useEvery(visible ? 10_000 : null, () => {
    if (Date.now() - lastTouch.current > 45_000 && !foundRef.current.has('bekle')) passive('bekle');
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() < 10 && !foundRef.current.has('gece-yarisi')) passive('gece-yarisi');
  });

  // ortam sesi: gündüz kuşlar, gece cırcır böcekleri, uzaktan korna; fazla mesaide klavye ve floresan
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

  // ses kapanınca yağmur da susar
  useEffect(() => {
    if (!sound) snd.rain(false);
  }, [sound]);

  const place = (p: Pt) => ({ x: ((box.ox + p.x * box.scale) / box.w) * 100, y: ((box.oy + p.y * box.scale) / box.h) * 100 });

  return (
    <div ref={root} className={`${s.life} ${quiet ? s.dim : ''}`}>
      <canvas ref={canvas} className={s.canvas} aria-hidden="true" />
      {bubble && !quiet && <Speech key={bubble.key} bubble={bubble} at={place(bubble.at)} />}
      {found.size > 0 && <Eye count={found.size} total={SECRETS.length} pop={pop} />}
    </div>
  );
}

/** Nazar boncuğu: çevresindeki halka bulunanlar kadar dolar; yeni bir şey bulununca göz kırpar. */
function Eye({ count, total, pop }: { count: number; total: number; pop: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  return (
    <div className={s.eye} key={pop} role="status" aria-label={`Bulunan sürpriz: ${count} / ${total}`}>
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <circle cx={20} cy={20} r={r} className={s.track} />
        <circle cx={20} cy={20} r={r} className={s.fill} strokeDasharray={`${(c * count) / total} ${c}`} transform="rotate(-90 20 20)" />
        <circle cx={20} cy={20} r={11.5} fill="#1f4fa8" />
        <circle cx={20} cy={20} r={8} fill="#f6f4ee" />
        <circle cx={20} cy={20} r={5.4} fill="#4fb3e8" />
        <circle cx={20} cy={20} r={2.8} fill="#0d1420" className={s.pupil} />
        <circle cx={18.6} cy={18.6} r={1.1} fill="#ffffff" />
      </svg>
      <span>
        {count}
        <small>/{total}</small>
      </span>
    </div>
  );
}

function Speech({ bubble, at }: { bubble: Bubble; at: Pt }) {
  // balon maketin kenarından taşmasın: sağdakiler sola, soldakiler sağa açılır
  const side = at.x > 62 ? s.toLeft : at.x < 30 ? s.toRight : '';
  const style = { left: `${at.x}%`, top: `${Math.max(9, at.y)}%` } as CSSProperties;
  return (
    <div className={`${s.bubble} ${side} ${bubble.egg ? s.eggBubble : ''}`} style={style} role={bubble.egg ? 'status' : undefined} aria-hidden={bubble.egg ? undefined : true}>
      <b>{bubble.who}</b>
      <span>{bubble.text}</span>
    </div>
  );
}
