/* Haftanın masada bıraktığı şeylerin çizimleri (bkz. DeskExtras). */
import { useId } from 'react';

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

/** Sebile dayanmış kapalı bir şemsiye, ucunun altında küçük bir su birikintisi. */
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
      {/* uç */}
      <line x1={20} y1={200} x2={20} y2={186} stroke="#9aa1ab" strokeWidth={2.4} strokeLinecap="round" />
      {/* toplanmış kumaş: ortası daha dolgun, pliler ve kayış */}
      <path d="M20 188 C12 170 10 120 14 70 L26 70 C30 120 28 170 20 188 Z" fill="url(#umbCanopy)" />
      <path d="M17 76 C15 120 16 160 20 184" stroke="rgba(255,255,255,0.12)" strokeWidth={1.4} fill="none" />
      <path d="M23 76 C25 120 24 160 21 184" stroke="rgba(0,0,0,0.35)" strokeWidth={1.2} fill="none" />
      <rect x={13.5} y={112} width={13} height={5} rx={1.5} fill="#0b0e15" />
      <circle cx={24.5} cy={114.5} r={1.4} fill="#6b7280" />
      {/* gövde ve J sap */}
      <line x1={20} y1={70} x2={20} y2={36} stroke="#b8bec7" strokeWidth={2.6} />
      <path d="M20 36 L20 20 Q20 6 32 6 Q44 6 44 18 L44 22" fill="none" stroke="#6b4a2e" strokeWidth={7} strokeLinecap="round" />
      <path d="M20 34 L20 22 Q20 10 30 9" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={2} strokeLinecap="round" />
      {/* aşağı süzülen damlalar */}
      <circle cx={16} cy={150} r={1.6} fill="rgba(180,205,240,0.8)" />
      <circle cx={23} cy={172} r={1.3} fill="rgba(180,205,240,0.8)" />
    </g>
  </svg>
);

