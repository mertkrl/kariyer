import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { callFor, isOnBreak, lineupFor, useGameStore } from '../game/store/store';
import { days } from '../game/data/days';
import { candidates, candidateOf } from '../game/data/candidates';
import { BREAK_END_MIN } from '../game/lib/time';
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
import { inbox } from '../game/day/mail';
import { RejectionMails } from '../components/gameplay/RejectionMails';
import { Orientation } from '../components/gameplay/Orientation';
import type { ThreadId } from '../game/day/manager';
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
 * Mesai: masa ve yaklaşılan bilgisayar (CV'li portal, yapay zekâ ve kuyruk). Bu ekran neyin
 * nerede durduğunu tutar — hangi görünüm, hangi katman — ve parçaları birbirine bağlar; her
 * parça gösterdiğini store'dan kendisi okur.
 */

// öğle arası ve Çarşamba'nın görüşmesi kendi başına sahnelerdir: başladıklarında yüklenir
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
  const hakanRapport = useGameStore((s) => s.hakanRapport);
  const performans = useGameStore((s) => s.performans);
  const vicdan = useGameStore((s) => s.vicdan);
  const paused = useGameStore((s) => s.paused);
  const shiftStarted = useGameStore((s) => s.shiftStarted);
  const revokeDraft = useGameStore((s) => s.revokeDraft);
  const sendRevoke = useGameStore((s) => s.sendRevoke);
  const extraMails = useGameStore((s) => s.extraMails);
  const answerCandidateMail = useGameStore((s) => s.answerCandidateMail);
  const mailRead = useGameStore((s) => s.mailRead);
  const readMail = useGameStore((s) => s.readMail);
  const finishOrientation = useGameStore((s) => s.finishOrientation);
  // ilk sabah, mesai kartı yerine portal tanıtımıyla başlar
  const needsOrientation = useGameStore((s) => s.currentDayIndex === 0 && !s.orientationDone);
  const activeEvent = useGameStore((s) => s.activeEvent);
  const difficulty = useGameStore((s) => s.difficulty);
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
  /** Telefonun hangi sohbette açılacağı (dokunulan bir bildirim) ya da ana ekran için null. */
  const [phoneThread, setPhoneThread] = useState<ThreadId | null>(null);
  const openPhone = (thread: ThreadId | null = null) => {
    setPhoneThread(thread);
    setPhoneOpen(true);
  };
  const phoneProps = usePhoneProps();
  /** Bilgisayar: masaüstü ya da üzerinde tam ekran açık bir uygulama. */
  const [pcApp, setPcApp] = useState<PcApp | null>(null);
  // Her sabah masada başlar; bilgisayar bir tık uzakta.
  const [view, setView] = useState<'desk' | 'pc'>('desk');
  const atPc = view === 'pc';
  const [editingMails, setEditingMails] = useState(false);
  const [mailsHidden, setMailsHidden] = useState(false);
  const portalRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const { area, stageScale, deskStyle, pcStyle, stackStyle, callStackStyle } = useDeskCamera(areaRef, atPc);
  const deskLayerRef = useRef<HTMLDivElement>(null);
  const pcLayerRef = useRef<HTMLDivElement>(null);
  const shownView = useRef(view);

  // Bilgisayara dönmek (ya da geri dönmek) diğer katmanı etkisiz kılar ve klavye odağı sayfaya
  // düşer; bunun yerine odak, döndüğün tarafın ilk kontrolüne gider.
  useEffect(() => {
    if (shownView.current === view) return;
    shownView.current = view;
    const layer = (view === 'pc' ? pcLayerRef : deskLayerRef).current;
    const active = document.activeElement;
    if (!layer || (active && active !== document.body && layer.contains(active))) return;
    layer.querySelector<HTMLElement>('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus({ preventScroll: true });
  }, [view]);

  const day = days[currentDayIndex];
  const itOutage = activeEvent?.kind === 'it';
  /** Yapay zekâ kutusu çökme gününde ve zor moddaki bilgi işlem arızası sırasında devre dışıdır. */
  const aiOffline = !!day.aiDown || itOutage;
  const lineup = lineupFor({ currentDayIndex, lineups });
  // her dosya karara bağlanınca portal, reddedilenlere ne söyleneceğini sorar
  const todaysRejects = lineup.filter((id) => decisions[id] === 'reject');
  // bugün reddedilen birinin giden kutusunda henüz bildirimi yok
  const pendingMails = !rejectionMailsSent && todaysRejects.some((id) => !plannedRejections[id]);
  const showMails = !rejectionMailsSent && todaysRejects.length > 0 && lineup.every((id) => decisions[id]) && ((pendingMails && !mailsHidden) || editingMails);

  const onBreak = isOnBreak({ workdayMinutes, breakOver });
  const analysis = useAiAnalysis({ dayKey: day.day, onBreak, aiOffline });
  useWorkdaySounds({ onBreak, meetingActive, paused, currentDayIndex, workdayMinutes, ringing });

  // Hakan Bey'in davetlerle ilgili aramasından sonra geri çekme e-postası her şeyin üstünde açılır;
  // e-posta uygulaması arkasında açılır, gönderilen kopya hemen orada durur
  useEffect(() => {
    if (!revokeDraft || desk.inCall) return;
    setView('pc');
    setPcApp('mail');
  }, [revokeDraft, desk.inCall]);

  // Öğle arası telefonu kapatır (sonrasında kendiliğinden yeniden açılmaz).
  if (onBreak && phoneOpen) setPhoneOpen(false);

  // Cmd/Ctrl+Z açık adaydaki kararı geri alır.
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

  // bilgisayardan masaya dönünce klavye kaldığı yerden devam eder: bilgisayardan
  const wasAtPc = useRef(false);
  useEffect(() => {
    if (view === 'pc') wasAtPc.current = true;
    else if (wasAtPc.current) {
      wasAtPc.current = false;
      document.querySelector<HTMLButtonElement>('button[data-key="b"]')?.focus({ preventScroll: true });
    }
  }, [view]);

  // Esc bilgisayardan masaya döndürür (üstte tuşu isteyen başka bir şey yoksa).
  useEffect(() => {
    if (view !== 'pc') return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape' || phoneOpen || paused) return;
      setView('desk');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, phoneOpen, paused]);

  useEffect(() => {
    const interval = setInterval(() => tick(), 1000);
    return () => clearInterval(interval);
  }, [tick]);

  // bir dosya yalnızca ekrandayken okunmuş sayılır: masadan, telefondan ya da bir aramadan değil
  const reading = atPc && pcApp === 'portal' && !showMails && !phoneOpen && !desk.inCall && !paused;
  useEffect(() => {
    useGameStore.getState().setReading(reading);
  }, [reading]);
  useEffect(() => () => useGameStore.getState().setReading(false), []);

  // gizli bir sekme, mesaiyi oyuncunun arkasından işletmez
  useEffect(() => {
    function onVisibility() {
      const s = useGameStore.getState();
      if (document.hidden && !s.paused) s.togglePause();
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // yeni bir gün ilk dosyasıyla açılır
  useEffect(() => {
    if (openedIds.length === 0 && lineup.length > 0) {
      selectCandidate(lineup[0]);
    }
    // oxlint-disable-next-line react/exhaustive-deps
  }, [day.day]);

  // giden kutusu bildirimi CV'nin ortasında, adayın adıyla aynı hizada durur
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
    // dar bir kartta adın yanında yer yok: bildirim onun hemen üstüne geçer
    const narrow = c.width < 700;
    setMailNoticeAt({
      left: c.left + c.width / 2 - a.left,
      top: narrow ? n.top - a.top - 8 : n.top + n.height / 2 - a.top,
      transform: narrow ? 'translate(-50%, -100%)' : undefined,
    });
  }, [mailNotice, atPc, desk.notice, area.w, area.h, currentCandidateId]);

  const callState = { managerRequests, managerStance, hakanRapport, currentDayIndex, desk, performans, story, justifyRejects, finalists };
  const ringingCall = ringing ? callFor(callState, ringing) : undefined;
  const activeCall = desk.inCall ? callFor(callState, desk.inCall) : undefined;
  const mails = inbox(currentDayIndex, workdayMinutes, extraMails);
  // yalnızca önemli e-posta omzuna dokunur; gerisi gelen kutusunda bekler
  const importantMails = mails.filter((m) => (m.folder ?? 'inbox') === 'inbox' && !m.spam && (m.important || m.reply));

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
        <div ref={deskLayerRef} className={styles.deskLayer} style={deskStyle} inert={atPc}>
          <Desk
            scale={stageScale}
            onOpenPc={() => {
              audioEngine.playUi('click');
              setView('pc');
            }}
            onOpenPhone={openPhone}
          />
        </div>
        <div ref={pcLayerRef} className={styles.pcLayer} style={pcStyle} inert={!atPc}>
          <PcDesktop
            app={pcApp}
            onOpen={setPcApp}
            onClose={() => setPcApp(null)}
            dayIndex={currentDayIndex}
            minutes={workdayMinutes}
            mailRead={mailRead}
            onReadMail={readMail}
            onAnswerMail={answerCandidateMail}
            extraMails={extraMails}
            finalistNames={finalists.map((f) => candidateOf(f.id).name)}
            beckonPortal={!shiftStarted && currentDayIndex === 0}
            portal={
      <div className={`${styles.mainArea} ${styles.portalArea}`} ref={portalRef} data-note-host>
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
