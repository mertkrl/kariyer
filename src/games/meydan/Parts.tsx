import type { ReactNode } from 'react';
import { GROUND, type BuildingShape, type Spec } from './model';
import { rnd, url } from './paint';

/*
 * Bir binanın parçaları: pencere, balkon, çatı, saçak, kaçak kat, kusurlar (sıvasız yamalar,
 * uyumsuz kaplama, kapatılmış balkon, sac sundurma, çatlak), cephe aydınlatması, çelik çapraz ve
 * zemin kat vitrini. Facade.tsx bunları binanın biçimine ve oyuncunun seçimlerine göre dizer.
 */

/** `n` eşit aralığın ortaları, 0–1 arasında: aplikler, bitkiler, armatürler cepheye böyle dizilir. */
const row = (n: number) => Array.from({ length: n }, (_, i) => (i + 0.5) / n);

const FRAME: Record<Spec['windows'], string | null> = { mevcut: null, pvc: '#f4f4f2', ahsap: '#6b4524', aluminyum: '#33383d' };

export function Window({ x, y, w, h, trim, v, arch = false, panes = 2, kind = 'mevcut', reveal = false }: { x: number; y: number; w: number; h: number; trim: string; v: number; arch?: boolean; panes?: number; kind?: Spec['windows']; reveal?: boolean }) {
  const shape = arch ? `M${x} ${y + h} V${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h} Z` : `M${x} ${y} H${x + w} V${y + h} H${x} Z`;
  // eski hâlde her pencere başka bir ustanın işi: kimi beyaz PVC, kimi kararmış ahşap
  const mixed = kind === 'mevcut' ? (v > 0.78 ? '#f4f4f2' : v > 0.66 ? '#6b5a48' : trim) : null;
  const frame = FRAME[kind] ?? mixed ?? trim;
  const n = kind === 'aluminyum' ? 1 : kind === 'ahsap' ? 2 : panes;
  const bar = kind === 'pvc' ? 4 : kind === 'aluminyum' ? 1.6 : 2.5;
  const springs = y + (arch ? w / 2 : 0);
  let inside: ReactNode = null;
  if (v < 0.32) inside = <rect x={x + 2} y={y + h * 0.18} width={w - 4} height={h * 0.8} fill="#f3efe6" opacity="0.5" />;
  else if (v < 0.55) inside = <rect x={x} y={springs} width={w} height={h * (0.2 + (v - 0.32) * 2)} fill="#d8cab0" opacity="0.92" />;
  else if (v < 0.66) inside = <rect x={x + 2} y={y + h * 0.3} width={w - 4} height={h * 0.66} fill="#f6d79b" opacity="0.45" />;
  return (
    <g>
      {kind === 'mevcut' && <rect x={x} y={y + h + 3} width={w} height="14" fill={url('stain')} />}
      {reveal && <rect x={x - 5} y={y - 5} width={w + 10} height={h + 10} fill="#000" opacity="0.12" />}
      <path d={shape} fill={url('glass')} />
      {inside}
      <path d={`M${x + 3} ${y + h - 3} L${x + w * 0.45} ${y + (arch ? w / 2 : 3)} L${x + w * 0.62} ${y + (arch ? w / 2 : 3)} L${x + w * 0.2} ${y + h - 3} Z`} fill="#fff" opacity="0.1" />
      <path d={shape} fill="none" stroke={frame} strokeWidth={kind === 'pvc' ? 4.5 : kind === 'aluminyum' ? 2.2 : 3} />
      {Array.from({ length: n - 1 }, (_, i) => (
        <rect key={i} x={x + (w * (i + 1)) / n - bar / 2} y={springs} width={bar} height={h - (arch ? w / 2 : 0)} fill={frame} />
      ))}
      {kind !== 'aluminyum' && <rect x={x} y={y + (arch ? w / 2 : h * 0.3)} width={w} height="2" fill={frame} />}
      {/* ahşap doğramanın kayıtları */}
      {kind === 'ahsap' && [0.55, 0.78].map((k) => <rect key={k} x={x} y={y + h * k} width={w} height="1.4" fill={frame} />)}
      <rect x={x - 4} y={y + h + 1} width={w + 8} height="4" fill={trim} />
      <rect x={x - 4} y={y + h + 5} width={w + 8} height="2" fill="#000" opacity="0.18" />
    </g>
  );
}

