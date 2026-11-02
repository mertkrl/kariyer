import { cycleOf, forecast } from './controller';
import { mainPhase, travel, waveError } from './engineer';
import type { Sim } from './sim';
import { Bay } from './Console';
import ui from './Console.module.css';

/*
 * Yeşil dalga bölümü: zaman-yol çizelgesi. Yatayda önümüzdeki 80 saniye, dikeyde caddenin
 * kavşakları (batı altta). Her satır o kavşağın doğuya düz ışığı: yeşil, sarı, kırmızı. Eğik
 * kesikli çizgiler, ilk kavşaktan yeşilde çıkan aracın hız sınırına yakın giderek her kavşağa
 * vardığı an: çizgi yeşile düşüyorsa araç durmadan geçer. "Dalgayı kur" döngüleri eşitler ve
 * ışıkları kaydırır; kayma birkaç evrede tamamlanır.
 */

const SPAN = 80;
const W = 260;
const LEFT = 64;
const ROW = 22;

export function WaveBay({ sims, xs, onWave }: { sims: Sim[]; xs: number[]; onWave: () => void }) {
  const n = sims.length;
  const H = n * ROW + 14;
  const k = (W - LEFT - 6) / SPAN;
  const y = (i: number) => H - 10 - i * ROW - ROW / 2;
  const rows = sims.map((s) => forecast(s, 'W.T', SPAN, 1));
  // ilk kavşakta yeşilin başladığı anlar: dalganın çıkış noktaları
  const starts = rows[0].flatMap((st, t) => (st === 'green' && (t === 0 || rows[0][t - 1] !== 'green') ? [t] : []));
  const errs = sims.map((_, i) => waveError(sims, xs, i));
  const moving = sims.some((s) => Math.abs(s.ctl.shift ?? 0) > 0.5);
  const same = sims.every((s) => cycleOf(s.plan) === cycleOf(sims[0].plan));
  const ok = same && errs.every((e) => Math.abs(e) < 2.5);
  const busy = sims.some((s) => s.ctl.hold || mainPhase(s) < 0 || s.fault > s.t);
  const status = ok ? 'Dalga oturdu: batıdan gelen durmadan geçer' : moving ? 'Işıklar kayıyor, dalga oturuyor…' : same ? 'Bir ışık elle değişti, dalga kaydı' : 'Işıklar birbirinden habersiz';
  return (
    <Bay label="Yeşil dalga" className={ui.wave}>
      <svg viewBox={`0 0 ${W} ${H}`} className={ui.waveChart} role="img" aria-label={`Zaman-yol çizelgesi. ${status}`}>
        {[0, 20, 40, 60, 80].map((t) => (
          <g key={t}>
            <line x1={LEFT + t * k} x2={LEFT + t * k} y1={2} y2={H - 10} className={ui.waveGrid} />
            <text x={LEFT + t * k} y={H - 1} className={ui.waveAxis}>
              {t ? `+${t}` : 'şimdi'}
            </text>
          </g>
        ))}
        {sims.map((s, i) => (
          <g key={s.node}>
            <text x={LEFT - 6} y={y(i) + 3.5} className={ui.waveName}>
              {s.name}
            </text>
            {rows[i].map((st, t) => (
              <rect key={t} x={LEFT + t * k} y={y(i) - 5} width={k + 0.3} height={10} className={st === 'green' ? ui.wG : st === 'amber' ? ui.wA : ui.wR} />
            ))}
          </g>
        ))}
        {starts.map((t0) => (
          <polyline key={t0} className={ui.waveLine} points={sims.map((_, i) => `${LEFT + (t0 + 2 + travel(sims, xs, i)) * k},${y(i)}`).join(' ')} />
        ))}
      </svg>
      <p className={`${ui.waveStatus} ${ok ? ui.waveOk : ''}`}>{status}</p>
      <button type="button" className={ui.waveBtn} onClick={onWave} disabled={busy} title={busy ? 'Konvoy için tutulan ya da arızalı ışık varken dalga kurulamaz.' : 'Döngüleri eşitler, ışıkları araç hızına göre kaydırır.'}>
        {ok ? 'Dalgayı yeniden kur' : 'Dalgayı kur'}
      </button>
    </Bay>
  );
}
