/*
 * CV kuyruğunun ötesinde haftanın hikâyesi: toplantı, ret bildirimleri, mülakatlar, işe alım ve Cuma'nın teklifi.
 */
import { clampRapport } from '../day/manager';
import type { GetState, SetState } from '../store/storeApi';
import type { StoryActions } from '../store/storeTypes';
import { DM_EFFECT, TEAM_LATE_DAY, TEAM_LATE_END, clampScore, lineupFor, addVicdan } from '../store/storeDefaults';
import { MAIL_SEND_AT, dispatchRejections, mailsPending, spendMinutes } from '../day/clock';
import { MEETING_MINUTES, OPTIONS } from '../events/meeting';
import { REPLY_BACK, TEMPLATE_MINUTES, outboxMails, replyBackMail } from '../day/rejectionMails';
import { sound } from '../lib/sound';
import { candidateDetails } from '../data/candidateDetails';
import { panelDecision } from '../day/managerCalls';
import { later } from '../lib/later';
import { NEPHEW_ID } from '../data/candidates';
import { salaryTalk } from '../events/interview';

export const createStorySlice = (set: SetState, get: GetState): StoryActions => ({
  askForbidden: () =>
    set((state) => ({
      forbiddenAsked: state.forbiddenAsked + 1,
      performans: clampScore(state.performans + 2),
      vicdan: addVicdan(state.vicdan, -4) })),

  settleOffer: (result) =>
    set((state) => (state.story.offer ? {} : { story: { ...state.story, offer: result }, vicdan: addVicdan(state.vicdan, result.vicdan) })),

  finishOffer: () => set({ phase: 'weekend' }),

  answerCandidateDm: (candidateId, kind) =>
    set((state) => {
      if (state.dmHandled[candidateId]) return {};
      const e = DM_EFFECT[kind];
      return {
        dmHandled: { ...state.dmHandled, [candidateId]: kind },
        performans: clampScore(state.performans + e.performans),
        vicdan: addVicdan(state.vicdan, e.vicdan) };
    }),

  finishWeekend: () => set({ phase: 'final' }),

  setWeekendChoice: (weekendChoice) => set({ weekendChoice }),

  hakanInterrupt: (protect) =>
    set((state) => ({
      interviewStance: { ...state.interviewStance, [protect ? 'protected' : 'silent']: state.interviewStance[protect ? 'protected' : 'silent'] + 1 },
      performans: clampScore(state.performans + (protect ? -3 : 0)),
      vicdan: addVicdan(state.vicdan, (protect ? 3 : -3)) })),

  answerCandidate: (honest) =>
    set((state) => ({
      interviewStance: { ...state.interviewStance, [honest ? 'honest' : 'polished']: state.interviewStance[honest ? 'honest' : 'polished'] + 1 },
      performans: clampScore(state.performans + (honest ? -1 : 1)),
      vicdan: addVicdan(state.vicdan, (honest ? 2 : -2)) })),

  closeHiring: (fairOffer, personalRejections) =>
    set((state) => ({
      // düşük beklentiyi piyasa değerine çekmek bütçeden yer ama doğrusu odur
      performans: clampScore(state.performans + (fairOffer ? -1 : 0)),
      vicdan: addVicdan(state.vicdan, (fairOffer ? 3 : 0) + (personalRejections ? 2 : -1)),
    })),

  hire: (recommended, panel) => {
    const state = get();
    if (state.phase !== 'finalRound' || state.hiredId) return;
    // sen yalnızca önerirsin; kurul (sen, Ümit, Hakan Bey) karar verir
    const id = panelDecision(recommended, state.finalists.length ? state.finalists : [{ id: NEPHEW_ID, day: 0 }], state.story.pastRequests, panel).hired;
    // İşe alınanın gerçekte nasıl çıktığı Performans'ı oynatır; sistemin silip attığı
    // birini işe almak ve onun harika çıkması ise Vicdan çubuğunun konusudur.
    const fit = candidateDetails[id]?.hireFit ?? 3;
    const performans = Math.max(0, Math.min(100, state.performans + (fit - 3) * 6));
    const vicdan = Math.max(0, Math.min(100, state.vicdan + (fit >= 4 ? 4 : fit <= 2 ? -4 : 0)));
    sound().playUi('confirm');
    set({ hiredId: id, recommendedId: recommended, performans, vicdan, phase: 'offer', story: { ...state.story, interviewScores: panel?.scores ?? state.story.interviewScores } });
  },

  finishMeeting: (choice) => {
    const state = get();
    if (state.meeting.state !== 'active') return;
    const option = OPTIONS.find((o) => o.id === choice);
    set({
      meeting: { state: 'done', choice },
      workdayMinutes: state.workdayMinutes + MEETING_MINUTES,
      performans: clampScore(state.performans + (option?.performans ?? 0)),
      vicdan: addVicdan(state.vicdan, (option?.vicdan ?? 0)),
      hakanRapport: clampRapport(state.hakanRapport + (option?.rapport ?? 0)) });
  },

  planRejectionMails: (choices) => {
    const state = get();
    if (state.rejectionMailsSent) return;
    const day = state.currentDayIndex;
    // yazmak zaman alır: yalnızca yeni ya da değişen bildirimler için
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
    // 17:00'den sonra beklenecek bir şey yok
    if (after.workdayMinutes >= MAIL_SEND_AT && !mailsPending(after)) {
      dispatchRejections();
      const done = get();
      if (done.overtime && lineupFor(done).every((cid) => done.decisions[cid]) && !(done.currentDayIndex === TEAM_LATE_DAY && done.workdayMinutes < TEAM_LATE_END)) {
        later(() => get().finishDay(), 1400);
      }
    }
  },

  noteSite: (id) =>
    set((state) => (state.story.sitesOpened?.includes(id) ? state : { story: { ...state.story, sitesOpened: [...(state.story.sitesOpened ?? []), id] } })),
  readMail: (id) => set((state) => (state.mailRead.includes(id) ? state : { mailRead: [...state.mailRead, id] })),
  settleSalary: (id, move) => {
    const state = get();
    if (state.phase !== 'finalRound') return;
    const { effect } = salaryTalk(id, move);
    set({ performans: clampScore(state.performans + effect.performans), vicdan: addVicdan(state.vicdan, effect.vicdan) });
  },
  answerCandidateMail: (mailId, kind) => {
    const state = get();
    const reply = state.extraMails.find((m) => m.id === mailId);
    // e-posta başına bir cevap: zaten "Gönderilenler"de
    if (!reply || state.extraMails.some((m) => m.id === `answer-${mailId}`)) return;
    const sent = replyBackMail(reply, kind, state.currentDayIndex, state.workdayMinutes);
    const option = REPLY_BACK.find((o) => o.kind === kind);
    if (!sent || !option) return;
    sound().playUi('connect');
    set({
      extraMails: [...state.extraMails, sent],
      performans: clampScore(state.performans + option.effect.performans),
      vicdan: addVicdan(state.vicdan, option.effect.vicdan),
    });
  },

  recordAiUse: () => set((state) => ({ aiUses: state.aiUses + 1 })),

  setDifficulty: (difficulty) => set({ difficulty }),
});
