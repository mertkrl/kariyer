import { useState } from 'react';
import { audioEngine } from '../../audio/audioEngine';
import * as sfx from './sfx';
import { EXAM_SECTIONS } from './data/questions';
import { clockText, QUESTIONS_PER_SECTION, SECTION_SECONDS } from './logic';
import type { ExamProgress } from './progress';
import styles from './TestGame.module.css';
import rs from './Resume.module.css';

/** Giriş: solda karşılama ve kurallar, sağda testin künyesi ve bölümleri. İlk dokunuşta bekleme müziği başlar. */
export function Intro({ onStart, saved, onResume, onDiscard }: { onStart: () => void; saved: ExamProgress | null; onResume: () => void; onDiscard: () => void }) {
  const [consent, setConsent] = useState(false);
  const wake = () => {
    audioEngine.init();
    sfx.startHold();
  };
  const total = EXAM_SECTIONS.length * QUESTIONS_PER_SECTION;
  const minutes = (EXAM_SECTIONS.length * SECTION_SECONDS) / 60;
  // yarım kalan test varsa önce yalnızca devam / sil seçimi gelir; silinince kurallı giriş açılır
  if (saved)
    return (
      <main className={`${styles.page} ${rs.resumePage}`}>
        <ResumeCard
          saved={saved}
          onResume={() => {
            wake();
            audioEngine.playUi('start');
            onResume();
          }}
          onDiscard={onDiscard}
        />
      </main>
    );
  return (
    <main className={`${styles.page} ${styles.pageWide}`}>
      <section className={`${styles.card} ${styles.hero}`}>
        <div className={styles.heroMain}>
          <p className={styles.eyebrow}>Aday Değerlendirme Merkezi</p>
          <h1 className={styles.h1}>Genel Yetenek ve Uyum Testi</h1>
          <p className={styles.lead}>Değerli adayımız, bu bilimsel olarak geliştirilmiş* değerlendirme bilişsel yeteneklerinizi, iş hayatına hazırlığınızı ve kurum kültürümüzle uyumunuzu ölçer.</p>
          <ul className={styles.rules}>
            <li>
              <i aria-hidden="true">⏱</i> Test bölüm bölüm ilerler; her bölümün kendi süresi var. Süre bitince bölüm kendiliğinden kapanır.
            </li>
            <li>
              <i aria-hidden="true">↔</i> Sorular sırayla gelir; boş geçebilir, geçtiğiniz sorulara geri dönebilirsiniz.
            </li>
            <li>
              <i aria-hidden="true">◉</i> Sekme değiştirmek "bağlılık eksikliği" olarak raporlanır.
            </li>
            <li>
              <i aria-hidden="true">✓</i> Doğru cevap yoktur.** <span className={styles.muted}>(**vardır)</span>
            </li>
          </ul>
          <label className={`${styles.consent} ${consent ? styles.consentOn : ''}`}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                wake();
                sfx.click();
                setConsent(e.target.checked);
              }}
            />
            <span>Aydınlatma metnini okudum, anlamadım ve kabul etmiyorum.</span>
          </label>
          <div className={styles.startRow}>
            <button
              className={`${styles.primary} ${styles.big}`}
              disabled={!consent}
              onClick={() => {
                wake();
                audioEngine.playUi('start');
                onStart();
              }}
            >
              Teste başla →
            </button>
            <p className={styles.fine}>*Kendi içimizde.</p>
          </div>
        </div>

        <aside className={styles.heroSide} aria-label="Test bilgileri">
          <div className={styles.stats}>
            <div>
              <b>{total}</b>
              <span>soru</span>
            </div>
            <div>
              <b>{EXAM_SECTIONS.length}</b>
              <span>bölüm</span>
            </div>
            <div>
              <b>{minutes}</b>
              <span>dakika</span>
            </div>
          </div>
          <ol className={styles.sectionList}>
            {EXAM_SECTIONS.map((s, i) => (
              <li key={s.id}>
                <span className={styles.sectionNo}>{i + 1}</span>
                <span>
                  {s.title}
                  <small>{SECTION_NOTES[s.id]}</small>
                </span>
              </li>
            ))}
          </ol>
          <p className={styles.trust}>
            <b>ISO 9001*</b> uyumlu değerlendirme <span className={styles.muted}>(*başvuru aşamasında)</span>
          </p>
        </aside>
      </section>
    </main>
  );
}

