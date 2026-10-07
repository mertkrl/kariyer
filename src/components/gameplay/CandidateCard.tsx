import { useEffect, type Ref } from 'react';
import { approvalQuota, lineupFor, useGameStore } from '../../game/store/store';
import { candidateDetails } from '../../game/data/candidateDetails';
import { candidates } from '../../game/data/candidates';
import { referenceFor } from '../../game/day/references';
import { formatClock } from '../../game/lib/time';
import { Button } from '../ui/Button';
import { CvBody } from './CvBody';
import { scanAt } from './scan';
import styles from '../../screens/GameplayScreen.module.css';
import own from './CandidateCard.module.css';
import { avatarStyle } from '../ui/avatarStyle';

/*
 * Açık CV: referans aramalı başlık, dosyanın kendisi ve ya iki düğme (bugünün mülakat
 * kontenjanıyla) ya da az önce verilen karar. Adayı ve kararları store'dan kendisi okur.
 */

interface Props {
  /** Yapay zekâ şu anda bu dosyayı okuyor. */
  isAnalyzing: boolean;
  /** Yapay zekâ okudu: işaretleri dosyada görünür. */
  isAnalyzed: boolean;
  onBreak: boolean;
  /** Giden kutusu bildirimini aynı hizaya koymak için adayın adı. */
  nameRef: Ref<HTMLHeadingElement>;
}


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
  const reading = useGameStore((s) => s.reading);

  const candidate = currentCandidateId ? candidates[currentCandidateId] : null;
  const details = candidate ? candidateDetails[candidate.id] : undefined;
  const decidedForCurrent = currentCandidateId ? decisions[currentCandidateId] : undefined;
  const quota = approvalQuota({ currentDayIndex, decisions, finalists, lineups, quotaCut });
  const quotaReason = quota.dailyLeft === 0 ? 'Bugünkü 3 mülakat hakkın doldu' : null;
  const decidedAt = decisionLog.find((e) => e.id === currentCandidateId)?.at;
  const lineup = lineupFor({ currentDayIndex, lineups });
  const nextUndecidedId = lineup.find((id) => !decisions[id] && id !== currentCandidateId);

  // klavye: M mülakata çağırır, R reddeder, S sıradaki dosyayı açar (Ctrl/Cmd+Z geri alır, bkz.
  // GameplayScreen). Yalnızca portal oyuncunun dikkatindeyken, yazı yazarken asla.
  useEffect(() => {
    if (!reading || !candidate || onBreak) return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const key = e.key.toLocaleLowerCase('tr');
      if (key === 'm' && !decidedForCurrent && quota.canApprove) decide('approve');
      else if (key === 'r' && !decidedForCurrent) decide('reject');
      else if (key === 's' && nextUndecidedId) selectCandidate(nextUndecidedId);
      else return;
      e.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reading, candidate, onBreak, decidedForCurrent, quota.canApprove, nextUndecidedId, decide, selectCandidate]);

  return (
    <div className={`${styles.candidateCard} ${isAnalyzing ? own.candidateCardScanning : ''}`} data-tour="cv">
      {isAnalyzing && (
        <div className={own.scanOverlay}>
          <div className={own.scanLine} />
          <div className={`${own.scanCorner} ${own.scanCornerTL}`} />
          <div className={`${own.scanCorner} ${own.scanCornerTR}`} />
          <div className={`${own.scanCorner} ${own.scanCornerBL}`} />
          <div className={`${own.scanCorner} ${own.scanCornerBR}`} />
          <div className={own.scanReadout}>VERİ TARANIYOR…</div>
        </div>
      )}
      {candidate ? (
        <>
          {decidedForCurrent && (
            <div
              key={`${candidate.id}-${decidedForCurrent}`}
              className={`${styles.stamp} ${decidedForCurrent === 'approve' ? own.stampApprove : own.stampReject}`}
            >
              {decidedForCurrent === 'approve' ? 'MÜLAKATTA' : 'REDDEDİLDİ'}
            </div>
          )}

          {/* ── bir CV gibi düzenlenmiş: başlık, ana sütun, yan sütun ── */}
          <header className={`${styles.cvHead} ${isAnalyzing ? styles.scanSweep : ''}`} style={scanAt(0)}>
            <div className={styles.avatar} style={avatarStyle(candidate.color)}>
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
          <div className={`${own.referenceRow} ${own.headerRef}`} data-tour="reference">
              {referenceChecks[candidate.id] ? (
                <span className={`${own.referenceResult} ${own[`ref_${referenceChecks[candidate.id]}`]}`}>
                  {referenceChecks[candidate.id] === 'warn' ? '⚠' : referenceChecks[candidate.id] === 'mixed' ? '◐' : '✓'} Referans: {referenceFor(candidate.id)?.summary}
                </span>
              ) : referenceFor(candidate.id) ? (
                <button
                  className={own.referenceButton}
                  disabled={lineBusy || onBreak}
                  title={lineBusy ? 'Hat meşgul' : 'Eski işverenini ara ve CV\'deki bilgiyi doğrula'}
                  onClick={() => callReference(candidate.id)}
                >
                  ☎ Referansı ara
                </button>
              ) : (
                <span className={own.referenceNone}>☎ Aranacak referans yok</span>
              )}
            </div>
          </header>

          {/* kişiye göre anahtarlı: her CV en üstünden açılır, bir öncekinin kaydırıldığı yerden değil */}
          <CvBody key={candidate.id} candidate={candidate} details={details} scanning={isAnalyzing} verdicts={isAnalyzed && !isAnalyzing} onReadThrough={() => markReadThrough(candidate.id)} />

          <div className={styles.grow} />

          {decidedForCurrent ? (
            <div
              className={`${styles.decisionBar} ${decidedForCurrent === 'approve' ? own.decisionBarApprove : own.decisionBarReject}`}
            >
              <div className={own.decisionInfo}>
                <span className={own.decisionTitle}>
                  {decidedForCurrent === 'approve' ? '✓ Mülakata çağrıldı' : '✕ Reddedildi'}
                </span>
                {effect?.reason && (
                  <span className={own.decisionWhy}>
                    {effect.reason}
                    <EffectChip label="Performans" value={effect.performans} />
                    <EffectChip label="Vicdan" value={effect.vicdan} />
                  </span>
                )}
                <span className={`${own.decisionMeta} mono`}>
                  {decidedAt !== undefined && `${formatClock(decidedAt)} · `}
                  geri alınabilir
                </span>
              </div>
              <button className={own.undoButton} onClick={undoDecision}>
                ↶ Kararı Geri Al
              </button>
              {nextUndecidedId && (
                <button className={own.nextButton} onClick={() => selectCandidate(nextUndecidedId)} aria-keyshortcuts="S">
                  Sonraki Aday →
                </button>
              )}
            </div>
          ) : (
            <div className={styles.actionArea} data-tour="actions">
              <div className={`${own.quotaLine} ${quotaReason ? own.quotaFull : ''}`}>
                {quotaCut && !quotaReason && <>⚠ Performansın düşük: Hakan Bey bugün mülakat hakkını bir azalttı. </>}
                {quotaReason ? (
                  <>⛔ {quotaReason} — bu adayı ancak reddedebilir ya da çağırdığın başka birini geri alabilirsin.</>
                ) : (
                  <>
                    Bugün <strong className="mono">{quota.dailyLeft}</strong>/{quota.dailyLimit} mülakat hakkın kaldı
                  </>
                )}
              </div>
              <div className={own.actionBar}>
                <Button
                  variant="primary"
                  sound="none"
                  onClick={() => decide('approve')}
                  disabled={!quota.canApprove}
                  title={quotaReason ?? 'Adayı cuma günkü mülakata çağır'}
                  aria-keyshortcuts="M"
                >
                  ✓ MÜLAKATA ÇAĞIR
                </Button>
                <Button variant="danger" sound="none" onClick={() => decide('reject')} title="Adayı reddet" aria-keyshortcuts="R">
                  ✕ REDDET
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className={own.emptyState}>Kuyruktan bir aday seç.</div>
      )}
      {/* karar ve yaptığı, ekran okuyucular için bir kez okunur */}
      <div className="sr-only" aria-live="polite">
        {candidate && decidedForCurrent && effect?.reason
          ? `${decidedForCurrent === 'approve' ? 'Mülakata çağrıldı' : 'Reddedildi'}. ${effect.reason} Performans ${signed(effect.performans)}, vicdan ${signed(effect.vicdan)}.`
          : ''}
      </div>
    </div>
  );
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '±0');

/** Bu karardan bir puanın değişimi; oynamadıysa hiçbir şey. */
function EffectChip({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  return (
    <span className={`${own.effectChip} ${value > 0 ? own.effectUp : own.effectDown} mono`} aria-hidden="true">
      {label} {signed(value)}
    </span>
  );
}
