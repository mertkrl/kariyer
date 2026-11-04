import { useEffect, useRef } from 'react';
import { PASS_SCORE, TOOL_LABEL, verdict, type Level } from './levels';
import { PRICE, SAW_PRICE, TACK_PRICE, type Material, type World } from './model';
import type { Report } from './traffic';
import type { Probe } from './inspect';
import styles from './AsfaltGame.module.css';
import ui from './Work.module.css';
import { TACK_LITRE, money, tons } from './format';

/* İşin sonu: hakediş fişi (maliyet, kalite, trafik günleri) ve şişle ölçümün kartı. */

export function Receipt({ level, world, report, last, onNext, onRetry }: { level: Level; world: World; report: Report; last: boolean; onNext: () => void; onRetry: () => void }) {
  const rows: [string, number][] = [
    ['Kesilmeyen kırık kenar', report.uncut],
    ['Yapıştırıcısız kenar', report.unbonded],
    ['Yapıştırıcısız taban (sütun)', report.untacked],
    ['Dolgu altında moloz (kova)', Math.ceil(report.rubble / 4)],
    ['Tümsek (sütun)', report.bumps],
    ['Çöken yer (sütun)', report.dips],
    ['İnce asfalt', report.thin],
    ['Mıcırsız', report.noGravel],
    ['Asfaltsız (çıplak toprak)', report.bare],
    ['Taşıyıcıda toprak (ilk 30 cm)', report.soilBase],
    ['Sıkışmamış dolgu', report.unpacked],
    ['Soğumadan açılan asfalt', report.hot],
    ['Sulu asfalt', report.wet],
    ['Yola saçılan (kova)', Math.round(report.spill / 4)],
  ];
  const passed = report.score >= PASS_SCORE;
  const ref = useRef<HTMLButtonElement>(null);
  const retry = useRef<HTMLButtonElement>(null);
  useEffect(() => (passed ? ref : retry).current?.focus(), [passed]);
  return (
    <div className={styles.receiptWrap}>
      <div className={styles.receipt} role="dialog" aria-label="Hakediş fişi">
        <header>
          <b>HAKEDİŞ FİŞİ</b>
          <span>{level.place}</span>
        </header>
        <table>
          <tbody>
            {(['soil', 'gravel', 'asphalt'] as Material[]).map((m) => (
              <tr key={m}>
                <td>{TOOL_LABEL[m].name}</td>
                <td>{tons(world.used[m])}</td>
                <td>{money(world.used[m] * PRICE[m])}</td>
              </tr>
            ))}
            <tr>
              <td>Yapıştırıcı</td>
              <td>{Math.round(world.tackUsed * TACK_LITRE)} lt</td>
              <td>{money(world.tackUsed * TACK_PRICE)}</td>
            </tr>
            <tr>
              <td>Asfalt kesme</td>
              <td>{(world.cuts.left !== null ? 1 : 0) + (world.cuts.right !== null ? 1 : 0)} kesim</td>
              <td>{money(((world.cuts.left !== null ? 1 : 0) + (world.cuts.right !== null ? 1 : 0)) * SAW_PRICE)}</td>
            </tr>
            <tr className={styles.total}>
              <td>Toplam</td>
              <td />
              <td className={report.cost > level.budget ? styles.bad : undefined}>{money(report.cost)}</td>
            </tr>
          </tbody>
        </table>
        {report.phases.length > 0 && (
          <ol className={styles.days}>
            {report.phases.map((p) => (
              <li key={p.weather} className={p.dips > 0 ? styles.bad : undefined}>
                <span>
                  {{ sun: '☀️', rain: '🌧', snow: '❄️' }[p.weather]} {p.label}
                </span>
                <span>{p.dips === 0 ? 'sağlam' : `${p.dips} yer çöktü`}</span>
              </li>
            ))}
          </ol>
        )}
        {report.reasons.length > 0 && (
          <div className={ui.why}>
            <b>Neden bu puan?</b>
            <ol>
              {report.reasons.slice(0, 3).map((r) => (
                <li key={r.label}>
                  <span>{r.label}</span>
                  <span>−{r.points}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {world.wasted > 0 && (
          <p className={ui.waste}>
            Boşa giden malzeme: <b>{money(world.wasted)}</b> (kürekle atılan ya da silindirin yoldan ittiği)
          </p>
        )}
        <details className={ui.allRows}>
          <summary>Bütün kalemler</summary>
          <ul>
            {rows.map(([k, v]) => (
              <li key={k} className={v > 0 ? styles.bad : undefined}>
                <span>{k}</span>
                <span>{v === 0 ? 'yok' : v}</span>
              </li>
            ))}
          </ul>
        </details>
        <div className={styles.score}>
          <span>Yama puanı</span>
          <b>{report.score}</b>
        </div>
        <p className={styles.verdict}>{verdict(report)}</p>
        {passed ? (
          <p className={styles.after}>{level.after}</p>
        ) : (
          <p className={`${styles.after} ${styles.bad}`}>Kontrol mühendisi işi teslim almadı: en az {PASS_SCORE} puan gerekir. Çukuru baştan yap.</p>
        )}
        <div className={styles.actions}>
          <button ref={retry} type="button" className={styles.ghost} onClick={onRetry}>
            Baştan dök
          </button>
          <button ref={ref} type="button" className={styles.primary} onClick={onNext} disabled={!passed}>
            {last ? 'Mesai bitti →' : 'Sonraki iş →'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Ölçüm kartı: imlecin yanında karot kesiti, sıcaklık, sıkışma ve mastar sapması. */
export function ProbeCard({ reading, x, y }: { reading: Probe; x: number; y: number }) {
  const dev = reading.deviation;
  const flip = x > window.innerWidth - 300;
  return (
    <div className={ui.probe} style={{ left: flip ? x - 268 : x + 18, top: Math.max(70, Math.min(window.innerHeight - 260, y - 40)) }} aria-live="polite">
      <header>
        <b>Karot · ölçüm</b>
        <span className={Math.abs(dev) > 10 ? styles.bad : styles.okTxt}>
          Mastar {dev > 0 ? '+' : ''}
          {dev} mm
        </span>
      </header>
      <ul>
        {reading.layers.map((l, i) => (
          <li key={i}>
            <span>{l.name}</span>
            <span>
              {l.cm > 0 && `${l.cm.toLocaleString('tr-TR')} cm`}
              {l.temp !== undefined && <em className={l.temp < 78 ? styles.bad : undefined}> · {l.temp} °C</em>}
              {l.proctor !== undefined && l.name !== 'Asfalt' && <em className={l.proctor < 95 ? styles.bad : styles.okTxt}> · %{l.proctor}</em>}
              {l.proctor !== undefined && l.name === 'Asfalt' && <em className={l.proctor < 95 ? styles.bad : styles.okTxt}> · %{l.proctor} sıkı</em>}
              {l.tacked && <em> · yapıştırıcılı</em>}
            </span>
          </li>
        ))}
      </ul>
      <p className={ui.probeCarrier}>
        Taşıyıcı (asfalt + mıcır): <b className={reading.carrier < 30 ? styles.bad : styles.okTxt}>{reading.carrier.toLocaleString('tr-TR')} cm</b> / en az 30 cm
      </p>
      <small>Sıkışma %95 Proctor üstü, mastar ±10 mm içinde olmalı. Toprak yol hizasının 30 cm altında kalmalı.</small>
    </div>
  );
}