/** Balkon döşemesi ve korkuluk; `enclosed` eğreti PVC kapatmayı çizer. */
export function Balcony({ x, y, w, h, kind, wall, enclosed, v }: { x: number; y: number; w: number; h: number; kind: Spec['railing']; wall: string; enclosed: boolean; v: number }) {
  // y: döşemenin üst yüzü
  const slab = (
    <>
      <rect x={x} y={y + 5} width={w} height="10" fill={url('drop')} />
      <rect x={x - 2} y={y} width={w + 4} height="5" fill="#d9d5cc" />
      <rect x={x - 2} y={y + 3.5} width={w + 4} height="1.5" fill="#000" opacity="0.2" />
    </>
  );
  if (kind === 'mevcut' && enclosed) {
    // her daire kendi bildiği gibi kapatmış: beyaz PVC, renkli perde, yarısı açık
    const top = y - h * 0.78;
    return (
      <g>
        <rect x={x} y={top} width={w} height={y - top} fill={url('glass')} />
        {v > 0.5 && <rect x={x + 2} y={top + 3} width={w * 0.5} height={y - top - 6} fill={v > 0.75 ? '#c96f6f' : '#8fb0c9'} opacity="0.7" />}
        <rect x={x} y={y - 18} width={w} height="18" fill={v > 0.4 ? '#f4f4f2' : '#d9d4c7'} />
        <rect x={x} y={top} width={w} height={y - top} fill="none" stroke="#f4f4f2" strokeWidth="3.5" />
        {[0.33, 0.66].map((k) => (
          <rect key={k} x={x + w * k - 1.5} y={top} width="3" height={y - top} fill="#f4f4f2" />
        ))}
        <rect x={x - 3} y={top - 4} width={w + 6} height="4" fill="#9aa0a5" />
        {slab}
      </g>
    );
  }
  let rail: ReactNode;
  if (kind === 'cam')
    rail = (
      <>
        <rect x={x} y={y - 20} width={w} height="20" fill="#cfe3ec" opacity="0.45" />
        <rect x={x} y={y - 22} width={w} height="2.5" fill={url('steel')} />
      </>
    );
  else if (kind === 'dolu') rail = <rect x={x} y={y - 20} width={w} height="20" fill={wall} stroke="#000" strokeOpacity="0.12" />;
  else if (kind === 'ferforje')
    rail = (
      <>
        {Array.from({ length: Math.floor(w / 9) }, (_, i) => (
          <g key={i}>
            <rect x={x + 4 + i * 9} y={y - 20} width="1.4" height="20" fill="#222" />
            <circle cx={x + 8.5 + i * 9} cy={y - 10} r="3" fill="none" stroke="#222" strokeWidth="1.2" />
          </g>
        ))}
        <rect x={x} y={y - 22} width={w} height="3" fill="#222" />
        <rect x={x} y={y - 5} width={w} height="1.6" fill="#222" />
      </>
    );
  else
    rail = (
      <>
        {Array.from({ length: Math.floor(w / (kind === 'dikme' ? 5 : 6)) }, (_, i) => (
          <rect key={i} x={x + 3 + i * (kind === 'dikme' ? 5 : 6)} y={y - 20} width={kind === 'dikme' ? 1 : 1.4} height="20" fill={kind === 'dikme' ? '#7c858c' : '#3b3f43'} opacity="0.85" />
        ))}
        <rect x={x} y={y - 22} width={w} height="2.5" fill={kind === 'dikme' ? url('steel') : '#3b3f43'} />
      </>
    );
  return (
    <g>
      {rail}
      {slab}
    </g>
  );
}

