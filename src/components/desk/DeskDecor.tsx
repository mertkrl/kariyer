/*
 * The rest of the office: the water cooler (standing on the carpet by the desk), the air conditioner, a desk lamp, a big plant in the
 * corner, the fire extinguisher on the wall and the shared printer on a filing cabinet.
 */

const blur = 'url(#deskBlur)';

export function WaterCoolerArt() {
  return (
    <svg viewBox="0 0 140 316" width="100%" height="100%" aria-hidden="true">
      <ellipse cx={72} cy={306} rx={66} ry={9} fill="rgba(20,22,28,0.45)" filter={blur} />
      {/* the 19-litre bottle, upside down */}
      <defs>
        <linearGradient id="bottle" x1="0" x2="1">
          <stop offset="0" stopColor="rgba(90,150,210,0.55)" />
          <stop offset="0.35" stopColor="rgba(190,225,250,0.75)" />
          <stop offset="0.6" stopColor="rgba(120,180,230,0.6)" />
          <stop offset="1" stopColor="rgba(60,120,190,0.6)" />
        </linearGradient>
        <linearGradient id="coolerBody" x1="0" x2="1">
          <stop offset="0" stopColor="#c9ccd1" />
          <stop offset="0.4" stopColor="#f4f5f7" />
          <stop offset="1" stopColor="#b3b7be" />
        </linearGradient>
      </defs>
      <path d="M28 20 Q28 6 70 6 Q112 6 112 20 L114 96 Q114 112 96 116 L84 120 L84 132 L56 132 L56 120 L44 116 Q26 112 26 96 Z" fill="url(#bottle)" />
      <path d="M30 44 H110 M30 70 H110" stroke="rgba(255,255,255,0.35)" strokeWidth={3} />
      <path d="M40 16 Q42 60 40 100" stroke="rgba(255,255,255,0.6)" strokeWidth={5} strokeLinecap="round" fill="none" />
      <ellipse cx={70} cy={56} rx={34} ry={4} fill="rgba(255,255,255,0.25)" className="deskBubble" />
      {/* the dispenser */}
      <rect x={16} y={132} width={108} height={170} rx={8} fill="url(#coolerBody)" />
      <rect x={16} y={292} width={108} height={12} rx={3} fill="#8e929a" />
      <rect x={20} y={302} width={10} height={6} fill="#3b3e44" />
      <rect x={110} y={302} width={10} height={6} fill="#3b3e44" />
      <rect x={42} y={222} width={56} height={6} rx={2} fill="#8e929a" />
      <rect x={16} y={132} width={108} height={10} rx={4} fill="#dfe2e6" />
      <rect x={30} y={170} width={80} height={48} rx={4} fill="#2b2f36" />
      <circle cx={52} cy={186} r={7} fill="#2f6fd0" />
      <circle cx={88} cy={186} r={7} fill="#d0392b" />
    </svg>
  );
}

export function AirConArt() {
  return (
    <svg viewBox="0 0 380 80" width="100%" height="100%" aria-hidden="true">
      <rect x={6} y={10} width={372} height={66} rx={10} fill="rgba(40,30,20,0.2)" filter={blur} />
      <rect x={0} y={4} width={372} height={64} rx={10} fill="#f3f3f1" />
      <rect x={0} y={4} width={372} height={10} rx={6} fill="#ffffff" />
      <rect x={14} y={48} width={344} height={12} rx={4} fill="#d7d8d6" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <line key={i} x1={24 + i * 48} y1={51} x2={52 + i * 48} y2={57} stroke="#b8bab8" strokeWidth={2} />
      ))}
      <circle cx={340} cy={30} r={3} fill="#3fd67a" className="deskLedSlow" />
      <text x={24} y={34} fontSize={10} letterSpacing={2} fill="#9a9c9a" fontFamily="Work Sans, sans-serif">
        INVERTER
      </text>
    </svg>
  );
}

export function DeskLampArt({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 220 300" width="100%" height="100%" aria-hidden="true">
      <ellipse cx={70} cy={284} rx={60} ry={10} fill="rgba(40,24,10,0.4)" filter={blur} />
      <ellipse cx={70} cy={278} rx={52} ry={12} fill="#2a2c31" />
      <ellipse cx={70} cy={274} rx={50} ry={10} fill="#3a3d43" />
      <path d="M66 272 L50 150 L150 70" fill="none" stroke="#2f3237" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M66 272 L50 150 L150 70" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={50} cy={150} r={9} fill="#44484e" />
      <circle cx={150} cy={70} r={8} fill="#44484e" />
      {/* shade */}
      <path d="M140 60 L190 42 L214 110 L150 128 Z" fill="#2c2f35" />
      <path d="M150 128 L214 110" stroke={on ? '#fff3cf' : '#4a4d53'} strokeWidth={6} strokeLinecap="round" />
      <path d="M140 60 L190 42" stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
    </svg>
  );
}

