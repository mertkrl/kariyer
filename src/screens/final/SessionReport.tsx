import { useState } from 'react';
import { reportText, type SessionReport as Report } from '../../game/engine/report';
import { useDialog } from '../../components/ui/useDialog';
import styles from './SessionReport.module.css';

/*
 * Final ekranının üstündeki oturum raporu: yazdırılacak (ya da PDF olarak kaydedilecek) bir
 * kâğıt ve onu metin olarak kopyalayan bir düğme. Cihazda hazırlanır; hiçbir şey gönderilmez.
 */

const DIFFICULTY_NAME = { relaxed: 'Rahat', normal: 'Normal', hard: 'Zor' } as const;

export function SessionReport({ report, onClose }: { report: Report; onClose: () => void }) {
  const ref = useDialog<HTMLDivElement>(onClose);
  const [copied, setCopied] = useState<boolean | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reportText(report));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div ref={ref} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="report-title" onClick={(e) => e.stopPropagation()}>
        <div className={styles.toolbar}>
          <button onClick={() => window.print()}>Yazdır / PDF</button>
          <button onClick={() => void copy()}>{copied ? 'Kopyalandı ✓' : copied === false ? 'Kopyalanamadı' : 'Metin olarak kopyala'}</button>
          <button onClick={onClose} aria-label="Raporu kapat">✕</button>
        </div>

        <header className={styles.head}>
          <h2 id="report-title">Oturum raporu</h2>
          <p>
            Sen İK'sin · oyun kodu <b>#{report.seed}</b> · {DIFFICULTY_NAME[report.difficulty]}
          </p>
        </header>

        <section className={styles.summary}>
          <div>
            <small>Son</small>
            <b>{report.endingTitle}</b>
          </div>
          <div>
            <small>Performans</small>
            <b>{report.performans}</b>
          </div>
          <div>
            <small>Vicdan</small>
            <b>{report.vicdan}</b>
          </div>
        </section>

        <section>
          <h3>Hafta</h3>
          <ul className={styles.facts}>
            <li>
              {report.decided} dosya: {report.approved} teste geçirildi, {report.rejected} ret
              {report.readShare !== null && <> · okuyarak verilen kararlar %{Math.round(report.readShare * 100)}</>}
            </li>
            <li>
              Referans araması {report.references} · yapay zekâ önerisi {report.aiUses}
            </li>
            <li>
              Müdürün ricaları: {report.complies} uyuldu, {report.refusals} geri çevrildi
            </li>
            <li>{report.hired ? `İşe alınan: ${report.hired.name} (uygunluk ${report.hired.fit}/5)` : 'İşe alım yapılmadı'}</li>
          </ul>
        </section>

        <section>
          <h3>Test</h3>
          <p className={styles.muted}>
            {report.test.tested} kişi teste geçti{report.test.selfScore !== null && ` · senin puanın ${report.test.selfScore}`}
          </p>
          {report.test.strongBelow.length + report.test.weakAbove.length > 0 && (
            <ul className={styles.facts}>
              {report.test.strongBelow.map((t) => (
                <li key={t.name}>
                  <b>{t.name}</b>: güçlü dosya, test {t.score}
                  <em>{t.invited ? ' · yine de çağrıldı' : ' · çağrılmadı'}</em>
                </li>
              ))}
              {report.test.weakAbove.map((t) => (
                <li key={t.name}>
                  <b>{t.name}</b>: zayıf dosya, test {t.score}
                  {t.invited && <em> · çağrıldı</em>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3>Sistemin haksız yere aşağı ittiği güçlü adaylar</h3>
          {report.flaggedStrong.length ? (
            <ul className={styles.facts}>
              {report.flaggedStrong.map((f) => (
                <li key={f.name}>
                  <b>{f.name}</b>: {f.decision === 'approve' ? 'teste geçirildi' : 'reddedildi'}
                  {f.considered !== null && <em>{f.considered ? ' · okunarak' : ' · okunmadan'}</em>}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>Bu hafta önüne gelmedi.</p>
          )}
        </section>

        <section>
          <h3>Tartışma soruları</h3>
          <ol className={styles.questions}>
            {report.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </section>

        <p className={styles.foot}>Bu rapor yalnızca bu cihazda üretildi; hiçbir yere gönderilmedi. Aynı haftayı oynatmak için adrese ?seed={report.seed} ekleyin.</p>
      </div>
    </div>
  );
}
