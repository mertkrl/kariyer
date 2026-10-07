import { candidateOf } from '../../game/data/candidates';
import { candidateDetails, FINAL_INTERVIEW_QUESTIONS } from '../../game/data/candidateDetails';
import { forbiddenAnswer, forbiddenQuestion } from '../../game/day/story';
import { INTERVIEWER, type Interviewer } from '../../game/events/panel';
import { APTITUDE_CUTOFF, candidateAptitude, testTalk } from '../../game/events/aptitude';
import { LEAD } from './interviewModel';
import { Turn } from './Conversation';
import styles from './ColleagueReport.module.css';
import parts from './InterviewParts.module.css';

/*
 * Başka birinin yürüttüğü görüşme: Ayşe, Emre ya da Hakan Bey kendi adayıyla. Sen de odadasın.
 * Görüşmeyi onlar yapar; sen dinlersin, bir kez söz alıp test puanını sorabilirsin ve kendi
 * puanını verirsin. Kurulda o puan da masada durur.
 */
const NOTE: Record<Exclude<Interviewer, 'you'>, (first: string, fit: number) => string> = {
  ayse: (first, fit) =>
    fit >= 4
      ? `${first} her soruya somut örnekle cevap verdi; neyi kendisinin yaptığını, neyi ekibin yaptığını ayırarak anlattı. Ben ikna oldum.`
      : `${first} iyi niyetli ama cevapları genel kaldı; takip sorusunda dağıldı. Dürüst olayım, emin değilim.`,
  emre: (first) => `${first}'ın sistemdeki skoru çok yüksek, sunumu kusursuzdu. Bence risk yok; veriler ortada.`,
  hakan: (first) => `${first} uzun vadeli uyum açısından çok uygun. Ailesi, çevresi, kafa yapısı; bizim şirkete göre biri.`,
};

/** Görüşmeyi yürütenin ilk sorusu, kendi tarzıyla. */
function opening(owner: Exclude<Interviewer, 'you'>, id: string, score: number): { q: string; a: string } {
  const c = candidateOf(id);
  const d = candidateDetails[id];
  if (owner === 'ayse') return { q: FINAL_INTERVIEW_QUESTIONS[0], a: d.interview[0] };
  if (owner === 'emre')
    return {
      q: score >= APTITUDE_CUTOFF ? `Test puanınız ${score}, tebrik ederim; sistem skorunuz da çok iyi. ${FINAL_INTERVIEW_QUESTIONS[1]}` : `Test puanınız ${score}; açık konuşayım, eşiğin altında. ${FINAL_INTERVIEW_QUESTIONS[1]}`,
      a: d.interview[1],
    };
  return { q: forbiddenQuestion(id, c.age), a: forbiddenAnswer(id, c.age) };
}

export interface SitInProps {
  id: string;
  owner: Exclude<Interviewer, 'you'>;
  structured: boolean;
  seed: number;
  /** Test puanını sordun. */
  asked: boolean;
  /** Bu görüşmeye verdiğin puan (1–5). */
  score: number | null;
  onAsk: () => void;
  onScore: (value: number) => void;
}

export function ColleagueReport({ id, owner, structured, seed, asked, score, onAsk, onScore }: SitInProps) {
  const c = candidateOf(id);
  const first = c.name.split(' ')[0];
  const fit = candidateDetails[id]?.hireFit ?? 3;
  const test = candidateAptitude(id, seed);
  const open = opening(owner, id, test.score);
  const host = INTERVIEWER[owner].name;
  const talk = testTalk(id, seed);
  return (
    <div className={styles.report}>
      <p className={styles.reportLead}>
        Görüşmeyi {host} yürütüyor; sen de odadasın. Bir kez söz alabilir, sonunda kendi puanını verirsin. Kurulda görüşenin puanı, {LEAD.split(' ')[0]}'in teknik puanı,
        Hakan Bey'in uyum puanı ve senin puanın yan yana duracak.
      </p>
      <Turn who={host} role="Görüşmeyi yürüten" tone="hakan">
        {open.q}
      </Turn>
      <Turn who={c.name} role="Aday" tone="candidate">
        {open.a}
      </Turn>
      <Turn who={LEAD} role="Teknik bölüm" tone="lead">
        {fit >= 4 ? 'Vakayı çözdü, nedenini de anlattı.' : fit === 3 ? 'Vakada takıldı; ipucuyla toparladı.' : 'Vakadaki hatayı görmedi.'}
      </Turn>
      {owner !== 'hakan' && !structured && (
        <>
          <Turn who="Hakan Kaya" role="Uyum sorusu" tone="hakan">
            {forbiddenQuestion(id, c.age)}
          </Turn>
          <Turn who={c.name} role="Aday" tone="candidate">
            {forbiddenAnswer(id, c.age)}
          </Turn>
        </>
      )}
      {asked && (
        <>
          <Turn who="Sen" role="Söz aldın" tone="you">
            {talk.question}
          </Turn>
          <Turn who={c.name} role="Aday" tone="candidate">
            {talk.answer}
          </Turn>
        </>
      )}
      <Turn who={host} role="Görüşme notu" tone="hakan">
        {NOTE[owner](first, fit)}
      </Turn>
      <div className={styles.yourTurn}>
        {!asked && (
          <button className={styles.askButton} onClick={onAsk}>
            ✎ Söz al: test puanını ({test.score}) ve cevap kâğıdını sor
          </button>
        )}
        <div className={parts.scoreRow} role="radiogroup" aria-label={`${first} için senin puanın`}>
          <span>Senin puanın</span>
          <span className={parts.scoreDots}>
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} type="button" role="radio" aria-checked={score === v} className={`${parts.scoreDot} ${(score ?? 0) >= v ? parts.scoreOn : ''}`} onClick={() => onScore(v)}>
                {v}
              </button>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
