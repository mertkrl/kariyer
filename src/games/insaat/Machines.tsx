import { INK } from './ink';

/*
 * Şantiyenin iş makineleri, 2B yan görünüş; çevreleri mürekkep, boyaları maketteki guaj tonlar. Her biri kendi yerel düzleminde çizilir: (0,0) yere
 * değdiği nokta, araçların önü sağa bakar. Renkler Scene'deki gölgeli dolgulardan gelir
 * (#ins-yellow, #ins-red, #ins-white, #ins-glass). Hareketli parçalar (kepçe kolu, tambur
 * çizgileri, sepet) çağıranın verdiği sınıfla canlanır.
 */

/** Aracın altına düşen yumuşak temas gölgesi. */
function Contact({ cx, w }: { cx: number; w: number }) {
  return <ellipse cx={cx} cy="1" rx={w / 2} ry="5" fill="#2f2c4a" opacity="0.34" filter="url(#ins-soft)" />;
}

/** Lastik, jant ve göbek: araçların hepsinde aynı. */
export function Wheel({ x, r = 8, y = -r }: { x: number; r?: number; y?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#2a2725" stroke={INK} strokeWidth="1.4" />
      <circle cx={x} cy={y} r={r * 0.55} fill="#8f8c84" />
      <circle cx={x} cy={y} r={r * 0.22} fill="#cfcbc0" />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={x + Math.cos((i * 2 * Math.PI) / 5) * r * 0.38} cy={y + Math.sin((i * 2 * Math.PI) / 5) * r * 0.38} r="0.9" fill="#5d5650" />
      ))}
    </g>
  );
}

/** Kamyon kabini: önü sağda; cam, çerçeve, ayna, far, tampon. */
function Cab({ x, w = 30, h = 28, fill }: { x: number; w?: number; h?: number; fill: string }) {
  return (
    <g>
      <path d={`M ${x} -12 V ${-h} H ${x + w - 8} L ${x + w} ${-h + 10} V -12 Z`} fill={fill} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d={`M ${x + 5} ${-h + 4} H ${x + w - 9} L ${x + w - 3} ${-h + 12} H ${x + 5} Z`} fill="url(#ins-glass)" stroke={INK} strokeWidth="1" />
      <line x1={x + w - 14} y1={-h + 5} x2={x + w - 18} y2={-h + 11} stroke="rgba(255,255,255,.6)" strokeWidth="1.5" />
      <rect x={x + w - 2} y={-h + 6} width="3" height="7" fill="#2e2a22" />
      <rect x={x + w - 4} y="-18" width="4" height="4" fill="#fff6c8" />
      <rect x={x + 2} y="-14" width={w} height="3" fill="#5d5650" />
      <line x1={x + 4} y1={-h + 16} x2={x + 10} y2={-h + 16} stroke="rgba(0,0,0,.4)" />
    </g>
  );
}

