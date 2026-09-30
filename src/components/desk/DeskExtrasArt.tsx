/* Drawings for the things the week leaves on the desk (see DeskExtras). */

const shadow = (cx: number, cy: number, rx: number, ry: number) => <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="rgba(40,24,10,0.3)" filter="url(#deskBlur)" />;

export const CakePlate = ({ stale }: { stale: boolean }) => (
  <svg viewBox="0 0 130 70" width="100%" height="100%" aria-hidden="true">
    {shadow(65, 56, 58, 8)}
    <ellipse cx={65} cy={42} rx={58} ry={18} fill="#f4f1ea" />
    <ellipse cx={65} cy={40} rx={44} ry={12} fill="#e9e4d9" />
    <path d="M40 38 q10 -6 22 -2 q-6 6 -22 2 z" fill={stale ? '#c9a98a' : '#f2d4c8'} />
    <circle cx={78} cy={40} r={2} fill="#6b3b2a" />
    <circle cx={86} cy={44} r={1.5} fill="#6b3b2a" />
    <circle cx={56} cy={46} r={1.5} fill="#e7b9a8" />
    <line x1={70} y1={30} x2={108} y2={46} stroke="#cfd2d6" strokeWidth={3} strokeLinecap="round" />
    <line x1={70} y1={30} x2={64} y2={27} stroke="#cfd2d6" strokeWidth={4} strokeLinecap="round" />
  </svg>
);

/** A closed umbrella leaning against the water cooler, a small puddle under its tip. */
export const Umbrella = () => (
  <svg viewBox="0 0 64 210" width="100%" height="100%" aria-hidden="true">
    <defs>
      <linearGradient id="umbCanopy" x1="0" x2="1">
        <stop offset="0" stopColor="#141925" />
        <stop offset="0.45" stopColor="#2a3246" />
        <stop offset="0.6" stopColor="#1d2332" />
        <stop offset="1" stopColor="#0f131c" />
      </linearGradient>
    </defs>
    <ellipse cx={20} cy={202} rx={22} ry={5} fill="rgba(120,150,190,0.3)" />
    <ellipse cx={20} cy={202} rx={12} ry={2.6} fill="rgba(200,220,245,0.25)" />
    <g transform="rotate(9 20 200)">
      {/* tip */}
      <line x1={20} y1={200} x2={20} y2={186} stroke="#9aa1ab" strokeWidth={2.4} strokeLinecap="round" />
      {/* furled canopy: fatter in the middle, pleats and the strap */}
      <path d="M20 188 C12 170 10 120 14 70 L26 70 C30 120 28 170 20 188 Z" fill="url(#umbCanopy)" />
      <path d="M17 76 C15 120 16 160 20 184" stroke="rgba(255,255,255,0.12)" strokeWidth={1.4} fill="none" />
      <path d="M23 76 C25 120 24 160 21 184" stroke="rgba(0,0,0,0.35)" strokeWidth={1.2} fill="none" />
      <rect x={13.5} y={112} width={13} height={5} rx={1.5} fill="#0b0e15" />
      <circle cx={24.5} cy={114.5} r={1.4} fill="#6b7280" />
      {/* shaft and J handle */}
      <line x1={20} y1={70} x2={20} y2={36} stroke="#b8bec7" strokeWidth={2.6} />
      <path d="M20 36 L20 20 Q20 6 32 6 Q44 6 44 18 L44 22" fill="none" stroke="#6b4a2e" strokeWidth={7} strokeLinecap="round" />
      <path d="M20 34 L20 22 Q20 10 30 9" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={2} strokeLinecap="round" />
      {/* drops running down */}
      <circle cx={16} cy={150} r={1.6} fill="rgba(180,205,240,0.8)" />
      <circle cx={23} cy={172} r={1.3} fill="rgba(180,205,240,0.8)" />
    </g>
  </svg>
);

