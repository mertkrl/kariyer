import type { ReactNode } from 'react';
import { CRITERIA, NOTE_TAG_NAME, hooksIn, sentencesOf, type CodeCase, type HookKind, type NoteTag, type Scores } from '../../game/interview';
import styles from './InterviewParts.module.css';

/*
 * The pieces of the Friday interview that the room is built from (FinalRoundScreen): an answer
 * you can dig into and take notes from, the coding case, the scorecard, your notebook, and the
 * case you put to the panel.
 */

export interface Note {
  text: string;
  tag: NoteTag;
}

/**
 * A finished answer. Underlined phrases are worth a follow-up (one per interview); the pin
 * after each sentence writes it into your notebook.
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
  /** The question's own kind, so every answer has something to dig into. */
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

/** The coding case, as it is handed across the table. */
export function CaseCard({ c }: { c: CodeCase }) {
  return (
    <figure className={styles.case}>
      <figcaption>
        Mini vaka · {c.title} — <span>Bu kodda ne yanlış?</span>
      </figcaption>
      <pre className="mono">{c.code}</pre>
      <p className={styles.caseWhat}>
        Kodu senin çözmen gerekmiyor. Bak: aday hatayı buluyor mu, nedenini anlatabiliyor mu, nasıl test edeceğini söylüyor mu? Cevaptan sonra Levent'in yorumu da dosyada.
      </p>
    </figure>
  );
}

/** Four criteria, 1–5, for the person you just talked to. */
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

/** Your notebook for one person: what you wrote down, and what kind of evidence it is. */
export function NotesList({ notes, onRemove }: { notes: Note[]; onRemove?: (text: string) => void }) {
  if (!notes.length) return <p className={styles.notesEmpty}>Cevaplardaki bir cümlenin sonundaki ✎ ile not al. Kurulda önerini notlarınla savunacaksın.</p>;
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

/** Picking the notes you put to the panel (up to three). */
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
