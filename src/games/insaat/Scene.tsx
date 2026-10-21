import { Building } from './Building';
import { STAGES, dayPhase, doneOf, idleAt, isNight, snowCoverAt, speechAt, stageAt, watchersAt, weatherAt, workAt } from './data';
import { FLOOR_H, GROUND, LEFT, WINDOWS } from './geo';
import { Site } from './Site';
import { darkAt, skyAt, tintAt } from './light';
import { Sky, Weather } from './Sky';
import s from './Scene.module.css';

/*
 * İnşaat sahnesi: tek bir SVG. Katmanlar arkadan öne: gökyüzü ve orman, bina, şantiye, gece
 * katmanı, ışıklar (projektör, teslimden sonra yanan pencereler), yağmur ya da kar, en önde arkası
 * dönük izleyenler ve konuşanın başının üstünde balonu. Bina ve şantiye iş saatine, atmosfer gerçek saate bağlıdır.
 */

/**
 * İzleyenler en önde, arkaları dönük ve belden yukarısı görünür; küçük, sade ve kıpırdamadan dururlar.
 * Yerleri binanın iki yanında, ortayı kapatmadan; geliş sırasına göre.
 */
const AMCA_X = [300, 870, 205, 955, 385, 1035, 130];
const AMCA = [
  { coat: '#5f594b', hair: 'bald' },
  { coat: '#3b4f6b', hair: 'cap' },
  { coat: '#6e5a48', hair: 'grey' },
  { coat: '#4a453b', hair: 'cap' },
  { coat: '#5a4a5e', hair: 'bald' },
  { coat: '#3f5b50', hair: 'grey' },
  { coat: '#56606b', hair: 'cap' },
] as const;

/** İzleyenlerin boyu: sahnede küçük, sade siluetler. */
const AMCA_SCALE = 0.55;
/** Başın üstü (SVG birimi): konuşma balonu buraya oturur. */
const HEAD_TOP = 640 - 132 * AMCA_SCALE;

function Watcher({ i, rain }: { i: number; rain: boolean }) {
  const a = AMCA[i];
  return (
    <g transform={`translate(${AMCA_X[i]} 640) scale(${AMCA_SCALE})`}>
      <path d="M -50 0 C -50 -50 -36 -72 0 -74 C 36 -72 50 -50 50 0 Z" fill={a.coat} />
      <path d="M -50 0 C -50 -50 -36 -72 0 -74 C 36 -72 50 -50 50 0 Z" fill="url(#ins-coat-shade)" />
      <path d="M -8 -72 L 0 -46 L 8 -72" fill="none" stroke="rgba(0,0,0,.2)" strokeWidth="2" />
      {i === 1 && <path d="M 6 -10 q 6 10 0 18" stroke="#7d2f1d" strokeWidth="3" fill="none" strokeDasharray="3 2" />}
      <g>
        <rect x="-10" y="-90" width="20" height="18" fill="#c9a888" />
        <circle cx="0" cy="-106" r="24" fill="#d9b48e" />
        <circle cx="6" cy="-100" r="20" fill="#b8916c" opacity="0.35" />
        {a.hair === 'bald' && <path d="M -24 -102 Q 0 -86 24 -102 L 24 -94 Q 0 -80 -24 -94 Z" fill="#a9a398" />}
        {a.hair === 'grey' && <path d="M -24 -104 Q -22 -132 0 -131 Q 22 -132 24 -104 Q 0 -94 -24 -104 Z" fill="#bdb8ae" />}
        {a.hair === 'cap' && <path d="M -26 -108 Q -24 -134 0 -134 Q 24 -134 26 -108 Z" fill="#3a362f" />}
      </g>
      {/* yağmurda şemsiye elde: kol omuzdan kalkar, sap elden çıkar, şemsiye başın üstünde */}
      {rain && (
        <g>
          <path d="M 36 -58 Q 30 -92 16 -120" fill="none" stroke={a.coat} strokeWidth="13" strokeLinecap="round" />
          <circle cx="15" cy="-122" r="6" fill="#d9b48e" />
          <line x1="15" y1="-116" x2="15" y2="-178" stroke="#2e2a22" strokeWidth="3" />
          <path d="M 15 -116 q 0 8 -6 8" fill="none" stroke="#2e2a22" strokeWidth="3" />
          <path d="M -62 -172 Q 15 -238 92 -172 Q 73 -180 54 -172 Q 34 -180 15 -172 Q -4 -180 -23 -172 Q -42 -180 -62 -172 Z" fill={i % 2 ? '#2e2a22' : '#3b5f8a'} />
          <path d="M 15 -230 v -6" stroke="#2e2a22" strokeWidth="3" />
        </g>
      )}
    </g>
  );
}

