import type { ReactNode } from 'react';
import { CRITERIA, hooksIn, sentencesOf, type CodeCase, type HookKind, type Scores } from '../../game/events/interview';
import styles from './InterviewParts.module.css';

/*
 * Cuma mülakatının odayı oluşturan parçaları (FinalRoundScreen): kurcalanabilen
 * bir cevap, kodlama vakası ve puan kartı.
 */

/**
 * Biten bir cevap. Altı çizili ifadeler bir takip sorusuna değer (mülakat başına bir tane).
 */
export function AnswerText({
  text,
  fallback,
  canFollow,
  onFollow,
}: {
  text: string;
  /** Sorunun kendi türü; böylece her cevapta kurcalanacak bir şey olur. */
  fallback?: HookKind;
  canFollow: boolean;
  onFollow?: (kind: HookKind, phrase: string) => void;
}) {
  const hooks = onFollow ? hooksIn(text, fallback) : [];
  return (
    <>
      {sentencesOf(text).map((s) => {
        const end = s.start + s.text.length;
        const inside = hooks.filter((h) => h.start >= s.start && h.end <= end);
        const parts: ReactNode[] = [];
        let at = s.start;
        for (const h of inside) {
          if (h.start > at) parts.push(text.slice(at, h.start));
          const phrase = text.slice(h.start, h.end);
          parts.push(
            canFollow ? (
              <button key={h.start} type="button" className={styles.hook} onClick={() => onFollow?.(h.kind, phrase)} title="Bunun üzerine sor">
                {phrase}
              </button>
            ) : (
              <span key={h.start} className={styles.hookSpent}>
                {phrase}
              </span>
            ),
          );
          at = h.end;
        }
        if (at < end) parts.push(text.slice(at, end));
        return (
          <span key={s.start}>
            {parts}{' '}
          </span>
        );
      })}
    </>
  );
}

/** Kodlama vakası, masanın karşısından uzatıldığı gibi. */
export function CaseCard({ c }: { c: CodeCase }) {
  return (
    <figure className={styles.case}>
      <figcaption>
        Mini vaka · {c.title} — <span>Bu kodda ne yanlış?</span>
      </figcaption>
      <pre className="mono">{c.code}</pre>
      <p className={styles.caseWhat}>
        Kodu senin çözmen gerekmiyor. Bak: aday hatayı buluyor mu, nedenini anlatabiliyor mu, nasıl test edeceğini söylüyor mu? Cevaptan sonra Ümit'in yorumu da dosyada.
      </p>
    </figure>
  );
}

/** Az önce konuştuğun kişi için dört ölçüt, 1–5. */
export function Scorecard({ scores, onScore }: { scores: Scores; onScore: (criterion: (typeof CRITERIA)[number], value: number) => void }) {
  return (
    <div className={styles.scorecard}>
      {CRITERIA.map((c) => (
        <div key={c} className={styles.scoreRow} role="radiogroup" aria-label={c}>
          <span>{c}</span>
          <span className={styles.scoreDots}>
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={scores[c] === v}
                className={`${styles.scoreDot} ${(scores[c] ?? 0) >= v ? styles.scoreOn : ''}`}
                onClick={() => onScore(c, v)}
              >
                {v}
              </button>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
