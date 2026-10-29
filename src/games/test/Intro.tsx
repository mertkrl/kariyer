import { useState } from 'react';
import { audioEngine } from '../../audio/audioEngine';
import * as sfx from './sfx';
import { EXAM_SECTIONS } from './data/questions';
import { clockText, QUESTIONS_PER_SECTION, SECTION_SECONDS } from './logic';
import type { ExamProgress } from './progress';
import styles from './TestGame.module.css';

/** Giriş: solda karşılama ve kurallar, sağda testin künyesi ve bölümleri. İlk dokunuşta bekleme müziği başlar. */
export function Intro({ onStart, saved, onResume, onDiscard }: { onStart: () => void; saved: ExamProgress | null; onResume: () => void; onDiscard: () => void }) {
  const [consent, setConsent] = useState(false);
  const wake = () => {
    audioEngine.init();
    sfx.startHold();
  };
  const total = EXAM_SECTIONS.length * QUESTIONS_PER_SECTION;
  const minutes = (EXAM_SECTIONS.length * SECTION_SECONDS) / 60;
  return (
    <main className={`${styles.page} ${styles.pageWide}`}>
      <section className={`${styles.card} ${styles.hero}`}>
        <div className={styles.heroMain}>
          <p className={styles.eyebrow}>Aday Değerlendirme Merkezi</p>
          <h1 className={styles.h1}>Genel Yetenek ve Uyum Testi</h1>
          <p className={styles.lead}>Değerli adayımız, bu bilimsel olarak geliştirilmiş* değerlendirme bilişsel yeteneklerinizi, iş hayatına hazırlığınızı ve kurum kültürümüzle uyumunuzu ölçer.</p>
          {saved && (
            <div className={styles.resume} role="status">
              <p>
                <b>Yarım kalan bir testiniz var.</b> Bölüm {saved.sec + 1} / {saved.exam.length} · {saved.answers.filter((a) => a !== null).length} cevap kayıtlı
                {saved.phase === 'run' && ` · ${clockText(saved.left)} kaldı`}
              </p>
              <div>
                <button
                  className={styles.primary}
                  onClick={() => {
                    wake();
                    audioEngine.playUi('start');
                    onResume();
                  }}
                >
                  Kaldığım yerden devam et →
                </button>
                <button className={styles.linkBtn} onClick={onDiscard}>
                  Kaydı sil
                </button>
              </div>
            </div>
          )}
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

/** Girişteki bölüm listesinin alt satırları. */
const SECTION_NOTES: Record<string, string> = {
  cognitive: 'Sayısal, sözel, şekil ve dikkat',
  simulation: 'Gerçek iş hayatından sahneler',
  culture: 'Değerlerimizle ne kadar örtüşüyorsunuz?',
  general: 'Her çalışanın bilmesi gerekenler',
};

