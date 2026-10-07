import { useEffect, useRef, useState, type Ref } from 'react';
import { lineupFor, useGameStore } from '../../game/store/store';
import { days } from '../../game/data/days';
import { candidates } from '../../game/data/candidates';
import { RejectionMails } from './RejectionMails';
import { Orientation } from './Orientation';
import { QueueSidebar } from './QueueSidebar';
import { ShiftGate } from './ShiftGate';
import { CandidateCard } from './CandidateCard';
import { AiPanel } from './AiPanel';
import { DailyActivity } from './DailyActivity';
import type { useAiAnalysis } from './useAiAnalysis';
import styles from '../../screens/GameplayScreen.module.css';

/*
 * İşe Alım Portalı'nın içi: kuyruk, açık aday (ya da günün ret bildirimleri), yapay zekâ kutusu ve
 * günün işlemleri. Okuma süresi yalnızca portal gerçekten önündeyken (`active`) ve bir CV
 * gösterilirken sayılır.
 */
export function Portal({
  active,
  onBreak,
  analysis,
  aiOffline,
  itOutage,
  nameRef,
}: {
  active: boolean;
  onBreak: boolean;
  analysis: ReturnType<typeof useAiAnalysis>;
  aiOffline: boolean;
  itOutage: boolean;
  nameRef: Ref<HTMLHeadingElement>;
}) {
  const currentDayIndex = useGameStore((s) => s.currentDayIndex);
  const workdayMinutes = useGameStore((s) => s.workdayMinutes);
  const lineups = useGameStore((s) => s.lineups);
  const decisions = useGameStore((s) => s.decisions);
  const decisionLog = useGameStore((s) => s.decisionLog);
  const timeSpent = useGameStore((s) => s.timeSpent);
  const openedIds = useGameStore((s) => s.openedIds);
  const shiftStarted = useGameStore((s) => s.shiftStarted);
  const plannedRejections = useGameStore((s) => s.plannedRejections);
  const rejectionMailsSent = useGameStore((s) => s.rejectionMailsSent);
  const planRejectionMails = useGameStore((s) => s.planRejectionMails);
  const selectCandidate = useGameStore((s) => s.selectCandidate);
  const finishOrientation = useGameStore((s) => s.finishOrientation);
  // ilk sabah, mesai kartı yerine portal tanıtımıyla başlar
  const needsOrientation = useGameStore((s) => s.currentDayIndex === 0 && !s.orientationDone);
  const [editingMails, setEditingMails] = useState(false);
  const [mailsHidden, setMailsHidden] = useState(false);
  const portalRef = useRef<HTMLDivElement>(null);

  const day = days[currentDayIndex];
  const lineup = lineupFor({ currentDayIndex, lineups });
  // her dosya karara bağlanınca portal, reddedilenlere ne söyleneceğini sorar
  const todaysRejects = lineup.filter((id) => decisions[id] === 'reject');
  // bugün reddedilen birinin giden kutusunda henüz bildirimi yok
  const pendingMails = !rejectionMailsSent && todaysRejects.some((id) => !plannedRejections[id]);
  const showMails = !rejectionMailsSent && todaysRejects.length > 0 && lineup.every((id) => decisions[id]) && ((pendingMails && !mailsHidden) || editingMails);

  // bir dosya yalnızca ekrandayken okunmuş sayılır: masadan, telefondan ya da bir aramadan değil
  const reading = active && !showMails;
  useEffect(() => {
    useGameStore.getState().setReading(reading);
  }, [reading]);
  useEffect(() => () => useGameStore.getState().setReading(false), []);

  // yeni bir gün ilk dosyasıyla açılır
  useEffect(() => {
    if (openedIds.length === 0 && lineup.length > 0) selectCandidate(lineup[0]);
    // oxlint-disable-next-line react/exhaustive-deps
  }, [day.day]);

  return (
    <div className={`${styles.mainArea} ${styles.portalArea}`} ref={portalRef}>
      {!shiftStarted && needsOrientation && <Orientation container={portalRef} onDone={finishOrientation} />}
      {!shiftStarted && !needsOrientation && <ShiftGate />}
      <QueueSidebar mailsHidden={mailsHidden} onShowMails={() => setMailsHidden(false)} editingMails={editingMails} onEditMails={() => setEditingMails(true)} />

      {showMails ? (
        <RejectionMails
          ids={todaysRejects}
          autoRejected={Math.max(0, day.applicationTarget - lineup.length)}
          dayName={day.dayName}
          minutes={workdayMinutes}
          planned={plannedRejections}
          onSend={(choices) => {
            planRejectionMails(choices);
            setEditingMails(false);
          }}
          onBack={() => {
            setMailsHidden(true);
            setEditingMails(false);
          }}
        />
      ) : (
        <CandidateCard isAnalyzing={analysis.isAnalyzing} isAnalyzed={analysis.isAnalyzed} onBreak={onBreak} nameRef={nameRef} />
      )}

      <div className={styles.rightPanel} data-tour="right">
        <AiPanel analysis={analysis} aiOffline={aiOffline} itOutage={itOutage} onBreak={onBreak} />
        <DailyActivity
          className={styles.activity}
          workdayMinutes={workdayMinutes}
          candidateIds={lineup}
          candidates={candidates}
          decisions={decisions}
          decisionLog={decisionLog}
          timeSpent={timeSpent}
        />
      </div>
    </div>
  );
}
