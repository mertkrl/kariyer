import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { approvalQuota, callFor, isOnBreak, lineupFor, useGameStore } from '../game/store';
import { candidateDetails } from '../game/data/candidateDetails';
import { days } from '../game/data/days';
import { candidates, candidateOf } from '../game/data/candidates';
import type { Candidate, EvaluatedField } from '../game/types';
import { BREAK_END_MIN, formatClock } from '../game/time';
import { Button } from '../components/ui/Button';
import { AiIcon } from '../components/ui/AiIcon';
import { RedFolder } from '../components/story/RedFolder';
import { audioEngine } from '../audio/audioEngine';
import { SettingsPanel } from '../components/ui/SettingsPanel';
import { DailyActivity } from '../components/gameplay/DailyActivity';
import { TopBar } from '../components/gameplay/TopBar';
import { PhoneOverlay } from '../components/phone/Phone';
import { Desk } from '../components/desk/Desk';
import { FIT_H, FIT_W, STAGE_H, STAGE_W } from '../components/desk/DeskRoom';
import { DeskCall } from '../components/desk/DeskCall';
import { NotificationStack } from '../components/desk/NotificationStack';
import { PcDesktop, type PcApp } from '../components/pc/PcDesktop';
import { dmProfile, writesBack } from '../components/phone/apps/candidateDms';
import { inbox } from '../game/mail';
import { atsReport, systemLineWith } from '../game/ats';
import { rejectedEchoes } from '../game/echoes';
import { RejectionMails } from '../components/gameplay/RejectionMails';
import { Orientation } from '../components/gameplay/Orientation';
import { REFERENCE_MINUTES, referenceFor } from '../game/references';
import type { ThreadId } from '../game/manager';
import { CvBody } from '../components/gameplay/CvBody';
import { QueueSidebar } from '../components/gameplay/QueueSidebar';
import { RecallComposer } from '../components/gameplay/RecallComposer';
import { ShiftGate } from '../components/gameplay/ShiftGate';
import { scanAt, SCAN_FIELD_DELAYS } from '../components/gameplay/scan';
import styles from './GameplayScreen.module.css';

// the lunch break and Wednesday's call are whole scenes of their own: loaded when they start
const BreakRoom = lazy(() => import('./break/BreakRoom').then((m) => ({ default: m.BreakRoom })));
const MeetingRoom = lazy(() => import('../components/meeting/MeetingRoom').then((m) => ({ default: m.MeetingRoom })));

const ANALYZE_DURATION_MS = 4600;
/** Centre and size of the monitor's screen on the desk stage — where the camera zooms in. */
const SCREEN_CENTER = { x: 720, y: 269.5 };
const SCREEN_SIZE = { w: 596, h: 335 };


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

