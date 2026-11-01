import { useEffect, useState } from 'react';
import { sliderOption, type ExamQuestion, type ExamWidget } from '../data/questions';
import { audioEngine } from '../../../audio/audioEngine';
import * as sfx from '../sfx';
import { prefersReducedMotion } from '../../../components/ui/motion';
import styles from './QuestionWidgets.module.css';
import { HistoryWidget, ScreenshareWidget } from './ScreenWidgets';
import { BackgroundWidget, InviteWidget, ReactionWidget } from './AppWidgets';
import { LunchWidget, RaiseWidget } from './OfficeWidgets';
import { StampWidget, ThermostatWidget, TurnstileWidget } from './FloorWidgets';
import { BudgetWidget, ContractWidget, ElevatorWidget, PasswordWidget, ShutdownWidget, SwipeWidget } from './DeskWidgets';
import { CcWidget, LeaveWidget, OvertimeWidget } from './HrWidgets';
import { InboxWidget } from './InboxWidget';

/*
 * Değerlendirmenin soru türleri. Her biri sonunda bir şık sırası verir (`onAnswer`), böylece
 * cevap kâğıdı her soru için aynı biçimde okunur: çoktan seçmeli, kaydırıcı, görev sıralama ve
 * bilgisayar ekranına akan gelen kutusunda doğru e-postayı seçmek.
 */

interface WidgetProps {
  q: ExamQuestion;
  onAnswer: (option: number) => void;
}

const click = () => audioEngine.playUi('click');

