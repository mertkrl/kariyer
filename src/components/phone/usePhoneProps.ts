import { useGameStore } from '../../game/store';
import { candidateOf } from '../../game/data/candidates';
import { days } from '../../game/data/days';
import { formatClock } from '../../game/time';
import { rejectedEchoes } from '../../game/echoes';
import { dmProfile, writesBack } from './apps/candidateDms';

/** Everything the phone shows during the workday, gathered from the store. */
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
}
