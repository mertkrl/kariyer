import { useEffect, useState } from 'react';
import { sliderOption, type AptitudeQuestion, type AptitudeWidget } from '../../game/data/aptitudeTest';
import { audioEngine } from '../../audio/audioEngine';
import styles from './AptitudeWidgets.module.css';

/*
 * Değerlendirmenin soru türleri. Her biri sonunda bir şık sırası verir (`onAnswer`), böylece
 * cevap kâğıdı her soru için aynı biçimde okunur: çoktan seçmeli, kaydırıcı, görev sıralama ve
 * Hakan Bey'in sunumunda doğru anda baş sallamak.
 */

interface WidgetProps {
  q: AptitudeQuestion;
  onAnswer: (option: number) => void;
}

const click = () => audioEngine.playUi('click');

export function QuestionWidget({ q, onAnswer }: WidgetProps) {
  const w = q.widget;
  if (w?.type === 'slider') return <SliderWidget q={q} w={w} onAnswer={onAnswer} />;
  if (w?.type === 'order') return <OrderWidget q={q} onAnswer={onAnswer} />;
  if (w?.type === 'tap') return <TapWidget q={q} everyMs={w.everyMs} onAnswer={onAnswer} />;
  return (
    <div className={styles.options}>
      {q.options.map((o, i) => (
        <button
          key={i}
          className={styles.option}
          onClick={() => {
            click();
            onAnswer(i);
          }}
        >
          <b>{'ABCD'[i]}</b> <span>{o}</span>
        </button>
      ))}
    </div>
  );
}

const FACES = ['😐', '🙂', '😄', '🤩'];

function SliderWidget({ q, w, onAnswer }: WidgetProps & { w: Extract<AptitudeWidget, { type: 'slider' }> }) {
  const [value, setValue] = useState(Math.round((w.min + w.max) / 2));
  const option = sliderOption(value, w.thresholds);
  return (
    <div className={styles.slider}>
      {w.faces ? (
        <div className={styles.face} aria-hidden="true">
          {FACES[option]}
        </div>
      ) : (
        <div className={styles.sliderValue}>
          <b className="mono">{value}</b> {w.unit}
          {value >= w.max && <span className={styles.badgeGold}>🏆 Örnek çalışan</span>}
        </div>
      )}
      <input
        type="range"
        min={w.min}
        max={w.max}
        step={w.step}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        aria-label={q.prompt}
        aria-valuetext={q.options[option]}
      />
      <div className={styles.sliderLabel}>{q.options[option]}</div>
      <button
        className={styles.primary}
        onClick={() => {
          click();
          onAnswer(option);
        }}
      >
        Onayla
      </button>
    </div>
  );
}

function OrderWidget({ q, onAnswer }: WidgetProps) {
  const [order, setOrder] = useState<number[]>([]);
  const done = order.length === q.options.length;
  return (
    <div className={styles.order}>
      <ul className={styles.orderList}>
        {q.options.map((o, i) => {
          const rank = order.indexOf(i);
          return (
            <li key={i}>
              <button
                className={`${styles.orderItem} ${rank >= 0 ? styles.orderItemOn : ''}`}
                disabled={rank >= 0}
                onClick={() => {
                  click();
                  setOrder((x) => [...x, i]);
                }}
              >
                <span className={styles.orderRank}>{rank >= 0 ? rank + 1 : '·'}</span>
                {o}
              </button>
            </li>
          );
        })}
      </ul>
      <div className={styles.orderActions}>
        <button className={styles.ghost} onClick={() => setOrder([])} disabled={!order.length}>
          Sıfırla
        </button>
        <button
          className={styles.primary}
          disabled={!done}
          onClick={() => {
            click();
            onAnswer(order[0]);
          }}
        >
          Sıralamayı gönder
        </button>
      </div>
    </div>
  );
}

/** Cümleler sırayla gelir; o an ekrandaki cümleye baş sallamak cevaptır. */
const TAP_SEQUENCE = [1, 3, 0, 2];

function TapWidget({ q, everyMs, onAnswer }: WidgetProps & { everyMs: number }) {
  const [step, setStep] = useState(0);
  const [nodded, setNodded] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => setStep((s) => s + 1), everyMs);
    return () => window.clearInterval(id);
  }, [everyMs]);
  const current = TAP_SEQUENCE[step % TAP_SEQUENCE.length] % q.options.length;
  return (
    <div className={styles.meeting}>
      <div className={styles.stage}>
        <div className={styles.presenter} aria-hidden="true">
          👔
        </div>
        <div className={styles.slide}>
          <small>Hakan Kaya · Çeyrek Değerlendirmesi</small>
          <p key={step} className={styles.slideLine} aria-live="polite">
            "{q.options[current]}"
          </p>
        </div>
      </div>
      <div className={styles.audience} aria-hidden="true">
        {['🧑‍💼', '👩‍💼', '🧑‍💻', '👨‍💼', '🫥'].map((p, i) => (
          <span key={i} className={step % 2 === i % 2 ? styles.nod : undefined}>
            {p}
          </span>
        ))}
      </div>
      <button
        className={`${styles.primary} ${styles.nodButton}`}
        disabled={nodded}
        onClick={() => {
          click();
          setNodded(true);
          onAnswer(current);
        }}
      >
        🙂 Başımı salla
      </button>
    </div>
  );
}
