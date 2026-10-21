import { useEffect, useRef, useState } from 'react';
import { screenshareOption, type ExamQuestion, type ExamWidget } from '../data/questions';
import { audioEngine } from '../../../audio/audioEngine';
import styles from './ScreenWidgets.module.css';
import { MockPage } from './MockPages';

/*
 * "Ekran içinde ekran" soruları: küçük bir tarayıcı penceresi. Ekran paylaşımında oyuncu kendi
 * sekmelerini geri sayım bitmeden kapatmaya çalışır; arama geçmişinde başkasının geçmişinden bir
 * satır seçer. İkisi de sonunda diğer türler gibi bir şık sırası verir.
 */

interface Props<T> {
  q: ExamQuestion;
  w: T;
  onAnswer: (option: number) => void;
}

const click = () => audioEngine.playUi('click');

type Share = Extract<ExamWidget, { type: 'screenshare' }>;

export function ScreenshareWidget({ q, w, onAnswer }: Props<Share>) {
  const [stage, setStage] = useState<'ready' | 'count' | 'live'>('ready');
  const [left, setLeft] = useState(w.seconds);
  const [closed, setClosed] = useState<Set<number>>(new Set());
  const [peek, setPeek] = useState(0);

  // Bitiş anı katılınca bir kez belirlenir; sayaç kalan süreyi ondan hesaplar, böylece sekme
  // kapatmak geri sayımı uzatmaz. Kapatılanlar olay anında ref'e de yazılır, sayaç oradan okur.
  const deadline = useRef(0);
  const closedNow = useRef<Set<number>>(new Set());
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    setStage('live');
    setLeft(0);
    onAnswer(screenshareOption(w.tabs, closedNow.current));
  };
  const join = () => {
    click();
    deadline.current = Date.now() + w.seconds * 1000;
    setStage('count');
  };
  useEffect(() => {
    if (stage !== 'count') return;
    const id = window.setInterval(() => {
      const rest = Math.ceil((deadline.current - Date.now()) / 1000);
      if (rest <= 0) finish();
      else setLeft(rest);
    }, 200);
    return () => window.clearInterval(id);
  });

  const close = (i: number) => {
    click();
    closedNow.current = new Set(closedNow.current).add(i);
    setClosed(closedNow.current);
    const next = w.tabs.findIndex((_, j) => j !== i && !closed.has(j));
    if (peek === i && next >= 0) setPeek(next);
  };
  const open = w.tabs.map((t, i) => ({ t, i })).filter(({ i }) => !closed.has(i));
  const shown = w.tabs[peek] && !closed.has(peek) ? w.tabs[peek] : open[0]?.t;

  return (
    <div className={styles.share}>
      <div className={`${styles.browser} ${styles.window} ${stage === 'live' ? styles.live : ''}`}>
        {/* sekme şeridi: pencere düğmeleri, sekmeler, yeni sekme */}
        <div className={styles.strip}>
          <span className={styles.lights} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <div className={styles.tabs} role="tablist" aria-label="Açık sekmeler">
            {open.map(({ t, i }) => (
              <div key={t.title} className={`${styles.tab} ${shown === t ? styles.tabOn : ''}`}>
                <button role="tab" aria-selected={shown === t} className={styles.tabTitle} onClick={() => setPeek(i)} disabled={stage === 'live'} title={t.title}>
                  <span className={styles.favicon} aria-hidden="true">
                    {t.icon}
                  </span>
                  <span className={styles.tabText}>{t.title}</span>
                </button>
                <button className={`${styles.tabClose} ${stage === 'count' ? styles.tabCloseOn : ''}`} aria-label={`${t.title} sekmesini kapat`} disabled={stage !== 'count'} onClick={() => close(i)}>
                  ×
                </button>
              </div>
            ))}
            <span className={styles.newTab} aria-hidden="true">
              +
            </span>
          </div>
        </div>

        {/* araç çubuğu ve adres */}
        <div className={styles.toolbar}>
          <span className={styles.navBtns} aria-hidden="true">
            ← → ↻
          </span>
          <span className={styles.url}>
            <span aria-hidden="true">🔒</span> {shown ? shown.url : 'yeni sekme'}
          </span>
          <span className={styles.avatar} aria-hidden="true">
            S
          </span>
        </div>

        <div className={styles.viewport}>{shown ? <MockPage tab={shown} /> : <div className={styles.empty}>Hiç sekme kalmadı. Masaüstü duvar kağıdınız: şirket logosu.</div>}</div>

        {stage === 'live' && (
          <div className={styles.liveBar} role="status">
            ● Ekranınız 412 kişiyle paylaşılıyor · <b>{q.options[screenshareOption(w.tabs, closed)]}</b>
          </div>
        )}
      </div>

      <div className={styles.shareBar}>
        {stage === 'ready' && (
          <>
            <span>Toplantı başlamak üzere. Katıldığınız an ekran paylaşımına {w.seconds} saniye kalacak.</span>
            <button className={styles.join} onClick={join}>
              Toplantıya katıl
            </button>
          </>
        )}
        {stage === 'count' && (
          <>
            <span>
              Paylaşım başlıyor: <b className={`${styles.count} mono`}>{left}</b>
            </span>
            <button
              className={styles.join}
              onClick={() => {
                click();
                finish();
              }}
            >
              Hazırım, paylaş
            </button>
          </>
        )}
        {stage === 'live' && <span>Toplantı sürüyor. Genel Müdür kamerasını açtı.</span>}
      </div>
    </div>
  );
}

type History = Extract<ExamWidget, { type: 'history' }>;

export function HistoryWidget({ q, w, onAnswer, selected }: Props<History> & { selected: number | null }) {
  const none = q.options.length - 1;
  return (
    <div className={styles.browser}>
      <div className={styles.address}>
        <span aria-hidden="true">🔒</span> tarayici://gecmis <small>Çalışan: #4471 · İzleme modu</small>
      </div>
      <ol className={styles.history} aria-label="Arama geçmişi">
        <li className={styles.day}>Dün gece</li>
        {q.options.slice(0, none).map((o, i) => (
          <li key={o}>
            <button
              className={`${styles.entry} ${selected === i ? styles.entryOn : ''}`}
              aria-pressed={selected === i}
              onClick={() => {
                click();
                onAnswer(i);
              }}
            >
              <span className={`${styles.time} mono`}>{w.times[i]}</span>
              <span aria-hidden="true">🔍</span>
              <span className={styles.query}>{o}</span>
              <span className={styles.flag} aria-hidden="true">
                {selected === i ? '⚑ İşaretlendi' : '⚑'}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <button
        className={`${styles.noneBtn} ${selected === none ? styles.noneOn : ''}`}
        aria-pressed={selected === none}
        onClick={() => {
          click();
          onAnswer(none);
        }}
      >
        {q.options[none]}
      </button>
    </div>
  );
}
