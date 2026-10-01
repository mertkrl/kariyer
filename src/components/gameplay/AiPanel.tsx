import { useGameStore } from '../../game/store';
import { candidates } from '../../game/data/candidates';
import { days } from '../../game/data/days';
import type { Candidate, EvaluatedField } from '../../game/types';
import { atsReport, systemLineWith } from '../../game/ats';
import { AiIcon } from '../ui/AiIcon';
import type { AiAnalysis } from './useAiAnalysis';
import styles from '../../screens/GameplayScreen.module.css';

/** What the AI "reads" in each section: one flagged, the rest waved through with a stock phrase. */
const SECTIONS: { label: string; field?: EvaluatedField; ok: string }[] = [
  { label: 'Profil', field: 'motivation', ok: 'Metin ayrıştırıldı; olumsuz ifade bulunamadı.' },
  { label: 'İş deneyimi', field: 'experience', ok: 'Süre ve unvanlar okundu.' },
  { label: 'Şirket soruları', field: 'questions', ok: 'Cevaplar anahtar kelimelerle eşleşti.' },
  { label: 'Maaş', field: 'salary', ok: 'Bant içinde.' },
  { label: 'Beceriler', field: 'skills', ok: 'İlanla eşleşme yeterli.' },
  { label: 'Eğitim, sertifika, referans', ok: 'Alan dolu; puanlamada ağırlığı yok.' },
];

function sectionNotes(c: Candidate) {
  const reason = /Gerekçe: ([^·]+)/.exec(systemLineWith(c, atsReport(c, 0)))?.[1]?.trim() ?? 'Sistem işareti.';
  return SECTIONS.map((sec) => {
    const bad = !!sec.field && sec.field === c.flaggedField;
    return { label: sec.label, bad, text: bad ? reason : sec.ok };
  });
}

interface Props {
  analysis: AiAnalysis;
  /** The AI box is offline on the crash day, and during a hard-mode IT outage. */
  aiOffline: boolean;
  itOutage: boolean;
  onBreak: boolean;
}

/**
 * The "Yapay Zeka Analizi" box: run the AI on the open file, then its verdict — the ATS parse
 * report, what it read in each section, and the hidden note behind the score.
 */
export function AiPanel({ analysis, aiOffline, itOutage, onBreak }: Props) {
  const currentCandidateId = useGameStore((s) => s.currentCandidateId);
  const currentDayIndex = useGameStore((s) => s.currentDayIndex);
  const candidate = currentCandidateId ? candidates[currentCandidateId] : null;
  const { isAnalyzing, isAnalyzed, hasNote, noteOpen, toggleNote, closeNote, analyze: handleAnalyze } = analysis;

  return (
    <div
      className={`${styles.systemBox} ${aiOffline ? styles.systemBoxDown : ''}`}
      data-tour="ai"
    >
      <div className={styles.systemHeader}>
        <button
          type="button"
          className={`${styles.systemIconBadge} ${aiOffline ? styles.systemIconError : ''} ${
            isAnalyzing ? styles.systemIconScanning : ''
          } ${hasNote ? styles.systemIconHasNote : ''}`}
          onClick={() => hasNote && toggleNote()}
          disabled={!hasNote}
          aria-expanded={hasNote ? noteOpen : undefined}
          title={hasNote ? (noteOpen ? 'Analiz notunu kapat' : 'Analiz notunu aç') : undefined}
        >
          {isAnalyzing && <div className={styles.systemScanRing} />}
          <AiIcon className={styles.systemIconGlyph} />
          {aiOffline && <div className={styles.systemIconSlash} />}
          {hasNote && !noteOpen && <i className={styles.systemNoteDot} />}
        </button>
        <div className={styles.systemText}>
          <div className={styles.systemTitle}>Yapay Zeka Analizi</div>
          <div className={styles.systemSub}>
            <span
              className={`${styles.statusDot} ${
                aiOffline ? styles.statusDown : isAnalyzing ? styles.statusBusy : isAnalyzed ? styles.statusDone : ''
              }`}
            />
            {aiOffline
              ? 'çevrimdışı'
              : onBreak || !candidate
                ? 'beklemede'
                : isAnalyzing
                  ? 'analiz ediliyor…'
                  : isAnalyzed
                    ? 'analiz tamamlandı'
                    : 'hazır'}
          </div>
        </div>
        {!aiOffline && candidate && !onBreak && !isAnalyzed && (
          <button
            className={styles.analyzeButton}
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            title="Yapay zekaya bu adayı değerlendirt"
          >
            {isAnalyzing ? (
              <span className={styles.analyzingDots}>
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            ) : (
              <>⚡ Değerlendir</>
            )}
          </button>
        )}
      </div>

      {aiOffline && (
        <div className={styles.systemLine}>{itOutage ? 'IT arızası: sistem yaklaşık 1 saat devre dışı. Bu arada kararlar sende.' : 'Bugün algoritmik öneri yok — kararlar tamamen sende.'}</div>
      )}

      {hasNote && noteOpen && candidate && (
        <div className={styles.noteBubble} role="dialog" aria-label="Yapay zeka analiz notu">
          <button type="button" className={styles.noteBubbleClose} onClick={closeNote} aria-label="Kapat">
            ✕
          </button>
          <div className={styles.noteGrid}>
          <div>
          {(() => {
            const ats = atsReport(candidate, days[currentDayIndex].applicationTarget);
            return (
              <>
              <div className={styles.systemLine}>{systemLineWith(candidate, ats)}</div>
              <div className={styles.ats}>
                <div className={styles.atsHead}>
                  <span>ATS ayrıştırma raporu</span>
                  <span className="mono">
                    Sıra #{ats.rank} / {ats.of}
                  </span>
                </div>
                <div className={styles.atsRow}>
                  <span>Ayrıştırma</span>
                  <b className={ats.parsed < 8 ? styles.atsBad : undefined}>
                    {ats.parsed}/8 alan · {ats.parseNote}
                  </b>
                </div>
                <div className={styles.atsRow}>
                  <span>Unvan</span>
                  <b className={ats.titleMatch ? undefined : styles.atsBad}>
                    "{ats.title}" {ats.titleMatch ? '· ilanla eşleşti' : '· ilan unvanıyla eşleşmedi'}
                  </b>
                </div>
                <div className={styles.atsRow}>
                  <span>
                    Anahtar kelime {ats.matched.length}/{ats.matched.length + ats.missing.length}
                  </span>
                  <span className={styles.atsChips}>
                    {ats.matched.map((k) => (
                      <i key={k} className={styles.atsHit}>
                        {k}
                      </i>
                    ))}
                    {ats.missing.map((k) => (
                      <i key={k} className={styles.atsMiss}>
                        {k}
                      </i>
                    ))}
                  </span>
                </div>
              </div>
              </>
            );
          })()}
          </div>
          <div>
          <ul className={styles.sectionNotes}>
            {sectionNotes(candidate).map((n) => (
              <li key={n.label} className={n.bad ? styles.noteBad : ''}>
                <b>{n.bad ? '✕' : '✓'}</b> {n.label}
                <span>{n.text}</span>
              </li>
            ))}
          </ul>
          {/* The model's hidden reasoning — only surfaces after an analysis is run */}
          <div className={styles.internalNoteBox}>
            <div className={styles.internalNoteText}>{candidate.internalNote}</div>
          </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