/** Çatı: kırma, sundurma, kornişli, düz teras ya da bitkili yeşil çatı. */
export function Roof({ b, kind, top, trim, wall }: { b: BuildingShape; kind: BuildingShape['roof'] | 'yesil'; top: number; trim: string; wall: string }) {
  if (kind === 'kirma')
    return (
      <g>
        <polygon points={`${b.x - 8},${top} ${b.x + b.w + 8},${top} ${b.x + b.w - 26},${top - 40} ${b.x + 26},${top - 40}`} fill={url('tile')} />
        {[0.25, 0.5, 0.75].map((k) => (
          <line key={k} x1={b.x - 8 + k * 34} y1={top - 40 * k} x2={b.x + b.w + 8 - k * 34} y2={top - 40 * k} stroke="#000" strokeOpacity="0.15" />
        ))}
        <rect x={b.x - 8} y={top - 4} width={b.w + 16} height="5" fill={trim} />
        <rect x={b.x} y={top + 1} width={b.w} height="8" fill={url('drop')} />
        <rect x={b.x + b.w * 0.7} y={top - 54} width="12" height="22" fill="#8c7b6b" />
      </g>
    );
  if (kind === 'sundurma')
    // tek katlı dükkânların sac sundurması: önde eğimli saçak, arkasında tabela bandı
    return (
      <g>
        <rect x={b.x} y={top - 36} width={b.w} height="36" fill={wall} />
        <rect x={b.x} y={top - 36} width={b.w} height="36" fill={url('face')} opacity="0.6" />
        <polygon points={`${b.x - 10},${top - 36} ${b.x + b.w + 10},${top - 36} ${b.x + b.w + 4},${top - 54} ${b.x - 4},${top - 54}`} fill={trim} />
        {Array.from({ length: Math.floor(b.w / 14) }, (_, i) => (
          <line key={i} x1={b.x + 4 + i * 14} y1={top - 53} x2={b.x - 6 + i * 14.6} y2={top - 37} stroke="#000" strokeOpacity="0.18" />
        ))}
        <rect x={b.x - 10} y={top - 38} width={b.w + 20} height="4" fill="#fff" opacity="0.25" />
        <rect x={b.x} y={top - 34} width={b.w} height="8" fill={url('drop')} />
      </g>
    );
  if (kind === 'kornis')
    return (
      <g>
        <rect x={b.x} y={top - 20} width={b.w} height="12" fill={wall} />
        <rect x={b.x - 5} y={top - 9} width={b.w + 10} height="9" fill={trim} />
        {Array.from({ length: Math.floor((b.w + 10) / 8) }, (_, i) => (
          <rect key={i} x={b.x - 4 + i * 8} y={top - 1} width="4" height="4" fill={trim} />
        ))}
        <rect x={b.x - 5} y={top + 3} width={b.w + 10} height="8" fill={url('drop')} />
        <rect x={b.x - 2} y={top - 24} width={b.w + 4} height="5" fill={trim} />
      </g>
    );
  return (
    <g>
      {b.penthouse && kind === 'duz' && (
        <g>
          <rect x={b.x + b.w * 0.18} y={top - 40} width={b.w * 0.64} height="40" fill={wall} />
          <rect x={b.x + b.w * 0.18} y={top - 40} width={b.w * 0.64} height="40" fill="#000" opacity="0.08" />
          <rect x={b.x + b.w * 0.3} y={top - 32} width={b.w * 0.4} height="20" fill={url('glass')} stroke={trim} strokeWidth="2.5" />
          <rect x={b.x + b.w * 0.15} y={top - 44} width={b.w * 0.7} height="5" fill={trim} />
        </g>
      )}
      {kind === 'yesil' &&
        row(Math.max(3, Math.round(b.w / 22))).map((f, i) => {
          const cx = b.x + 8 + (b.w - 16) * f;
          const r = 9 + rnd(b.id, 300 + i) * 9;
          return <ellipse key={i} cx={cx} cy={top - 10} rx={r} ry={r * 0.75} fill={i % 2 ? '#5f8a3e' : '#76a04a'} />;
        })}
      <rect x={b.x - 2} y={top - 10} width={b.w + 4} height="10" fill={kind === 'yesil' ? '#6d7a5a' : trim} />
      <rect x={b.x - 2} y={top - 10} width={b.w + 4} height="2" fill="#fff" opacity="0.3" />
      <rect x={b.x} y={top} width={b.w} height="6" fill={url('drop')} />
    </g>
  );
}

