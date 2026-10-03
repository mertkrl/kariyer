/*
 * The files: opening one, deciding on it, taking a decision back, and what counts as reading it.
 */
import type { GetState, SetState } from '../storeApi';
import type { GameState } from '../storeTypes';
import { decisionEffect } from '../engine/scoring';
import { sound } from '../sound';
import { later } from '../later';
import { JUSTIFY_MINUTES, TEAM_LATE_DAY, TEAM_LATE_END, approvalQuota, clampScore, lineupFor, readingOf } from '../storeDefaults';
import { addExtraFiles, isOnBreak, mailsPending, spendMinutes } from '../clock';

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
    // Final-round quota: today's cap and the week-wide cap of FINALIST_LIMIT.
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

    // how you decided matters as much as what: reading the file, checking a reference
    const effect = decisionEffect(id, decision, readingOf(state, id));
    const before = { performans, vicdan };
    performans = clampScore(performans + effect.performans);
    vicdan = clampScore(vicdan + effect.vicdan);
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
    // Hakan Bey wants every "no" in writing now
    if (state.justifyRejects && decision === 'reject' && prevDecision !== 'reject') spendMinutes(JUSTIFY_MINUTES);
    // closing the queue early: a few more files are on their way
    later(addExtraFiles, 1500);
    // staying late: closing the last open file sends you home
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

    // a notice waiting in the outbox for this person is pulled back with the decision
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
