import { useEffect, useRef, useState } from 'react';
import { moveName } from './model';
import { feltDelay, patience, type Report } from './score';
import styles from './Hud.module.css';

/*
 * Oyun sırasında puanın canlı hâli ve vardiya sonunda kuyruğun öyküsü. Sabır göstergesi tutanaktaki
 * "Araç gecikmesi" kalemini anında gösterir: ortalama bekleyiş ve en çok bekleyen yön karışımı. Sabır
 * bir kademe düşünce gösterge sarsılır. Kuyruk çizelgesi vardiya boyunca her iki saniyede alınan
 * toplam kuyruğu çizer; en kötü an işaretlidir.
 */

/** Sabrın kademesi: 2 rahat, 1 söyleniyorlar, 0 korna. */
const band = (p: number) => (p > 0.66 ? 2 : p > 0.33 ? 1 : 0);
const WORDS = ['Korna çalıyorlar', 'Söyleniyorlar', 'Sakinler'];

export function Patience({ r, where }: { r: Report; where: string }) {
  const p = patience(feltDelay(r.delay, r.worst));
  const b = band(p);
  const prev = useRef(b);
  const [shake, setShake] = useState(0);
  useEffect(() => {
    if (b < prev.current) setShake((k) => k + 1);
    prev.current = b;
  }, [b]);
  return (
    <div key={shake} className={`${styles.gauge} ${shake ? styles.shake : ''}`} data-band={b} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)} aria-label="Sürücülerin sabrı">
      <div className={styles.row}>
        <b>Sürücülerin sabrı</b>
        <span>{WORDS[b]}</span>
      </div>
      <div className={styles.track}>
        <i style={{ width: `${Math.round(p * 100)}%` }} />
      </div>
      <small>
        Ortalama {Math.round(r.delay)} sn bekleme
        {r.worstMv && r.worst > 15 ? ` · en çok ${where}${moveName(r.worstMv)} (${Math.round(r.worst)} sn)` : ''}
      </small>
    </div>
  );
}

export interface Sample {
  t: number;
  /** Bütün kollarda bekleyen araç. */
  q: number;
  /** O an en uzun kuyruklu kol. */
  leg: string;
  legQ: number;
}

/** Tutanaktaki kuyruk çizelgesi: vardiya boyunca bekleyen araç sayısı. */
export function Timeline({ samples, duration }: { samples: Sample[]; duration: number }) {
  if (samples.length < 3) return null;
  const W = 520;
  const H = 96;
  const max = Math.max(5, ...samples.map((s) => s.q));
  const x = (t: number) => (t / duration) * W;
  const y = (q: number) => H - 6 - (q / max) * (H - 18);
  const line = samples.map((s, i) => `${i ? 'L' : 'M'}${x(s.t).toFixed(1)},${y(s.q).toFixed(1)}`).join(' ');
  const peak = samples.reduce((m, s) => (s.q > m.q ? s : m), samples[0]);
  const area = `${line} L${x(samples[samples.length - 1].t).toFixed(1)},${H - 6} L0,${H - 6} Z`;
  const mm = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  return (
    <figure className={styles.timeline}>
      <figcaption>Vardiya boyunca kuyruk</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Kuyruk en çok ${mm(peak.t)}’da ${peak.q} araçtı`}>
        <line x1={0} x2={W} y1={H - 6} y2={H - 6} className={styles.axis} />
        <path d={area} className={styles.area} />
        <path d={line} className={styles.line} />
        <circle cx={x(peak.t)} cy={y(peak.q)} r={4} className={styles.peak} />
      </svg>
      <p>
        En kötü an <b>{mm(peak.t)}</b>: {peak.q} araç bekliyordu, en uzun kuyruk <b>{peak.leg}</b> ({peak.legQ} araç).
      </p>
    </figure>
  );
}
