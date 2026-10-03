import type { Ref } from 'react';
import { approvalQuota, lineupFor, useGameStore } from '../../game/store';
import { candidateDetails } from '../../game/data/candidateDetails';
import { candidates } from '../../game/data/candidates';
import { REFERENCE_MINUTES, referenceFor } from '../../game/references';
import { formatClock } from '../../game/time';
import { Button } from '../ui/Button';
import { CvBody } from './CvBody';
import { scanAt } from './scan';
import styles from '../../screens/GameplayScreen.module.css';

/*
 * The open CV: header with the reference call, the file itself, and either the two buttons
 * (with today's interview quota) or the decision just taken. Reads the candidate and the
 * decisions from the store itself.
 */

interface Props {
  /** The AI is reading this file right now. */
  isAnalyzing: boolean;
  /** The AI has read it: its marks show on the file. */
  isAnalyzed: boolean;
  onBreak: boolean;
  /** The candidate's name, for placing the outbox notice level with it. */
  nameRef: Ref<HTMLHeadingElement>;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export function CandidateCard({ isAnalyzing, isAnalyzed, onBreak, nameRef }: Props) {
  const currentCandidateId = useGameStore((s) => s.currentCandidateId);
  const currentDayIndex = useGameStore((s) => s.currentDayIndex);
  const decisions = useGameStore((s) => s.decisions);
  const decisionLog = useGameStore((s) => s.decisionLog);
  const finalists = useGameStore((s) => s.finalists);
  const lineups = useGameStore((s) => s.lineups);
  const quotaCut = useGameStore((s) => s.quotaCut);
  const referenceChecks = useGameStore((s) => s.referenceChecks);
  const effect = useGameStore((s) => (s.currentCandidateId ? s.decisionEffects[s.currentCandidateId] : undefined));
  const lineBusy = useGameStore((s) => Boolean(s.desk.inCall || s.desk.ringing));
  const callReference = useGameStore((s) => s.callReference);
  const decide = useGameStore((s) => s.decide);
  const undoDecision = useGameStore((s) => s.undoDecision);
  const selectCandidate = useGameStore((s) => s.selectCandidate);
  const markReadThrough = useGameStore((s) => s.markReadThrough);

  const candidate = currentCandidateId ? candidates[currentCandidateId] : null;
  const details = candidate ? candidateDetails[candidate.id] : undefined;
  const decidedForCurrent = currentCandidateId ? decisions[currentCandidateId] : undefined;
  const quota = approvalQuota({ currentDayIndex, decisions, finalists, lineups, quotaCut });
  const quotaReason = quota.totalLeft === 0 ? 'Haftalık mülakat kontenjanı doldu' : quota.dailyLeft === 0 ? 'Bugünkü kontenjan doldu' : null;
  const decidedAt = decisionLog.find((e) => e.id === currentCandidateId)?.at;
  const lineup = lineupFor({ currentDayIndex, lineups });
  const nextUndecidedId = lineup.find((id) => !decisions[id] && id !== currentCandidateId);

  return (
    <div className={`${styles.candidateCard} ${isAnalyzing ? styles.candidateCardScanning : ''}`} data-tour="cv">
      {isAnalyzing && (
        <div className={styles.scanOverlay}>
          <div className={styles.scanLine} />
          <div className={`${styles.scanCorner} ${styles.scanCornerTL}`} />
          <div className={`${styles.scanCorner} ${styles.scanCornerTR}`} />
          <div className={`${styles.scanCorner} ${styles.scanCornerBL}`} />
          <div className={`${styles.scanCorner} ${styles.scanCornerBR}`} />
          <div className={styles.scanReadout}>VERİ TARANIYOR…</div>
        </div>
      )}
      {candidate ? (
        <>
          {decidedForCurrent && (
            <div
              key={`${candidate.id}-${decidedForCurrent}`}
              className={`${styles.stamp} ${decidedForCurrent === 'approve' ? styles.stampApprove : styles.stampReject}`}
            >
              {decidedForCurrent === 'approve' ? 'MÜLAKATTA' : 'REDDEDİLDİ'}
            </div>
          )}

          {/* ── a CV laid out like one: header, main column, sidebar ── */}
          <header className={`${styles.cvHead} ${isAnalyzing ? styles.scanSweep : ''}`} style={scanAt(0)}>
            <div className={styles.avatar} style={{ background: candidate.color }}>
              {candidate.initials}
            </div>
            <div className={styles.candidateNames}>
              <h2 ref={nameRef}>{candidate.name}</h2>
              <div className={styles.candidateSub}>
                {candidate.age} yaşında · {candidate.role}
              </div>
              {details && (
                <div className={styles.candidateMeta}>
                  <span>📍 {details.location}</span>
                  <span>🗣 {details.languages}</span>
                </div>
              )}
            </div>
          <div className={`${styles.referenceRow} ${styles.headerRef}`} data-tour="reference">
              {referenceChecks[candidate.id] ? (
                <span className={`${styles.referenceResult} ${styles[`ref_${referenceChecks[candidate.id]}`]}`}>
                  {referenceChecks[candidate.id] === 'warn' ? '⚠' : referenceChecks[candidate.id] === 'mixed' ? '◐' : '✓'} Referans: {referenceFor(candidate.id)?.summary}
                </span>
              ) : referenceFor(candidate.id) ? (
                <button
                  className={styles.referenceButton}
                  disabled={lineBusy || onBreak}
                  title={lineBusy ? 'Hat meşgul' : 'Eski işverenini ara ve CV\'deki bilgiyi doğrula'}
                  onClick={() => callReference(candidate.id)}
                >
                  ☎ Referansı ara <small>{REFERENCE_MINUTES} dk</small>
                </button>
              ) : (
                <span className={styles.referenceNone}>☎ Aranacak referans yok</span>
              )}
            </div>
          </header>

          {/* keyed by person: each CV opens at its top, not where the last one was scrolled to */}
          <CvBody key={candidate.id} candidate={candidate} details={details} scanning={isAnalyzing} verdicts={isAnalyzed && !isAnalyzing} onReadThrough={() => markReadThrough(candidate.id)} />

          <div className={styles.grow} />

          {decidedForCurrent ? (
            <div
              className={`${styles.decisionBar} ${decidedForCurrent === 'approve' ? styles.decisionBarApprove : styles.decisionBarReject}`}
            >
              <div className={styles.decisionInfo}>
                <span className={styles.decisionTitle}>
                  {decidedForCurrent === 'approve' ? '✓ Mülakata çağrıldı' : '✕ Reddedildi'}
                </span>
                {effect?.reason && (
                  <span className={styles.decisionWhy}>
                    {effect.reason}
                    <EffectChip label="Performans" value={effect.performans} />
                    <EffectChip label="Vicdan" value={effect.vicdan} />
                  </span>
                )}
                <span className={`${styles.decisionMeta} mono`}>
                  {decidedAt !== undefined && `${formatClock(decidedAt)} · `}
                  {isMac ? '⌘Z' : 'Ctrl+Z'} ile geri alınabilir
                </span>
              </div>
              <button className={styles.undoButton} onClick={undoDecision}>
                ↶ Kararı Geri Al
              </button>
              {nextUndecidedId && (
                <button className={styles.nextButton} onClick={() => selectCandidate(nextUndecidedId)}>
                  Sonraki Aday →
                </button>
              )}
            </div>
          ) : (
            <div className={styles.actionArea} data-tour="actions">
              <div className={`${styles.quotaLine} ${quotaReason ? styles.quotaFull : ''}`}>
                {quotaCut && !quotaReason && <>⚠ Performansın düşük: Hakan Bey bugün mülakat hakkını bir azalttı. </>}
                {quotaReason ? (
                  <>⛔ {quotaReason} — bu adayı ancak reddedebilir ya da çağırdığın başka birini geri alabilirsin.</>
                ) : (
                  <>
                    Mülakat kontenjanı · bugün <strong className="mono">{quota.dailyLeft}</strong> hak · haftada{' '}
                    <strong className="mono">{quota.totalLeft}</strong> yer kaldı
                  </>
                )}
              </div>
              <div className={styles.actionBar}>
                <Button
                  variant="primary"
                  sound="none"
                  onClick={() => decide('approve')}
                  disabled={!quota.canApprove}
                  title={quotaReason ?? 'Adayı cuma günkü mülakata çağır'}
                >
                  ✓ MÜLAKATA ÇAĞIR
                </Button>
                <Button variant="danger" sound="none" onClick={() => decide('reject')}>
                  ✕ REDDET
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className={styles.emptyState}>Kuyruktan bir aday seç.</div>
      )}
      {/* the decision and what it did, read out once for screen readers */}
      <div className="sr-only" aria-live="polite">
        {candidate && decidedForCurrent && effect?.reason
          ? `${decidedForCurrent === 'approve' ? 'Mülakata çağrıldı' : 'Reddedildi'}. ${effect.reason} Performans ${signed(effect.performans)}, vicdan ${signed(effect.vicdan)}.`
          : ''}
      </div>
    </div>
  );
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '±0');

/** One score's change from this decision; nothing when it didn't move. */
function EffectChip({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  return (
    <span className={`${styles.effectChip} ${value > 0 ? styles.effectUp : styles.effectDown} mono`} aria-hidden="true">
      {label} {signed(value)}
    </span>
  );
}
