import type { ReactElement } from 'react';
import styles from './CommuteScene.module.css';

/*
 * A small animated scene of Istanbul work life at the top of "Bugünün İşlemleri",
 * one per workday: the office in Levent, the metrobüs, the M2 metro, and — on the day the AI
 * crashes — the server room. viewBox 300×110; everything loops with CSS.
 */

interface SceneInfo {
  caption: string;
  render: () => ReactElement;
}

function Office() {
  return (
    <>
      <rect width="300" height="110" fill="#e9e2d0" />
      {/* Window wall with the Levent skyline */}
      <rect x="10" y="8" width="280" height="52" rx="3" fill="#bcd3e0" />
      <g fill="#9fb4c2">
        <rect x="30" y="22" width="16" height="38" />
        <rect x="50" y="14" width="12" height="46" />
        <path d="M70 60 V24 L78 16 L86 24 V60 Z" />
        <rect x="96" y="30" width="20" height="30" />
        <rect x="190" y="18" width="14" height="42" />
        <path d="M212 60 V20 Q218 10 224 20 V60 Z" />
        <rect x="236" y="28" width="22" height="32" />
      </g>
      <g stroke="#f4efe3" strokeWidth="2">
        {[80, 150, 220].map((x) => (
          <line key={x} x1={x} y1="8" x2={x} y2="60" />
        ))}
      </g>
      {/* Ceiling lamps */}
      {[70, 150, 230].map((x) => (
        <g key={x}>
          <line x1={x} y1="0" x2={x} y2="6" stroke="#6b6455" />
          <rect x={x - 14} y="5" width="28" height="3" rx="1.5" fill="#fff4cf" />
        </g>
      ))}
      {/* Desks with monitors and people */}
      {[40, 120, 200].map((x, i) => (
        <g key={x}>
          <rect x={x - 4} y="80" width="72" height="5" rx="1" fill="#b89b6e" />
          <rect x={x + 4} y="85" width="3" height="25" fill="#8a7550" />
          <rect x={x + 58} y="85" width="3" height="25" fill="#8a7550" />
          <rect x={x + 18} y="60" width="30" height="19" rx="2" fill="#2d3a44" />
          <rect x={x + 20} y="62" width="26" height="15" rx="1" className={styles.screen} style={{ animationDelay: `${i * 0.7}s` }} />
          <rect x={x + 31} y="79" width="4" height="2" fill="#2d3a44" />
          {/* Colleague seen from behind */}
          <g className={styles.typist} style={{ animationDelay: `${i * 0.4}s` }}>
            <circle cx={x + 33} cy="86" r="6" fill={['#3f3a33', '#6b4a33', '#2a2622'][i]} />
            <path d={`M${x + 22} 110 Q${x + 22} 92 ${x + 33} 92 Q${x + 44} 92 ${x + 44} 110 Z`} fill={['#4c7fb0', '#b3766b', '#3f6b63'][i]} />
          </g>
        </g>
      ))}
      {/* Plant + coffee */}
      <path d="M280 110 L276 92 H292 L288 110 Z" fill="#b8643e" />
      <ellipse cx="280" cy="84" rx="4" ry="11" fill="#4a7a3a" transform="rotate(-20 280 90)" />
      <ellipse cx="290" cy="82" rx="4" ry="12" fill="#5c8c46" transform="rotate(18 290 90)" />
      <rect x="104" y="72" width="7" height="8" rx="1" fill="#fbf8f0" />
      <path d="M107 70 q-2 -4 0 -7" stroke="#ffffff" strokeWidth="1" fill="none" className={styles.steam} />
    </>
  );
}

function Metrobus() {
  return (
    <>
      <rect width="300" height="110" fill="#c9d8e2" />
      {/* Skyline + Bosphorus bridge */}
      <g fill="#a7bac6">
        <rect x="20" y="30" width="14" height="36" />
        <rect x="38" y="22" width="10" height="44" />
        <rect x="200" y="26" width="16" height="40" />
        <rect x="222" y="34" width="12" height="32" />
      </g>
      <g stroke="#8fa4b2" fill="none" strokeWidth="1.2">
        <path d="M90 58 Q120 36 150 30 Q180 36 210 58" />
        <line x1="150" y1="30" x2="150" y2="60" strokeWidth="3" />
        <line x1="80" y1="58" x2="220" y2="58" strokeWidth="2" />
      </g>
      {/* Road: opposite lanes + dedicated metrobüs lane */}
      <rect y="66" width="300" height="44" fill="#5d6166" />
      <rect y="84" width="300" height="3" fill="#e0c35a" />
      <rect y="88" width="300" height="22" fill="#6a4a44" opacity="0.35" />
      <g className={styles.roadDashes}>
        {Array.from({ length: 12 }).map((_, i) => (
          <rect key={i} x={i * 30} y="74" width="14" height="2" fill="#f4efe3" />
        ))}
      </g>
      {/* Oncoming cars */}
      <g className={styles.carsLeft}>
        <rect x="0" y="68" width="18" height="8" rx="3" fill="#e9e5dc" />
        <rect x="60" y="70" width="16" height="7" rx="3" fill="#c9a227" />
        <rect x="140" y="68" width="20" height="8" rx="3" fill="#8a3a2c" />
      </g>
      {/* The metrobüs: articulated, red, with its bellow joint */}
      <g className={styles.bus}>
        <rect x="0" y="86" width="56" height="18" rx="3" fill="#c63a2f" />
        <rect x="58" y="86" width="50" height="18" rx="3" fill="#c63a2f" />
        <rect x="55" y="88" width="4" height="14" fill="#3a3530" />
        {[4, 16, 28, 40, 62, 74, 86].map((x) => (
          <rect key={x} x={x} y="89" width="9" height="6" rx="1" fill="#cfe2ec" />
        ))}
        <rect x="100" y="89" width="6" height="7" rx="1" fill="#cfe2ec" />
        <rect x="0" y="98" width="108" height="2" fill="#f4efe3" />
        {[10, 44, 70, 96].map((x) => (
          <circle key={x} cx={x} cy="104" r="3.5" fill="#1f1d1a" />
        ))}
        <rect x="104" y="98" width="4" height="3" fill="#ffe8a0" />
      </g>
    </>
  );
}

