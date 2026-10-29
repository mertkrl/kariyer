import { creditLine, greetingFor, lineFor, sayItems, type Memory, type Reaction, type Visit } from './data';
import type { Step } from './Till';
import { accountAsk, dilemmaAsk, type Outcome } from './week';

/*
 * Müşterinin konuşma balonu: kapıdan girerken istediği, fiyata tepkisi, veresiye isteği, eski
 * hesap, ikilem ya da para üstüne söylediği; sırasıyla en son olan söylenir.
 */

const cap = (s: string) => s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);

export function say({ visit, step, outcome, reaction, credited, lineNo, memory }: { visit: Visit; step: Step; outcome: Outcome | null; reaction: Reaction | null; credited: boolean | null; lineNo: number; memory?: Memory }) {
  const type = visit.customer.id;
  if (outcome) return outcome.line;
  if (visit.account) return accountAsk(visit.account);
  if (visit.dilemma === 'loan') return dilemmaAsk('loan');
  if (step === 'dilemma' && visit.dilemma === 'short') return dilemmaAsk('short', reaction?.sold);
  if (step === 'dilemma') return 'Teşekkürler, iyi günler!';
  if (step === 'credit' && credited === null) return `${lineFor(reaction!.mood, lineNo, reaction!.offer, type)} ${creditLine(type, 'ask')}`;
  if (credited !== null) return creditLine(type, credited ? 'yes' : 'no');
  if (reaction) return lineFor(reaction.mood, lineNo, reaction.offer, type);
  return (
    <>
      {greetingFor(visit.villager, memory)} <b>{cap(sayItems(visit.items))}</b> verir misin? {visit.items.length > 1 ? 'Hepsi kaça?' : 'Kaça bu?'}
    </>
  );
}
