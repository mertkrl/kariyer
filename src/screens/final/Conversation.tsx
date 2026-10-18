import type { ReactNode, RefObject } from 'react';
import type { Candidate } from '../../game/types';
import { caseFor, expectedSalary, salaryOffer, salaryTalk } from '../../game/events/interview';
import type { BackQuestion } from '../../game/data/interviewExtras';
import { SALARY_CAP } from '../../game/store/store';
import { PLAYER } from '../../game/lib/player';
import { AnswerText, CaseCard } from './InterviewParts';
import { CASE, FOLLOW, FORBIDDEN, LEAD, OWNER, SALARY_LINES, TEST, FORMAL_LINE, WARM_LINE, warmReply, type Entry, type Typing } from './interviewModel';
import styles from './Conversation.module.css';

/*
 * Odadaki kişiyle şimdiye kadarki konuşma, an an: senin soruların ve onun cevapları (canlı
 * olanı yazılırken), Ümit'in teknik sorusu, Hakan Bey'in uyum sorusu ve maaş konuşması. Biten
 * cevaplar kurcalanabilir (altı çizili ifadeler) ve not alınabilir (✎).
 */

/** Konuşmanın tek satırı: kim konuşuyor, hangi rolde ve ne diyor. */
export function Turn({ who, role, tone, children }: { who: string; role: string; tone: 'you' | 'candidate' | 'hakan' | 'lead'; children: ReactNode }) {
  return (
    <div className={`${styles.turn} ${styles['turn_' + tone]}`}>
      <div className={styles.turnWho}>
        <b>{who}</b>
        <small>{role}</small>
      </div>
      <div className={styles.turnText}>{children}</div>
    </div>
  );
}

/** Odada kimse konuşmadan olan şey. */
export function Note({ children }: { children: ReactNode }) {
  return <p className={styles.note}>{children}</p>;
}

export interface ConversationProps {
  entries: Entry[];
  selectedId: string;
  candidate: Candidate;
  poolIds: string[];
  typing: Typing | null;
  canFollow: boolean;
  chatRef: RefObject<HTMLDivElement | null>;
  answerFor: (id: string, question: number) => string;
  questionText: (q: number, about?: string, by?: string) => string;
  ask: (question: number, about?: string) => void;
  /** Bugün henüz kimseyle görüşülmedi: oda nasıl işlediğini anlatır. */
  firstOfDay: boolean;
  /** Yapılandırılmış mülakat: Hakan Bey'in listesi masada değil. */
  structured: boolean;
  /** Adayın sonda soracağı sorular (deneyimine göre 0–2). */
  backs: BackQuestion[];
  /** Görüşmeyi ekipten biri yürütüyor: onun adı (sen gözlemcisin); sen yürütüyorsan null. */
  host?: 'ayse' | 'emre' | 'hakan' | null;
}

const HOST_NAME = { ayse: 'Ayşe Demir', emre: 'Emre Yıldız', hakan: 'Hakan Kaya' } as const;

