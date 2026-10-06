import { useEffect, useState } from 'react';
import type { DeskCall as Call } from '../../game/desk';
import { audioEngine } from '../../audio/audioEngine';
import styles from './Desk.module.css';

/** Kulağındaki ahize: arayan konuşur, ne diyeceğini seçersin, o cevap verir, kapatırsın. */
export function DeskCall({ call, onHangUp }: { call: Call; onHangUp: (choice: number) => void }) {
  const [shown, setShown] = useState(1);
  const [picked, setPicked] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (shown >= call.lines.length) return;
    const id = window.setTimeout(() => setShown((n) => n + 1), 1500);
    return () => window.clearTimeout(id);
  }, [shown, call.lines.length]);

  useEffect(() => {
    if (picked === null) return;
    const id = window.setTimeout(() => {
      if (!call.inPerson) audioEngine.playHandset(true);
      onHangUp(picked);
    }, call.inPerson ? 5200 : 2600);
    return () => window.clearTimeout(id);
  }, [picked, onHangUp, call.inPerson]);

  const ready = shown >= call.lines.length && picked === null;
  return (
    <div className={styles.call} role="dialog" aria-label={`${call.caller} ile ${call.inPerson ? 'yüz yüze konuşma' : 'telefon görüşmesi'}`}>
      <div className={styles.callHead}>
        <span className={styles.callIcon}>{call.inPerson ? '👤' : call.outgoing ? '↗' : '☎'}</span>
        <div>
          <div className={styles.callWho}>{call.caller}</div>
          <div className={styles.callLine}>
            {call.outgoing ? 'Giden arama · ' : ''}
            {call.line}
          </div>
        </div>
        <span className={`${styles.callTimer} mono`}>
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
        </span>
      </div>
      {call.stakes && <div className={styles.callStakes}>📌 {call.stakes}</div>}
      <div className={styles.callBody}>
        {call.lines.slice(0, shown).map((l) => (
          <p key={l} className={styles.callSays}>
            {l}
          </p>
        ))}
        {shown < call.lines.length && <p className={styles.callTyping}>…</p>}
        {picked !== null && (
          <>
            <p className={styles.callYou}>{call.choices[picked].text}</p>
            <p className={styles.callSays}>{call.choices[picked].reply}</p>
          </>
        )}
      </div>
      {ready && (
        <div className={styles.callChoices}>
          {call.choices.map((c, i) => (
            <button key={c.text} className={styles.callChoice} onClick={() => setPicked(i)}>
              {c.text}
            </button>
          ))}
        </div>
      )}
      {picked !== null && <div className={styles.callEnd}>{call.inPerson ? 'Konuşma bitiyor…' : 'Görüşme bitiyor…'}</div>}
    </div>
  );
}
