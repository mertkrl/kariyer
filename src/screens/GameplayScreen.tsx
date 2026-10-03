import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { callFor, isOnBreak, lineupFor, useGameStore } from '../game/store';
import { days } from '../game/data/days';
import { candidates, candidateOf } from '../game/data/candidates';
import { BREAK_END_MIN } from '../game/time';
import { RedFolder } from '../components/story/RedFolder';
import { audioEngine } from '../audio/audioEngine';
import { SettingsPanel } from '../components/ui/SettingsPanel';
import { DailyActivity } from '../components/gameplay/DailyActivity';
import { TopBar } from '../components/gameplay/TopBar';
import { PhoneOverlay } from '../components/phone/Phone';
import { usePhoneProps } from '../components/phone/usePhoneProps';
import { Desk } from '../components/desk/Desk';
import { DeskCall } from '../components/desk/DeskCall';
import { NotificationStack } from '../components/desk/NotificationStack';
import { PcDesktop, type PcApp } from '../components/pc/PcDesktop';
import { inbox } from '../game/mail';
import { RejectionMails } from '../components/gameplay/RejectionMails';
import { Orientation } from '../components/gameplay/Orientation';
import type { ThreadId } from '../game/manager';
import { QueueSidebar } from '../components/gameplay/QueueSidebar';
import { RecallComposer } from '../components/gameplay/RecallComposer';
import { ShiftGate } from '../components/gameplay/ShiftGate';
import { CandidateCard } from '../components/gameplay/CandidateCard';
import { AiPanel } from '../components/gameplay/AiPanel';
import { EventBanner } from '../components/gameplay/EventBanner';
import { useAiAnalysis } from '../components/gameplay/useAiAnalysis';
import { useDeskCamera } from '../components/gameplay/useDeskCamera';
import { useWorkdaySounds } from '../components/gameplay/useWorkdaySounds';
import styles from './GameplayScreen.module.css';

/*
 * The workday: the desk, and the computer it zooms into (the portal with the CV, the AI and
 * the queue). This screen holds what's on screen where — which view, which overlay — and wires
 * the pieces together; each piece reads what it shows from the store itself.
 */

// the lunch break and Wednesday's call are whole scenes of their own: loaded when they start
const BreakRoom = lazy(() => import('./break/BreakRoom').then((m) => ({ default: m.BreakRoom })));
const MeetingRoom = lazy(() => import('../components/meeting/MeetingRoom').then((m) => ({ default: m.MeetingRoom })));