/** Saçak: çatının cepheden taşan kenarı ve altına düşen gölge. */
export function Eave({ b, top, kind }: { b: BuildingShape; top: number; kind: Spec['eave'] }) {
  if (kind === 'yok') return null;
  const o = 14;
  const t = kind === 'ahsap' ? 8 : kind === 'beton' ? 7 : 4;
  const fill = kind === 'ahsap' ? '#7a5232' : kind === 'beton' ? '#d6d2c8' : '#9aa1a6';
  return (
    <g>
      <rect x={b.x - o} y={top - t} width={b.w + o * 2} height={t} fill={fill} />
      <rect x={b.x - o} y={top - t} width={b.w + o * 2} height="1.5" fill="#fff" opacity="0.3" />
      <rect x={b.x} y={top} width={b.w} height="16" fill={url('drop')} />
      {kind === 'ahsap' &&
        Array.from({ length: Math.floor((b.w + o * 2) / 12) }, (_, i) => <rect key={i} x={b.x - o + 4 + i * 12} y={top} width="5" height="6" fill="#5e3e25" />)}
    </g>
  );
}

/** Ruhsatsız çatı katı: trapez sac, çıplak briket ya da PVC camlı kutu. */
export function IllegalFloor({ b, top, kind }: { b: BuildingShape; top: number; kind: 'sac' | 'briket' | 'pvc' }) {
  const x = b.x + b.w * 0.08;
  const w = b.w * (kind === 'pvc' ? 0.7 : 0.84);
  const h = b.floorH;
  const y = top - h;
  const sheet = rnd(b.id, 900) > 0.5 ? '#3f6fa8' : '#a83a32';
  return (
    <g>
      {kind === 'sac' && (
        <>
          <rect x={x} y={y} width={w} height={h} fill={sheet} />
          <rect x={x} y={y} width={w} height={h} fill={url('sac')} />
          <polygon points={`${x - 6},${y + 2} ${x + w + 6},${y - 8} ${x + w + 6},${y - 3} ${x - 6},${y + 7}`} fill={sheet} />
          <rect x={x + w * 0.2} y={y + h * 0.28} width={w * 0.22} height={h * 0.42} fill={url('glass')} stroke="#ddd" strokeWidth="2" />
          <rect x={x + w * 0.62} y={y + h * 0.18} width={w * 0.16} height={h * 0.82} fill="#5a5f63" />
          <rect x={x + w * 0.88} y={y + h * 0.5} width="3" height={h * 0.5} fill="#7a3a1a" opacity="0.6" />
        </>
      )}
      {kind === 'briket' && (
        <>
          <rect x={x} y={y + 6} width={w} height={h - 6} fill={url('block')} />
          {/* filizler: yukarı kat için bırakılmış çıplak demirler */}
          {[0, 0.33, 0.66, 1].map((k) => (
            <g key={k}>
              <rect x={x + w * k - 5} y={y - 4} width="10" height={h + 4} fill="#a29f98" />
              {[-2, 2].map((d) => (
                <rect key={d} x={x + w * k + d - 0.7} y={y - 26} width="1.4" height="24" fill="#7a3f22" />
              ))}
            </g>
          ))}
          <rect x={x} y={y - 4} width={w} height="8" fill="#a29f98" />
          <rect x={x + w * 0.18} y={y + h * 0.3} width={w * 0.18} height={h * 0.4} fill="#2b2b2b" />
          <rect x={x + w * 0.56} y={y + h * 0.3} width={w * 0.18} height={h * 0.4} fill="#2b2b2b" />
        </>
      )}
      {kind === 'pvc' && (
        <>
          <rect x={x} y={y} width={w} height={h} fill={url('glass')} />
          <rect x={x + 3} y={y + 4} width={w * 0.3} height={h - 8} fill="#d8cab0" opacity="0.6" />
          <rect x={x} y={y} width={w} height={h} fill="none" stroke="#f4f4f2" strokeWidth="4" />
          {[0.25, 0.5, 0.75].map((k) => (
            <rect key={k} x={x + w * k - 2} y={y} width="4" height={h} fill="#f4f4f2" />
          ))}
          <rect x={x - 6} y={y - 6} width={w + 12} height="6" fill="#c9ccce" />
          <rect x={x} y={y + h - 12} width={w} height="12" fill="#eceae4" />
        </>
      )}
      <rect x={x} y={top - 2} width={w} height="3" fill="#000" opacity="0.2" />
    </g>
  );
}

