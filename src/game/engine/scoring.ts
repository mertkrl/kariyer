import type { Candidate, Decision, SystemVerdict } from '../types';
import { NEIGHBOUR_ID, NEPHEW_ID, candidateOf } from '../data/candidates';
import { candidateDetails } from '../data/candidateDetails';

/*
 * What a single decision is worth. The two scores measure different things on purpose:
 *
 * Performans is how the company sees you, and the company sees you through its system. Going
 * along with the system's recommendation ("Öncelikli" in, a flagged file out) earns a little;
 * going against it costs more — the system is what your manager reads. It does not care whether
 * the file was any good: that shows on Friday, in who you end up hiring.
 *
 * Vicdan is how you decided, not what. There are three interview slots a day and nearly
 * everyone is good, so turning people away is unavoidable and, done after reading the file,
 * costs nothing. What costs you is turning a strong person away for a biased proxy ("career
 * stage", "continuity risk", a gap) without even reading them, or signing off the system's
 * favourite unread. What earns you something is looking past the flag and giving that person
 * the slot, checking a reference, refusing a favour.
 *
 * Neither score moves for simply closing a file, so neither one climbs just by working fast.
 */

export interface DecisionEffect {
  performans: number;
  vicdan: number;
  /** One line shown right after you decide. */
  reason: string;
}

export type { SystemVerdict } from '../types';

export function systemVerdict(c: Pick<Candidate, 'verdict'>): SystemVerdict {
  return c.verdict;
}

const NEPHEW = NEPHEW_ID;
const NEIGHBOUR = NEIGHBOUR_ID;
/** The system's concern about this file is real: rejecting it is not rejecting a proxy. */
const fairFlag = (id: string) => !!candidateOf(id).flagIsFair;

const FLAG_WORDS: Record<string, string> = {
  experience: 'deneyim şartı',
  salary: 'maaş beklentisi',
  skills: 'beceri eşleşmesi',
  motivation: '"motivasyon" değerlendirmesi',
  questions: 'şirket sorularına verdiği cevaplar',
};

/** Seconds of reading (with the CV on screen) before a decision counts as considered. */
export const CONSIDERED_SECONDS = 12;

export interface ReadingContext {
  secondsSpent: number;
  /** The CV was seen to its end: scrolled down, or it fit on the screen. */
  readThrough: boolean;
  referenceChecked: boolean;
}

/**
 * Was the file actually read? Time alone can be waited out with the CV half off screen, so it
 * also has to have been seen to the end — the company's questions sit at the bottom. A
 * reference call counts on its own: you didn't take the file at its word.
 */
export function wasConsidered(ctx: ReadingContext) {
  return (ctx.secondsSpent >= CONSIDERED_SECONDS && ctx.readThrough) || ctx.referenceChecked;
}

/** How the company scores going with (or against) its system. */
const COMPANY: Record<SystemVerdict, Record<Decision, number>> = {
  priority: { approve: 2, reject: -2 },
  review: { approve: 0, reject: 1 },
  low: { approve: -1, reject: 1 },
  out: { approve: -2, reject: 1 },
};

/** A strong file (by how the person actually turns out; the CV shows it to whoever reads it). */
export const isStrong = (id: string) => (candidateDetails[id]?.hireFit ?? 3) >= 4;
const isWeak = (id: string) => (candidateDetails[id]?.hireFit ?? 3) <= 2;

/**
 * A file the system pushed down for a proxy rather than a real concern — the people the
 * week is about. Rejecting one of them is where reading the file matters.
 */
export function isWronglyFlagged(id: string) {
  const verdict = systemVerdict(candidateOf(id));
  if (fairFlag(id) || id === NEIGHBOUR) return false;
  return verdict === 'low' || verdict === 'out' || verdict === 'review';
}

export function decisionEffect(id: string, decision: Decision, ctx: ReadingContext): DecisionEffect {
  const c = candidateOf(id);
  const first = c.name.split(' ')[0];
  const flag = FLAG_WORDS[c.flaggedField] ?? 'sistem işareti';
  const verdict = systemVerdict(c);
  const considered = wasConsidered(ctx);
  const checked = ctx.referenceChecked ? 1 : 0;
  const performans = COMPANY[verdict][decision];

  if (id === NEPHEW) {
    return decision === 'approve'
      ? { performans: 3, vicdan: -4, reason: `${first}: deneyimi yok, tavsiyesi var. Hakan Bey memnun olacak.` }
      : { performans: -3, vicdan: 2, reason: `${first}: tavsiyesine rağmen herkese uyguladığın ölçütle değerlendirdin.` };
  }

  if (id === NEIGHBOUR) {
    return decision === 'approve'
      ? { performans, vicdan: -3, reason: `${first}: tavsiye eden sendin. Sistem de bunu "öncelik" saydı.` }
      : { performans, vicdan: 1, reason: `${first}: tanıdık olsa da herkese uyguladığın ölçütle değerlendirdin.` };
  }

  if (decision === 'approve') {
    if (isWronglyFlagged(id) && isStrong(id)) {
      return considered
        ? { performans, vicdan: 3 + checked, reason: `${first}: sistemin "${flag}" işaretine rağmen dosyanın kendisine baktın.` }
        : { performans, vicdan: 1, reason: `${first}: işarete rağmen çağırdın — ama dosyayı okumadan.` };
    }
    if (isWronglyFlagged(id)) return { performans, vicdan: (considered ? 1 : 0) + checked, reason: `${first}: işaretli bir dosyaya şans verdin.` };
    if (verdict === 'priority' && isWeak(id) && !considered) {
      return { performans, vicdan: -1, reason: `${first}: sistemin "öncelikli" dediği dosyayı okumadan onayladın.` };
    }
    return { performans, vicdan: checked, reason: verdict === 'priority' ? `${first}: sistemin önerisiyle mülakata çağrıldı.` : `${first}: mülakata çağrıldı.` };
  }

  // rejected
  if (isWronglyFlagged(id) && isStrong(id)) {
    if (!considered) return { performans, vicdan: -2, reason: `${first}: dosyası okunmadan, "${flag}" gerekçesiyle elendi.` };
    return { performans, vicdan: checked, reason: `${first}: güçlü bir aday elendi. En azından dosyasını okuyarak karar verdin.` };
  }
  if (isWronglyFlagged(id) && !isWeak(id) && !considered) {
    return { performans, vicdan: -1, reason: `${first}: dosyası okunmadan, "${flag}" gerekçesiyle elendi.` };
  }
  if (verdict === 'priority' && isWeak(id) && considered) {
    return { performans, vicdan: 1 + checked, reason: `${first}: sistemin yüksek puanına rağmen dosyaya baktın; dosya zayıftı.` };
  }
  if (fairFlag(id) && isStrong(id) && !considered) {
    return { performans, vicdan: -1, reason: `${first}: güçlü ama soru işaretleri gerçek bir aday, dosyası okunmadan elendi.` };
  }
  return { performans, vicdan: checked, reason: isWeak(id) ? `${first}: dosya gerçekten zayıftı. Yerinde bir ret.` : `${first}: elendi.` };
}

/** End of day: interview slots left empty while strong, wrongly flagged people were turned away. */
export function unusedSlotCost(slotsLeft: number, strongRejected: number): number {
  return strongRejected > 0 ? Math.min(slotsLeft, strongRejected) : 0;
}

/** End of day: files still open when you leave. The company counts every one. */
export const OPEN_FILE_PERFORMANS = 2;
export const OPEN_FILE_PERFORMANS_CAP = 6;