export function PlantArt() {
  const leaves = [
    [120, 150, -40, 1.1],
    [150, 120, 10, 1],
    [90, 110, -70, 0.95],
    [170, 170, 40, 1.05],
    [70, 180, -110, 0.9],
    [130, 80, -15, 0.85],
    [185, 110, 55, 0.8],
    [60, 130, -95, 0.8],
  ];
  return (
    <svg viewBox="0 0 240 380" width="100%" height="100%" aria-hidden="true">
      <ellipse cx={122} cy={370} rx={80} ry={10} fill="rgba(20,22,28,0.45)" filter={blur} />
      {/* stems */}
      {leaves.map(([x, y], i) => (
        <path key={`s${i}`} d={`M120 290 Q${(120 + x) / 2} ${(290 + y) / 2 + 30} ${x} ${y}`} stroke="#3c5a2c" strokeWidth={4} fill="none" />
      ))}
      {/* split monstera leaves */}
      {leaves.map(([x, y, rot, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
          <path d="M0 0 C-40 -10 -52 -58 -18 -78 C0 -86 22 -82 34 -64 C54 -34 36 6 0 0 Z" fill={i % 2 ? '#2f6b3a' : '#3b7d45'} />
          <path d="M0 0 C4 -30 6 -56 4 -76" stroke="rgba(255,255,255,0.25)" strokeWidth={1.6} fill="none" />
          <path d="M-8 -30 l-26 -6 M-6 -50 l-24 -12 M10 -30 l26 -4 M10 -50 l22 -12" stroke="#e9e4d6" strokeWidth={4} strokeLinecap="round" opacity={0.85} />
        </g>
      ))}
      {/* tall matte pot */}
      <path d="M72 280 L172 280 L162 366 L82 366 Z" fill="#4a4d52" />
      <path d="M72 280 L172 280 L162 366 L82 366 Z" fill="url(#alu)" opacity={0.25} />
      <rect x={68} y={274} width={108} height={12} rx={3} fill="#5a5d63" />
      <ellipse cx={122} cy={276} rx={50} ry={5} fill="#3a2a1c" />
    </svg>
  );
}

export function ExtinguisherArt() {
  return (
    <svg viewBox="0 0 90 170" width="100%" height="100%" aria-hidden="true">
      <rect x={6} y={2} width={78} height={40} rx={3} fill="#c0392b" />
      <text x={45} y={18} textAnchor="middle" fontSize={8} fontWeight={800} fill="#fff" fontFamily="Work Sans, sans-serif">
        YANGIN
      </text>
      <text x={45} y={30} textAnchor="middle" fontSize={7} fontWeight={700} fill="#fff" fontFamily="Work Sans, sans-serif">
        SÖNDÜRME
      </text>
      <rect x={30} y={50} width={30} height={8} rx={2} fill="#2b2e33" />
      <rect x={26} y={60} width={38} height={100} rx={12} fill="#c62828" />
      <path d="M34 66 Q36 110 34 150" stroke="rgba(255,255,255,0.35)" strokeWidth={4} fill="none" strokeLinecap="round" />
      <path d="M60 58 q18 10 10 44" stroke="#1d1f22" strokeWidth={4} fill="none" />
      <rect x={30} y={100} width={30} height={22} fill="#f6f1e4" />
    </svg>
  );
}

export function PrinterCabinetArt() {
  return (
    <svg viewBox="0 0 280 230" width="100%" height="100%" aria-hidden="true">
      <ellipse cx={140} cy={222} rx={130} ry={8} fill="rgba(20,22,28,0.45)" filter={blur} />
      {/* filing cabinet */}
      <rect x={20} y={90} width={240} height={130} rx={3} fill="#8b8f96" />
      <rect x={28} y={98} width={224} height={54} rx={2} fill="#9a9ea5" />
      <rect x={28} y={158} width={224} height={54} rx={2} fill="#9a9ea5" />
      <rect x={120} y={118} width={40} height={7} rx={3} fill="#4a4d53" />
      <rect x={120} y={178} width={40} height={7} rx={3} fill="#4a4d53" />
      {/* printer on top */}
      <rect x={50} y={30} width={180} height={62} rx={8} fill="#e8e8e6" />
      <rect x={50} y={30} width={180} height={12} rx={6} fill="#f7f7f5" />
      <rect x={70} y={72} width={140} height={14} rx={3} fill="#c9cac7" />
      <rect x={82} y={10} width={116} height={28} fill="#fbfaf6" transform="skewX(-8)" />
      <rect x={196} y={46} width={24} height={12} rx={2} fill="#2b2f36" />
      <circle cx={202} cy={52} r={2} fill="#3fd67a" />
    </svg>
  );
}
