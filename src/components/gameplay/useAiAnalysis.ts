import { useEffect, useState } from 'react';
import { useGameStore } from '../../game/store/store';
import { audioEngine } from '../../audio/audioEngine';
import { SCAN_FIELD_DELAYS } from './scan';

export const ANALYZE_DURATION_MS = 4600;

/**
 * Bir dosyada yapay zekâyı çalıştırmak: tarama birkaç saniye sürer (CV kartı süpürülür, panel
 * döner), sonra kararı yapay zekâ rozetinin yanında açılır. Buradaki her şey tek bir güne aittir:
 * yeni bir sabah hiçbir şey analiz edilmemiş olarak başlar ve karar notu tek bir dosyaya aittir.
 */
export function useAiAnalysis({ dayKey, onBreak, aiOffline }: { dayKey: number; onBreak: boolean; aiOffline: boolean }) {
  const currentCandidateId = useGameStore((s) => s.currentCandidateId);
  const recordAiUse = useGameStore((s) => s.recordAiUse);
  const [analyzed, setAnalyzed] = useState<{ day: number; ids: ReadonlySet<string> }>({ day: dayKey, ids: new Set() });
  const [analyzing, setAnalyzing] = useState<{ day: number; id: string } | null>(null);
  /** Karar notu açık olan dosya; dosya değiştirmek onu katlar. */
  const [noteFor, setNoteFor] = useState<string | null>(null);
  // dosyadan ayrılmak notunu kalıcı olarak katlar: geri dönünce not değil nokta görünür
  const [shownFile, setShownFile] = useState(currentCandidateId);
  if (shownFile !== currentCandidateId) {
    setShownFile(currentCandidateId);
    setNoteFor(null);
  }

  // gün bittiğinde hâlâ süren bir tarama susar
  useEffect(() => () => audioEngine.stopScan(), [dayKey]);

  const analyzingId = analyzing?.day === dayKey ? analyzing.id : null;

  function analyze() {
    if (!currentCandidateId || analyzingId || onBreak) return;
    const id = currentCandidateId;
    const day = dayKey;
    setAnalyzing({ day, id });
    recordAiUse();
    // Kilitlenme tıkırtıları her CV alanı yandığında düşer (--scan-delay'i + nabzın %4 ana karesi).
    audioEngine.startScan(
      ANALYZE_DURATION_MS / 1000,
      SCAN_FIELD_DELAYS.map((d) => d + 0.05),
    );
    // Motor taramayı kendi bitiş zil sesiyle sonlandırır.
    setTimeout(() => {
      setAnalyzed((prev) => ({ day, ids: new Set(prev.day === day ? prev.ids : []).add(id) }));
      // karar yapay zekâ rozetinin yanında açılır; katlamak için rozete tıkla
      if (useGameStore.getState().currentCandidateId === id) setNoteFor(id);
      setAnalyzing((current) => (current?.id === id && current.day === day ? null : current));
    }, ANALYZE_DURATION_MS);
  }

  const isAnalyzing = currentCandidateId !== null && analyzingId === currentCandidateId;
  const isAnalyzed = currentCandidateId !== null && analyzed.day === dayKey && analyzed.ids.has(currentCandidateId);
  const hasNote = !aiOffline && !!currentCandidateId && !onBreak && isAnalyzed && !isAnalyzing;
  const noteOpen = noteFor !== null && noteFor === currentCandidateId;
  return {
    isAnalyzing,
    isAnalyzed,
    hasNote,
    noteOpen,
    toggleNote: () => setNoteFor(noteOpen ? null : currentCandidateId),
    closeNote: () => setNoteFor(null),
    analyze,
  };
}

export type AiAnalysis = ReturnType<typeof useAiAnalysis>;