/** Açık kutusunda Perşembe'nin pizzası: henüz yemediğin dilimler. */
export const PizzaBox = ({ left }: { left: number }) => {
  const id = useId().replace(/:/g, '');
  // merkezin çevresinde altı dilim; ilk üçü ekibin, çoktan gitti
  const slices = Array.from({ length: 6 }, (_, i) => i).filter((i) => i >= 6 - left);
  const CX = 95;
  const CY = 72;
  const RX = 64;
  const RY = 18.5;
  const pt = (a: number, f: number) => [CX + Math.cos(a) * RX * f, CY + Math.sin(a) * RY * f] as const;
  const wedge = (a0: number, a1: number, f: number) => {
    const [x0, y0] = pt(a0, f);
    const [x1, y1] = pt(a1, f);
    return `M${CX} ${CY} L${x0} ${y0} A${RX * f} ${RY * f} 0 0 1 ${x1} ${y1} Z`;
  };
  // malzemeler, pizza çizimler arasında değişmesin diye dilim başına sabit bir desenle bir kez yerleştirilir
  const toppings = (i: number) => {
    const mid = ((i + 0.5) / 6) * Math.PI * 2;
    return {
      pepperoni: [
        [mid - 0.18, 0.42],
        [mid + 0.2, 0.7],
        [mid - 0.12, 0.84],
      ],
      olives: [
        [mid + 0.25, 0.4],
        [mid - 0.28, 0.66],
      ],
      herbs: Array.from({ length: 7 }, (_, k) => [mid - 0.38 + ((k * 37) % 76) / 100, 0.25 + ((k * 53) % 60) / 100]),
    };
  };
  return (
    <svg viewBox="0 0 190 110" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}lid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e4cfa6" />
          <stop offset="1" stopColor="#cdb385" />
        </linearGradient>
        <linearGradient id={`${id}box`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ead9b4" />
          <stop offset="1" stopColor="#d6bf93" />
        </linearGradient>
        <radialGradient id={`${id}crust`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.82" stopColor="#d58a35" />
          <stop offset="0.93" stopColor="#e8a957" />
          <stop offset="1" stopColor="#a8601f" />
        </radialGradient>
        <radialGradient id={`${id}cheese`} cx="0.45" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#fbe39a" />
          <stop offset="0.6" stopColor="#f5cc63" />
          <stop offset="1" stopColor="#e9ad45" />
        </radialGradient>
        <radialGradient id={`${id}pep`} cx="0.4" cy="0.35" r="0.65">
          <stop offset="0" stopColor="#d4473a" />
          <stop offset="0.75" stopColor="#a8281f" />
          <stop offset="1" stopColor="#6e140f" />
        </radialGradient>
      </defs>
      {shadow(95, 96, 88, 10)}
      {/* kapak, arkada açık duruyor: karton, dükkânın baskısı, bir yağ lekesi */}
      <path d="M22 44 L40 4 L150 4 L168 44 Z" fill={`url(#${id}lid)`} stroke="#ad8f60" strokeWidth={1.4} />
      <path d="M40 4 L150 4" stroke="#f3e6c8" strokeWidth={1} />
      <circle cx={95} cy={22} r={13} fill="none" stroke="#a33a2a" strokeWidth={1.4} opacity={0.75} />
      <text x={95} y={25.5} textAnchor="middle" fontSize={8.5} fontWeight={800} fill="#a33a2a" fontFamily="Georgia, serif" opacity={0.85}>
        PİZZA
      </text>
      <ellipse cx={130} cy={34} rx={9} ry={4} fill="rgba(160,110,40,0.18)" />
      {/* kutu: oluklu kenar, iç taban */}
      <path d="M10 48 L180 48 L172 96 L18 96 Z" fill={`url(#${id}box)`} stroke="#ad8f60" strokeWidth={1.4} />
      <path d="M10 48 L180 48" stroke="#f5ead0" strokeWidth={1.2} />
      {Array.from({ length: 34 }, (_, k) => (
        <line key={k} x1={13 + k * 5} y1={49.5} x2={13 + k * 5} y2={52} stroke="rgba(150,118,72,0.45)" strokeWidth={0.8} />
      ))}
      <ellipse cx={CX} cy={CY} rx={RX + 4} ry={RY + 2.5} fill="#cbb07f" />
      {/* yenen dilimlerin yeri: bir yağ halkası ve kırıntılar */}
      <ellipse cx={CX} cy={CY} rx={RX - 6} ry={RY - 2} fill="rgba(170,110,40,0.16)" />
      {[
        [70, 66],
        [78, 74],
        [62, 72],
        [86, 64],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={0.9} fill="#b97a33" />
      ))}
      {slices.map((i) => {
        const a0 = (i / 6) * Math.PI * 2 + 0.012;
        const a1 = ((i + 1) / 6) * Math.PI * 2 - 0.012;
        const t = toppings(i);
        return (
          <g key={i}>
            {/* kenar, sonra bir sos halkası, sonra peynir */}
            <path d={wedge(a0, a1, 1)} fill={`url(#${id}crust)`} />
            <path d={wedge(a0, a1, 0.9)} fill="#c2412b" />
            <path d={wedge(a0, a1, 0.86)} fill={`url(#${id}cheese)`} />
            {/* kenardaki yanık noktalar */}
            {[0.2, 0.55, 0.8].map((f) => {
              const [x, y] = pt(a0 + (a1 - a0) * f, 0.96);
              return <ellipse key={f} cx={x} cy={y} rx={1.6} ry={0.7} fill="rgba(90,45,15,0.55)" />;
            })}
            {/* erimiş peynir kabarcıkları */}
            {[0.3, 0.6].map((f) => {
              const [x, y] = pt(a0 + (a1 - a0) * f, 0.55);
              return <ellipse key={f} cx={x} cy={y} rx={2.2} ry={0.9} fill="rgba(255,248,215,0.6)" />;
            })}
            {t.pepperoni.map(([a, f]) => {
              const [x, y] = pt(a, f);
              return (
                <g key={`p${a}`}>
                  <ellipse cx={x} cy={y} rx={4.6} ry={1.9} fill={`url(#${id}pep)`} />
                  <ellipse cx={x - 1.2} cy={y - 0.5} rx={1.4} ry={0.45} fill="rgba(255,190,150,0.55)" />
                </g>
              );
            })}
            {t.olives.map(([a, f]) => {
              const [x, y] = pt(a, f);
              return <ellipse key={`o${a}`} cx={x} cy={y} rx={1.9} ry={0.85} fill="none" stroke="#2b2620" strokeWidth={1.1} />;
            })}
            {t.herbs.map(([a, f], k) => {
              const [x, y] = pt(a, f);
              return <rect key={k} x={x} y={y} width={1.1} height={0.6} fill="#4f6b2f" transform={`rotate(${k * 40} ${x} ${y})`} />;
            })}
            {/* kesik */}
            <path d={`M${CX} ${CY} L${pt(a0 - 0.012, 1)[0]} ${pt(a0 - 0.012, 1)[1]}`} stroke="rgba(120,70,25,0.5)" strokeWidth={0.7} />
          </g>
        );
      })}
    </svg>
  );
};

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