/** Sıvasız briket yamaları: her binada aynı yerde, binanın kimliğinden türeyen. */
export function BarePatches({ b, top, bottom }: { b: BuildingShape; top: number; bottom: number }) {
  return (
    <g pointerEvents="none">
      {[0, 1, 2].map((i) => {
        const w = b.w * (0.22 + rnd(b.id, 500 + i) * 0.22);
        const h = (bottom - top) * (0.14 + rnd(b.id, 510 + i) * 0.16);
        const x = b.x + rnd(b.id, 520 + i) * (b.w - w);
        const y = top + rnd(b.id, 530 + i) * (bottom - top - h);
        return (
          <g key={i}>
            <path d={`M${x} ${y + 4} L${x + w * 0.3} ${y} L${x + w} ${y + 6} L${x + w - 4} ${y + h} L${x + w * 0.4} ${y + h - 3} L${x + 3} ${y + h} Z`} fill={url('block')} />
            <path d={`M${x} ${y + 4} L${x + w * 0.3} ${y} L${x + w} ${y + 6} L${x + w - 4} ${y + h} L${x + w * 0.4} ${y + h - 3} L${x + 3} ${y + h} Z`} fill="none" stroke="#000" strokeOpacity="0.2" />
          </g>
        );
      })}
    </g>
  );
}

/** Bir katı baştan sona kaplayan, binaya yabancı kaplama: parlak kompozit ya da banyo seramiği. */
export function Patch({ b, y, h, kind }: { b: BuildingShape; y: number; h: number; kind: 'kompozit' | 'seramik' }) {
  return (
    <g pointerEvents="none">
      <rect x={b.x} y={y} width={b.w} height={h} fill={kind === 'kompozit' ? '#8ea4b6' : '#e9e6dc'} />
      <rect x={b.x} y={y} width={b.w} height={h} fill={url(kind === 'kompozit' ? 'panel' : 'ceramic')} />
      {kind === 'kompozit' && <rect x={b.x} y={y} width={b.w} height={h} fill={url('face')} />}
      <rect x={b.x} y={y + h} width={b.w} height="3" fill="#000" opacity="0.2" />
    </g>
  );
}

/** Çatıya çakılmış sac sundurma: paslı direkler ve eğik sac. */
export function LeanTo({ b, top }: { b: BuildingShape; top: number }) {
  const x = b.x + b.w * 0.42;
  const w = b.w * 0.5;
  return (
    <g>
      {[x + 3, x + w - 6].map((px) => (
        <rect key={px} x={px} y={top - 30} width="3" height="30" fill="#6b4a32" />
      ))}
      <polygon points={`${x - 4},${top - 28} ${x + w + 6},${top - 40} ${x + w + 6},${top - 35} ${x - 4},${top - 23}`} fill="#8a7f72" />
      <polygon points={`${x - 4},${top - 28} ${x + w + 6},${top - 40} ${x + w + 6},${top - 35} ${x - 4},${top - 23}`} fill={url('sac')} />
      <rect x={x + 10} y={top - 18} width={w - 22} height="18" fill="#5a5048" opacity="0.6" />
      <rect x={x + w * 0.3} y={top - 22} width={w * 0.3} height="3" fill="#c9a24a" opacity="0.7" />
    </g>
  );
}