/** A knitted wool scarf thrown over the partition: ribbed, folded, heavy with melted snow. */
export const Scarf = () => (
  <svg viewBox="0 0 160 130" width="100%" height="100%" aria-hidden="true">
    <defs>
      <pattern id="scarfRib" width="5" height="6" patternUnits="userSpaceOnUse">
        <rect width="5" height="6" fill="#8e2a26" />
        <rect width="2.2" height="6" fill="#a1342e" />
        <path d="M0 3 Q1.1 1.6 2.2 3" stroke="rgba(0,0,0,0.18)" strokeWidth={0.6} fill="none" />
      </pattern>
      <linearGradient id="scarfFold" x1="0" x2="1">
        <stop offset="0" stopColor="rgba(0,0,0,0.35)" />
        <stop offset="0.35" stopColor="rgba(0,0,0,0)" />
        <stop offset="0.7" stopColor="rgba(255,255,255,0.06)" />
        <stop offset="1" stopColor="rgba(0,0,0,0.3)" />
      </linearGradient>
      <linearGradient id="scarfWet" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="rgba(0,0,0,0)" />
        <stop offset="1" stopColor="rgba(20,0,0,0.28)" />
      </linearGradient>
    </defs>
    <ellipse cx={80} cy={124} rx={62} ry={4} fill="rgba(40,24,10,0.18)" filter="url(#deskBlur)" />
    {/* the part lying over the top edge of the partition */}
    <path d="M6 34 C30 22 60 20 82 24 C104 20 132 22 154 32 L152 46 C128 38 104 38 82 40 C60 36 32 38 8 48 Z" fill="url(#scarfRib)" />
    <path d="M6 34 C30 22 60 20 82 24 C104 20 132 22 154 32 L152 46 C128 38 104 38 82 40 C60 36 32 38 8 48 Z" fill="url(#scarfFold)" />
    <path d="M10 40 C34 32 60 30 82 33 C104 30 128 31 150 39" stroke="rgba(0,0,0,0.22)" strokeWidth={1.2} fill="none" />
    {/* left end: hangs long, twisted once */}
    <path d="M22 42 C20 64 26 88 30 116 L58 114 C54 88 50 66 50 40 Z" fill="url(#scarfRib)" />
    <path d="M22 42 C20 64 26 88 30 116 L58 114 C54 88 50 66 50 40 Z" fill="url(#scarfFold)" />
    <path d="M22 42 C20 64 26 88 30 116 L58 114 C54 88 50 66 50 40 Z" fill="url(#scarfWet)" />
    <path d="M24 70 C34 66 44 68 52 64" stroke="rgba(0,0,0,0.28)" strokeWidth={1.4} fill="none" />
    {/* right end: shorter, falls behind */}
    <path d="M112 40 C114 60 110 80 104 100 L128 104 C132 82 136 60 138 38 Z" fill="url(#scarfRib)" />
    <path d="M112 40 C114 60 110 80 104 100 L128 104 C132 82 136 60 138 38 Z" fill="url(#scarfFold)" />
    <path d="M112 40 C114 60 110 80 104 100 L128 104 C132 82 136 60 138 38 Z" fill="rgba(0,0,0,0.12)" />
    {/* fringes */}
    {Array.from({ length: 9 }, (_, i) => (
      <path key={`l${i}`} d={`M${31 + i * 3.2} 115 q${(i % 3) - 1} 6 ${(i % 2) * 1.5 - 0.5} 11`} stroke="#8a2824" strokeWidth={1.6} strokeLinecap="round" fill="none" />
    ))}
    {Array.from({ length: 8 }, (_, i) => (
      <path key={`r${i}`} d={`M${105 + i * 3} 102 q${(i % 3) - 1} 5 ${(i % 2) * 1.5 - 0.5} 9`} stroke="#7a2320" strokeWidth={1.5} strokeLinecap="round" fill="none" />
    ))}
    {/* a drip from the melted snow */}
    <circle cx={44} cy={127} r={1.4} fill="rgba(180,205,240,0.7)" />
  </svg>
);

export const Envelope = ({ paid }: { paid: boolean }) => (
  <svg viewBox="0 0 140 80" width="100%" height="100%" aria-hidden="true">
    {shadow(70, 70, 64, 7)}
    <path d="M12 12 L128 6 L134 66 L16 72 Z" fill={paid ? '#f7f3e8' : '#efe7d2'} />
    {paid ? (
      <>
        <text x={40} y={32} fontSize={10} fontWeight={700} fill="#2d3a55" fontFamily="Work Sans, sans-serif" transform="rotate(-3 70 40)">
          DEKONT
        </text>
        <text x={40} y={46} fontSize={8} fill="#6b6455" fontFamily="JetBrains Mono, monospace" transform="rotate(-3 70 40)">
          Elektrik 2.350 ₺
        </text>
        <text x={98} y={58} fontSize={16} fill="#3f8a55" transform="rotate(-3 70 40)">
          ✓
        </text>
      </>
    ) : (
      <>
        <path d="M12 12 L72 42 L128 6" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={1.5} />
        <rect x={34} y={44} width={78} height={16} fill="#b8322a" transform="rotate(-3 70 50)" />
        <text x={73} y={56} textAnchor="middle" fontSize={9} fontWeight={800} letterSpacing={1} fill="#fff" fontFamily="Work Sans, sans-serif" transform="rotate(-3 70 50)">
          SON İHTAR
        </text>
      </>
    )}
  </svg>
);

export const Note = ({ color, lines, rot }: { color: string; lines: string[]; rot: number }) => (
  <svg viewBox="0 0 100 90" width="100%" height="100%" aria-hidden="true">
    <g transform={`rotate(${rot} 50 45)`}>
      <rect x={10} y={10} width={80} height={70} fill="rgba(30,20,10,0.25)" filter="url(#deskSoft)" />
      <rect x={8} y={6} width={80} height={70} fill={color} />
      {lines.map((l, i) => (
        <text key={l} x={16} y={30 + i * 17} fontSize={14} fill="#2b2410" fontFamily="Fraunces, serif" fontStyle="italic">
          {l}
        </text>
      ))}
    </g>
  </svg>
);
