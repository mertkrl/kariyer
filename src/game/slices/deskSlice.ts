/*
 * Masa: sabit hat ve aramaları, kahve, çiçek, sebil, referans aramaları.
 */
import type { GetState, SetState } from '../store/storeApi';
import type { GameState } from '../store/storeTypes';
import { COFFEE_SIPS, COFFEE_THOUGHTS, COOLER_MINUTES, COOLER_THOUGHTS, IDLE_THOUGHTS, REFILL_MINUTES, REFILL_THOUGHTS, REQUEST_CALL_PREFIX, WATER_MINUTES } from '../day/desk';
import { referenceFor } from '../day/references';
import { RAPPORT, REPLY_EFFECT, clampRapport, requestIsFair } from '../day/manager';
import { sound } from '../lib/sound';
import { callFor, revokeInvites, revokeTargets, strandFinalist } from '../day/managerCalls';
import { clampScore, addVicdan } from '../store/storeDefaults';
import { isOnBreak, spendMinutes } from '../day/clock';

/** Ekibin pizzasından payın: üç dilim, her biri birkaç dakika. */
export const PIZZA_SLICES = 3;
const PIZZA_MINUTES = 4;
const PIZZA_THOUGHTS = [
  'İlk dilim. Soğumaya başlamış ama aç olduğunu şimdi fark ettin.',
  'İkinci dilim, ekrana bakarak. Klavyeye yağ damlamasın diye peçeteyi altına koydun.',
  'Son dilim. "Şirket zor durumda" diyen Emre üçüncü kutuyu açıyor.',
];

