import { lazy, Suspense, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { callFor, isOnBreak, useGameStore } from '../game/store/store';
import { days } from '../game/data/days';
import { candidateOf } from '../game/data/candidates';
import { BREAK_END_MIN } from '../game/lib/time';
import { audioEngine } from '../audio/audioEngine';
import { SettingsPanel } from '../components/ui/SettingsPanel';
import { TopBar } from '../components/gameplay/TopBar';
import { PhoneOverlay } from '../components/phone/Phone';
import { usePhoneProps } from '../components/phone/usePhoneProps';
import { Desk } from '../components/desk/Desk';
import { DeskCall } from '../components/desk/DeskCall';
import { NotificationStack } from '../components/desk/NotificationStack';
import { PcDesktop, type PcApp } from '../components/pc/PcDesktop';
import { inbox } from '../game/day/mail';
import type { ThreadId } from '../game/day/manager';
import { RecallComposer } from '../components/gameplay/RecallComposer';
import { EventBanner } from '../components/gameplay/EventBanner';
import { useAiAnalysis } from '../components/gameplay/useAiAnalysis';
import { useDeskCamera } from '../components/gameplay/useDeskCamera';
import { useWorkdaySounds } from '../components/gameplay/useWorkdaySounds';
import { useWorkdayControls } from '../components/gameplay/useWorkdayControls';
import { Portal } from '../components/gameplay/Portal';
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
  const currentCandidateId = useGameStore((s) => s.currentCandidateId);
  const meetingActive = useGameStore((s) => s.meeting.state === 'active');
  const finalists = useGameStore((s) => s.finalists);
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
  const areaRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const { area, stageScale, deskStyle, pcStyle, stackStyle, callStackStyle } = useDeskCamera(areaRef, atPc, activeEvent?.kind === 'power', pcApp !== null);
  const deskLayerRef = useRef<HTMLDivElement>(null);
  const pcLayerRef = useRef<HTMLDivElement>(null);

  const day = days[currentDayIndex];
  const itOutage = activeEvent?.kind === 'it';
  /** Yapay zekâ kutusu çökme gününde ve zor moddaki bilgi işlem arızası sırasında devre dışıdır. */
  const aiOffline = !!day.aiDown || itOutage;

  const onBreak = isOnBreak({ workdayMinutes, breakOver });
  const analysis = useAiAnalysis({ dayKey: day.day, onBreak, aiOffline });
  useWorkdaySounds({ onBreak, meetingActive, paused, currentDayIndex, workdayMinutes, ringing });

  // Hakan Bey'in davetlerle ilgili aramasından sonra geri çekme e-postası her şeyin üstünde açılır;
  // e-posta uygulaması arkasında açılır, gönderilen kopya hemen orada durur
  // (render sırasında, açıldığı an bir kez: React'in "önceki değere göre durum ayarlama" kalıbı)
  const revokeOpen = Boolean(revokeDraft) && !desk.inCall;
  const [revokeShown, setRevokeShown] = useState(false);
  if (revokeOpen !== revokeShown) {
    setRevokeShown(revokeOpen);
    if (revokeOpen) {
      setView('pc');
      setPcApp('mail');
    }
  }

  // Öğle arası telefonu kapatır (sonrasında kendiliğinden yeniden açılmaz).
  if (onBreak && phoneOpen) setPhoneOpen(false);

  useWorkdayControls({ view, setView, phoneOpen, paused, deskLayerRef, pcLayerRef });
  const portalActive = atPc && pcApp === 'portal' && !phoneOpen && !desk.inCall && !paused;

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
            portal={<Portal active={portalActive} onBreak={onBreak} analysis={analysis} aiOffline={aiOffline} itOutage={itOutage} nameRef={nameRef} />}
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