/** Yarım kalan test kartı: bölüm adımları, ilerleme çubuğu, künye ve iki aşamalı silme. */
function ResumeCard({ saved, onResume, onDiscard }: { saved: ExamProgress; onResume: () => void; onDiscard: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const total = saved.answers.length;
  const answered = saved.answers.filter((a) => a !== null).length;
  const pct = total ? Math.round((answered / total) * 100) : 0;
  const current = saved.exam[saved.sec];
  return (
    <section className={rs.resume} aria-labelledby="resume-title">
      <header className={rs.resumeHead}>
        <span className={rs.resumeIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h12v18l-6-4-6 4z" />
          </svg>
        </span>
        <div>
          <p className={rs.resumeKicker}>Kaydedilmiş oturum</p>
          <h1 id="resume-title" className={rs.resumeTitle}>
            Yarım kalan bir testiniz var
          </h1>
          <p className={rs.resumeLead}>Cevaplarınız ve süreniz kaydedildi. Kaldığınız yerden devam edebilir ya da kaydı silip testi baştan başlatabilirsiniz.</p>
        </div>
        <span className={rs.resumePct}>%{pct}</span>
      </header>

      <ol className={rs.resumeSteps} aria-label="Bölümler">
        {saved.exam.map((s, i) => {
          const state = i < saved.sec ? 'done' : i === saved.sec ? 'now' : 'next';
          return (
            <li key={s.title} className={rs[`step_${state}`]} aria-current={state === 'now' ? 'step' : undefined}>
              <span className={rs.stepBar} />
              <span className={rs.stepLabel}>
                <b>{state === 'done' ? '✓' : i + 1}</b> {s.title}
              </span>
            </li>
          );
        })}
      </ol>

      <dl className={rs.resumeMeta}>
        <div>
          <dt>Şu an</dt>
          <dd>
            Bölüm {saved.sec + 1}
            <small>{current?.title}</small>
          </dd>
        </div>
        <div>
          <dt>Cevaplanan</dt>
          <dd>
            {answered}
            <small>/ {total} soru</small>
          </dd>
        </div>
        <div>
          <dt>Bölüm süresi</dt>
          <dd>
            {saved.phase === 'run' ? clockText(saved.left) : 'Başlamadı'}
            <small>{saved.phase === 'run' ? 'kaldı' : 'bölüm girişindesiniz'}</small>
          </dd>
        </div>
      </dl>

      <div className={rs.resumeActions}>
        <button className={`${styles.primary} ${rs.resumeGo}`} onClick={onResume}>
          Kaldığım yerden devam et <span aria-hidden="true">→</span>
        </button>
        {confirm ? (
          <span className={rs.resumeConfirm} role="alert">
            Tüm cevaplar silinsin mi?
            <button className={rs.resumeDanger} onClick={onDiscard}>
              Evet, sil
            </button>
            <button className={styles.linkBtn} onClick={() => setConfirm(false)}>
              Vazgeç
            </button>
          </span>
        ) : (
          <button className={rs.resumeGhost} onClick={() => setConfirm(true)}>
            Kaydı sil, yeni teste başla
          </button>
        )}
      </div>
    </section>
  );
}

/** Girişteki bölüm listesinin alt satırları. */
const SECTION_NOTES: Record<string, string> = {
  cognitive: 'Sayısal, sözel, şekil ve dikkat',
  simulation: 'Gerçek iş hayatından sahneler',
  culture: 'Değerlerimizle ne kadar örtüşüyorsunuz?',
  general: 'Her çalışanın bilmesi gerekenler',
};