/** Taşıyıcıdaki çatlaklar: kolonlarda ve pencere köşelerinde çapraz yarıklar. */
export function Cracks({ b, top, bottom }: { b: BuildingShape; top: number; bottom: number }) {
  return (
    <g pointerEvents="none" stroke="#2b2622" strokeOpacity="0.7" fill="none" strokeLinecap="round">
      {[0, 1, 2].map((i) => {
        const x = b.x + b.w * (0.15 + rnd(b.id, 700 + i) * 0.7);
        const y = top + (bottom - top) * (0.2 + rnd(b.id, 710 + i) * 0.6);
        const s = rnd(b.id, 720 + i) > 0.5 ? 1 : -1;
        return <path key={i} d={`M${x} ${y} l${s * 6} 9 l${-s * 3} 7 l${s * 9} 11 l${-s * 2} 8 l${s * 7} 6`} strokeWidth="1.6" />;
      })}
      <path d={`M${b.x + 4} ${bottom - 4} l8 -14 l-3 -10 l7 -12`} strokeWidth="2" />
    </g>
  );
}

/** Cepheye dıştan bağlanmış çelik çaprazlar: her iki katta bir X, köşelerde bağlantı plakası. */
export function Bracing({ b, top, bottom }: { b: BuildingShape; top: number; bottom: number }) {
  const bays = Math.max(1, Math.round(b.w / 90));
  const rows = Math.max(1, Math.round((bottom - top) / (b.floorH * 2)));
  const bw = b.w / bays;
  const bh = (bottom - top) / rows;
  return (
    <g pointerEvents="none">
      {Array.from({ length: bays * rows }, (_, i) => {
        const x = b.x + (i % bays) * bw;
        const y = top + Math.floor(i / bays) * bh;
        return (
          <g key={i} stroke="#3a4046" strokeWidth="5">
            <line x1={x + 4} y1={y + 4} x2={x + bw - 4} y2={y + bh - 4} />
            <line x1={x + bw - 4} y1={y + 4} x2={x + 4} y2={y + bh - 4} />
            <rect x={x + 2} y={y} width={bw - 4} height="4" fill="#3a4046" stroke="none" />
          </g>
        );
      })}
      <rect x={b.x + 2} y={bottom - 4} width={b.w - 4} height="4" fill="#3a4046" />
    </g>
  );
}

/** Cephe aydınlatması: duvar aplikleri, aşağıdan yıkama ya da renkli LED şerit. */
export function Lighting({ b, top, kind, floors }: { b: BuildingShape; top: number; kind: Spec['lighting']; floors: number[] }) {
  const shopTop = GROUND - b.groundH;
  if (kind === 'yok') return null;
  if (kind === 'renkli')
    return (
      <g pointerEvents="none">
        {[top, ...floors.map((f) => f + b.floorH - 3), shopTop - 2].map((y, i) => (
          <rect key={i} x={b.x} y={y} width={b.w} height="3" fill={['#ff2bd6', '#2be0ff', '#7dff3a'][i % 3]} opacity="0.9" />
        ))}
      </g>
    );
  if (kind === 'yikama')
    return (
      <g pointerEvents="none">
        <rect x={b.x} y={top} width={b.w} height={shopTop - top} fill={url('wash')} />
        {row(Math.max(2, Math.round(b.w / 50))).map((f, i) => (
          <rect key={i} x={b.x + f * b.w - 6} y={shopTop - 6} width="12" height="5" rx="1" fill="#2b2e31" />
        ))}
      </g>
    );
  return (
    <g pointerEvents="none">
      {row(Math.max(2, Math.round(b.w / 60))).map((f, i) => {
        const x = b.x + f * b.w;
        return (
          <g key={i}>
            <ellipse cx={x} cy={shopTop - 22} rx="18" ry="22" fill={url('glow')} />
            <rect x={x - 3} y={shopTop - 30} width="6" height="10" rx="2" fill="#2b2e31" />
            <rect x={x - 2} y={shopTop - 21} width="4" height="3" fill="#ffe2a0" />
          </g>
        );
      })}
    </g>
  );
}

