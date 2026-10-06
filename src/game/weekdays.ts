/*
 * The week's days by name. Story beats belong to a weekday ("Wednesday it rains", "Thursday the
 * team stays late"); the code compares against these rather than bare day indices, so moving a
 * beat is one edit here and a search for the name shows everything that happens that day.
 */
export const MONDAY = 0;
export const TUESDAY = 1;
export const WEDNESDAY = 2;
export const THURSDAY = 3;
export const FRIDAY = 4;

/** Selin's birthday cake in the office; its plate is still on your desk the days after. */
export const BIRTHDAY_DAY = TUESDAY;
/** Rain: the wet umbrella by the cooler, rain on the office window. */
export const RAINY_DAY = WEDNESDAY;
/** Your neighbour's son's CV, if you said you'd pass it on, arrives in the queue. */
export const NEIGHBOUR_DAY = THURSDAY;
/** Someone you called to interview earlier rings to say thanks. */
export const THANKS_DAY = THURSDAY;