/** `selected`: daha önce işaretlenen şık; düz çoktan seçmelide vurgulanır, diğer türlerde soru kartı gösterir. */
export function QuestionWidget({ q, onAnswer, selected = null }: WidgetProps & { selected?: number | null }) {
  const w = q.widget;
  if (w?.type === 'slider') return <SliderWidget q={q} w={w} onAnswer={onAnswer} selected={selected} />;
  if (w?.type === 'order') return <OrderWidget q={q} onAnswer={onAnswer} selected={selected} />;
  if (w?.type === 'inbox') return <InboxWidget q={q} w={w} onAnswer={onAnswer} selected={selected} />;
  if (w?.type === 'calendar') return <CalendarWidget q={q} onAnswer={onAnswer} />;
  if (w?.type === 'chat') return <ChatWidget q={q} w={w} onAnswer={onAnswer} selected={selected} />;
  if (w?.type === 'runaway') return <RunawayWidget q={q} onAnswer={onAnswer} />;
  if (w?.type === 'screenshare') return <ScreenshareWidget q={q} w={w} onAnswer={onAnswer} />;
  if (w?.type === 'history') return <HistoryWidget q={q} w={w} onAnswer={onAnswer} selected={selected} />;
  if (w?.type === 'background') return <BackgroundWidget q={q} w={w} onAnswer={onAnswer} selected={selected} />;
  if (w?.type === 'invite') return <InviteWidget q={q} w={w} onAnswer={onAnswer} selected={selected} />;
  if (w?.type === 'reaction') return <ReactionWidget q={q} w={w} onAnswer={onAnswer} selected={selected} />;
  if (w?.type === 'lunch') return <LunchWidget q={q} w={w} onAnswer={onAnswer} selected={selected} />;
  if (w?.type === 'raise') return <RaiseWidget q={q} w={w} onAnswer={onAnswer} selected={selected} />;
  if (w?.type === 'stamp') return <StampWidget q={q} w={w} onAnswer={onAnswer} selected={selected} />;
  if (w?.type === 'thermostat') return <ThermostatWidget q={q} w={w} onAnswer={onAnswer} selected={selected} />;
  if (w?.type === 'turnstile') return <TurnstileWidget q={q} w={w} onAnswer={onAnswer} selected={selected} />;
  if (w?.type === 'contract') return <ContractWidget q={q} w={w} onAnswer={onAnswer} selected={selected} />;
  if (w?.type === 'swipe') return <SwipeWidget q={q} w={w} onAnswer={onAnswer} selected={selected} />;
  if (w?.type === 'password') return <PasswordWidget q={q} w={w} onAnswer={onAnswer} selected={selected} />;
  if (w?.type === 'shutdown') return <ShutdownWidget q={q} w={w} onAnswer={onAnswer} selected={selected} />;
  if (w?.type === 'elevator') return <ElevatorWidget q={q} w={w} onAnswer={onAnswer} selected={selected} />;
  if (w?.type === 'budget') return <BudgetWidget q={q} w={w} onAnswer={onAnswer} selected={selected} />;
  if (w?.type === 'leave') return <LeaveWidget q={q} w={w} onAnswer={onAnswer} selected={selected} />;
  if (w?.type === 'cc') return <CcWidget q={q} w={w} onAnswer={onAnswer} selected={selected} />;
  if (w?.type === 'overtime') return <OvertimeWidget q={q} w={w} onAnswer={onAnswer} selected={selected} />;
  return (
    <div className={styles.options}>
      {q.options.map((o, i) => (
        <button
          key={i}
          className={`${styles.option} ${selected === i ? styles.optionOn : ''}`}
          aria-pressed={selected === i}
          onClick={() => {
            sfx.select(i);
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

/** Kaydırıcının son onaylanan değeri: soruya geri dönülünce kaydırıcı oradan başlar. */
const sliderMemory = new Map<string, number>();

function SliderWidget({ q, w, onAnswer, selected }: WidgetProps & { w: Extract<ExamWidget, { type: 'slider' }>; selected: number | null }) {
  const [value, setValue] = useState(() => sliderMemory.get(q.id) ?? Math.round((w.min + w.max) / 2));
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
          {option === q.answer && <span className={styles.badgeGold}>🏆 Örnek çalışan</span>}
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
          sliderMemory.set(q.id, value);
          onAnswer(option);
        }}
      >
        Onayla
      </button>
      {selected !== null && (
        <p className={styles.yourAnswer} role="status">
          Cevabınız: <b>{q.options[selected]}</b>
        </p>
      )}
    </div>
  );
}

/** Gönderilen sıralamalar: cevap kâğıdı yalnızca ilk sırayı tutar, soruya dönülünce tam sıra buradan gelir. */
const orderMemory = new Map<string, number[]>();

function OrderWidget({ q, onAnswer, selected }: WidgetProps & { selected: number | null }) {
  const [order, setOrder] = useState<number[]>(() => (selected !== null ? (orderMemory.get(q.id) ?? []) : []));
  const done = order.length === q.options.length;
  const sent = selected !== null && orderMemory.get(q.id)?.join() === order.join();
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
            orderMemory.set(q.id, order);
            onAnswer(order[0]);
          }}
        >
          {sent ? 'Gönderildi ✓' : 'Sıralamayı gönder'}
        </button>
      </div>
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
  ['Mesai sonrası "kısa" senkron', 'Akşam hizalanması', 'Moral kahvaltısı (gönüllü-zorunlu)', 'Ekip çalıştayı', 2, '—'],
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
function ChatWidget({ q, w, onAnswer, selected }: WidgetProps & { w: Extract<ExamWidget, { type: 'chat' }>; selected: number | null }) {
  // daha önce cevaplanmışsa mesajlar yeniden yazılmaz
  const [shown, setShown] = useState(selected === null ? 1 : w.messages.length);
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
            className={`${styles.reply} ${selected === i ? styles.replyOn : ''}`}
            aria-pressed={selected === i}
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
  // hareket azaltılmışsa düğme hiç kaçmaz: şaka metinde kalır, oyuncu engellenmez
  const [runs, setRuns] = useState(() => (prefersReducedMotion() ? RUNS : 0));
  const [pos, setPos] = useState({ x: 8, y: 60 });
  const tired = runs >= RUNS;
  // yorulduktan sonra imleç düğmeye girdiği an "aile" düğmesi onun yerine geçer
  const [swapped, setSwapped] = useState(false);
  const flee = () => {
    if (tired && prefersReducedMotion()) return;
    if (tired) {
      setSwapped(true);
      return;
    }
    sfx.flee();
    setRuns((n) => n + 1);
    setPos({ x: 2 + Math.random() * 60, y: 6 + Math.random() * 60 });
  };
  return (
    <div className={styles.runaway}>
      {!swapped && (
        <button className={`${styles.runner} ${tired ? styles.runnerTired : ''}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }} onPointerEnter={flee} onFocus={flee} onClick={() => (tired && prefersReducedMotion() ? (click(), onAnswer(0)) : flee())}>
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
