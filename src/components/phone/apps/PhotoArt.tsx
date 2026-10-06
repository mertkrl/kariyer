import { useId } from 'react';
import type { ArtKind } from './artKinds';

/*
 * Kariyergram gönderileri için çizilmiş "fotoğraflar": İstanbul iş hayatından küçük düz vektör
 * sahneler, keşfet ızgarasında döşensin ve bir gönderiyi doldursun diye kare 300×300 çerçevede.
 */


export function PhotoArt({ kind, className }: { kind: ArtKind; className?: string }) {
  const id = useId().replace(/:/g, '');
  const g = (name: string) => `${name}-${id}`;
  return (
    <svg viewBox="0 0 300 300" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden>
      {kind === 'bosphorus' && (
        <>
          <defs>
            <linearGradient id={g('sky')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2d2a5a" />
              <stop offset="0.45" stopColor="#c8577a" />
              <stop offset="0.8" stopColor="#f6a45b" />
            </linearGradient>
            <linearGradient id={g('sea')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#e58a63" />
              <stop offset="1" stopColor="#3a3163" />
            </linearGradient>
          </defs>
          <rect width="300" height="300" fill={`url(#${g('sky')})`} />
          <circle cx="210" cy="170" r="30" fill="#ffd79a" opacity="0.95" />
          <path d="M0 180 Q60 160 120 176 T240 170 T300 176 V210 H0Z" fill="#5a3d6b" opacity="0.75" />
          <rect y="200" width="300" height="100" fill={`url(#${g('sea')})`} />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={188 + (i % 2) * 8} y={212 + i * 14} width={44 - i * 6} height="2.5" rx="1.2" fill="#ffd79a" opacity={0.7 - i * 0.1} />
          ))}
          {/* Köprü */}
          <g stroke="#1d1830" fill="none">
            <path d="M-10 196 L310 190" strokeWidth="5" />
            <path d="M70 196 V120 M230 192 V116" strokeWidth="6" />
            <path d="M-10 170 Q30 196 70 122 Q150 196 230 118 Q270 190 310 160" strokeWidth="2" />
            {Array.from({ length: 22 }).map((_, i) => {
              const x = 8 + i * 14;
              return <path key={i} d={`M${x} 194 V${x < 70 ? 180 - x * 0.5 : x < 230 ? 150 + Math.abs(150 - x) * -0.35 + 35 : 175 - (x - 230) * 0.3}`} strokeWidth="0.8" />;
            })}
          </g>
          {/* Cami silüeti */}
          <g fill="#1d1830">
            <path d="M16 200 V186 Q34 160 52 186 V200Z" />
            <rect x="10" y="150" width="3" height="50" />
            <rect x="56" y="154" width="3" height="46" />
            <path d="M9 150 L11.5 140 L14 150Z M55 154 L57.5 144 L60 154Z" />
          </g>
          <path d="M150 90 q6 -6 12 0 q6 -6 12 0" stroke="#1d1830" strokeWidth="2" fill="none" />
          <path d="M110 60 q4 -4 8 0 q4 -4 8 0" stroke="#1d1830" strokeWidth="1.6" fill="none" />
        </>
      )}

      {kind === 'tea' && (
        <>
          <defs>
            <linearGradient id={g('tea')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d9531e" />
              <stop offset="1" stopColor="#7a1f0c" />
            </linearGradient>
            <radialGradient id={g('light')} cx="0.3" cy="0.2" r="0.9">
              <stop offset="0" stopColor="#f2d4a4" />
              <stop offset="1" stopColor="#a86b3c" />
            </radialGradient>
          </defs>
          <rect width="300" height="300" fill={`url(#${g('light')})`} />
          {Array.from({ length: 6 }).map((_, i) => (
            <path key={i} d={`M0 ${40 + i * 52} Q150 ${30 + i * 52} 300 ${46 + i * 52}`} stroke="#8a5530" strokeWidth="1.2" fill="none" opacity="0.35" />
          ))}
          {/* Simit */}
          <g transform="translate(78 196)">
            <ellipse rx="62" ry="40" fill="#b8692d" />
            <ellipse rx="58" ry="36" fill="#cf8440" />
            <ellipse rx="22" ry="12" fill="#a86b3c" />
            {Array.from({ length: 40 }).map((_, i) => {
              const a = (i / 40) * Math.PI * 2;
              const r = 32 + (i % 3) * 8;
              return <ellipse key={i} cx={Math.cos(a) * r} cy={Math.sin(a) * r * 0.62} rx="2" ry="1.1" fill="#f3dfb0" transform={`rotate(${i * 37} ${Math.cos(a) * r} ${Math.sin(a) * r * 0.62})`} />;
            })}
          </g>
          {/* Tabak + ince belli bardak */}
          <g transform="translate(200 230)">
            <ellipse rx="60" ry="16" fill="#e8e3d8" />
            <ellipse rx="44" ry="10" fill="#cfc8b8" />
            <ellipse cx="0" cy="-2" rx="22" ry="5" fill="#9a2f12" opacity="0.4" />
            <path d="M-22 -4 C-26 -40 -14 -60 -24 -96 L24 -96 C14 -60 26 -40 22 -4 Z" fill={`url(#${g('tea')})`} />
            <path d="M-22 -4 C-26 -40 -14 -60 -24 -96 L24 -96 C14 -60 26 -40 22 -4 Z" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="2" />
            <path d="M-24 -96 L24 -96 C23 -100 -23 -100 -24 -96Z" fill="#f4e9d6" opacity="0.7" />
            <path d="M-14 -20 C-16 -44 -8 -60 -15 -86" stroke="#fff" strokeOpacity="0.45" strokeWidth="3" fill="none" strokeLinecap="round" />
            <rect x="30" y="-8" width="30" height="3" rx="1.5" fill="#b9b2a2" transform="rotate(-14)" />
          </g>
          <g stroke="#fff" strokeOpacity="0.55" strokeWidth="3" fill="none" strokeLinecap="round">
            <path d="M192 118 q-10 -14 0 -28 q10 -14 0 -28" />
            <path d="M210 112 q-8 -12 0 -24 q8 -12 0 -24" />
          </g>
        </>
      )}

      {kind === 'metrobus' && (
        <>
          <defs>
            <linearGradient id={g('eve')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1b2a48" />
              <stop offset="1" stopColor="#e07a4f" />
            </linearGradient>
          </defs>
          <rect width="300" height="300" fill={`url(#${g('eve')})`} />
          {[20, 60, 96, 150, 196, 240, 270].map((x, i) => (
            <rect key={x} x={x} y={80 + (i % 3) * 20} width={30 + (i % 2) * 14} height={200} fill="#15203a" opacity="0.8" />
          ))}
          {Array.from({ length: 30 }).map((_, i) => (
            <rect key={i} x={24 + ((i * 37) % 270)} y={96 + ((i * 23) % 90)} width="4" height="5" fill="#ffd27a" opacity="0.7" />
          ))}
          <rect y="224" width="300" height="76" fill="#2a2a33" />
          <rect y="258" width="300" height="3" fill="#f2f2f2" opacity="0.6" />
          {/* Körüklü otobüs */}
          <g transform="translate(30 160)">
            <rect width="118" height="74" rx="10" fill="#e8e6e1" />
            <rect x="122" width="118" height="74" rx="10" fill="#e8e6e1" />
            <rect x="114" y="8" width="16" height="60" fill="#4a4a52" />
            <rect y="50" width="240" height="10" fill="#d0342c" />
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <g key={i}>
                <rect x={8 + i * 29 + (i > 3 ? 8 : 0)} y="10" width="24" height="32" rx="3" fill="#2d3b55" />
                <circle cx={20 + i * 29 + (i > 3 ? 8 : 0)} cy="30" r="6" fill="#1a2233" />
                <rect x={14 + i * 29 + (i > 3 ? 8 : 0)} y="35" width="12" height="7" fill="#1a2233" />
              </g>
            ))}
            <rect x="222" y="12" width="14" height="10" rx="2" fill="#ffc34a" />
            <text x="10" y="-6" fill="#fff" fontSize="14" fontWeight="800" fontFamily="sans-serif">34 · Söğütlüçeşme</text>
            {[26, 94, 150, 214].map((x) => (
              <circle key={x} cx={x} cy="74" r="11" fill="#141418" />
            ))}
          </g>
          <circle cx="252" cy="44" r="18" fill="#ffe3b0" opacity="0.8" />
        </>
      )}

      {kind === 'desk' && (
        <>
          <rect width="300" height="300" fill="#e9e3d6" />
          <rect y="200" width="300" height="100" fill="#b98a5a" />
          <rect y="200" width="300" height="6" fill="#9c6f44" />
          <rect x="220" y="30" width="60" height="80" rx="4" fill="#d6ecf5" stroke="#fff" strokeWidth="5" />
          <path d="M225 100 L240 70 L255 90 L275 60 V105 H225Z" fill="#9cc2cf" />
          {/* Dizüstü bilgisayar */}
          <g transform="translate(60 92)">
            <rect width="150" height="100" rx="8" fill="#2b2d33" />
            <rect x="8" y="8" width="134" height="84" rx="3" fill="#f7f5ef" />
            <rect x="16" y="16" width="60" height="6" rx="3" fill="#1d8a6c" />
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i}>
                <circle cx="22" cy={34 + i * 12} r="4" fill={['#c9a227', '#4c7fb0', '#b3766b', '#7c6a8c', '#3f6b63'][i]} />
                <rect x="30" y={31 + i * 12} width={60 - i * 7} height="5" rx="2.5" fill="#cfc8b8" />
                <rect x="112" y={31 + i * 12} width="22" height="6" rx="3" fill={i % 3 === 1 ? '#c8432f' : '#1d8a6c'} opacity="0.85" />
              </g>
            ))}
            <path d="M-14 100 H164 L170 110 H-20 Z" fill="#4a4d55" />
          </g>
          {/* Kupa + bitki + yapışkan notlar */}
          <g transform="translate(236 160)">
            <rect width="34" height="42" rx="5" fill="#c8432f" />
            <path d="M34 10 q14 0 14 12 q0 12 -14 12" stroke="#c8432f" strokeWidth="5" fill="none" />
            <text x="6" y="26" fill="#fff" fontSize="10" fontWeight="800" fontFamily="sans-serif">İK</text>
          </g>
          <g transform="translate(22 150)">
            <path d="M8 50 L30 50 L26 22 L12 22Z" fill="#c07b4a" />
            <path d="M19 22 C4 10 6 -4 10 -10 C14 0 18 10 19 22 C20 8 26 -6 34 -8 C32 4 26 14 19 22" fill="#3f8a5a" />
          </g>
          <rect x="30" y="40" width="40" height="40" fill="#ffe27a" transform="rotate(-6 50 60)" />
          <rect x="80" y="30" width="40" height="40" fill="#9fe0c8" transform="rotate(5 100 50)" />
          <path d="M36 54 h26 M36 62 h20" stroke="#8a7a3a" strokeWidth="2" transform="rotate(-6 50 60)" />
        </>
      )}

      {kind === 'cat' && (
        <>
          <rect width="300" height="300" fill="#f3d9b0" />
          {[
            ['#d9674f', 0],
            ['#4d8fa8', 76],
            ['#e9b949', 152],
            ['#6fa27a', 228],
          ].map(([c, x]) => (
            <g key={x as number}>
              <rect x={x as number} y="0" width="76" height="220" fill={c as string} />
              {[30, 90, 150].map((y) => (
                <g key={y}>
                  <rect x={(x as number) + 16} y={y} width="18" height="30" rx="9" fill="#2f3440" opacity="0.8" />
                  <rect x={(x as number) + 44} y={y} width="18" height="30" rx="9" fill="#2f3440" opacity="0.8" />
                  <rect x={(x as number) + 12} y={y + 30} width="54" height="4" fill="#fff" opacity="0.5" />
                </g>
              ))}
            </g>
          ))}
          {/* Merdivenler */}
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x="0" y={220 + i * 20} width="300" height="20" fill={i % 2 ? '#b8a88f' : '#c9b99e'} />
          ))}
          {/* Kedi */}
          <g transform="translate(150 228)">
            <ellipse cx="0" cy="18" rx="34" ry="22" fill="#e6893c" />
            <path d="M28 20 q30 -4 24 -30" stroke="#e6893c" strokeWidth="9" fill="none" strokeLinecap="round" />
            <circle cx="-22" cy="-6" r="20" fill="#e6893c" />
            <path d="M-38 -16 L-36 -36 L-24 -24Z M-6 -16 L-8 -36 L-20 -24Z" fill="#e6893c" />
            <path d="M-35 -20 L-34 -30 L-28 -24Z M-9 -20 L-10 -30 L-16 -24Z" fill="#f4b3a0" />
            <path d="M-30 -6 q4 -4 8 0 M-22 -6 q4 -4 8 0" stroke="#3a2a1a" strokeWidth="2" fill="none" />
            <path d="M-22 2 l-2 2 h4Z" fill="#c75a5a" />
            <path d="M-40 4 h12 M-40 8 h12 M-4 4 h-12 M-4 8 h-12" stroke="#fff" strokeWidth="0.8" opacity="0.8" />
            <path d="M-10 26 q10 6 22 0" stroke="#c96e2a" strokeWidth="4" fill="none" />
          </g>
        </>
      )}

      {kind === 'coffee' && (
        <>
          <rect width="300" height="300" fill="#dfe6e8" />
          <rect y="236" width="300" height="64" fill="#8b9aa0" />
          <g transform="translate(80 50)">
            <rect width="140" height="190" rx="12" fill="#2f3237" />
            <rect x="12" y="14" width="116" height="40" rx="6" fill="#111317" />
            <text x="22" y="40" fill="#e0574a" fontSize="14" fontWeight="800" fontFamily="monospace">ERR 404</text>
            <circle cx="30" cy="74" r="8" fill="#555a62" />
            <circle cx="58" cy="74" r="8" fill="#555a62" />
            <circle cx="86" cy="74" r="8" fill="#555a62" />
            <rect x="40" y="96" width="60" height="16" rx="4" fill="#1b1d21" />
            <rect x="64" y="112" width="12" height="10" fill="#1b1d21" />
            <rect x="20" y="170" width="100" height="10" rx="3" fill="#1b1d21" />
            <path d="M52 136 h36 l-4 34 h-28Z" fill="#f4f1ea" />
            <ellipse cx="70" cy="136" rx="18" ry="3" fill="#d6cfc2" />
          </g>
          <g transform="rotate(8 190 80)">
            <rect x="150" y="56" width="92" height="56" fill="#ffe27a" />
            <text x="160" y="80" fill="#6b4f1a" fontSize="14" fontWeight="900" fontFamily="sans-serif">ARIZALI</text>
            <text x="160" y="98" fill="#6b4f1a" fontSize="10" fontFamily="sans-serif">3. gün 🙃 -BT</text>
          </g>
          <path d="M150 180 q0 10 0 16" stroke="#6b4a33" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 6" />
        </>
      )}

      {kind === 'rain' && (
        <>
          <defs>
            <filter id={g('blur')}>
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>
          <rect width="300" height="300" fill="#1c2733" />
          <g filter={`url(#${g('blur')})`}>
            {Array.from({ length: 16 }).map((_, i) => (
              <circle key={i} cx={(i * 71) % 300} cy={120 + ((i * 47) % 160)} r={10 + (i % 4) * 6} fill={['#f2b53c', '#e0574a', '#ffe8b0', '#7fb4e0'][i % 4]} opacity="0.55" />
            ))}
          </g>
          {Array.from({ length: 36 }).map((_, i) => (
            <g key={i}>
              <ellipse cx={(i * 53) % 290 + 5} cy={(i * 97) % 280 + 10} rx={2 + (i % 3)} ry={3 + (i % 3)} fill="#cfe3f2" opacity="0.4" />
              {i % 4 === 0 && <path d={`M${(i * 53) % 290 + 5} ${(i * 97) % 280 + 14} v${16 + (i % 5) * 6}`} stroke="#cfe3f2" strokeWidth="1.4" opacity="0.3" />}
            </g>
          ))}
          <rect x="0" y="0" width="300" height="300" fill="none" stroke="#10161d" strokeWidth="18" />
          <rect x="146" y="0" width="8" height="300" fill="#10161d" />
        </>
      )}

      {kind === 'ferry' && (
        <>
          <defs>
            <linearGradient id={g('day')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#8fc4e8" />
              <stop offset="1" stopColor="#e7f2f7" />
            </linearGradient>
          </defs>
          <rect width="300" height="300" fill={`url(#${g('day')})`} />
          <path d="M0 170 Q40 150 80 160 T170 152 T300 160 V190 H0Z" fill="#9fb0b8" />
          <rect y="180" width="300" height="120" fill="#3b7fa6" />
          {Array.from({ length: 14 }).map((_, i) => (
            <path key={i} d={`M${(i * 43) % 300} ${196 + (i * 17) % 90} q8 -4 16 0`} stroke="#bfe0f0" strokeWidth="1.6" fill="none" opacity="0.7" />
          ))}
          {/* Kız Kulesi */}
          <g transform="translate(236 150)">
            <rect x="-14" y="24" width="40" height="14" fill="#e8e0cf" />
            <rect x="-6" y="-6" width="14" height="32" fill="#f4eee0" />
            <path d="M-8 -6 L1 -24 L10 -6Z" fill="#6b7c86" />
          </g>
          {/* Vapur */}
          <g transform="translate(40 176)">
            <path d="M0 20 L150 20 L140 40 L10 40Z" fill="#f4f4f0" />
            <rect x="0" y="36" width="140" height="6" fill="#1f2a36" />
            <rect x="18" y="4" width="112" height="16" fill="#f4f4f0" />
            {Array.from({ length: 10 }).map((_, i) => (
              <rect key={i} x={24 + i * 10} y="8" width="6" height="7" fill="#2d4558" />
            ))}
            <rect x="60" y="-18" width="14" height="22" fill="#f2b53c" />
            <rect x="60" y="-18" width="14" height="5" fill="#1f2a36" />
            <path d="M68 -24 q10 -12 26 -10" stroke="#fff" strokeWidth="5" fill="none" opacity="0.7" strokeLinecap="round" />
          </g>
          {[
            [80, 60],
            [130, 90],
            [200, 50],
          ].map(([x, y]) => (
            <path key={x} d={`M${x} ${y} q6 -6 12 0 q6 -6 12 0`} stroke="#3b4a55" strokeWidth="2" fill="none" />
          ))}
        </>
      )}
      {kind === 'snow' && (
        <>
          <defs>
            <linearGradient id={g('night')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1b2438" />
              <stop offset="1" stopColor="#4b5670" />
            </linearGradient>
          </defs>
          <rect width="300" height="300" fill={`url(#${g('night')})`} />
          <path d="M0 200 Q60 150 120 170 T240 150 T300 170 V300 H0Z" fill="#2a3044" />
          {Array.from({ length: 26 }).map((_, i) => (
            <g key={i}>
              <rect x={(i * 23) % 290} y={170 + ((i * 17) % 60)} width="14" height="12" fill="#1e2334" />
              <rect x={(i * 23) % 290} y={168 + ((i * 17) % 60)} width="14" height="3" fill="#e9eef6" />
              <rect x={(i * 23) % 290 + 4} y={174 + ((i * 17) % 60)} width="3" height="3" fill="#ffcf8a" />
            </g>
          ))}
          {/* Karlar altında Galata Kulesi */}
          <rect x="138" y="80" width="26" height="100" fill="#b9a488" />
          <rect x="134" y="72" width="34" height="12" fill="#ffd89a" />
          <path d="M132 72 L151 36 L170 72Z" fill="#3d4552" />
          <path d="M140 62 L151 40 L162 62Z" fill="#eef2f8" opacity="0.8" />
          {Array.from({ length: 70 }).map((_, i) => (
            <circle key={i} cx={(i * 41) % 300} cy={(i * 67) % 300} r={1 + (i % 3)} fill="#fff" opacity={0.5 + (i % 4) * 0.12} />
          ))}
          <rect y="270" width="300" height="30" fill="#e6ebf3" />
        </>
      )}

      {kind === 'traffic' && (
        <>
          <defs>
            <linearGradient id={g('dusk')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1c2140" />
              <stop offset="1" stopColor="#b5654f" />
            </linearGradient>
          </defs>
          <rect width="300" height="150" fill={`url(#${g('dusk')})`} />
          {[10, 50, 90, 200, 240, 270].map((x, i) => (
            <rect key={x} x={x} y={60 + (i % 3) * 20} width={26} height={100} fill="#1a1d30" />
          ))}
          <path d="M150 140 L0 300 H300Z" fill="#26242c" />
          <rect y="140" width="300" height="4" fill="#3a3640" />
          {Array.from({ length: 5 }).map((_, row) =>
            Array.from({ length: 4 }).map((__, lane) => {
              const y = 150 + row * row * 8 + row * 10;
              const spread = 12 + row * 16;
              const x = 150 + (lane - 1.5) * spread;
              const r = 1.5 + row * 1.1;
              return (
                <g key={`${row}-${lane}`}>
                  <circle cx={x - r * 1.3} cy={y} r={r} fill="#ff3b2e" />
                  <circle cx={x + r * 1.3} cy={y} r={r} fill="#ff3b2e" />
                  <circle cx={x} cy={y} r={r * 3.5} fill="#ff3b2e" opacity="0.18" />
                </g>
              );
            }),
          )}
        </>
      )}

      {kind === 'lunch' && (
        <>
          <rect width="300" height="300" fill="#c9b79a" />
          <rect x="30" y="50" width="240" height="200" rx="14" fill="#9aa3a8" />
          <rect x="40" y="60" width="220" height="180" rx="10" fill="#b8c0c4" />
          {/* çorba */}
          <circle cx="90" cy="110" r="36" fill="#f4efe6" />
          <circle cx="90" cy="110" r="28" fill="#e0a13c" />
          <circle cx="82" cy="104" r="4" fill="#fff3c4" opacity="0.8" />
          {/* ana yemek: kuru fasulye + pilav */}
          <ellipse cx="190" cy="115" rx="52" ry="34" fill="#f4efe6" />
          <ellipse cx="172" cy="115" rx="26" ry="20" fill="#b3462a" />
          <ellipse cx="212" cy="115" rx="24" ry="18" fill="#f6f1e4" />
          {Array.from({ length: 14 }).map((_, i) => (
            <ellipse key={i} cx={160 + (i % 5) * 6} cy={105 + Math.floor(i / 5) * 7} rx="3" ry="2" fill="#e9dcc4" />
          ))}
          {/* ekmek, ayran, cacık */}
          <rect x="60" y="170" width="60" height="44" rx="10" fill="#d8a45c" />
          <rect x="140" y="165" width="34" height="56" rx="4" fill="#fbfbf6" />
          <rect x="140" y="165" width="34" height="10" fill="#2f7fc1" />
          <circle cx="222" cy="194" r="26" fill="#f4efe6" />
          <circle cx="222" cy="194" r="19" fill="#e9f0e2" />
          <path d="M210 190 q12 -6 24 0" stroke="#6b9a5a" strokeWidth="2" fill="none" />
          <rect x="250" y="80" width="6" height="120" rx="3" fill="#d9dcde" />
        </>
      )}

      {kind === 'servis' && (
        <>
          <rect width="300" height="300" fill="#2a2f3e" />
          <rect y="170" width="300" height="130" fill="#34343c" />
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${-20 + i * 110} ${150 - i * 14}) scale(${1 - i * 0.12})`}>
              <rect width="120" height="70" rx="10" fill="#f1f1ee" />
              <rect x="8" y="10" width="104" height="26" rx="3" fill="#2b3a4c" />
              {[0, 1, 2, 3, 4].map((w) => (
                <circle key={w} cx={20 + w * 20} cy="26" r="5" fill="#1a2330" />
              ))}
              <rect x="6" y="-12" width="60" height="12" rx="2" fill="#141414" />
              <text x="10" y="-3" fill="#ff9d2e" fontSize="9" fontWeight="800" fontFamily="monospace">SERVİS</text>
              <circle cx="26" cy="72" r="10" fill="#141418" />
              <circle cx="94" cy="72" r="10" fill="#141418" />
              <circle cx="112" cy="50" r="4" fill="#ff3b2e" />
            </g>
          ))}
          <text x="20" y="60" fill="#ffffff" fontSize="18" fontWeight="800" fontFamily="sans-serif" opacity="0.9">17:30</text>
          <text x="20" y="80" fill="#c9cdd6" fontSize="11" fontFamily="sans-serif">Ataşehir · servis çıkışı</text>
        </>
      )}
    </svg>
  );
}
