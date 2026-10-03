import { audioEngine } from '../audio/audioEngine';
import { useState, type CSSProperties } from 'react';
import { useGameStore } from '../game/store';
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
      <div className={styles.content}>
        <div className={styles.headerBlock}>
          <div className={styles.eyebrow}>Adım 1 / İlan Taslakları</div>
          <h1 className={styles.title}>Hangi ilanı yayınlıyorsun?</h1>
          <p className={styles.subtitle}>Şirket 3 taslak hazırladı. Seçtiğin ilan hafta boyunca yayında kalacak.</p>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="İlan taslakları">
          {jobDrafts.map((job, index) => {
            const isSelected = job.id === selectedId;
            return (
              <button
                key={job.id}
                role="tab"
                aria-selected={isSelected}
                className={`${styles.tab} ${isSelected ? styles.tabSelected : ''}`}
                style={{ '--accent': job.accent } as CSSProperties}
                onClick={() => {
                  audioEngine.init();
                  audioEngine.playUi('select', index);
                  setSelectedId(job.id);
                }}
              >
                <span className={styles.tabDot} />
                {TAB_LABELS[job.id] ?? job.tag}
              </button>
            );
          })}
        </div>

        <div className={styles.postingPreview} key={selectedJob.id}>
          <div className={styles.postingAccentBar} style={{ background: selectedJob.accent }} />

          <div className={styles.postingBody}>
            <div className={styles.postingEyebrow}>Aktif İlan Önizlemesi</div>

            <div className={styles.postingHeader}>
              <div className={styles.postingHeaderLeft}>
                <div className={styles.postingLogo} style={{ background: selectedJob.accent }}>
                  {selectedJob.companyLine.charAt(0)}
                </div>
                <div>
                  <div className={styles.postingTitle}>{selectedJob.title}</div>
                  <div className={styles.postingMeta}>{selectedJob.companyLine}</div>
                </div>
              </div>
              <div className={styles.postingFacts}>
                <div className={styles.postingFact}>
                  <span className={styles.postingFactIcon}>📍</span>
                  {selectedJob.location}
                </div>
                <div className={styles.postingFact}>
                  <span className={styles.postingFactIcon}>🕒</span>
                  {selectedJob.employmentType}
                </div>
                <div className={`${styles.postingFact} ${styles.postingFactSalary}`}>
                  <span className={styles.postingFactIcon}>💰</span>
                  <span className="sr-only">Maaş aralığı: </span>
                  {salaryText(selectedJob)}
                </div>
              </div>
            </div>

            <div className={styles.postingDivider} />

            <p className={styles.postingAbout}>{selectedJob.aboutRole}</p>

            <div className={styles.postingGrid}>
              <div className={styles.postingSection}>
                <div className={styles.postingSectionLabel}>
                  <span className={styles.postingSectionDot} style={{ background: selectedJob.accent }} />
                  Görev ve Sorumluluklar
                </div>
                <ul className={styles.postingList}>
                  {selectedJob.responsibilities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className={styles.postingSection}>
                <div className={styles.postingSectionLabel}>
                  <span className={styles.postingSectionDot} style={{ background: selectedJob.accent }} />
                  Aranan Nitelikler
                </div>
                <ul className={styles.postingList}>
                  {selectedJob.requirements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className={styles.postingSection}>
                <div className={styles.postingSectionLabel}>
                  <span className={styles.postingSectionDot} style={{ background: selectedJob.accent }} />
                  Sunduklarımız
                </div>
                <ul className={styles.postingList}>
                  {selectedJob.benefits.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
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
