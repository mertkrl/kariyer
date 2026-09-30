import type { Decision } from '../types';
import { candidateOf } from '../data/candidates';
import { candidateDetails } from '../data/candidateDetails';

/*
 * What a single decision is worth.
 *
 * Performans is how the company sees you: closing files, following the system, pleasing the
 * manager, filling interview slots with people worth interviewing. Vicdan is how you decided,
 * not just what: there are three interview slots a day and nearly everyone is good, so turning
 * people away is unavoidable. What costs you is turning a strong person away for a proxy
 * ("career stage", "continuity risk", a gap) without even reading them — and what earns you
 * something is looking past the flag, checking a reference, refusing a favour.
 */

export interface DecisionEffect {
  performans: number;
  vicdan: number;
  /** One line shown right after you decide. */
  reason: string;
}

/** Candidates whose system flag is not a biased proxy: the concerns about them are real. */
const FAIR_FLAG = new Set(['okan', 'serkan', 'emre', 'volkan']);
/** The manager's nephew. */
const NEPHEW = 'okan';
/** Your mother's neighbour's son — your own "reference". */
const NEIGHBOUR = 'onur';

const FLAG_WORDS: Record<string, string> = {
  experience: 'deneyim şartı',
  salary: 'maaş beklentisi',
  skills: 'beceri eşleşmesi',
  motivation: '"motivasyon" değerlendirmesi',
  questions: 'şirket sorularına verdiği cevaplar',
};

/** Seconds of reading before a decision counts as considered. */
export const CONSIDERED_SECONDS = 12;

export function decisionEffect(id: string, decision: Decision, ctx: { secondsSpent: number; referenceChecked: boolean }): DecisionEffect {
  const c = candidateOf(id);
  const fit = candidateDetails[id]?.hireFit ?? 3;
  const first = c.name.split(' ')[0];
  const flag = FLAG_WORDS[c.flaggedField] ?? 'sistem işareti';
  const considered = ctx.secondsSpent >= CONSIDERED_SECONDS || ctx.referenceChecked;
  const diligence = ctx.referenceChecked ? 1 : 0;

  if (id === NEPHEW) {
    return decision === 'approve'
      ? { performans: 3, vicdan: -4, reason: `${first}: deneyimi yok, tavsiyesi var. Hakan Bey memnun olacak.` }
      : { performans: -2, vicdan: 2, reason: `${first}: tavsiyesine rağmen herkese uyguladığın ölçütle değerlendirdin.` };
  }

  if (id === NEIGHBOUR) {
    return decision === 'approve'
      ? { performans: 0, vicdan: -2, reason: `${first}: tavsiye eden sendin. Sistem de bunu "öncelik" saydı.` }
      : { performans: 1, vicdan: 1, reason: `${first}: tanıdık olsa da herkese uyguladığın ölçütle değerlendirdin.` };
  }

  if (decision === 'approve') {
    if (fit <= 2) return { performans: -3, vicdan: diligence, reason: `${first}: zayıf bir dosya için değerli bir mülakat hakkını kullandın.` };
    if (!FAIR_FLAG.has(id)) return { performans: 1, vicdan: 4 + diligence, reason: `${first}: sistemin "${flag}" işaretine rağmen dosyanın kendisine baktın.` };
    return { performans: 2, vicdan: 1 + diligence, reason: `${first}: güçlü bir aday, mülakata çağrıldı.` };
  }

  // rejected
  if (fit <= 2) return { performans: 2, vicdan: diligence, reason: `${first}: dosya gerçekten zayıftı. Yerinde bir ret.` };
  if (FAIR_FLAG.has(id)) return { performans: 2, vicdan: -1 + diligence, reason: `${first}: güçlü ama soru işaretleri gerçek bir aday elendi.` };
  if (!considered) return { performans: 2, vicdan: -4, reason: `${first}: dosyası okunmadan, "${flag}" gerekçesiyle elendi.` };
  return { performans: 2, vicdan: -2 + diligence, reason: `${first}: güçlü bir aday elendi. En azından dosyasını okuyarak karar verdin.` };
}
