import { useRef } from 'react';
import { useGameStore } from '../../game/store/store';
import { candidates } from '../../game/data/candidates';
import { days } from '../../game/data/days';
import type { Candidate, EvaluatedField } from '../../game/types';
import { aiScore, atsReport, systemLineWith } from '../../game/day/ats';
import { AiIcon } from '../ui/AiIcon';
import { ANALYZE_DURATION_MS, type AiAnalysis } from './useAiAnalysis';
import { AnalysisRun, ScoreDial } from './AiRun';
import styles from './AiPanel.module.css';
import report from './AiReport.module.css';

/** Yapay zekânın her bölümde "okuduğu": biri işaretli, geri kalanı hazır bir kalıpla geçiştirilmiş. */
const SECTIONS: { label: string; field?: EvaluatedField; ok: string }[] = [
  { label: 'Profil', field: 'motivation', ok: 'Metin ayrıştırıldı; olumsuz ifade bulunamadı.' },
  { label: 'İş deneyimi', field: 'experience', ok: 'Süre ve unvanlar okundu.' },
  { label: 'Şirket soruları', field: 'questions', ok: 'Cevaplar anahtar kelimelerle eşleşti.' },
  { label: 'Maaş', field: 'salary', ok: 'Bant içinde.' },
  { label: 'Beceriler', field: 'skills', ok: 'İlanla eşleşme yeterli.' },
  { label: 'Eğitim, sertifika, referans', ok: 'Alan dolu; puanlamada ağırlığı yok.' },
];

type Band = 'high' | 'mid' | 'low';

/** Aynı adayda hep aynı sayı: id ve bölümden küçük, kararlı bir oynama (-12…+12). */
function wobble(id: string, label: string) {
  let h = 7;
  for (const ch of id + label) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return (h % 25) - 12;
}

/**
 * Raporun bölüm puanları, yüksekten düşüğe. Sayılar genel puanın etrafında dağılır; sistemin
 * işaretlediği bölüm hep en dipte kalır. Bu yalnızca sunuş: karar ve puanlama `aiScore`u okur.
 */
function sectionScores(c: Candidate) {
  const reason = /Gerekçe: ([^·]+)/.exec(systemLineWith(c, atsReport(c, 0)))?.[1]?.trim() ?? 'Sistem işareti.';
  const overall = aiScore(c);
  const rows = SECTIONS.map((sec) => {
    const bad = !!sec.field && sec.field === c.flaggedField;
    const score = bad
      ? Math.max(5, Math.min(35, Math.round(overall * 0.5)))
      : Math.max(36, Math.min(96, overall + 18 + wobble(c.id, sec.label)));
    const band: Band = score >= 70 ? 'high' : score >= 45 ? 'mid' : 'low';
    return { label: sec.label, score, band, bad, text: bad ? reason : sec.ok };
  });
  return rows.sort((a, b) => b.score - a.score);
}

interface Props {
  analysis: AiAnalysis;
  /** Yapay zekâ kutusu çökme gününde ve zor moddaki bilgi işlem arızası sırasında devre dışıdır. */
  aiOffline: boolean;
  itOutage: boolean;
  onBreak: boolean;
}

/**
 * "Yapay Zeka Analizi" kutusu: yapay zekâyı açık dosyada çalıştır, sonra kararı; ATS ayrıştırma
 * raporu, her bölümde okudukları ve puanın arkasındaki gizli not.
 */
