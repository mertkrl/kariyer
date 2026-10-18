import { useEffect, useState } from 'react';
import { sliderOption, type AptitudeQuestion, type AptitudeWidget } from '../../game/data/aptitudeTest';
import { audioEngine } from '../../audio/audioEngine';
import styles from './AptitudeWidgets.module.css';

/*
 * Değerlendirmenin soru türleri. Her biri sonunda bir şık sırası verir (`onAnswer`), böylece
 * cevap kâğıdı her soru için aynı biçimde okunur: çoktan seçmeli, kaydırıcı, görev sıralama ve
 * yöneticinin sunumunda doğru anda baş sallamak.
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
  if (w?.type === 'calendar') return <CalendarWidget q={q} onAnswer={onAnswer} />;
  if (w?.type === 'chat') return <ChatWidget q={q} w={w} onAnswer={onAnswer} />;
  if (w?.type === 'runaway') return <RunawayWidget q={q} onAnswer={onAnswer} />;
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
          <small>Yönetici · Çeyrek Değerlendirmesi</small>
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

/*
 * Takvim: haftanın neredeyse her yeri dolu. Boş dört hücre dört şıktır (sırayla: Salı 10:00,
 * Perşembe 12:30, Cuma 18:30, Cumartesi 10:00); geri kalanı ofis hayatının kendisi.
 */
const CAL_DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const CAL_TIMES = ['10:00', '12:30', '18:30'];
const CAL: (string | number)[][] = [
  ['Haftalık hizalanma', 0, 'Hizalanmanın hizalanması', 'Hizalanma (tekrar)', 'Q3 retrospektifinin ön hazırlığı', 3],
  ['Öğle arası (iptal edildi)', 'Öğle arası toplantısı', 'Öğle yemeğinde sunum', 1, 'Takım ruhu öğle yemeği (zorunlu)', '—'],
  ['Mesai sonrası "kısa" senkron', 'Akşam hizalanması', 'Doğum günü pastası (gönüllü-zorunlu)', 'Ekip çalıştayı', 2, '—'],
];

function CalendarWidget({ q, onAnswer }: WidgetProps) {
  return (
    <div className={styles.calendar} role="grid" aria-label="Haftalık takvim">
      <span />
      {CAL_DAYS.map((d) => (
        <b key={d} className={styles.calHead}>
          {d}
        </b>
      ))}
      {CAL.map((row, r) => (
        <div key={r} className={styles.calRow}>
          <span className={`mono ${styles.calTime}`}>{CAL_TIMES[r]}</span>
          {row.map((cell, c) =>
            typeof cell === 'number' ? (
              <button
                key={c}
                className={styles.calFree}
                aria-label={q.options[cell]}
                onClick={() => {
                  click();
                  onAnswer(cell);
                }}
              >
                + Boş
              </button>
            ) : (
              <span key={c} className={cell === '—' ? styles.calOff : styles.calBusy}>
                {cell}
              </span>
            ),
          )}
        </div>
      ))}
    </div>
  );
}

/** Gece mesajı: yönetici yazar, bir an "yazıyor…" görünür, ikinci mesaj gelir; sonra cevap sırası sende. */
function ChatWidget({ q, w, onAnswer }: WidgetProps & { w: Extract<AptitudeWidget, { type: 'chat' }> }) {
  const [shown, setShown] = useState(1);
  useEffect(() => {
    if (shown >= w.messages.length) return;
    const id = window.setTimeout(() => setShown((n) => n + 1), 1600);
    return () => window.clearTimeout(id);
  }, [shown, w.messages.length]);
  const typing = shown < w.messages.length;
  return (
    <div className={styles.phone}>
      <div className={styles.phoneHead}>
        <b>{w.from}</b>
        <small>{typing ? 'yazıyor…' : 'çevrimiçi'}</small>
      </div>
      <div className={styles.phoneBody}>
        {w.messages.slice(0, shown).map((m, i) => (
          <p key={i} className={styles.bubble}>
            {m}
            <small className="mono">{w.at}</small>
          </p>
        ))}
        {typing && <p className={`${styles.bubble} ${styles.bubbleTyping}`}>• • •</p>}
      </div>
      <div className={styles.replies}>
        {q.options.map((o, i) => (
          <button
            key={i}
            className={styles.reply}
            disabled={typing}
            onClick={() => {
              click();
              onAnswer(i);
            }}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Kaçan düğme: ücret talebi küçük ama görünür; imleç yaklaşınca kaçar. Birkaç denemeden sonra
 * kaçmayı bırakır, ama tam basacağın an yerine "biz bir aileyiz" düğmesi geçer: tıklama ona gider.
 */
const RUNS = 5;
const FLEE_LINES = ['Form yeniden yükleniyor…', 'Bu seçenek şu an bakımda.', 'Talebiniz sıraya alındı (sıra: 4.812).', 'Sunucu: "Emin misiniz?"', 'Bütçe dönemi kapalı.'];

function RunawayWidget({ q, onAnswer }: WidgetProps) {
  const [runs, setRuns] = useState(0);
  const [pos, setPos] = useState({ x: 8, y: 60 });
  const tired = runs >= RUNS;
  // yorulduktan sonra imleç düğmeye girdiği an "aile" düğmesi onun yerine geçer
  const [swapped, setSwapped] = useState(false);
  const flee = () => {
    if (tired) {
      setSwapped(true);
      return;
    }
    setRuns((n) => n + 1);
    setPos({ x: 2 + Math.random() * 60, y: 6 + Math.random() * 60 });
  };
  return (
    <div className={styles.runaway}>
      {!swapped && (
        <button className={`${styles.runner} ${tired ? styles.runnerTired : ''}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }} onPointerEnter={flee} onFocus={flee} onClick={flee}>
          {q.options[0]}
        </button>
      )}
      <button
        className={`${styles.primary} ${styles.stay}`}
        style={swapped ? { left: `${pos.x}%`, top: `${pos.y}%`, right: 'auto', bottom: 'auto' } : undefined}
        onClick={() => {
          click();
          onAnswer(1);
        }}
      >
        {q.options[1]}
      </button>
      {runs > 0 && <small className={styles.runNote}>{tired ? 'Form sabitlendi. Artık tıklayabilirsiniz.' : FLEE_LINES[(runs - 1) % FLEE_LINES.length]}</small>}
    </div>
  );
}
