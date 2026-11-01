import { RACK } from './data';
import type { Stock } from './week';
import { COUNTER_Y } from './ShopDecor';

/*
 * Kapıyla raf arasındaki tel cips standı: tepede sarı CİPS levhası, iki tel direk, beş katlı tel
 * sepet, her katın önünde kırmızı fiyat şeridi. Her katta bir atıştırmalık (cips, kraker, bisküvi,
 * çikolata, lokum); paketler önlü arkalı iki sıra, rengârenk ve iri dizilir. Stoktaki her mal iki
 * paket görünür (kat en çok sekiz paket alır): stand dolu başlar, satıldıkça seyrelir.
 */

const X0 = 372;
const X1 = 442;
const TIERS = [345, 420, 495, 570, 645];
const PER_ROW = 4;
const BAG_W = 18;

/** Katların paket renkleri: cipste her renk, krakerde kahverengi, lokumda pembe. */
const PALETTE: Record<string, string[]> = {
  cips: ['#e65100', '#c62828', '#1565c0', '#fbc02d', '#2e7d32', '#6a1b9a', '#ef6c00', '#00897b'],
  kraker: ['#d7a35a', '#c62828', '#a1887f', '#f9a825', '#8d6e63', '#e57373', '#d7a35a', '#ffb74d'],
  biskuvi: ['#1565c0', '#6d4c2f', '#c62828', '#fdd835', '#0d47a1', '#8d6e63', '#e53935', '#fbc02d'],
  cikolata: ['#5b2a6e', '#4e342e', '#b71c1c', '#7b1fa2', '#3e2723', '#8e24aa', '#6d4c41', '#c62828'],
  lokum: ['#f48fb1', '#ad1457', '#f8bbd0', '#ec407a', '#ce93d8', '#d81b60', '#f48fb1', '#ab47bc'],
};

/** Yastık paket: tepesi ve dibi tırtıklı kaynak, ortasında parlak etiket, kenarında parlama. */
function Bag({ x, y, color, logo, dim }: { x: number; y: number; color: string; logo: string; dim?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-9 -1 Q-10.5 -15 -9 -29 H9 Q10.5 -15 9 -1 Z" fill={color} />
      <path d="M-9 -29 l1.5 -2 1.5 2 1.5 -2 1.5 2 1.5 -2 1.5 2 1.5 -2 1.5 2 1.5 -2 1.5 2 1.5 -2 1.5 2 Z" fill={color} />
      <path d="M-9 -1 l1.5 2 1.5 -2 1.5 2 1.5 -2 1.5 2 1.5 -2 1.5 2 1.5 -2 1.5 2 1.5 -2 1.5 2 1.5 -2 Z" fill={color} />
      <ellipse cx="0" cy="-17" rx="6.5" ry="4" fill={logo} />
      <rect x="-6" y="-9" width="12" height="4" rx="1" fill="rgba(255,255,255,.55)" />
      <path d="M-6.5 -27 Q-8 -15 -6.5 -4" stroke="rgba(255,255,255,.35)" strokeWidth="1.6" fill="none" />
      {dim && <path d="M-9 -1 Q-10.5 -15 -9 -29 H9 Q10.5 -15 9 -1 Z" fill="rgba(0,0,0,.28)" />}
    </g>
  );
}

export function ChipsRack({ stock }: { stock: Stock }) {
  return (
    <g>
      <ellipse cx={(X0 + X1) / 2} cy={COUNTER_Y + 2} rx="46" ry="5" fill="rgba(0,0,0,.3)" />
      {/* tel direkler ve ayaklar */}
      {[X0 - 4, X1 + 4].map((x) => (
        <rect key={x} x={x - 2} y="262" width="4" height={COUNTER_Y - 262} fill="#9aa3a9" />
      ))}
      <path d={`M${X0 - 16} ${COUNTER_Y} H${X0 + 8} M${X1 - 8} ${COUNTER_Y} H${X1 + 16}`} stroke="#7d868c" strokeWidth="4" strokeLinecap="round" />
      {/* tepedeki levha */}
      <rect x={X0 - 12} y="250" width={X1 - X0 + 24} height="32" rx="5" fill="#fdd835" />
      <rect x={X0 - 8} y="254" width={X1 - X0 + 16} height="24" rx="3" fill="none" stroke="#c62828" strokeWidth="1.5" />
      <text x={(X0 + X1) / 2} y="273" textAnchor="middle" fontSize="16" fontWeight="900" fill="#c62828" fontFamily="Arial, sans-serif" letterSpacing="1">
        CİPS
      </text>
      {TIERS.map((y, i) => {
        const id = RACK[i];
        const colors = PALETTE[id] ?? PALETTE.cips;
        // stoktaki her mal iki paket: önce ön sıra dolar, sonra arka sıra
        const bags = Math.min(PER_ROW * 2, (stock[id] ?? 0) * 2);
        const front = Math.min(PER_ROW, bags);
        const back = bags - front;
        const left = X0 - 4 + BAG_W / 2 + 1;
        return (
          <g key={y}>
            {Array.from({ length: back }, (_, k) => (
              <Bag key={`b${k}`} x={left + k * BAG_W + 4} y={y - 9} color={colors[(k + 4) % colors.length]} logo={k % 2 ? '#fff' : '#ffd54f'} dim />
            ))}
            {Array.from({ length: front }, (_, k) => (
              <Bag key={`f${k}`} x={left + k * BAG_W} y={y - 2} color={colors[k % colors.length]} logo={k % 2 ? '#ffd54f' : '#fff'} />
            ))}
            {/* tel sepet: taban ve ön tel; önünde kırmızı fiyat şeridi ve küçük beyaz etiketler */}
            <path d={`M${X0 - 6} ${y} H${X1 + 6}`} stroke="#b0b8be" strokeWidth="2" />
            <rect x={X0 - 6} y={y} width={X1 - X0 + 12} height="7" fill="#c62828" />
            {bags === 0 ? (
              <text x={(X0 + X1) / 2} y={y + 5.8} textAnchor="middle" fontSize="5.6" fontWeight="900" fill="#fff" fontFamily="Arial, sans-serif">
                TÜKENDİ
              </text>
            ) : (
              // şeritte raftaki adet: kaç paket kaldığı bakınca okunur
              <text x={(X0 + X1) / 2} y={y + 5.8} textAnchor="middle" fontSize="5.6" fontWeight="900" fill="#fff" fontFamily="Arial, sans-serif">
                {stock[id] ?? 0} PAKET
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