export function GameplayScreen() {
  const currentDayIndex = useGameStore((s) => s.currentDayIndex);
  const workdayMinutes = useGameStore((s) => s.workdayMinutes);
  const openedIds = useGameStore((s) => s.openedIds);
  const decisions = useGameStore((s) => s.decisions);
  const decisionLog = useGameStore((s) => s.decisionLog);
  const timeSpent = useGameStore((s) => s.timeSpent);
  const currentCandidateId = useGameStore((s) => s.currentCandidateId);
  const meetingActive = useGameStore((s) => s.meeting.state === 'active');
  const finalists = useGameStore((s) => s.finalists);
  const lineups = useGameStore((s) => s.lineups);
  const phone = useGameStore((s) => s.phone);
  const mutedThreads = useGameStore((s) => s.mutedThreads);
  const managerRequests = useGameStore((s) => s.managerRequests);
  const managerStance = useGameStore((s) => s.managerStance);
  const performans = useGameStore((s) => s.performans);
  const vicdan = useGameStore((s) => s.vicdan);
  const paused = useGameStore((s) => s.paused);
  const shiftStarted = useGameStore((s) => s.shiftStarted);
  const revokeDraft = useGameStore((s) => s.revokeDraft);
  const sendRevoke = useGameStore((s) => s.sendRevoke);
  const extraMails = useGameStore((s) => s.extraMails);
  const mailRead = useGameStore((s) => s.mailRead);
  const readMail = useGameStore((s) => s.readMail);
  const finishOrientation = useGameStore((s) => s.finishOrientation);
  // the first morning begins with the portal walk-through instead of the clock-in card
  const needsOrientation = useGameStore((s) => s.currentDayIndex === 0 && !s.orientationDone);
  const activeEvent = useGameStore((s) => s.activeEvent);
  const difficulty = useGameStore((s) => s.difficulty);
  const drawer = useGameStore((s) => s.story.drawer);
  const photoPages = useGameStore((s) => s.story.photoPages);
  const decideDrawer = useGameStore((s) => s.decideDrawer);
  const desk = useGameStore((s) => s.desk);
  const ringing = desk.ringing;
  const pickUpCall = useGameStore((s) => s.pickUpCall);
  const answerCall = useGameStore((s) => s.answerCall);
  const clearDeskNotice = useGameStore((s) => s.clearDeskNotice);
  const breakOver = useGameStore((s) => s.breakOver);
  const overtime = useGameStore((s) => s.overtime);
  const story = useGameStore((s) => s.story);
  const justifyRejects = useGameStore((s) => s.justifyRejects);
  const selectCandidate = useGameStore((s) => s.selectCandidate);
  const tick = useGameStore((s) => s.tick);
  const planRejectionMails = useGameStore((s) => s.planRejectionMails);
  const plannedRejections = useGameStore((s) => s.plannedRejections);
  const rejectionMailsSent = useGameStore((s) => s.rejectionMailsSent);
  const skipBreak = useGameStore((s) => s.skipBreak);
  const togglePause = useGameStore((s) => s.togglePause);

  const [phoneOpen, setPhoneOpen] = useState(false);
  /** Which chat to open the phone on (a tapped notification), or null for the home screen. */
  const [phoneThread, setPhoneThread] = useState<ThreadId | null>(null);
  const openPhone = (thread: ThreadId | null = null) => {
    setPhoneThread(thread);
    setPhoneOpen(true);
  };
  const phoneProps = usePhoneProps();
  const [folderOpen, setFolderOpen] = useState(false);
  /** The computer: the desktop, or one maximised app on it. */
  const [pcApp, setPcApp] = useState<PcApp | null>(null);
  // Every morning starts at the desk; the computer is one click away.
  const [view, setView] = useState<'desk' | 'pc'>('desk');
  const atPc = view === 'pc';
  const [editingMails, setEditingMails] = useState(false);
  const [mailsHidden, setMailsHidden] = useState(false);
  const portalRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const { area, stageScale, deskStyle, pcStyle, stackStyle, callStackStyle } = useDeskCamera(areaRef, atPc);

  const day = days[currentDayIndex];
  const itOutage = activeEvent?.kind === 'it';
  /** The AI box is offline on the crash day, and during a hard-mode IT outage. */
  const aiOffline = !!day.aiDown || itOutage;
  const lineup = lineupFor({ currentDayIndex, lineups });
  // once every file is decided, the portal asks what the rejected people will be told
  const todaysRejects = lineup.filter((id) => decisions[id] === 'reject');
  // someone rejected today has no notice in the outbox yet
  const pendingMails = !rejectionMailsSent && todaysRejects.some((id) => !plannedRejections[id]);
  const showMails = !rejectionMailsSent && todaysRejects.length > 0 && lineup.every((id) => decisions[id]) && ((pendingMails && !mailsHidden) || editingMails);

  const onBreak = isOnBreak({ workdayMinutes, breakOver });
  const analysis = useAiAnalysis({ dayKey: day.day, onBreak, aiOffline });
  useWorkdaySounds({ onBreak, meetingActive, paused, currentDayIndex, workdayMinutes, ringing });

  // after Hakan Bey's call about the invitations the recall mail opens over everything; the mail
  // app comes up behind it, so the sent copy is right there afterwards
  useEffect(() => {
    if (!revokeDraft || desk.inCall) return;
    setView('pc');
    setPcApp('mail');
  }, [revokeDraft, desk.inCall]);

  // Lunch break puts the phone down (it does not pop back open afterwards).
  if (onBreak && phoneOpen) setPhoneOpen(false);

  // Cmd/Ctrl+Z takes back the decision on the open candidate.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        useGameStore.getState().undoDecision();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Esc leaves the computer for the desk (unless something on top of it wants the key).
  useEffect(() => {
    if (view !== 'pc') return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape' || phoneOpen || folderOpen || paused) return;
      setView('desk');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, phoneOpen, folderOpen, paused]);

  useEffect(() => {
    const interval = setInterval(() => tick(), 1000);
    return () => clearInterval(interval);
  }, [tick]);

  // a file counts as read only while it is on screen: not from the desk, the phone or a call
  const reading = atPc && pcApp === 'portal' && !showMails && !phoneOpen && !folderOpen && !desk.inCall && !paused;
  useEffect(() => {
    useGameStore.getState().setReading(reading);
  }, [reading]);
  useEffect(() => () => useGameStore.getState().setReading(false), []);

  // a hidden tab doesn't keep the workday running behind the player's back
  useEffect(() => {
    function onVisibility() {
      const s = useGameStore.getState();
      if (document.hidden && !s.paused) s.togglePause();
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // a new day opens on its first file
  useEffect(() => {
    if (openedIds.length === 0 && lineup.length > 0) {
      selectCandidate(lineup[0]);
    }
    // oxlint-disable-next-line react/exhaustive-deps
  }, [day.day]);

  // the outbox notice sits centred on the CV, level with the candidate's name
  const [mailNoticeAt, setMailNoticeAt] = useState<CSSProperties | undefined>();
  const mailNotice = Boolean(desk.notice) && (desk.noticeKind === 'scheduled' || desk.noticeKind === 'sent');
  useLayoutEffect(() => {
    const name = nameRef.current;
    const stage = areaRef.current;
    const card = name?.closest(`.${styles.candidateCard}`);
    if (!mailNotice || !atPc || !name || !stage || !card) {
      setMailNoticeAt(undefined);
      return;
    }
    const a = stage.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    const n = name.getBoundingClientRect();
    // on a narrow card there is no room beside the name: the notice sits just above it instead
    const narrow = c.width < 700;
    setMailNoticeAt({
      left: c.left + c.width / 2 - a.left,
      top: narrow ? n.top - a.top - 8 : n.top + n.height / 2 - a.top,
      transform: narrow ? 'translate(-50%, -100%)' : undefined,
    });
  }, [mailNotice, atPc, desk.notice, area.w, area.h, currentCandidateId]);

  const callState = { managerRequests, managerStance, currentDayIndex, desk, performans, story, justifyRejects, finalists };
  const ringingCall = ringing ? callFor(callState, ringing) : undefined;
  const activeCall = desk.inCall ? callFor(callState, desk.inCall) : undefined;
  const mails = inbox(currentDayIndex, workdayMinutes, extraMails);
  // only mail that matters taps you on the shoulder; the rest waits in the inbox
  const importantMails = mails.filter((m) => (m.folder ?? 'inbox') === 'inbox' && (m.important || m.reply));

  return (
    <div className={styles.screen}>
      <TopBar
        day={day.day}
        dayCount={days.length}
        dayName={day.dayName}
        interviewDay={days.findIndex((d) => d.final) + 1}
        workdayMinutes={workdayMinutes}
        onBreak={onBreak}
        overtime={overtime}
        performans={performans}
        vicdan={vicdan}
        paused={paused}
        onSettings={togglePause}
        hard={difficulty === 'hard'}
        onDesk={atPc && !onBreak ? () => setView('desk') : undefined}
      />

      {paused && <SettingsPanel onResume={togglePause} />}
      {revokeDraft && !desk.inCall && <RecallComposer to={revokeDraft.map((id) => candidateOf(id).name)} onSend={sendRevoke} />}
      {meetingActive && !paused && (
        <Suspense fallback={null}>
          <MeetingRoom />
        </Suspense>
      )}
      {folderOpen && drawer !== 'locked' && (
        <RedFolder state={drawer} photoPages={photoPages} dayIndex={currentDayIndex} onDecide={(photo) => decideDrawer(photo)} onClose={() => setFolderOpen(false)} />
      )}
      <EventBanner onBreak={onBreak} />
      {phoneOpen && !onBreak && !paused && !meetingActive && <PhoneOverlay {...phoneProps} thread={phoneThread} onClose={() => setPhoneOpen(false)} />}

      {onBreak ? (
        <div className={styles.breakArea}>
          <Suspense fallback={null}>
            <BreakRoom dayIndex={currentDayIndex} dayNumber={day.day} onFinish={skipBreak} minutesLeft={BREAK_END_MIN - workdayMinutes} />
          </Suspense>
        </div>
      ) : (
      <div ref={areaRef} className={styles.stageArea}>
        <div className={styles.deskLayer} style={deskStyle} inert={atPc}>
          <Desk
            scale={stageScale}
            onOpenPc={() => {
              audioEngine.playUi('click');
              setView('pc');
            }}
            onOpenPhone={openPhone}
            onOpenDrawer={() => {
              audioEngine.playUi('click');
              setFolderOpen(true);
            }}
          />
        </div>
        <div className={styles.pcLayer} style={pcStyle} inert={!atPc}>
          <PcDesktop
            app={pcApp}
            onOpen={setPcApp}
            onClose={() => setPcApp(null)}
            dayIndex={currentDayIndex}
            minutes={workdayMinutes}
            mailRead={mailRead}
            onReadMail={readMail}
            extraMails={extraMails}
            finalistNames={finalists.map((f) => candidateOf(f.id).name)}
            beckonPortal={!shiftStarted && currentDayIndex === 0}
            portal={
      <div className={`${styles.mainArea} ${styles.portalArea}`} ref={portalRef}>
            {!shiftStarted && needsOrientation && <Orientation container={portalRef} onDone={finishOrientation} />}
            {!shiftStarted && !needsOrientation && <ShiftGate />}
            <QueueSidebar
              mailsHidden={mailsHidden}
              onShowMails={() => setMailsHidden(false)}
              editingMails={editingMails}
              onEditMails={() => setEditingMails(true)}
            />

            {showMails ? (
              <RejectionMails
                ids={todaysRejects}
                autoRejected={Math.max(0, days[currentDayIndex].applicationTarget - lineup.length)}
                dayName={days[currentDayIndex].dayName}
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
                currentCandidateId={currentCandidateId}
              />

            </div>
      </div>
            }
          />
        </div>
        {!onBreak && (
          <NotificationStack
            muted={mutedThreads}
            style={stackStyle}
            callStyle={callStackStyle}
            messages={phone}
            mails={importantMails}
            mailNoticeStyle={mailNoticeAt}
            ringing={ringingCall && !desk.inCall ? { caller: ringingCall.caller, line: ringingCall.line } : null}
            notice={desk.notice}
            noticeKind={desk.noticeKind}
            onClearNotice={clearDeskNotice}
            onPickUp={() => {
              audioEngine.playHandset();
              pickUpCall();
            }}
            onOpenThread={(t) => openPhone(t)}
            onOpenMail={() => {
              setPcApp('mail');
              setView('pc');
            }}
          />
        )}
        {activeCall && !onBreak && <DeskCall key={activeCall.id} call={activeCall} onHangUp={answerCall} />}
      </div>
      )}
    </div>
  );
}
