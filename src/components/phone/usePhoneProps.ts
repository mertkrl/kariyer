import { useGameStore } from '../../game/store';
import { candidateOf } from '../../game/data/candidates';
import { days } from '../../game/data/days';
import { formatClock } from '../../game/time';
import { rejectedEchoes } from '../../game/echoes';
import { dmProfile, writesBack } from './apps/candidateDms';

/** Telefonun mesai boyunca gösterdiği her şey, store'dan toplanmış. */
export function usePhoneProps() {
  const currentDayIndex = useGameStore((s) => s.currentDayIndex);
  const workdayMinutes = useGameStore((s) => s.workdayMinutes);
  const phone = useGameStore((s) => s.phone);
  const phoneUnread = useGameStore((s) => s.phoneUnread);
  const managerRequests = useGameStore((s) => s.managerRequests);
  const managerStance = useGameStore((s) => s.managerStance);
  const decisionLog = useGameStore((s) => s.decisionLog);
  const weekLog = useGameStore((s) => s.weekLog);
  const dmHandled = useGameStore((s) => s.dmHandled);
  const mutedThreads = useGameStore((s) => s.mutedThreads);
  const typingThread = useGameStore((s) => s.typingThread);
  const gameSeed = useGameStore((s) => s.seed);
  const answerRequest = useGameStore((s) => s.answerRequest);
  const answerMessage = useGameStore((s) => s.answerMessage);
  const markPhoneRead = useGameStore((s) => s.markPhoneRead);
  const toggleMuteThread = useGameStore((s) => s.toggleMuteThread);
  const answerCandidateDm = useGameStore((s) => s.answerCandidateDm);
  const day = days[currentDayIndex];

  return {
    muted: mutedThreads,
    onToggleMute: toggleMuteThread,
    typing: typingThread,
    messages: phone,
    // ricalar sabit hattan gelir; sohbette yalnızca bir zamanlar mesajla gelen ricalar görünür
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
    // geri çevirdiğin insanların yalnızca bazıları yazar, her biri kendi süresi sonra ve kendi ruh hâliyle
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
}
