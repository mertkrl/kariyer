/*
 * Dosyalar: birini açmak, hakkında karar vermek, bir kararı geri almak ve neyin okuma sayıldığı.
 */
import type { GetState, SetState } from '../store/storeApi';
import type { GameState } from '../store/storeTypes';
import { decisionEffect } from '../engine/scoring';
import { sound } from '../lib/sound';
import { later } from '../lib/later';
import { JUSTIFY_MINUTES, TEAM_LATE_DAY, TEAM_LATE_END, approvalQuota, clampScore, lineupFor, readingOf, addVicdan } from '../store/storeDefaults';
import { addExtraFiles, isOnBreak, mailsPending, spendMinutes } from '../day/clock';

export const createDecisionSlice = (set: SetState, get: GetState): Pick<GameState, 'selectCandidate' | 'decide' | 'undoDecision' | 'setReading' | 'markReadThrough'> => ({
  selectCandidate: (id) => {
    const state = get();
    if (isOnBreak(state)) return;

    const alreadyOpened = state.openedIds.includes(id);
    if (!alreadyOpened) {
      set({
        openedIds: [...state.openedIds, id],
        timeSpent: { ...state.timeSpent, [id]: 0 },
        currentCandidateId: id });
    } else {
      set({ currentCandidateId: id });
    }
  },

  decide: (decision) => {
    const state = get();
    if (isOnBreak(state)) return;
    if (state.activeEvent?.kind === 'power') return;
    const id = state.currentCandidateId;
    if (!id) return;

    const prevDecision = state.decisions[id];
    // Final turu kontenjanı: bugünün sınırı ve FINALIST_LIMIT'in haftalık sınırı.
    if (decision === 'approve' && prevDecision !== 'approve' && !approvalQuota(state).canApprove) {
      sound().playUi('click');
      return;
    }
    let performans = state.performans;
    let vicdan = state.vicdan;
    const dayStats = { ...state.dayStats };

    if (prevDecision) {
      const prev = state.decisionEffects[id];
      if (prev) {
        performans = clampScore(performans - prev.performans);
        vicdan = clampScore(vicdan - prev.vicdan);
      }
      if (prevDecision === 'approve') dayStats.approved -= 1;
      else dayStats.rejected -= 1;
    }

    // nasıl karar verdiğin ne karar verdiğin kadar önemli: dosyayı okumak, bir referansı kontrol etmek
    const effect = decisionEffect(id, decision, readingOf(state, id));
    const before = { performans, vicdan };
    performans = clampScore(performans + effect.performans);
    vicdan = addVicdan(vicdan, effect.vicdan);
    if (decision === 'approve') dayStats.approved += 1;
    else dayStats.rejected += 1;

    sound().playStamp(decision);

    set({
      decisions: { ...state.decisions, [id]: decision },
      decisionLog: [...state.decisionLog.filter((e) => e.id !== id), { id, decision, at: state.workdayMinutes }],
      performans,
      vicdan,
      dayStats,
      decisionEffects: { ...state.decisionEffects, [id]: { performans: performans - before.performans, vicdan: vicdan - before.vicdan, reason: effect.reason } } });
    // Hakan Bey artık her "hayır"ı yazılı istiyor
    if (state.justifyRejects && decision === 'reject' && prevDecision !== 'reject') spendMinutes(JUSTIFY_MINUTES);
    // kuyruğu erken kapatmak: birkaç dosya daha yolda
    later(addExtraFiles, 1500);
    // geç kalmak: son açık dosyayı kapatmak seni eve gönderir
    const after = get();
    if (after.overtime && lineupFor(after).every((cid) => after.decisions[cid]) && !mailsPending(after) && !(after.currentDayIndex === TEAM_LATE_DAY && after.workdayMinutes < TEAM_LATE_END)) {
      later(() => get().finishDay(), 1400);
    }
  },

  undoDecision: () => {
    const state = get();
    if (isOnBreak(state)) return;
    const id = state.currentCandidateId;
    const prev = id ? state.decisions[id] : undefined;
    if (!id || !prev) return;

    const applied = state.decisionEffects[id] ?? { performans: 0, vicdan: 0 };
    const reverted = { performans: clampScore(state.performans - applied.performans), vicdan: clampScore(state.vicdan - applied.vicdan) };
    const decisionEffects = { ...state.decisionEffects };
    delete decisionEffects[id];
    const dayStats = { ...state.dayStats };
    if (prev === 'approve') dayStats.approved -= 1;
    else dayStats.rejected -= 1;

    const decisions = { ...state.decisions };
    delete decisions[id];

    sound().playUndo();

    // giden kutusunda bu kişi için bekleyen bildirim kararla birlikte geri çekilir
    const plannedRejections = { ...state.plannedRejections };
    delete plannedRejections[id];
    set({
      plannedRejections,
      extraMails: state.extraMails.filter((m) => m.id !== `outbox-${state.currentDayIndex}-${id}`),
      decisions,
      decisionLog: state.decisionLog.filter((e) => e.id !== id),
      decisionEffects,
      performans: reverted.performans,
      vicdan: reverted.vicdan,
      dayStats });
  },

  setReading: (reading) => set({ reading }),
  markReadThrough: (id) => {
    if (!get().readThrough[id]) set((state) => ({ readThrough: { ...state.readThrough, [id]: true } }));
  },
});