export function Conversation({ entries, selectedId, candidate, poolIds, typing, canFollow, chatRef, answerFor, questionText, ask, firstOfDay, structured, backs, host = null }: ConversationProps) {
  const speaker = host ? HOST_NAME[host] : PLAYER.name;
  return (
      <div className={styles.log} ref={chatRef} aria-live="polite">
        {entries.length === 0 && (
          <div className={styles.rules} role="note" aria-label="Görüşme planı">
            <div className={styles.briefHead}>
              <span className={styles.briefTitle}>Görüşme planı</span>
              <span className={styles.briefMeta}>
                Toplantı Odası 2 · Panel: {PLAYER.name}, {LEAD}
                {structured ? '' : ', Hakan Kaya'}
              </span>
            </div>
            <ol className={styles.steps}>
              {['Açılış', 'Sorular', 'Panel', 'Maaş', 'Değerlendirme'].map((step, i) => (
                <li key={step} className={i === 0 ? styles.stepNow : undefined}>
                  {step}
                </li>
              ))}
            </ol>
            {firstOfDay && <p className={styles.briefTip}>İpucu: cevaplardaki altı noktalı ifadelere tıklayıp takip sorusu sorabilirsin.</p>}
          </div>
        )}
        {entries.map((e, index) => {
          if (e.kind === 'note') return <Note key={index}>{e.text}</Note>;
          if (e.kind === 'warm')
            return (
              <div key={index} className={styles.exchange}>
                <Turn who={PLAYER.name} role={e.warm ? 'Açılış · samimi' : 'Açılış · kurumsal'} tone="you">
                  {e.warm ? WARM_LINE : FORMAL_LINE}
                </Turn>
                <Turn who={candidate.name} role="Aday" tone="candidate">
                  {warmReply(selectedId, e.warm)}
                </Turn>
                {host && <Note>Görüşmeyi {HOST_NAME[host].split(' ')[0]} sürdürüyor. Sen gözlemcisin; istersen söz alabilirsin.</Note>}
              </div>
            );
          if (e.kind === 'handoff') return <Note key={index}>Söz panelde.</Note>;
          if (e.kind === 'end') return <Note key={index}>Görüşme tamamlandı. Aday odadan çıkıyor.</Note>;
          if (e.kind === 'back') {
            const back = backs[e.n];
            if (!back) return null;
            return (
              <div key={index} className={styles.exchange}>
                <Turn who={candidate.name} role="Aday soruyor" tone="candidate">
                  {back.question}
                </Turn>
                {e.choice && (
                  <>
                    <Turn who={PLAYER.name} role="İK Uzmanı" tone="you">
                      {e.choice === 'honest' ? back.honest : back.polished}
                    </Turn>
                    <Turn who={candidate.name} role="Aday" tone="candidate">
                      {e.choice === 'honest' ? back.afterHonest : back.afterPolished}
                    </Turn>
                  </>
                )}
              </div>
            );
          }
          if (e.kind === 'salary') {
            const ask = expectedSalary(selectedId);
            const result = e.move ? salaryTalk(selectedId, e.move) : null;
            return (
              <div key={index} className={styles.exchange}>
                <Turn who={speaker} role="Maaş" tone={host ? 'lead' : 'you'}>
                  Maaş beklentinizi konuşalım. Ne kadar bekliyorsunuz?
                </Turn>
                <Turn who={candidate.name} role="Aday" tone="candidate">
                  {ask ? `Aylık net ${ask.toLocaleString('tr-TR')} TL bekliyorum.` : candidate.salary}
                  {ask && ask > SALARY_CAP && ' Piyasada bu seviyede teklifler alıyorum.'}
                </Turn>
                {e.move && result && (
                  <>
                    <Turn who={speaker} role="Maaş" tone={host ? 'lead' : 'you'}>
                      {SALARY_LINES[e.move](salaryOffer(selectedId, e.move) ?? 0)}
                    </Turn>
                    <Turn who={candidate.name} role="Aday" tone="candidate">
                      {result.reply}
                    </Turn>
                  </>
                )}
              </div>
            );
          }
          const live = typing && typing.candidateId === selectedId && typing.entry === index;
          const answer = answerFor(selectedId, e.q);
          return (
            <div key={index} className={styles.exchange}>
              {e.by === 'levent' ? (
                <Turn who={LEAD} role="Yazılım Ekip Lideri · durum sorusu" tone="lead">
                  {questionText(e.q, e.about, e.by)}
                </Turn>
              ) : e.by === 'hakan' ? (
                <Turn who="Hakan Kaya" role={e.q >= OWNER ? 'İK Müdürü · görüşmeyi yürütüyor' : 'İK Müdürü'} tone="hakan">
                  {questionText(e.q, e.about, e.by)}
                </Turn>
              ) : e.by === 'ayse' || e.by === 'emre' ? (
                <Turn who={e.by === 'ayse' ? 'Ayşe Demir' : 'Emre Yıldız'} role="İK Uzmanı · görüşmeyi yürütüyor" tone="lead">
                  {questionText(e.q, e.about, e.by)}
                </Turn>
              ) : (
                <Turn who={PLAYER.name} role={host ? 'Söz aldın' : e.q === TEST ? 'Test sorusu' : e.q >= FOLLOW ? 'Takip sorusu' : 'İK Uzmanı'} tone="you">
                  {questionText(e.q, e.about, e.by)}
                </Turn>
              )}
              {e.q === CASE && <CaseCard c={caseFor(selectedId, poolIds)} />}
              <Turn who={candidate.name} role="Aday" tone="candidate">
                {live && typing.shown < 0 ? (
                  <span className={styles.thinking} aria-label="düşünüyor">
                    <i />
                    <i />
                    <i />
                  </span>
                ) : (
                  <>
                    {live ? (
                      <>
                        {answer.slice(0, typing.shown)}
                        <span className={styles.caret} />
                      </>
                    ) : (
                      <AnswerText
                        text={answer}
                        fallback={e.q < FORBIDDEN ? (e.q as 0 | 1 | 2) : e.q >= OWNER ? ((e.q - OWNER) as 0 | 1 | 2) : undefined}
                        canFollow={canFollow}
                        onFollow={(e.q < FORBIDDEN && !e.by) || e.q >= OWNER ? (kind, phrase) => ask(FOLLOW + kind, phrase) : undefined}
                      />
                    )}
                  </>
                )}
              </Turn>
            </div>
          );
        })}
      </div>
  );
}