export const createDeskSlice = (set: SetState, get: GetState): Pick<GameState, 'pickUpCall' | 'answerCall' | 'drinkCoffee' | 'eatPizza' | 'waterFlower' | 'clearDeskNotice' | 'clearDeskItem' | 'callReference' | 'visitCooler' | 'sendRevoke'> => ({
  pickUpCall: () => {
    const { desk } = get();
    if (!desk.ringing) return;
    set({ desk: { ...desk, inCall: desk.ringing, ringing: null } });
  },

  answerCall: (choice) => {
    const state = get();
    const id = state.desk.inCall;
    if (id?.startsWith('ref:')) {
      const cid = id.slice(4);
      const ref = referenceFor(cid);
      set({
        referenceChecks: ref ? { ...state.referenceChecks, [cid]: ref.verdict } : state.referenceChecks,
        desk: { ...state.desk, inCall: null, calls: { ...state.desk.calls, [id]: 'answered' } } });
      // bir referansı kontrol etmek saatten zaman almaz: önemli olan kontrol, ceza değil
      return;
    }
    if (id?.startsWith(REQUEST_CALL_PREFIX)) {
      const requestId = id.slice(REQUEST_CALL_PREFIX.length);
      const answer = choice === 0 ? 'comply' : 'refuse';
      const req = state.managerRequests.find((r) => r.id === requestId);
      // dosyanın desteklediği bir ricaya evet demek bir taviz değil
      const effect = req && requestIsFair(req) ? { performans: REPLY_EFFECT[answer].performans, vicdan: 0 } : REPLY_EFFECT[answer];
      set({
        managerRequests: state.managerRequests.map((r) => (r.id === requestId ? { ...r, answer } : r)),
        managerStance: {
          refusals: state.managerStance.refusals + (answer === 'refuse' ? 1 : 0),
          complies: state.managerStance.complies + (answer === 'comply' ? 1 : 0) },
        hakanRapport: clampRapport(state.hakanRapport + (answer === 'comply' ? RAPPORT.comply : req && requestIsFair(req) ? RAPPORT.refuseFair : RAPPORT.refuse)),
        performans: clampScore(state.performans + effect.performans),
        vicdan: addVicdan(state.vicdan, effect.vicdan),
        desk: { ...state.desk, inCall: null, calls: { ...state.desk.calls, [id]: 'answered' } } });
      spendMinutes(4);
      return;
    }
    const call = id ? callFor(state, id) : undefined;
    if (!call) return;
    const c = call.choices[choice];
    set({
      performans: clampScore(state.performans + (c?.performans ?? 0)),
      vicdan: addVicdan(state.vicdan, (c?.vicdan ?? 0)),
      hakanRapport: clampRapport(state.hakanRapport + (c?.rapport ?? 0)),
      // onlara gerçeği yüz yüze söylemek dürüst geri bildirim sayılır
      dmHandled: c?.honestFor ? { ...state.dmHandled, [c.honestFor]: 'honest' } : state.dmHandled,
      story: c?.reform ? { ...state.story, reform: c.reform } : state.story,
      ...(c?.revoke ? { revokeDraft: revokeTargets(state.finalists) } : {}),
      ...(c?.strand ? strandFinalist(state, c.strand) : {}),
      desk: {
        ...state.desk,
        inCall: c?.next ?? null,
        calls: { ...state.desk.calls, [call.id]: 'answered' },
        flower: state.desk.flower || !!call.flower,
        lastWatered: call.flower ? state.currentDayIndex : state.desk.lastWatered } });
    spendMinutes(call.minutes);
  },

  drinkCoffee: () => {
    const state = get();
    const desk = state.desk;
    if (desk.coffee <= 0) {
      // mutfak: taze bir kupa birkaç dakikaya mal olur
      set({ desk: { ...desk, coffee: COFFEE_SIPS, refills: desk.refills + 1 } });
      const pour = sound().startPour('brew');
      pour.setFill(0.6);
      setTimeout(() => pour.stop(), 1100);
      spendMinutes(REFILL_MINUTES);
      return REFILL_THOUGHTS[desk.refills % REFILL_THOUGHTS.length];
    }
    const thoughts = COFFEE_THOUGHTS[Math.min(state.currentDayIndex, COFFEE_THOUGHTS.length - 1)];
    const thought = thoughts[desk.sipsToday] ?? IDLE_THOUGHTS[desk.sipsToday % IDLE_THOUGHTS.length];
    set({ desk: { ...desk, coffee: desk.coffee - 1, sipsToday: desk.sipsToday + 1 } });
    sound().playSip();
    return thought;
  },

  eatPizza: () => {
    const { desk } = get();
    const eaten = desk.pizzaEaten ?? 0;
    if (eaten >= PIZZA_SLICES) return 'Kutu boş. Sadece kenarlarda biraz sos kalmış.';
    set({ desk: { ...desk, pizzaEaten: eaten + 1 } });
    spendMinutes(PIZZA_MINUTES);
    return PIZZA_THOUGHTS[eaten];
  },

  waterFlower: () => {
    const state = get();
    if (!state.desk.flower || state.desk.lastWatered === state.currentDayIndex) return;
    set({ desk: { ...state.desk, lastWatered: state.currentDayIndex } });
    spendMinutes(WATER_MINUTES);
  },

  clearDeskNotice: () => set((state) => ({ desk: { ...state.desk, notice: null } })),

  clearDeskItem: (id) => set((state) => ({ desk: { ...state.desk, cleared: [...state.desk.cleared, id] } })),

  callReference: (candidateId) => {
    const state = get();
    if (state.desk.inCall || state.desk.ringing || isOnBreak(state) || !referenceFor(candidateId)) return false;
    sound().playHandset();
    set({ desk: { ...state.desk, inCall: `ref:${candidateId}` } });
    return true;
  },

  visitCooler: () => {
    const state = get();
    set({ desk: { ...state.desk, coolerVisits: state.desk.coolerVisits + 1 } });
    sound().playSip();
    spendMinutes(COOLER_MINUTES);
    return COOLER_THOUGHTS[state.desk.coolerVisits % COOLER_THOUGHTS.length];
  },

  sendRevoke: (honest) => {
    const state = get();
    if (!state.revokeDraft) return;
    sound().playUi('confirm');
    set({
      ...revokeInvites(state, honest),
      revokeDraft: null,
      vicdan: addVicdan(state.vicdan, (honest ? -1 : -3)),
      // doğruyu yazmak onun talimatını yazılı olarak çiğnemektir
      hakanRapport: clampRapport(state.hakanRapport + (honest ? -5 : 2)) });
  },
});