export function AiPanel({ analysis, aiOffline, itOutage, onBreak }: Props) {
  const currentCandidateId = useGameStore((s) => s.currentCandidateId);
  const currentDayIndex = useGameStore((s) => s.currentDayIndex);
  const candidate = currentCandidateId ? candidates[currentCandidateId] : null;
  const { isAnalyzing, isAnalyzed, hasNote, noteOpen, toggleNote, analyze: handleAnalyze } = analysis;
  const boxRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={boxRef}
      className={`${styles.systemBox} ${aiOffline ? styles.systemBoxDown : ''}`}
      data-tour="ai"
    >
      <div className={`${styles.systemHeader} ${report.header}`}>
        <button
          type="button"
          className={`${styles.systemIconBadge} ${aiOffline ? styles.systemIconError : ''} ${
            isAnalyzing ? styles.systemIconScanning : ''
          } ${hasNote ? styles.systemIconHasNote : ''}`}
          onClick={() => hasNote && toggleNote()}
          disabled={!hasNote}
          aria-expanded={hasNote ? noteOpen : undefined}
          title={hasNote ? (noteOpen ? 'Analiz notunu kapat' : 'Analiz notunu aç') : undefined}
          aria-label={hasNote ? (noteOpen ? 'Analiz notunu kapat' : 'Analiz notunu aç') : aiOffline ? 'Yapay zekâ sistemi: çevrimdışı' : 'Yapay zekâ sistemi'}
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

      {/* tarama da raporla aynı balonda akar: kutu ve altındaki sütun yerinden oynamaz */}
      {isAnalyzing && candidate && (
        <div className={`${styles.noteBubble} ${report.bubble}`} aria-live="polite">
          <AnalysisRun key={candidate.id} candidate={candidate} applications={days[currentDayIndex].applicationTarget} durationMs={ANALYZE_DURATION_MS} />
        </div>
      )}
      {/* kutunun boyu her durumda aynı: altındaki sütun hiç kaymaz */}
      {!aiOffline && candidate && (
        <div className={report.statusSlot}>
          {isAnalyzing ? (
            <span>Dosya taranıyor…</span>
          ) : hasNote ? (
            <button className={report.reopenHint} onClick={toggleNote}>
              {noteOpen ? 'Raporu kapat' : 'Analiz hazır · raporu aç'}
            </button>
          ) : (
            <span>İstersen değerlendirt; istemezsen dosyayı okuyarak karar ver.</span>
          )}
        </div>
      )}

      {aiOffline && (
        <div className={styles.systemLine}>{itOutage ? 'IT arızası: sistem yaklaşık 1 saat devre dışı. Bu arada kararlar sende.' : 'Bugün algoritmik öneri yok — kararlar tamamen sende.'}</div>
      )}

      {/* rapor bir mesaj gibi kutunun altında, CV'nin üstünde açılır: sütunu itmez, büyütmez;
          simgeye (ya da "raporu aç"a) basınca yeniden açılır */}
      {hasNote && noteOpen && candidate && (
        <div className={`${styles.noteBubble} ${report.bubble}`} role="dialog" aria-label="Yapay zeka analiz notu">
          <div className={report.noteBubbleHead}>
            <ScoreDial key={candidate.id} candidate={candidate} reportOpen={noteOpen} onToggleReport={toggleNote} />
            <button className={report.noteClose} onClick={toggleNote} aria-label="Raporu kapat">
              ×
            </button>
          </div>
          <ol className={report.scoreList}>
            {sectionScores(candidate).map((r) => (
              <li key={r.label} className={`${report[`band_${r.band}`]} ${r.bad ? report.flagged : ''}`}>
                <span className={report.scoreLabel} title={r.text}>
                  <b>{r.label}</b>
                  {r.bad && <small>{r.text}</small>}
                </span>
                <span className={report.scoreTrack} aria-hidden="true">
                  <i style={{ width: `${r.score}%` }} />
                </span>
                <b className={`${report.scoreValue} mono`}>{r.score}</b>
              </li>
            ))}
          </ol>
          <details className={report.more}>
            <summary>Ayrıntılar · ATS raporu ve sistem notu</summary>
          <div className={`${styles.noteGrid} ${report.bubbleGrid}`}>
            {(() => {
              const ats = atsReport(candidate, days[currentDayIndex].applicationTarget);
              return (
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
              );
            })()}
            {/* Modelin gizli gerekçesi: yalnızca bir analiz çalıştırıldıktan sonra ortaya çıkar */}
            <div className={styles.internalNoteBox}>
              <div className={styles.internalNoteText}>{candidate.internalNote}</div>
            </div>
          </div>
          </details>
        </div>
      )}
    </div>
  );
}