/** Zemin kat: bugünkü kepenkli vitrin, ince çelik vitrin ya da ahşap dükkân önü. */
export function Shopfront({ b, shop, kind }: { b: BuildingShape; shop: string; kind: Spec['shopfront'] }) {
  const top = GROUND - b.groundH;
  const glassTop = top + 34;
  const door = b.x + Math.round(b.w * 0.64);
  const doorW = Math.min(30, b.w * 0.2);
  const lights = Math.max(2, Math.round(b.w / 40));
  const mull = kind === 'vitrin' ? '#151719' : kind === 'ahsap' ? '#4e3420' : '#2b2e31';
  const mw = kind === 'vitrin' ? 2 : kind === 'ahsap' ? 6 : 3;
  return (
    <g>
      <rect x={b.x} y={top} width={b.w} height={b.groundH} fill={shop} />
      <rect x={b.x} y={top} width={b.w} height={b.groundH} fill={url('face')} opacity="0.7" />
      {kind === 'mevcut' && (
        <>
          {/* kepenk kutusu */}
          <rect x={b.x + 6} y={glassTop - 10} width={b.w - 12} height="10" fill="#8f9398" />
          <rect x={b.x + 6} y={glassTop - 10} width={b.w - 12} height="2" fill="#b9bdc1" />
          <rect x={b.x + 6} y={glassTop - 2} width={b.w - 12} height="2" fill="#000" opacity="0.3" />
        </>
      )}
      {kind === 'ahsap' &&
        [b.x + 2, b.x + b.w - 12].map((px) => (
          <g key={px}>
            <rect x={px} y={top + 2} width="10" height={b.groundH - 4} fill="#5e3e25" />
            <rect x={px - 2} y={top + 2} width="14" height="6" fill="#4a3020" />
          </g>
        ))}
      <rect x={b.x + 6} y={glassTop} width={b.w - 12} height={GROUND - glassTop - 4} fill={url('shop')} />
      {/* dükkânın içi: tavan ışıkları ve raflar */}
      {Array.from({ length: lights }, (_, i) => (
        <ellipse key={i} cx={b.x + ((i + 0.5) * b.w) / lights} cy={glassTop + 6} rx="9" ry="3" fill="#ffe8b0" opacity={kind === 'mevcut' ? 0.55 : 0.8} />
      ))}
      {[0.45, 0.68].map((k) => (
        <rect key={k} x={b.x + 10} y={glassTop + (GROUND - glassTop) * k} width={door - b.x - 18} height="2" fill="#6f655a" opacity="0.6" />
      ))}
      <rect x={b.x + 6} y={glassTop} width={b.w - 12} height={(GROUND - glassTop) * 0.4} fill="#fff" opacity="0.06" />
      {/* doğrama: kapı ve camları bölen dikmeler */}
      {[door - mw, door + doorW, b.x + 6, b.x + b.w - 6 - mw].map((mx, i) => (
        <rect key={i} x={mx} y={glassTop} width={mw} height={GROUND - glassTop - 4} fill={mull} />
      ))}
      {kind !== 'mevcut' && <rect x={b.x + 6} y={glassTop} width={b.w - 12} height={mw} fill={mull} />}
      {kind === 'ahsap' && <rect x={b.x + 6} y={GROUND - 22} width={b.w - 12} height="18" fill="#5e3e25" />}
      <rect x={door + doorW / 2 - 6} y={glassTop + 30} width="12" height="2.5" fill="#b9bdc1" />
      <rect x={b.x} y={GROUND - 5} width={b.w} height="5" fill={kind === 'mevcut' ? '#77736c' : '#4a4a46'} />
    </g>
  );
}
