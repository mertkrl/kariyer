import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../../game/store/store';
import { candidates } from '../../game/data/candidates';
import { days } from '../../game/data/days';
import type { Candidate, EvaluatedField } from '../../game/types';
import { atsReport, systemLineWith } from '../../game/day/ats';
import { AiIcon } from '../ui/AiIcon';
import { ANALYZE_DURATION_MS, type AiAnalysis } from './useAiAnalysis';
import { AnalysisRun, ScoreDial } from './AiRun';
import styles from '../../screens/GameplayScreen.module.css';

/** Yapay zekânın her bölümde "okuduğu": biri işaretli, geri kalanı hazır bir kalıpla geçiştirilmiş. */
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
  const { isAnalyzing, isAnalyzed, hasNote, noteOpen, toggleNote, closeNote, analyze: handleAnalyze } = analysis;
  const boxRef = useRef<HTMLDivElement>(null);
  const noteAt = useNotePlacement(boxRef, hasNote && noteOpen);

  return (
    <div
      ref={boxRef}
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

      {isAnalyzing && candidate && (
        <AnalysisRun key={candidate.id} candidate={candidate} applications={days[currentDayIndex].applicationTarget} durationMs={ANALYZE_DURATION_MS} />
      )}
      {hasNote && candidate && <ScoreDial key={candidate.id} candidate={candidate} reportOpen={noteOpen} onToggleReport={toggleNote} />}

      {aiOffline && (
        <div className={styles.systemLine}>{itOutage ? 'IT arızası: sistem yaklaşık 1 saat devre dışı. Bu arada kararlar sende.' : 'Bugün algoritmik öneri yok — kararlar tamamen sende.'}</div>
      )}

      {hasNote && noteOpen && candidate && noteAt &&
        createPortal(
        <div className={styles.noteBubble} style={noteAt.style} role="dialog" aria-label="Yapay zeka analiz notu">
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
          {/* Modelin gizli gerekçesi: yalnızca bir analiz çalıştırıldıktan sonra ortaya çıkar */}
          <div className={styles.internalNoteBox}>
            <div className={styles.internalNoteText}>{candidate.internalNote}</div>
          </div>
          </div>
          </div>
        </div>,
          noteAt.host,
        )}
    </div>
  );
}

/**
 * Notun açıldığı yer: yapay zekâ kutusunun altında, onunla sağa hizalı, CV'nin üstünde geniş.
 * Kayan ve onu sütun genişliğine kırpacak olan sağ sütunun içinde değil portal alanında
 * (data-note-host) çizilir. Sütun kaydığında ya da alan boyut değiştirdiğinde kutuyu izler ve
 * alanın alt kenarında durur.
 */
function useNotePlacement(boxRef: RefObject<HTMLDivElement | null>, open: boolean) {
  const [at, setAt] = useState<{ host: HTMLElement; style: CSSProperties } | null>(null);
  useLayoutEffect(() => {
    const host = boxRef.current?.closest<HTMLElement>('[data-note-host]');
    if (!open || !host) {
      setAt(null);
      return;
    }
    const place = () => {
      const box = boxRef.current?.getBoundingClientRect();
      const area = host.getBoundingClientRect();
      if (!box) return;
      const top = box.bottom - area.top + 10;
      setAt({ host, style: { top, right: area.right - box.right, maxHeight: Math.max(160, area.height - top - 12) } });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(host);
    // sağ sütunun kayması (capture: kaydırma olayları yukarı kabarcıklanmaz)
    window.addEventListener('scroll', place, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', place, true);
    };
  }, [boxRef, open]);
  return at;
}