/** Paletli ekskavatör: palet, gövde, karşı ağırlık, kabin; bom, arm ve kova hidrolik pistonlu. */
export function Excavator({ armClass }: { armClass?: string }) {
  return (
    <g>
      <Contact cx={-10} w={116} />
      {/* palet */}
      <rect x="-58" y="-16" width="96" height="16" rx="8" fill="#3b3a38" stroke={INK} strokeWidth="1.8" />
      <rect x="-56" y="-14" width="92" height="12" rx="6" fill="none" stroke="#5d5650" strokeWidth="2" strokeDasharray="3 3" />
      {[-48, -34, -20, -6, 8, 22, 30].map((x) => (
        <circle key={x} cx={x} cy="-8" r="3.5" fill="#6e6a62" />
      ))}
      {/* döner gövde */}
      <path d="M -62 -18 V -36 Q -62 -42 -54 -42 H 26 V -18 Z" fill="url(#ins-yellow)" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="-66" y="-38" width="14" height="20" rx="4" fill="#8f8c84" stroke={INK} strokeWidth="1.2" />
      <rect x="-44" y="-48" width="4" height="8" fill="#3a362f" />
      {/* kabin */}
      <path d="M -14 -42 V -74 H 14 L 22 -60 V -42 Z" fill="url(#ins-yellow)" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M -9 -70 H 11 L 17 -60 V -46 H -9 Z" fill="url(#ins-glass)" stroke={INK} />
      <line x1="6" y1="-68" x2="0" y2="-52" stroke="rgba(255,255,255,.55)" strokeWidth="2" />
      <text x="-38" y="-26" fontSize="7" fontWeight="800" fill="#6b5a2a" fontFamily="monospace">
        KZ-220
      </text>
      {/* bom, arm, kova */}
      <g className={armClass}>
        <path d="M 18 -36 Q 60 -96 92 -80" fill="none" stroke={INK} strokeWidth="14" strokeLinecap="round" />
        <path d="M 92 -80 L 124 -24" stroke={INK} strokeWidth="11" strokeLinecap="round" />
        <path d="M 18 -36 Q 60 -96 92 -80" fill="none" stroke="#e2a92a" strokeWidth="10" strokeLinecap="round" />
        <path d="M 92 -80 L 124 -24" stroke="#e2a92a" strokeWidth="7" strokeLinecap="round" />
        {/* pistonlar */}
        <line x1="20" y1="-28" x2="56" y2="-74" stroke="#5d5650" strokeWidth="3" />
        <line x1="40" y1="-52" x2="56" y2="-74" stroke="#cfccc5" strokeWidth="2" />
        {[
          [18, -36],
          [92, -80],
          [124, -24],
        ].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="3" fill="#5b5853" stroke={INK} strokeWidth="1" />
        ))}
        <line x1="78" y1="-90" x2="112" y2="-50" stroke="#5d5650" strokeWidth="2.5" />
        <path d="M 116 -32 L 140 -26 L 136 -6 L 116 -8 Z" fill="#6b5a2a" stroke={INK} />
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M ${120 + i * 6} -7 l 2 5 l 2 -5`} fill="#cfcbc0" />
        ))}
      </g>
    </g>
  );
}

/** Damperli kamyon: kasa nervürlü ve toprak dolu, arka teker çift. */
export function DumpTruck() {
  return (
    <g>
      <Contact cx={54} w={124} />
      <rect x="-4" y="-16" width="112" height="6" fill="#3a362f" />
      <path d="M 0 -42 Q 34 -54 70 -44 L 76 -40 H 0 Z" fill="#8a6440" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M 0 -40 H 76 L 72 -16 H 4 Z" fill="url(#ins-red)" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      {[16, 32, 48, 62].map((x) => (
        <line key={x} x1={x} y1="-39" x2={x - 1} y2="-17" stroke="rgba(0,0,0,.2)" strokeWidth="2" />
      ))}
      <rect x="-2" y="-14" width="6" height="10" fill="#2e2a22" />
      <Cab x={78} w={32} h={34} fill="url(#ins-red)" />
      <Wheel x={14} />
      <Wheel x={32} />
      <Wheel x={96} />
    </g>
  );
}

/** Beton pompası kamyonu: destek ayakları açık; kolun dibi (60, -34) noktasıdır. */
export function PumpTruck() {
  return (
    <g>
      <Contact cx={70} w={170} />
      {/* destek ayakları */}
      {[6, 104].map((x) => (
        <g key={x}>
          <line x1={x} y1="-20" x2={x + (x < 50 ? -14 : 14)} y2="2" stroke="#5d5650" strokeWidth="4" />
          <rect x={x + (x < 50 ? -22 : 6)} y="0" width="16" height="4" fill="#3a362f" />
        </g>
      ))}
      <rect x="-2" y="-16" width="146" height="6" fill="#3a362f" />
      {/* arkada beton haznesi: mikser buraya boşaltır */}
      <path d="M -10 -40 H 10 L 6 -24 H -6 Z" fill="#8f8c84" stroke="#5d5650" />
      <rect x="0" y="-34" width="108" height="18" rx="2" fill="url(#ins-white)" stroke={INK} strokeWidth="1.8" />
      <rect x="6" y="-30" width="40" height="10" fill="#d9d6ce" stroke={INK} />
      <circle cx="60" cy="-36" r="9" fill="#5d5650" />
      {/* araç sahnede aynalanır: yazı kendi içinde geri çevrilir ki düz okunsun */}
      <text x="-80" y="-21" transform="scale(-1 1)" textAnchor="middle" fontSize="8" fontWeight="800" fill="#3b6894" fontFamily="monospace">
        POMPA
      </text>
      <Cab x={110} w={32} h={34} fill="#3b6894" />
      {[18, 40, 100, 126].map((x) => (
        <Wheel key={x} x={x} />
      ))}
    </g>
  );
}

/** Beton mikseri: tamburda dönen sarmal çizgiler, arkada oluk. */
export function MixerTruck({ drumClass }: { drumClass?: string }) {
  return (
    <g>
      <Contact cx={64} w={146} />
      <rect x="-4" y="-16" width="132" height="7" fill="#3a362f" />
      <defs>
        <clipPath id="ins-drumclip">
          <ellipse cx="62" cy="-38" rx="48" ry="23" transform="rotate(-8 62 -38)" />
        </clipPath>
      </defs>
      <ellipse cx="62" cy="-38" rx="48" ry="23" transform="rotate(-8 62 -38)" fill="url(#ins-white)" />
      <g clipPath="url(#ins-drumclip)">
        <g className={drumClass}>
          {[-60, -30, 0, 30, 60, 90].map((dx) => (
            <path key={dx} d={`M ${40 + dx} -70 L ${70 + dx} -6`} stroke="#c43c2c" strokeWidth="6" opacity="0.85" />
          ))}
        </g>
      </g>
      <ellipse cx="62" cy="-38" rx="48" ry="23" transform="rotate(-8 62 -38)" fill="none" stroke={INK} strokeWidth="1.8" />
      <path d="M 12 -30 L -6 -18 L -2 -14 L 16 -24 Z" fill="#8f8c84" stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
      <Cab x={100} w={30} h={34} fill="url(#ins-red)" />
      <Wheel x={22} />
      <Wheel x={42} />
      <Wheel x={112} />
    </g>
  );
}

/** Tuğla kamyonu: kasada paletler, arkada katlanmış küçük vinç. */
export function BrickTruck() {
  return (
    <g>
      <Contact cx={70} w={150} />
      <rect x="-2" y="-22" width="112" height="8" fill="#5d5650" />
      <rect x="-2" y="-16" width="112" height="4" fill="#3a362f" />
      {[6, 52].map((x) => (
        <g key={x}>
          <rect x={x} y="-42" width="40" height="18" fill="url(#ins-brick)" stroke={INK} />
          <rect x={x} y="-24" width="40" height="2" fill="#a07a4a" />
        </g>
      ))}
      <path d="M 96 -22 V -46 L 74 -52" fill="none" stroke={INK} strokeWidth="6.4" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M 96 -22 V -46 L 74 -52" fill="none" stroke="#e2a92a" strokeWidth="3.6" strokeLinejoin="round" strokeLinecap="round" />
      <Cab x={110} w={30} h={32} fill="#3f6b63" />
      <Wheel x={18} />
      <Wheel x={80} />
      <Wheel x={124} />
    </g>
  );
}

/**
 * Sepetli platform aracı: teleskopik kol dipten (22, -36) sepete uzanır. Sepetin yeri çağırandan
 * gelir (yerel düzlemde tipX, tipY); kol ve sepet hep birbirine bağlı kalır.
 */
export function LiftTruck({ tipX, tipY }: { tipX: number; tipY: number }) {
  const bx = 22;
  const by = -36;
  const mx = bx + (tipX + 13 - bx) * 0.5;
  const my = by + (tipY + 16 - by) * 0.5;
  return (
    <g>
      <Contact cx={48} w={120} />
      {[4, 92].map((x) => (
        <g key={x}>
          <line x1={x} y1="-18" x2={x + (x < 50 ? -10 : 10)} y2="2" stroke="#5d5650" strokeWidth="3" />
          <rect x={x + (x < 50 ? -16 : 4)} y="0" width="12" height="3" fill="#3a362f" />
        </g>
      ))}
      <rect x="-2" y="-16" width="100" height="6" fill="#3a362f" />
      <rect x="0" y="-30" width="66" height="14" fill="url(#ins-orange)" stroke={INK} strokeWidth="1.8" />
      <rect x="12" y="-40" width="20" height="10" rx="2" fill="#5d5650" />
      <Cab x={68} w={28} h={30} fill="url(#ins-orange)" />
      <Wheel x={16} />
      <Wheel x={40} />
      <Wheel x={82} />
      {/* teleskopik kol: kalın dış boru, ince iç boru, aradaki bilezik */}
      <line x1={bx} y1={by} x2={mx} y2={my} stroke={INK} strokeWidth="12" strokeLinecap="round" />
      <line x1={mx} y1={my} x2={tipX + 13} y2={tipY + 16} stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <line x1={bx} y1={by} x2={mx} y2={my} stroke="#d9a21e" strokeWidth="8.4" strokeLinecap="round" />
      <line x1={mx} y1={my} x2={tipX + 13} y2={tipY + 16} stroke="#ecb83a" strokeWidth="5.4" strokeLinecap="round" />
      <circle cx={mx} cy={my} r="5" fill="#8a6c14" />
      <circle cx={bx} cy={by} r="6" fill="#5d5650" />
      {/* sepet: korkuluklu, kolun ucuna mafsallı */}
      <rect x={tipX} y={tipY + 14} width="26" height="5" fill="#d9a21e" stroke={INK} strokeWidth="1.2" />
      <rect x={tipX} y={tipY} width="26" height="14" fill="rgba(242,194,48,.2)" stroke={INK} strokeWidth="2.6" />
      <rect x={tipX} y={tipY} width="26" height="14" fill="none" stroke="#ecb83a" strokeWidth="1.2" />
      <line x1={tipX} y1={tipY + 6} x2={tipX + 26} y2={tipY + 6} stroke="#f2c230" strokeWidth="1.5" />
    </g>
  );
}