function Metro() {
  return (
    <>
      <rect width="300" height="110" fill="#e4e1d8" />
      {/* Tiled wall */}
      <g stroke="#d2cdc0" strokeWidth="0.6">
        {Array.from({ length: 16 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="62" />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 12} x2="300" y2={i * 12} />
        ))}
      </g>
      <rect x="0" y="22" width="300" height="5" fill="#3f8a4a" />
      {/* Station sign */}
      <rect x="102" y="6" width="96" height="14" rx="2" fill="#1f2a36" />
      <circle cx="112" cy="13" r="5" fill="#3f8a4a" />
      <text x="112" y="16" textAnchor="middle" className={styles.signM}>
        M2
      </text>
      <text x="152" y="17" textAnchor="middle" className={styles.signText}>
        ŞİŞHANE
      </text>
      {/* Track + platform edge */}
      <rect y="62" width="300" height="48" fill="#3b3833" />
      <rect y="62" width="300" height="4" fill="#e0c35a" />
      {/* Train sliding in, dwelling, sliding out */}
      <g className={styles.train}>
        <rect x="0" y="30" width="240" height="30" rx="5" fill="#c9ced2" />
        <rect x="0" y="50" width="240" height="4" fill="#3f8a4a" />
        {Array.from({ length: 9 }).map((_, i) => (
          <rect key={i} x={10 + i * 26} y="35" width="18" height="11" rx="2" fill="#6f8796" />
        ))}
        {[60, 140, 220].map((x) => (
          <rect key={x} x={x} y="34" width="12" height="24" fill="#a9b0b5" stroke="#8d949a" strokeWidth="0.6" />
        ))}
        <rect x="232" y="36" width="8" height="10" rx="2" fill="#ffe8a0" />
      </g>
      {/* People waiting on the platform */}
      {[30, 58, 190, 262].map((x, i) => (
        <g key={x} className={styles.waiter} style={{ animationDelay: `${i * 0.8}s` }}>
          <circle cx={x} cy="76" r="5" fill="#3f3a33" />
          <path d={`M${x - 8} 110 Q${x - 8} 83 ${x} 83 Q${x + 8} 83 ${x + 8} 110 Z`} fill={['#7c6a8c', '#4c7fb0', '#b3766b', '#3f6b63'][i]} />
        </g>
      ))}
    </>
  );
}

function ServerRoom() {
  return (
    <>
      <rect width="300" height="110" fill="#15191d" />
      <rect y="96" width="300" height="14" fill="#1f252a" />
      {/* Racks */}
      {[20, 90, 160, 230].map((x, r) => (
        <g key={x}>
          <rect x={x} y="14" width="54" height="84" rx="2" fill="#23292f" stroke="#343c43" />
          {Array.from({ length: 8 }).map((_, i) => (
            <g key={i}>
              <rect x={x + 5} y={19 + i * 10} width="44" height="7" rx="1" fill="#2c343b" />
              <circle
                cx={x + 10}
                cy={22.5 + i * 10}
                r="1.4"
                className={(i + r) % 3 === 0 ? styles.ledRed : styles.ledAmber}
                style={{ animationDelay: `${((i * 7 + r * 3) % 10) / 10}s` }}
              />
              <rect x={x + 16} y={21.5 + i * 10} width="26" height="2" fill="#3a444c" />
            </g>
          ))}
        </g>
      ))}
      {/* Alarm beacon sweep */}
      <circle cx="150" cy="7" r="4" fill="#e0574a" className={styles.beacon} />
      <rect width="300" height="110" fill="#e0574a" className={styles.alarmWash} />
      {/* Crash monitor */}
      <g className={styles.glitch}>
        <rect x="118" y="44" width="64" height="30" rx="2" fill="#0b0d10" stroke="#e0574a" />
        <text x="150" y="58" textAnchor="middle" className={styles.crashText}>
          AI OFFLINE
        </text>
        <text x="150" y="68" textAnchor="middle" className={styles.crashSub}>
          ERR 503 · yeniden bağlan…
        </text>
      </g>
    </>
  );
}

const SCENES: SceneInfo[] = [
  { caption: '📍 Levent · açık ofis', render: Office },
  { caption: '🚍 Metrobüs · Zincirlikuyu', render: Metrobus },
  { caption: '🚇 M2 · Şişhane', render: Metro },
  { caption: '🖥 Sunucu odası · AI çevrimdışı', render: ServerRoom },
];

export function CommuteScene({ dayIndex, title, progress }: { dayIndex: number; title: string; progress: string }) {
  const scene = SCENES[dayIndex % SCENES.length];
  return (
    <div className={styles.banner}>
      <svg viewBox="0 0 300 110" preserveAspectRatio="xMidYMid slice" className={styles.svg} aria-hidden="true">
        {scene.render()}
      </svg>
      <div className={styles.shade} />
      <div className={styles.overlay}>
        <span className={styles.title}>{title}</span>
        <span className={`${styles.progress} mono`}>{progress}</span>
      </div>
      <span className={styles.caption}>{scene.caption}</span>
    </div>
  );
}
