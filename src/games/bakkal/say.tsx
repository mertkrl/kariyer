import { creditLine, greetingFor, lineFor, sayItems, touristLine, type Memory, type Reaction, type Visit } from './data';
import type { Step } from './Till';
import { accountAsk, dilemmaAsk, type Outcome } from './week';
import { returnLine } from './returns';
import { rivalLine } from './pressure';

/*
 * Müşterinin konuşma balonu: kapıdan girerken istediği, fiyata tepkisi, veresiye isteği, eski
 * hesap, ikilem ya da para üstüne söylediği; sırasıyla en son olan söylenir.
 */

const cap = (s: string) => s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);

export function say({ visit, step, outcome, reaction, credited, lineNo, memory, day = 1 }: { visit: Visit; step: Step; outcome: Outcome | null; reaction: Reaction | null; credited: boolean | null; lineNo: number; memory?: Memory; day?: number }) {
  const type = visit.customer.id;
  if (outcome) return outcome.line;
  if (visit.account) return accountAsk(visit.account);
  if (visit.returning) return returnLine(visit.returning);
  if (visit.audit) return 'Maliye\'den geliyorum. Z raporlarınla kasandaki parayı karşılaştıracağım, defterleri görebilir miyim?';
  if (visit.dilemma === 'loan') return dilemmaAsk('loan');
  if (visit.charity) return "Selamünaleyküm evladım. Almanya'dan geldim, köyüm için bir hayır yapmak istiyorum: defterdeki bütün veresiyeleri ben kapatayım. Kim ne borçluysa söyle, hepsini ödeyeceğim.";
  if (visit.fine) return 'Belediye zabıtasıyım. Dün bu dükkândan bayat mal satıldığına dair şikâyet var. Tutanağı kesiyorum.';
  if (step === 'dilemma' && visit.dilemma === 'short') return dilemmaAsk('short', reaction?.sold);
  if (step === 'dilemma') return 'Teşekkürler, iyi günler!';
  if (step === 'credit' && credited === null) return `${lineFor(reaction!.mood, lineNo, reaction!.offer, type)} ${creditLine(type, 'ask')}`;
  if (credited !== null) return creditLine(type, credited ? 'yes' : 'no');
  if (reaction && type === 'turist' && !reaction.mild) return touristLine(visit.villager.id, reaction.mood, lineNo, reaction.offer) ?? lineFor(reaction.mood, lineNo, reaction.offer, type);
  if (reaction) return lineFor(reaction.mood, lineNo, reaction.offer, type);
  return (
    <>
      {greetingFor(visit.villager, memory)} {rivalLine(day, visit.villager.id) ?? ''} <b>{cap(sayItems(visit.items))}</b> verir misin? {visit.items.length > 1 ? 'Hepsi kaça?' : 'Kaça bu?'}
    </>
  );
}
