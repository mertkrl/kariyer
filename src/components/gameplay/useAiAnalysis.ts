import { useEffect, useState } from 'react';
import { useGameStore } from '../../game/store';
import { audioEngine } from '../../audio/audioEngine';
import { SCAN_FIELD_DELAYS } from './scan';

export const ANALYZE_DURATION_MS = 4600;

/**
 * Running the AI on a file: the scan takes a few seconds (the CV card sweeps, the panel
 * spins), then its verdict opens next to the AI badge. Everything here belongs to one day:
 * a new morning starts with nothing analysed, and the verdict note belongs to one file.
 */
export function useAiAnalysis({ dayKey, onBreak, aiOffline }: { dayKey: number; onBreak: boolean; aiOffline: boolean }) {
  const currentCandidateId = useGameStore((s) => s.currentCandidateId);
  const recordAiUse = useGameStore((s) => s.recordAiUse);
  const [analyzed, setAnalyzed] = useState<{ day: number; ids: ReadonlySet<string> }>({ day: dayKey, ids: new Set() });
  const [analyzing, setAnalyzing] = useState<{ day: number; id: string } | null>(null);
  /** The file whose verdict note is open; switching files folds it away. */
  const [noteFor, setNoteFor] = useState<string | null>(null);
  // leaving the file folds its note away for good: coming back shows the dot, not the note
  const [shownFile, setShownFile] = useState(currentCandidateId);
  if (shownFile !== currentCandidateId) {
    setShownFile(currentCandidateId);
    setNoteFor(null);
  }

  // a scan still running when the day ends goes quiet
  useEffect(() => () => audioEngine.stopScan(), [dayKey]);

  const analyzingId = analyzing?.day === dayKey ? analyzing.id : null;

  function analyze() {
    if (!currentCandidateId || analyzingId || onBreak) return;
    const id = currentCandidateId;
    const day = dayKey;
    setAnalyzing({ day, id });
    recordAiUse();
    // Lock-on ticks land when each CV field lights up (its --scan-delay + the pulse's 4% keyframe).
    audioEngine.startScan(
      ANALYZE_DURATION_MS / 1000,
      SCAN_FIELD_DELAYS.map((d) => d + 0.05),
    );
    // The engine resolves the scan with a completion chime on its own.
    setTimeout(() => {
      setAnalyzed((prev) => ({ day, ids: new Set(prev.day === day ? prev.ids : []).add(id) }));
      // the verdict pops up next to the AI badge; click the badge to fold it away
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
