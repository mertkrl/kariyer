import { audioEngine } from '../audio/audioEngine';
import { useState, type CSSProperties } from 'react';
import { useGameStore } from '../game/store/store';
import { jobDrafts, salaryText } from '../game/data/jobs';
import { Button } from '../components/ui/Button';
import styles from './JobSelectScreen.module.css';

const TAB_LABELS: Record<string, string> = { standart: 'Standart İlan', enerjik: 'Kurum Kültürü', sonuc: 'Performans' };

export function JobSelectScreen() {
  const publishJob = useGameStore((s) => s.publishJob);
  const difficulty = useGameStore((s) => s.difficulty);
  const setDifficulty = useGameStore((s) => s.setDifficulty);
  const [selectedId, setSelectedId] = useState<string>(jobDrafts[0].id);

  const selectedJob = jobDrafts.find((j) => j.id === selectedId) ?? jobDrafts[0];

  return (
    <div className={styles.screen}>
      <button
        className={styles.backButton}
        onClick={() => {
          audioEngine.playUi('click');
          audioEngine.stopAmbient();
          // kayıt yalnızca ilan yayınlanınca yazılır; geri dönmek eski kayda dokunmaz
          useGameStore.setState({ phase: 'welcome' });
        }}
      >
        ← Ana sayfaya dön
      </button>
      <div className={styles.content}>
        <div className={styles.headerBlock}>
          <div className={styles.eyebrow}>Adım 1 / İlan Taslakları</div>
          <h1 className={styles.title}>Hangi ilanı yayınlıyorsun?</h1>
          <p className={styles.subtitle}>Şirket 3 taslak hazırladı. Seçtiğin ilan hafta boyunca yayında kalacak.</p>
        </div>

        <div className={styles.workspace}>
          <div className={styles.drafts} role="tablist" aria-label="İlan taslakları" aria-orientation="vertical">
            {jobDrafts.map((job, index) => {
              const isSelected = job.id === selectedId;
              return (
                <button
                  key={job.id}
                  role="tab"
                  aria-selected={isSelected}
                  className={`${styles.draft} ${isSelected ? styles.draftSelected : ''}`}
                  style={{ '--accent': job.accent } as CSSProperties}
                  onClick={() => {
                    audioEngine.init();
                    audioEngine.playUi('select', index);
                    setSelectedId(job.id);
                  }}
                >
                  <span className={styles.draftTop}>
                    <span className={styles.draftNo}>Taslak {index + 1}</span>
                    <span className={styles.draftTag}>{TAB_LABELS[job.id] ?? job.tag}</span>
                  </span>
                  <span className={styles.draftTitle}>{job.title}</span>
                  <span className={styles.draftSummary}>{job.summary}</span>
                  <span className={styles.draftMeta}>
                    <span>{job.location}</span>
                    <span>{salaryText(job)}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className={styles.window} style={{ '--accent': selectedJob.accent } as CSSProperties}>
            <div className={styles.titleBar}>
              <span className={styles.titleGlyph}>İK</span>
              <span className={styles.titleText}>İşe Alım Portalı — İlan Önizlemesi</span>
              <span className={styles.titleState}>Taslak</span>
            </div>

            <article className={styles.posting} key={selectedJob.id} role="tabpanel">
              <header className={styles.postingHeader}>
                <div className={styles.postingLogo}>{selectedJob.companyLine.charAt(0)}</div>
                <div className={styles.postingHeading}>
                  <h2 className={styles.postingTitle}>{selectedJob.title}</h2>
                  <div className={styles.postingMeta}>{selectedJob.companyLine}</div>
                </div>
              </header>

              <dl className={styles.facts}>
                <div>
                  <dt>Konum</dt>
                  <dd>{selectedJob.location}</dd>
                </div>
                <div>
                  <dt>Çalışma şekli</dt>
                  <dd>{selectedJob.employmentType}</dd>
                </div>
                <div className={styles.factSalary}>
                  <dt>Maaş aralığı</dt>
                  <dd>{salaryText(selectedJob)}</dd>
                </div>
              </dl>

              <p className={styles.postingAbout}>{selectedJob.aboutRole}</p>

              <div className={styles.postingSections}>
              {(
                [
                  ['Görev ve Sorumluluklar', selectedJob.responsibilities],
                  ['Aranan Nitelikler', selectedJob.requirements],
                  ['Sunduklarımız', selectedJob.benefits],
                ] as const
              ).map(([label, items]) => (
                <section key={label} className={styles.postingSection}>
                  <h3 className={styles.postingSectionLabel}>{label}</h3>
                  <ul className={styles.postingList}>
                    {items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
              </div>
            </article>
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.difficulty} role="radiogroup" aria-label="Zorluk">
            <span className={styles.difficultyLabel}>Zorluk</span>
            {(
              [
                ['relaxed', 'Rahat'],
                ['normal', 'Normal'],
                ['hard', 'Zor'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="radio"
                aria-checked={difficulty === id}
                className={`${styles.diffBtn} ${difficulty === id ? (id === 'hard' ? styles.diffHard : styles.diffOn) : ''}`}
                onClick={() => {
                  audioEngine.init();
                  audioEngine.playUi('select', id === 'hard' ? 3 : id === 'relaxed' ? 0 : 1);
                  setDifficulty(id);
                }}
              >
                {label}
              </button>
            ))}
            <span className={styles.difficultyHint}>
              {difficulty === 'hard'
                ? 'Saat daha hızlı akar, müdür daha sert, gün içinde sürprizler çıkar.'
                : difficulty === 'relaxed'
                  ? 'Saat daha yavaş akar: dosyaları kendi hızında okursun. Hikâye ve puanlama aynı.'
                  : 'Hikâyenin tasarlandığı hız.'}
            </span>
          </div>
          <Button variant="gold" sound="confirm" onClick={() => publishJob(selectedJob.id)}>
            İLANI YAYINLA →
          </Button>
        </div>
      </div>
    </div>
  );
}
