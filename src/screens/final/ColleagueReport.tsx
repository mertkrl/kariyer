import { candidateOf } from '../../game/data/candidates';
import { candidateDetails } from '../../game/data/candidateDetails';
import { forbiddenQuestion } from '../../game/day/story';
import { INTERVIEWER, type Interviewer } from '../../game/events/panel';
import { LEAD } from './interviewModel';
import { Turn } from './Conversation';
import styles from './ColleagueReport.module.css';

/*
 * Başka bir odadaki görüşme: o adayla Ayşe, Emre ya da Hakan Bey görüştü. Sen orada değildin;
 * elinde yalnızca görüşmeyi yapanın kısa notu ve Ümit'in teknik bölümden aktardığı var.
 */
const NOTE: Record<Exclude<Interviewer, 'you'>, (first: string, fit: number) => string> = {
  ayse: (first, fit) =>
    fit >= 4
      ? `${first} her soruya somut örnekle cevap verdi; neyi kendisinin yaptığını, neyi ekibin yaptığını ayırarak anlattı. Ben ikna oldum.`
      : `${first} iyi niyetli ama cevapları genel kaldı; takip sorusunda dağıldı. Dürüst olayım, emin değilim.`,
  emre: (first) => `${first}'ın sistemdeki skoru çok yüksek, sunumu kusursuzdu. Bence risk yok; veriler ortada.`,
  hakan: (first) => `${first} uzun vadeli uyum açısından çok uygun. Ailesi, çevresi, kafa yapısı; bizim şirkete göre biri.`,
};

export function ColleagueReport({ id, owner, structured }: { id: string; owner: Exclude<Interviewer, 'you'>; structured: boolean }) {
  const c = candidateOf(id);
  const first = c.name.split(' ')[0];
  const fit = candidateDetails[id]?.hireFit ?? 3;
  return (
    <div className={styles.report}>
      <p className={styles.reportLead}>
        Bu mülakat başka bir odada yapıldı. Görüşmeyi {INTERVIEWER[owner].name} yaptı; sen orada değildin. Kurulda görüşmeyi yapanın puanı, Ümit'in teknik puanı ve Hakan Bey'in
        uyum puanı yan yana duracak.
      </p>
      <Turn who={INTERVIEWER[owner].name} role="Görüşme notu" tone="you">
        {NOTE[owner](first, fit)}
      </Turn>
      <Turn who={LEAD} role="Teknik bölüm" tone="lead">
        {fit >= 4 ? 'Vakayı çözdü, nedenini de anlattı.' : fit === 3 ? 'Vakada takıldı; ipucuyla toparladı.' : 'Vakadaki hatayı görmedi.'}
      </Turn>
      {owner !== 'hakan' && !structured && (
        <Turn who="Hakan Kaya" role="Uyum sorusu" tone="hakan">
          Sordum: {forbiddenQuestion(id, c.age)}
        </Turn>
      )}
    </div>
  );
}
