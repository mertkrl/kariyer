import type { ReactNode } from 'react';
import { CRITERIA, NOTE_TAG_NAME, hooksIn, sentencesOf, type CodeCase, type HookKind, type NoteTag, type Scores } from '../../game/events/interview';
import styles from './InterviewParts.module.css';

/*
 * Cuma mülakatının odayı oluşturan parçaları (FinalRoundScreen): kurcalanıp not alınabilen
 * bir cevap, kodlama vakası, puan kartı, not defterin ve kurula sunduğun gerekçe.
 */

export interface Note {
  text: string;
  tag: NoteTag;
}

/**
 * Biten bir cevap. Altı çizili ifadeler bir takip sorusuna değer (mülakat başına bir tane);
 * her cümlenin sonundaki iğne onu not defterine yazar.
 */
export function AnswerText({
  text,
  fallback,
  canFollow,
  onFollow,
  noted,
  onNote,
}: {
  text: string;
  /** Sorunun kendi türü; böylece her cevapta kurcalanacak bir şey olur. */
  fallback?: HookKind;
  canFollow: boolean;
  onFollow?: (kind: HookKind, phrase: string) => void;
  noted: (sentence: string) => boolean;
  onNote?: (sentence: string) => void;
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
        const isNoted = noted(s.text.trim());
        return (
          <span key={s.start} className={isNoted ? styles.noted : undefined}>
            {parts}
            {onNote && (
              <button
                type="button"
                className={`${styles.pin} ${isNoted ? styles.pinOn : ''}`}
                onClick={() => onNote(s.text.trim())}
                aria-pressed={isNoted}
                aria-label={isNoted ? 'Nottan çıkar' : 'Not al'}
                title={isNoted ? 'Nottan çıkar' : 'Not al'}
              >
                ✎
              </button>
            )}{' '}
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

/** Bir kişi için not defterin: ne yazdığın ve bunun ne tür bir kanıt olduğu. */
export function NotesList({ notes, onRemove }: { notes: Note[]; onRemove?: (text: string) => void }) {
  if (!notes.length) return <p className={styles.notesEmpty}>Cevaplardaki bir cümlenin sonundaki ✎ ile not al; puanlarken notlarına bakarsın.</p>;
  return (
    <ul className={styles.notes}>
      {notes.map((n) => (
        <li key={n.text}>
          <span className={`${styles.tag} ${styles['tag_' + n.tag]}`}>{NOTE_TAG_NAME[n.tag]}</span>
          <span>{n.text}</span>
          {onRemove && (
            <button type="button" className={styles.noteRemove} onClick={() => onRemove(n.text)} aria-label="Notu sil">
              ✕
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Kurula sunacağın notları seçmek (en fazla üç). */
export function EvidencePicker({ notes, picked, onToggle }: { notes: Note[]; picked: string[]; onToggle: (text: string) => void }) {
  if (!notes.length) return <p className={styles.notesEmpty}>Bu aday için hiç not almadın; elinde gösterecek bir şey yok.</p>;
  return (
    <ul className={styles.evidence}>
      {notes.map((n) => {
        const on = picked.includes(n.text);
        return (
          <li key={n.text}>
            <label className={on ? styles.evidenceOn : undefined}>
              <input type="checkbox" checked={on} disabled={!on && picked.length >= 3} onChange={() => onToggle(n.text)} />
              <span className={`${styles.tag} ${styles['tag_' + n.tag]}`}>{NOTE_TAG_NAME[n.tag]}</span>
              <span>"{n.text}"</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
