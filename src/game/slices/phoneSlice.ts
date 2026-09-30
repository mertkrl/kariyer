/*
 * The phones: answering texts and the manager's requests, reading, muting group chats.
 */
import type { GetState, SetState } from '../storeApi';
import type { GameState } from '../storeTypes';
import { REPLY_EFFECT, managerReaction, managerTone, replyText } from '../manager';
import { sound } from '../sound';
import { clampScore } from '../storeDefaults';
import { takeMessageId } from '../clock';

export const createPhoneSlice = (set: SetState, get: GetState): Pick<GameState, 'toggleMuteThread' | 'answerMessage' | 'answerRequest' | 'markPhoneRead'> => ({
  toggleMuteThread: (thread) =>
    set((state) => ({ mutedThreads: state.mutedThreads.includes(thread) ? state.mutedThreads.filter((t) => t !== thread) : [...state.mutedThreads, thread] })),

  answerMessage: (messageId, replyIndex) => {
    const state = get();
    const msg = state.phone.find((m) => m.id === messageId);
    const reply = msg?.replies?.[replyIndex];
    if (!msg || !reply || msg.answered || msg.expired) return;
    const stance = reply.stance
      ? {
          refusals: state.managerStance.refusals + (reply.stance === 'refuse' ? 1 : 0),
          complies: state.managerStance.complies + (reply.stance === 'comply' ? 1 : 0) }
      : state.managerStance;
    // what you say matters — and so does writing back to Mom at all
    const momCare = msg.thread === 'mom' ? 1 : 0;
    set({
      performans: clampScore(state.performans + (reply.performans ?? 0)),
      vicdan: clampScore(state.vicdan + (reply.vicdan ?? 0) + momCare),
      managerStance: stance,
      story: reply.neighbourCv ? { ...state.story, neighbourCv: true } : state.story,
      typingThread: msg.thread,
      dayEvents:
        reply.event && state.workdayMinutes <= reply.event.at + 20
          ? [...state.dayEvents, { kind: 'calendar' as const, at: Math.max(reply.event.at, state.workdayMinutes), minutes: reply.event.minutes, text: reply.event.text }].sort((a, b) => a.at - b.at)
          : state.dayEvents,
      week: msg.thread === 'mom' ? { ...state.week, momAnswered: state.week.momAnswered + 1 } : state.week,
      phone: [
        ...state.phone.map((m) => (m.id === messageId ? { ...m, answered: true } : m)),
        { id: takeMessageId(), thread: msg.thread, at: state.workdayMinutes, day: state.currentDayIndex, from: 'me', text: reply.text },
      ] });
    sound().playUi('click');
    window.setTimeout(() => {
      const s2 = get();
      if (s2.phase !== 'gameplay') return;
      set({
        phone: [
          ...s2.phone,
          { id: takeMessageId(), thread: msg.thread, at: s2.workdayMinutes, day: s2.currentDayIndex, from: 'them', sender: reply.reactionSender, text: reply.reaction },
        ],
        typingThread: s2.typingThread === msg.thread ? null : s2.typingThread,
        phoneUnread: { ...s2.phoneUnread, [msg.thread]: s2.phoneUnread[msg.thread] + 1 },
        // the private half of the answer arrives later, through the normal message pacing
        managerScript: reply.aside
          ? [
              ...s2.managerScript,
              { at: s2.workdayMinutes + reply.aside.after, kind: 'ambient' as const, dayIndex: s2.currentDayIndex, ambient: { thread: reply.aside.thread, text: reply.aside.text } },
            ].sort((a, b) => a.at - b.at)
          : s2.managerScript });
      sound().playPhoneBuzz();
    }, 1800);
  },

  answerRequest: (requestId, answer) => {
    const state = get();
    const request = state.managerRequests.find((r) => r.id === requestId);
    if (!request || request.answer) return;
    const effect = REPLY_EFFECT[answer];
    const now = state.workdayMinutes;
    const stance = {
      refusals: state.managerStance.refusals + (answer === 'refuse' ? 1 : 0),
      complies: state.managerStance.complies + (answer === 'comply' ? 1 : 0) };
    set({
      managerRequests: state.managerRequests.map((r) => (r.id === requestId ? { ...r, answer } : r)),
      phone: [
        ...state.phone,
        { id: takeMessageId(), thread: 'manager', at: now, day: state.currentDayIndex, from: 'me', text: replyText(answer, state.managerStance), requestId },
      ],
      managerStance: stance,
      performans: clampScore(state.performans + effect.performans),
      vicdan: clampScore(state.vicdan + effect.vicdan) });
    sound().playUi('click');
    // The manager "types" for a moment before reacting.
    window.setTimeout(() => {
      const s2 = get();
      if (s2.phase !== 'gameplay') return;
      set({
        phone: [
          ...s2.phone,
          {
            id: takeMessageId(),
            thread: 'manager',
            at: s2.workdayMinutes,
            day: s2.currentDayIndex,
            from: 'them',
            text: managerReaction(answer, managerTone(stance.refusals)) },
        ],
        phoneUnread: { ...s2.phoneUnread, manager: s2.phoneUnread.manager + 1 } });
      sound().playPhoneBuzz();
    }, 1600);
  },

  markPhoneRead: (thread) => set((state) => ({ phoneUnread: { ...state.phoneUnread, [thread]: 0 } })),
});