export function GameplayScreen() {
  const currentDayIndex = useGameStore((s) => s.currentDayIndex);
  const workdayMinutes = useGameStore((s) => s.workdayMinutes);
  const openedIds = useGameStore((s) => s.openedIds);
  const currentCandidateId = useGameStore((s) => s.currentCandidateId);
  const decisions = useGameStore((s) => s.decisions);
  const decisionLog = useGameStore((s) => s.decisionLog);
  const weekLog = useGameStore((s) => s.weekLog);
  const meetingActive = useGameStore((s) => s.meeting.state === 'active');
  const finalists = useGameStore((s) => s.finalists);
  const lineups = useGameStore((s) => s.lineups);
  const phone = useGameStore((s) => s.phone);
  const phoneUnread = useGameStore((s) => s.phoneUnread);
  const managerRequests = useGameStore((s) => s.managerRequests);
  const answerRequest = useGameStore((s) => s.answerRequest);
  const answerMessage = useGameStore((s) => s.answerMessage);
  const markPhoneRead = useGameStore((s) => s.markPhoneRead);
  const managerStance = useGameStore((s) => s.managerStance);
  const [phoneOpen, setPhoneOpen] = useState(false);
  /** Which chat to open the phone on (a tapped notification), or null for the home screen. */
  const [phoneThread, setPhoneThread] = useState<ThreadId | null>(null);
  const openPhone = (thread: ThreadId | null = null) => {
    setPhoneThread(thread);
    setPhoneOpen(true);
  };
  const timeSpent = useGameStore((s) => s.timeSpent);
  const performans = useGameStore((s) => s.performans);
  const vicdan = useGameStore((s) => s.vicdan);
  const paused = useGameStore((s) => s.paused);
  const shiftStarted = useGameStore((s) => s.shiftStarted);
  const revokeDraft = useGameStore((s) => s.revokeDraft);
  const sendRevoke = useGameStore((s) => s.sendRevoke);
  const extraMails = useGameStore((s) => s.extraMails);
  const [noteOpen, setNoteOpen] = useState(false);
  const finishOrientation = useGameStore((s) => s.finishOrientation);
  // the first morning begins with the portal walk-through instead of the clock-in card
  const needsOrientation = useGameStore((s) => s.currentDayIndex === 0 && !s.orientationDone);
  const portalRef = useRef<HTMLDivElement>(null);
  const activeEvent = useGameStore((s) => s.activeEvent);
  const difficulty = useGameStore((s) => s.difficulty);
  const dmHandled = useGameStore((s) => s.dmHandled);
  const drawer = useGameStore((s) => s.story.drawer);
  const photoPages = useGameStore((s) => s.story.photoPages);
  const decideDrawer = useGameStore((s) => s.decideDrawer);
  const [folderOpen, setFolderOpen] = useState(false);
  const answerCandidateDm = useGameStore((s) => s.answerCandidateDm);
  const recordAiUse = useGameStore((s) => s.recordAiUse);
  const desk = useGameStore((s) => s.desk);
  const ringing = desk.ringing;
  const pickUpCall = useGameStore((s) => s.pickUpCall);
  const answerCall = useGameStore((s) => s.answerCall);
  const clearDeskNotice = useGameStore((s) => s.clearDeskNotice);
  const breakOver = useGameStore((s) => s.breakOver);
  const overtime = useGameStore((s) => s.overtime);
  const mailRead = useGameStore((s) => s.mailRead);
  const readMail = useGameStore((s) => s.readMail);
  const referenceChecks = useGameStore((s) => s.referenceChecks);
  const callReference = useGameStore((s) => s.callReference);
  /** The computer: the desktop, or one maximised app on it. */
  const [pcApp, setPcApp] = useState<PcApp | null>(null);
  // Every morning starts at the desk; the computer is one click away.
  const [view, setView] = useState<'desk' | 'pc'>('desk');
  const areaRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  // the outbox notice sits centred on the CV, level with the candidate's name
  const [mailNoticeAt, setMailNoticeAt] = useState<CSSProperties | undefined>();
  const [area, setArea] = useState({ w: 1280, h: 720 });
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () => setArea({ w: el.clientWidth || 1, h: el.clientHeight || 1 });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  const selectCandidate = useGameStore((s) => s.selectCandidate);
  const tick = useGameStore((s) => s.tick);
  const decide = useGameStore((s) => s.decide);
  const undoDecision = useGameStore((s) => s.undoDecision);
  const planRejectionMails = useGameStore((s) => s.planRejectionMails);
  const plannedRejections = useGameStore((s) => s.plannedRejections);
  const [editingMails, setEditingMails] = useState(false);
  const rejectionMailsSent = useGameStore((s) => s.rejectionMailsSent);
  const [mailsHidden, setMailsHidden] = useState(false);
  const skipBreak = useGameStore((s) => s.skipBreak);
  const togglePause = useGameStore((s) => s.togglePause);

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
  const [analyzedIds, setAnalyzedIds] = useState<Set<string>>(new Set());
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const onBreak = isOnBreak({ workdayMinutes, breakOver });

  // Open-plan office sound bed while working (the cafeteria has its own ambience). During
  // Wednesday's video call you're in your headphones: no office, no rain on the window.
  const office = useRef<ReturnType<typeof audioEngine.startOfficeAmbience> | null>(null);
  useEffect(() => {
    if (onBreak || meetingActive) return;
    office.current = audioEngine.startOfficeAmbience(currentDayIndex === 2);
    return () => {
      office.current?.stop();
      office.current = null;
    };
  }, [onBreak, currentDayIndex, meetingActive]);
  useEffect(() => {
    office.current?.setUrgency(workdayMinutes >= 480 ? 1 : 0);
  }, [workdayMinutes]);

  // after Hakan Bey's call about the invitations the recall mail opens over everything; the mail
  // app comes up behind it, so the sent copy is right there afterwards
  useEffect(() => {
    if (!revokeDraft || desk.inCall) return;
    setView('pc');
    setPcApp('mail');
  }, [revokeDraft, desk.inCall]);

  // Lunch break puts the phone down (it does not pop back open afterwards).
  if (onBreak && phoneOpen) setPhoneOpen(false);

  // Lunch bell rings the moment the clock hits 12:00.
  const wasOnBreak = useRef(onBreak);
  useEffect(() => {
    if (onBreak && !wasOnBreak.current) audioEngine.playLunchBell();
    wasOnBreak.current = onBreak;
  }, [onBreak]);

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

  // The landline keeps ringing until you pick it up or it gives up.
  useEffect(() => {
    if (!ringing || paused || onBreak) return;
    audioEngine.playDeskRing();
    const id = window.setInterval(() => audioEngine.playDeskRing(), 2600);
    return () => window.clearInterval(id);
  }, [ringing, paused, onBreak]);

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
    audioEngine.setMusicMood(paused ? 'paused' : onBreak ? 'break' : 'work');
  }, [paused, onBreak]);

  useEffect(() => {
    const interval = setInterval(() => tick(), 1000);
    return () => clearInterval(interval);
  }, [tick]);

  useEffect(() => {
    if (openedIds.length === 0 && lineup.length > 0) {
      selectCandidate(lineup[0]);
    }
    audioEngine.stopScan();
    setAnalyzedIds(new Set());
    setAnalyzingId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.day]);

  useEffect(() => {
    setNoteOpen(false);
  }, [currentCandidateId]);

  const candidate = currentCandidateId ? candidates[currentCandidateId] : null;
  const details = candidate ? candidateDetails[candidate.id] : undefined;
  const decidedForCurrent = currentCandidateId ? decisions[currentCandidateId] : undefined;
  const quotaCut = useGameStore((s) => s.quotaCut);
  const quota = approvalQuota({ currentDayIndex, decisions, finalists, lineups, quotaCut });
  const quotaReason = quota.totalLeft === 0 ? 'Haftalık mülakat kontenjanı doldu' : quota.dailyLeft === 0 ? 'Bugünkü kontenjan doldu' : null;
  const decidedAt = decisionLog.find((e) => e.id === currentCandidateId)?.at;
  const nextUndecidedId = lineup.find((id) => !decisions[id] && id !== currentCandidateId);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  function handleAnalyze() {
    if (!currentCandidateId || analyzingId || onBreak) return;
    const id = currentCandidateId;
    setAnalyzingId(id);
    recordAiUse();
    // Lock-on ticks land when each CV field lights up (its --scan-delay + the pulse's 4% keyframe).
    audioEngine.startScan(
      ANALYZE_DURATION_MS / 1000,
      SCAN_FIELD_DELAYS.map((d) => d + 0.05),
    );
    // The engine resolves the scan with a completion chime on its own.
    setTimeout(() => {
      setAnalyzedIds((prev) => new Set(prev).add(id));
      // the verdict pops up next to the AI badge; click the badge to fold it away
      if (useGameStore.getState().currentCandidateId === id) setNoteOpen(true);
      setAnalyzingId((current) => (current === id ? null : current));
    }, ANALYZE_DURATION_MS);
  }

  const isAnalyzing = candidate ? analyzingId === candidate.id : false;
  const isAnalyzed = candidate ? analyzedIds.has(candidate.id) : false;
  const hasNote = !aiOffline && !!candidate && !onBreak && isAnalyzed && !isAnalyzing;


  const mutedThreads = useGameStore((s) => s.mutedThreads);
  const gameSeed = useGameStore((s) => s.seed);
  const typingThread = useGameStore((s) => s.typingThread);
  const toggleMuteThread = useGameStore((s) => s.toggleMuteThread);
  const phoneProps = {
    muted: mutedThreads,
    onToggleMute: toggleMuteThread,
    typing: typingThread,
    messages: phone,
    // favours come by landline; only requests that were ever texted show up in the chat
    requests: managerRequests.filter((r) => phone.some((m) => m.requestId === r.id)),
    unread: phoneUnread,
    stance: managerStance,
    clock: formatClock(workdayMinutes),
    dayName: `${day.dayName} · Gün ${day.day}`,
    onAnswer: answerRequest,
    onQuickReply: answerMessage,
    onRead: markPhoneRead,
    minutes: workdayMinutes,
    weatherPenalty: [0, 0.05, 0.15, 0.25][currentDayIndex] ?? 0,
    dayIndex: currentDayIndex,
    // only some of the people you turn away write, each after their own while and in their own temper
    dmCandidates: decisionLog
      .filter((e) => e.decision === 'reject' && writesBack(e.id, gameSeed))
      .map((e) => ({
        id: e.id,
        name: candidateOf(e.id).name,
        initials: candidateOf(e.id).initials,
        color: candidateOf(e.id).color,
        role: candidateOf(e.id).role.replace(' adayı', ''),
        at: e.at,
        dayIndex: currentDayIndex,
        ...dmProfile(e.id, gameSeed),
      })),
    dmHandled,
    onDm: answerCandidateDm,
    echoes: rejectedEchoes(weekLog, currentDayIndex),
    rejectedAuthors: decisionLog
      .filter((e) => e.decision === 'reject')
      .map((e) => ({ name: candidateOf(e.id).name, initials: candidateOf(e.id).initials, color: candidateOf(e.id).color })),
  };

  // camera: the desk zooms into the monitor while the system UI grows out of its screen
  // seated a step back: the whole desk (and the clock on the wall) always in frame;
  // on a phone-narrow screen the sides may crop rather than shrinking everything to a stamp
  const stageScale = area.w < 820 ? Math.max(area.w / FIT_W, area.h / 1300) : Math.min(area.w / FIT_W, area.h / FIT_H);
  const ox = area.w / 2 + (SCREEN_CENTER.x - STAGE_W / 2) * stageScale;
  const oy = area.h / 2 + (SCREEN_CENTER.y - STAGE_H / 2) * stageScale;
  const zoom = Math.max(area.w / (SCREEN_SIZE.w * stageScale), area.h / (SCREEN_SIZE.h * stageScale));
  const atPc = view === 'pc';
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
  }, [mailNotice, atPc, desk.notice, area.w, area.h]);
  const ease ='cubic-bezier(0.65, 0, 0.25, 1)';
  const deskStyle: CSSProperties = {
    transformOrigin: `${ox}px ${oy}px`,
    transform: atPc ? `translate(${area.w / 2 - ox}px, ${area.h / 2 - oy}px) scale(${zoom})` : 'none',
    transition: `transform 0.7s ${ease}, filter 0.7s ease`,
    filter: atPc ? 'blur(3px) brightness(0.7)' : 'none',
  };
  const pcStyle: CSSProperties = {
    transformOrigin: '50% 50%',
    transform: atPc ? 'none' : `translate(${ox - area.w / 2}px, ${oy - area.h / 2}px) scale(${1 / zoom})`,
    opacity: atPc ? 1 : 0,
    transition: atPc ? `transform 0.7s ${ease}, opacity 0.35s ease 0.3s` : `transform 0.7s ${ease}, opacity 0.25s ease`,
  };
  const story = useGameStore((s) => s.story);
  const justifyRejects = useGameStore((s) => s.justifyRejects);
  const callState = { managerRequests, managerStance, currentDayIndex, desk, performans, story, justifyRejects, finalists };
  const ringingCall = ringing ? callFor(callState, ringing) : undefined;
  const activeCall = desk.inCall ? callFor(callState, desk.inCall) : undefined;
  const mails = inbox(currentDayIndex, workdayMinutes, extraMails);
  // only mail that matters taps you on the shoulder; the rest waits in the inbox
  const importantMails = mails.filter((m) => (m.folder ?? 'inbox') === 'inbox' && (m.important || m.reply));
  // notifications rise from the mobile phone on the desk (right), or bottom-right at the computer
  const phoneX = area.w / 2 + (1482 - STAGE_W / 2) * stageScale;
  const phoneY = area.h / 2 + (636 - STAGE_H / 2) * stageScale;
  const landX = area.w / 2 + (245 - STAGE_W / 2) * stageScale;
  const landY = area.h / 2 + (496 - STAGE_H / 2) * stageScale;
  const callStackStyle: CSSProperties | undefined = atPc ? undefined : { left: Math.max(12, landX - 170), bottom: Math.max(12, area.h - landY + 6) };
  const stackStyle: CSSProperties = atPc
    ? { right: 16, bottom: 58 }
    : { right: Math.max(12, area.w - phoneX - 170), bottom: Math.max(12, area.h - phoneY + 6) };

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
      {activeEvent?.kind === 'power' && !onBreak && (
        <div className={styles.powerOut} role="alert">
          <div className={styles.powerOutTitle}>⚡ Elektrik kesildi</div>
          <div className={styles.powerOutText}>Jeneratör devreye giriyor… Ekranlar kapalı, bu sırada karar veremezsin. Saat ise işliyor.</div>
        </div>
      )}
      {activeEvent && activeEvent.kind !== 'power' && !onBreak && (
        <div key={activeEvent.kind + activeEvent.until} className={`${styles.eventToast} ${activeEvent.kind === 'calendar' || activeEvent.kind === 'weather' ? styles.eventCalm : ''}`} role="status">
          {activeEvent.text ??
            (activeEvent.kind === 'meeting'
              ? '📅 Hakan Bey seni "5 dakikalık" acil toplantıya çağırdı — yarım saat gitti.'
              : '🖥 IT arızası! Yapay zekâ sistemi yaklaşık 1 saat devre dışı.')}
        </div>
      )}
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
                          disabled={Boolean(desk.inCall || desk.ringing) || onBreak}
                          title={desk.inCall || desk.ringing ? 'Hat meşgul' : 'Eski işverenini ara ve CV\'deki bilgiyi doğrula'}
                          onClick={() => callReference(candidate.id)}
                        >
                          ☎ Referansı ara <small>{REFERENCE_MINUTES} dk</small>
                        </button>
                      ) : (
                        <span className={styles.referenceNone}>☎ Aranacak referans yok</span>
                      )}
                    </div>
                  </header>

                  <CvBody candidate={candidate} details={details} scanning={isAnalyzing} verdicts={isAnalyzed && !isAnalyzing} />

                  <div className={styles.grow} />

                  {decidedForCurrent ? (
                    <div
                      className={`${styles.decisionBar} ${decidedForCurrent === 'approve' ? styles.decisionBarApprove : styles.decisionBarReject}`}
                    >
                      <div className={styles.decisionInfo}>
                        <span className={styles.decisionTitle}>
                          {decidedForCurrent === 'approve' ? '✓ Mülakata çağrıldı' : '✕ Reddedildi'}
                        </span>
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
            </div>
            )}

            <div className={styles.rightPanel} data-tour="right">
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
                    onClick={() => hasNote && setNoteOpen((o) => !o)}
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
                    <button type="button" className={styles.noteBubbleClose} onClick={() => setNoteOpen(false)} aria-label="Kapat">
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
