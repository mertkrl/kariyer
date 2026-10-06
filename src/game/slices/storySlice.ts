/*
 * The week's story beyond the CV queue: the meeting, money and bills, evenings, rejection notices, the interviews and the hire.
 */
import type { GetState, SetState } from '../storeApi';
import type { GameState } from '../storeTypes';
import { BILLS, EVENING_ACTIVITIES, EXPENSES, RENT } from '../story';
import { DM_EFFECT, TEAM_LATE_DAY, TEAM_LATE_END, clampScore, lineupFor } from '../storeDefaults';
import { MAIL_SEND_AT, dispatchRejections, mailsPending, spendMinutes } from '../clock';
import { MEETING_MINUTES, OPTIONS } from '../meeting';
import { REPLY_BACK, TEMPLATE_MINUTES, outboxMails, replyBackMail } from '../rejectionMails';
import { sound } from '../sound';
import { candidateDetails } from '../data/candidateDetails';
import { panelDecision } from '../managerCalls';
import { later } from '../later';
import { NEPHEW_ID } from '../data/candidates';
import { salaryTalk } from '../interview';

export const createStorySlice = (set: SetState, get: GetState): Pick<GameState, 'doActivity' | 'askForbidden' | 'payBill' | 'setExpense' | 'payRent' | 'finishReckoning' | 'answerCandidateDm' | 'finishWeekend' | 'setWeekendChoice' | 'hakanInterrupt' | 'answerCandidate' | 'hire' | 'finishMeeting' | 'planRejectionMails' | 'readMail' | 'answerCandidateMail' | 'settleSalary' | 'recordAiUse' | 'setDifficulty'> => ({
  doActivity: (id) => {
    const state = get();
    const a = EVENING_ACTIVITIES[state.currentDayIndex]?.find((x) => x.id === id);
    if (!a || state.story.activities.includes(id) || state.story.money < a.cost) return;
    sound().playUi('confirm');
    set({ story: { ...state.story, money: state.story.money - a.cost, spentToday: state.story.spentToday + a.cost, activities: [...state.story.activities, id] } });
  },

  askForbidden: () =>
    set((state) => ({
      forbiddenAsked: state.forbiddenAsked + 1,
      performans: clampScore(state.performans + 2),
      vicdan: clampScore(state.vicdan - 4) })),

  payBill: (id, pay) =>
    set((state) => {
      const bill = BILLS.find((b) => b.id === id);
      if (!bill || state.story.bills[id]) return {};
      const can = state.story.money >= bill.amount;
      const paid = pay && can;
      return {
        story: { ...state.story, bills: { ...state.story.bills, [id]: paid ? 'paid' : 'skipped' }, money: state.story.money - (paid ? bill.amount : 0) },
        // leaving Mom without her medicine weighs on you
        vicdan: clampScore(state.vicdan - (!paid && id === 'kart' ? 2 : 0)) };
    }),

  setExpense: (id, pay) =>
    set((state) => {
      const e = EXPENSES.find((x) => x.id === id);
      const today = state.story.ledger[state.currentDayIndex] ?? {};
      if (!e || today[id] !== undefined) return {};
      const paid = pay && state.story.money >= e.cost;
      sound().playUi(paid ? 'confirm' : 'click');
      return {
        story: {
          ...state.story,
          money: state.story.money - (paid ? e.cost : 0),
          ledger: { ...state.story.ledger, [state.currentDayIndex]: { ...today, [id]: paid } } } };
    }),

  payRent: (pay) =>
    set((state) => {
      const paid = pay && state.story.money >= RENT;
      return { story: { ...state.story, rent: paid ? 'paid' : 'unpaid', money: state.story.money - (paid ? RENT : 0) } };
    }),


  finishReckoning: () => set({ phase: 'weekend' }),

  answerCandidateDm: (candidateId, kind) =>
    set((state) => {
      if (state.dmHandled[candidateId]) return {};
      const e = DM_EFFECT[kind];
      return {
        dmHandled: { ...state.dmHandled, [candidateId]: kind },
        performans: clampScore(state.performans + e.performans),
        vicdan: clampScore(state.vicdan + e.vicdan) };
    }),

  finishWeekend: () => set({ phase: 'final' }),

  setWeekendChoice: (weekendChoice) => set({ weekendChoice }),

  hakanInterrupt: (protect) =>
    set((state) => ({
      interviewStance: { ...state.interviewStance, [protect ? 'protected' : 'silent']: state.interviewStance[protect ? 'protected' : 'silent'] + 1 },
      performans: clampScore(state.performans + (protect ? -3 : 0)),
      vicdan: clampScore(state.vicdan + (protect ? 3 : -3)) })),

  answerCandidate: (honest) =>
    set((state) => ({
      interviewStance: { ...state.interviewStance, [honest ? 'honest' : 'polished']: state.interviewStance[honest ? 'honest' : 'polished'] + 1 },
      performans: clampScore(state.performans + (honest ? -1 : 1)),
      vicdan: clampScore(state.vicdan + (honest ? 2 : -2)) })),

  hire: (recommended, panel) => {
    const state = get();
    if (state.phase !== 'finalRound' || state.hiredId) return;
    // you only recommend; the panel (you, Levent, Hakan Bey) decides
    const id = panelDecision(recommended, state.finalists.length ? state.finalists : [{ id: NEPHEW_ID, day: 0 }], state.story.pastRequests, panel).hired;
    // How the hire actually works out moves Performans; hiring someone the system had
    // written off, and who turns out great, is what the Vicdan bar is about.
    const fit = candidateDetails[id]?.hireFit ?? 3;
    const performans = Math.max(0, Math.min(100, state.performans + (fit - 3) * 6));
    const vicdan = Math.max(0, Math.min(100, state.vicdan + (fit >= 4 ? 4 : fit <= 2 ? -4 : 0)));
    sound().playUi('confirm');
    set({ hiredId: id, recommendedId: recommended, performans, vicdan, phase: 'weekend' });
  },

  finishMeeting: (choice) => {
    const state = get();
    if (state.meeting.state !== 'active') return;
    const option = OPTIONS.find((o) => o.id === choice);
    set({
      meeting: { state: 'done', choice },
      workdayMinutes: state.workdayMinutes + MEETING_MINUTES,
      performans: clampScore(state.performans + (option?.performans ?? 0)),
      vicdan: clampScore(state.vicdan + (option?.vicdan ?? 0)) });
  },

  planRejectionMails: (choices) => {
    const state = get();
    if (state.rejectionMailsSent) return;
    const day = state.currentDayIndex;
    // writing takes time: only for notices that are new or changed
    const minutes = Object.entries(choices).reduce((m, [id, t]) => m + (state.plannedRejections[id] === t ? 0 : TEMPLATE_MINUTES[t]), 0);
    const count = Object.values(choices).filter((t) => t !== 'none').length;
    const late = state.workdayMinutes >= MAIL_SEND_AT;
    set({
      plannedRejections: choices,
      extraMails: [...state.extraMails.filter((m) => !(m.folder === 'outbox' && m.day === day)), ...outboxMails(choices, day, state.workdayMinutes)],
      desk: {
        ...state.desk,
        noticeKind: late ? 'sent' : 'scheduled',
        notice: late
          ? `${count} ret bildirimi adaylara gönderildi.`
          : `${count} ret bildirimi giden kutusuna alındı ve bugün 17:00'de gönderilecek. O saate kadar kararlarını değiştirebilirsin; değişen adayın bildirimi otomatik olarak geri çekilir.` } });
    sound().playUi('confirm');
    spendMinutes(Math.round(minutes));
    const after = get();
    // past 17:00 there is nothing to wait for
    if (after.workdayMinutes >= MAIL_SEND_AT && !mailsPending(after)) {
      dispatchRejections();
      const done = get();
      if (done.overtime && lineupFor(done).every((cid) => done.decisions[cid]) && !(done.currentDayIndex === TEAM_LATE_DAY && done.workdayMinutes < TEAM_LATE_END)) {
        later(() => get().finishDay(), 1400);
      }
    }
  },

  readMail: (id) => set((state) => (state.mailRead.includes(id) ? state : { mailRead: [...state.mailRead, id] })),
  settleSalary: (id, move) => {
    const state = get();
    if (state.phase !== 'finalRound') return;
    const { effect } = salaryTalk(id, move);
    set({ performans: clampScore(state.performans + effect.performans), vicdan: clampScore(state.vicdan + effect.vicdan) });
  },
  answerCandidateMail: (mailId, kind) => {
    const state = get();
    const reply = state.extraMails.find((m) => m.id === mailId);
    // one answer per mail: it is already in "Gönderilenler"
    if (!reply || state.extraMails.some((m) => m.id === `answer-${mailId}`)) return;
    const sent = replyBackMail(reply, kind, state.currentDayIndex, state.workdayMinutes);
    const option = REPLY_BACK.find((o) => o.kind === kind);
    if (!sent || !option) return;
    sound().playUi('connect');
    set({
      extraMails: [...state.extraMails, sent],
      performans: clampScore(state.performans + option.effect.performans),
      vicdan: clampScore(state.vicdan + option.effect.vicdan),
    });
  },

  recordAiUse: () => set((state) => ({ aiUses: state.aiUses + 1 })),

  setDifficulty: (difficulty) => set({ difficulty }),
});