export function Scene({ t }: { t: number }) {
  const w = workAt(t);
  const idle = idleAt(t);
  const night = isNight(t);
  const dark = darkAt(t);
  const rain = weatherAt(t) === 'rain';
  const done = doneOf(w, 'teslim');
  const stage = stageAt(w);
  const watchers = watchersAt(t);
  const speech = speechAt(t);
  const lit = dark > 0.25 && done > 0.3;
  // güneşin yönü ve gölge koyuluğu: binanın gölgesi buna göre döner ve uzar
  const p = dayPhase(t);
  const dayP = Math.min(1, p / 0.72);
  const sun = { dir: Math.max(-1, Math.min(1, (dayP - 0.5) * 2)), strength: night ? 0 : weatherAt(t) !== 'clear' ? 0.25 : 0.35 + 0.65 * Math.sin(dayP * Math.PI) };
  const mixSky = skyAt(p);

  return (
    <svg className={s.scene} viewBox="0 0 1200 640" preserveAspectRatio="xMidYMax slice" role="img" aria-label={`İnşaat: ${STAGES[stage].title}`}>
      <defs>
        <pattern id="ins-brick" width="20" height="10" patternUnits="userSpaceOnUse">
          <rect width="20" height="10" fill="#b5654a" />
          <path d="M0 0H20M0 5H20M5 0V5M15 5V10" stroke="#8d4a35" strokeWidth="1" />
        </pattern>
        <pattern id="ins-tile" width="16" height="9" patternUnits="userSpaceOnUse">
          <rect width="16" height="9" fill="#b2492f" />
          <path d="M0 8.5 Q4 4 8 8.5 Q12 4 16 8.5" stroke="#7d2f1d" fill="none" strokeWidth="1.2" />
        </pattern>
        {/* yumuşak gölge ve ince yüzey dokusu */}
        <filter id="ins-soft" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id="ins-fine" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="9" />
          <feColorMatrix values="0 0 0 0 0.2  0 0 0 0 0.16  0 0 0 0 0.12  0 0 0 0.22 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <linearGradient id="ins-side-shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.05" />
          <stop offset="1" stopColor="#000" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="ins-roof-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
        <linearGradient id="ins-glass-sky" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor={mixSky.top} />
          <stop offset="0.55" stopColor={mixSky.bottom} />
          <stop offset="0.56" stopColor="#5f7f92" />
          <stop offset="1" stopColor="#3f5868" />
        </linearGradient>
        <linearGradient id="ins-coat-shade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="0.5" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.3" />
        </linearGradient>
        {/* makinelerin gölgeli boyaları: üstten ışık, alta doğru koyulaşır */}
        <linearGradient id="ins-yellow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2c54a" />
          <stop offset="1" stopColor="#c99a1e" />
        </linearGradient>
        <linearGradient id="ins-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d8503e" />
          <stop offset="1" stopColor="#a2342a" />
        </linearGradient>
        <linearGradient id="ins-orange" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f08a3a" />
          <stop offset="1" stopColor="#c0661f" />
        </linearGradient>
        <linearGradient id="ins-white" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7f7f5" />
          <stop offset="1" stopColor="#c9c7c1" />
        </linearGradient>
        <linearGradient id="ins-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#bfe0ef" />
          <stop offset="1" stopColor="#5f8aa3" />
        </linearGradient>
        <linearGradient id="ins-shade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.16" />
        </linearGradient>
        <radialGradient id="ins-vignette" cx="0.5" cy="0.55" r="0.75">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </radialGradient>
        <radialGradient id="ins-flood">
          <stop offset="0" stopColor="#fff4be" stopOpacity="0.42" />
          <stop offset="1" stopColor="#fff4be" stopOpacity="0" />
        </radialGradient>
      </defs>

      <Sky t={t} snowCover={snowCoverAt(t)} />
      <Building w={w} sun={sun} />
      <Site w={w} working={!idle} night={night} />

      {/* izleyenler en önde, arkaları dönük; gece katmanı ve yağmur onların da üstüne düşer */}
      {Array.from({ length: watchers }, (_, i) => (
        <Watcher key={i} i={i} rain={rain} />
      ))}

      {/* günün ışık tonu, yağmurda soğuk gri */}
      {(() => {
        const tint = rain ? { color: '#5f6b78', opacity: 0.16 } : tintAt(dayPhase(t));
        return <rect width="1200" height="640" fill={tint.color} opacity={tint.opacity} pointerEvents="none" />;
      })()}

      {/* gece katmanı ve onun üstündeki ışıklar */}
      {dark > 0 && <rect width="1200" height="640" fill="#0b1030" opacity={dark} pointerEvents="none" />}
      {/* projektör: şantiyeye yumuşak bir ışık havuzu */}
      {night && done < 1 && <ellipse cx="560" cy={GROUND - 60} rx="320" ry="150" fill="url(#ins-flood)" />}
      {lit &&
        Array.from({ length: 6 }, (_, k) =>
          WINDOWS.map((dx, i) =>
            (k * 4 + i * 3 + Math.floor(t / 7)) % 5 < 3 ? <rect key={`${k}-${i}`} x={LEFT + dx + 2} y={GROUND - FLOOR_H * (k + 1) + 18} width="36" height="22" fill="#ffd98a" opacity="0.9" /> : null,
          ),
        )}
      {lit && <rect x={LEFT + 136} y={GROUND - 36} width="28" height="16" fill="#ffd98a" opacity="0.8" />}

      <Weather t={t} />

      {/* kenarlarda hafif kararma: göz ortadaki şantiyeye gider */}
      <rect width="1200" height="640" fill="url(#ins-vignette)" pointerEvents="none" />

      {/* konuşan amcanın balonu: başının üstünde */}
      {(() => {
        const x = AMCA_X[speech.who];
        const bw = 18 + speech.text.length * 5.3;
        const bx = Math.max(190, Math.min(1010 - bw, x - bw / 2));
        const by = HEAD_TOP - (rain ? 82 : 32);
        return (
          <g key={speech.id} className={s.bubble}>
            <rect x={bx} y={by} width={bw} height="22" rx="8" fill="#fbf8f0" stroke="#3a362f" strokeWidth="1.2" />
            <path d={`M ${x - 5} ${by + 21} l 5 7 l 5 -7`} fill="#fbf8f0" stroke="#3a362f" strokeWidth="1.2" />
            <rect x={x - 6} y={by + 19} width="12" height="3" fill="#fbf8f0" />
            <text x={bx + 9} y={by + 15} fontSize="10" fill="#221f1b">
              {speech.text}
            </text>
          </g>
        );
      })()}

    </svg>
  );
}
