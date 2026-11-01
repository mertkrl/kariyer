import { useEffect, useRef, useState } from 'react';
import { sliderOption, stampOption, type ExamQuestion, type ExamWidget } from '../data/questions';
import { audioEngine } from '../../../audio/audioEngine';
import styles from './FloorWidgets.module.css';

/*
 * Ofis katından üç sahne: yönetici masasında süreyle evrak damgalamak, açık ofisin termostatını
 * ayarlamak ve 18:00'de çıkış turnikesinden geçmeye çalışmak. Hepsi sonunda bir şık sırası verir.
 */

interface Props<T> {
  q: ExamQuestion;
  w: T;
  onAnswer: (option: number) => void;
  selected: number | null;
}

const click = () => audioEngine.playUi('click');

/* ── evrak damgalama ── */

export function StampWidget({ q, w, onAnswer, selected }: Props<Extract<ExamWidget, { type: 'stamp' }>>) {
  const [stage, setStage] = useState<'ready' | 'run' | 'done'>('ready');
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(w.seconds);
  const [mark, setMark] = useState<'ok' | 'no' | null>(null);
  const [decisions, setDecisions] = useState<(boolean | null)[]>(() => w.docs.map(() => null));
  // bitiş anı başlarken bir kez belirlenir; karar verildikçe ref'e de yazılır, sayaç oradan okur
  const deadline = useRef(0);
  const approved = useRef<Set<number>>(new Set());
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    setStage('done');
    onAnswer(stampOption(w.docs, approved.current));
  };
  const start = () => {
    click();
    approved.current = new Set();
    done.current = false;
    deadline.current = Date.now() + w.seconds * 1000;
    setDecisions(w.docs.map(() => null));
    setIdx(0);
    setLeft(w.seconds);
    setStage('run');
  };
  useEffect(() => {
    if (stage !== 'run') return;
    const id = window.setInterval(() => {
      const rest = Math.ceil((deadline.current - Date.now()) / 1000);
      if (rest <= 0) finish();
      else setLeft(rest);
    }, 200);
    return () => window.clearInterval(id);
  });

  const stamp = (ok: boolean) => {
    if (mark || stage !== 'run') return;
    click();
    if (ok) approved.current = new Set(approved.current).add(idx);
    setDecisions((d) => d.map((x, i) => (i === idx ? ok : x)));
    setMark(ok ? 'ok' : 'no');
    window.setTimeout(() => {
      setMark(null);
      if (idx + 1 >= w.docs.length) finish();
      else setIdx(idx + 1);
    }, 420);
  };
  const doc = w.docs[Math.min(idx, w.docs.length - 1)];

  return (
    <div className={styles.desk}>
      <div className={styles.deskTop}>
        <span>🗂️ Yönetici masası · Gelen evrak: {w.docs.length}</span>
        {stage === 'run' && <span className={`${styles.timer} ${left <= 5 ? styles.timerHurry : ''} mono`}>⏱ {left} sn</span>}
      </div>

      {stage === 'ready' && (
        <div className={styles.readyBox}>
          <p>
            {w.seconds} saniyede {w.docs.length} evrak. Her birine ONAY ya da RET damgası vurun.
          </p>
          {selected !== null && <p className={styles.prev}>Önceki sonucunuz: {q.options[selected]}</p>}
          <button className={styles.go} onClick={start}>
            {selected === null ? 'Mesaiyi başlat' : 'Yeniden damgala'}
          </button>
        </div>
      )}

      {stage === 'run' && (
        <div className={styles.work}>
          <article key={idx} className={styles.paper} aria-live="polite">
            <small>
              Evrak {idx + 1}/{w.docs.length}
            </small>
            <b>
              <span aria-hidden="true">{doc.icon}</span> {doc.title}
            </b>
            <p>{doc.detail}</p>
            {mark && <span className={`${styles.mark} ${mark === 'ok' ? styles.markOk : styles.markNo}`}>{mark === 'ok' ? 'ONAY' : 'RET'}</span>}
          </article>
          <div className={styles.stamps}>
            <button className={`${styles.stampBtn} ${styles.ok}`} onClick={() => stamp(true)}>
              ✓ ONAY
            </button>
            <button className={`${styles.stampBtn} ${styles.no}`} onClick={() => stamp(false)}>
              ✕ RET
            </button>
          </div>
        </div>
      )}

      {stage === 'done' && (
        <div className={styles.summary}>
          <ul>
            {w.docs.map((d, i) => (
              <li key={d.title} className={decisions[i] === true ? styles.sOk : decisions[i] === false ? styles.sNo : styles.sWait}>
                <span aria-hidden="true">{d.icon}</span> {d.title}
                <b>{decisions[i] === true ? 'ONAY' : decisions[i] === false ? 'RET' : 'BEKLEMEDE'}</b>
              </li>
            ))}
          </ul>
          <div className={styles.summaryBar}>
            <span role="status">{selected !== null ? q.options[selected] : ''}</span>
            <button className={styles.ghost} onClick={start}>
              Yeniden damgala
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── termostat ── */

const ROOM_TALK: [number, string][] = [
  [16, '🥶 Muhasebe: "Elim klavyeye yapıştı."'],
  [18, '🧥 Satış ekibi montla oturuyor. Biri eldiven dağıtıyor.'],
  [19, '👔 Genel Müdür: "Mükemmel. Tam benim sıcaklığım."'],
  [21, '🙂 Kimse şikâyet etmiyor. Bu biraz şüpheli.'],
  [23, '🌞 Pencere kenarı: "Bayılıyorum!" Koridor tarafı: "Bayılacağız."'],
  [25, '🖥️ BT: "Sunucu odası 41 derece, haberiniz olsun."'],
  [27, '🌵 Biri masasına kaktüs koydu. Kaktüs memnun.'],
  [29, '🧖 Toplantı odası resmen sauna oldu. Toplantılar kısaldı.'],
];

const talkAt = (t: number) => [...ROOM_TALK].reverse().find(([from]) => t >= from)?.[1] ?? ROOM_TALK[0][1];

export function ThermostatWidget({ q, w, onAnswer, selected }: Props<Extract<ExamWidget, { type: 'thermostat' }>>) {
  const [temp, setTemp] = useState(w.start);
  const set = (t: number) => {
    click();
    setTemp(Math.max(w.min, Math.min(w.max, t)));
  };
  const ratio = (temp - w.min) / (w.max - w.min);
  return (
    <div className={styles.thermo}>
      <div className={styles.dialWrap}>
        <div className={styles.dial} style={{ ['--r' as string]: ratio }}>
          <div className={styles.dialFace}>
            <b className="mono">{temp}°</b>
            <small>{temp <= 19 ? '❄ Soğutuyor' : temp >= 25 ? '🔥 Isıtıyor' : '● Sabit'}</small>
          </div>
        </div>
        <div className={styles.dialBtns}>
          <button aria-label="Bir derece azalt" onClick={() => set(temp - 1)}>
            −
          </button>
          <button aria-label="Bir derece artır" onClick={() => set(temp + 1)}>
            +
          </button>
        </div>
      </div>
      <div className={styles.thermoSide}>
        <input type="range" min={w.min} max={w.max} value={temp} onChange={(e) => setTemp(Number(e.target.value))} aria-label="Sıcaklık" aria-valuetext={`${temp} derece`} />
        <p key={talkAt(temp)} className={styles.talk} aria-live="polite">
          {talkAt(temp)}
        </p>
        <div className={styles.thermoBar}>
          <span>{selected !== null ? `✓ Kaydedildi: ${q.options[selected]}` : "Kutunun anahtarı İK'dadır."}</span>
          <button
            className={styles.go}
            onClick={() => {
              click();
              onAnswer(sliderOption(temp, w.thresholds));
            }}
          >
            Ayarla
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── çıkış turnikesi ── */

const TONE: Record<string, string> = { ok: styles.toneOk, bad: styles.toneBad, calm: styles.toneCalm };

const GATE_ACTIONS = ['🪑 Masama dönerim', '⏳ Onayı beklerim', '✍️ "Mesaim bitti" yazarım', '🦆 Altından geçerim'];
const GATE_RESULT = [
  { screen: 'İYİ ÇALIŞMALAR', note: "Masanıza döndünüz. Işıklar 22:00'de otomatik kapanır.", tone: 'calm' },
  { screen: 'ONAY: 21:34', note: 'Yöneticiniz toplantıdaydı. Onay 3 saat 34 dakika sonra geldi.', tone: 'calm' },
  { screen: 'GEÇİŞ SERBEST', note: 'Turnike açıldı. Gerekçeniz yöneticinize iletildi. İyi akşamlar!', tone: 'ok' },
  { screen: '🚨 ALARM', note: 'Güvenlik bildirimi oluşturuldu. Görüntünüz "esneklik" eğitimine eklendi.', tone: 'bad' },
];

/**
 * Personel kartı: okuyucuya sürüklenir; okuyucunun üstünde bırakılınca okunur. Klavyeyle ve dokunmatik
 * ekranda Enter ya da çift dokunuş da okutur. Okuyucunun dışında bırakılan kart cebine geri döner.
 */
function BadgeCard({ reader, onScan }: { reader: React.RefObject<HTMLDivElement | null>; onScan: () => void }) {
  const [drag, setDrag] = useState<{ x: number; y: number; over: boolean } | null>(null);
  const start = useRef({ x: 0, y: 0 });
  const overReader = (x: number, y: number) => {
    const r = reader.current?.getBoundingClientRect();
    return !!r && x >= r.left - 12 && x <= r.right + 12 && y >= r.top - 12 && y <= r.bottom + 12;
  };
  return (
    <button
      type="button"
      className={`${styles.badge} ${drag ? styles.badgeDrag : ''}`}
      style={drag ? { transform: `translate(${drag.x}px, ${drag.y}px) rotate(-6deg)` } : undefined}
      aria-label="Personel kartı: kart okuyucuya sürükleyin ya da Enter'a basın"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { x: e.clientX, y: e.clientY };
        setDrag({ x: 0, y: 0, over: false });
      }}
      onPointerMove={(e) => drag && setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y, over: overReader(e.clientX, e.clientY) })}
      onPointerUp={(e) => {
        const hit = overReader(e.clientX, e.clientY);
        setDrag(null);
        if (hit) onScan();
      }}
      onPointerCancel={() => setDrag(null)}
      onLostPointerCapture={() => setDrag(null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onScan();
        }
      }}
    >
      <span className={styles.badgeChip} aria-hidden="true" />
      <span className={styles.badgePhoto} aria-hidden="true">🙂</span>
      <span className={styles.badgeText}>
        <b>PERSONEL KARTI</b>
        <small>Aday · Sicil 004711</small>
        <small>Mesai: 09.00 – 18.00</small>
      </span>
    </button>
  );
}

export function TurnstileWidget({ w, onAnswer, selected }: Props<Extract<ExamWidget, { type: 'turnstile' }>>) {
  const [scanned, setScanned] = useState(selected !== null);
  const reader = useRef<HTMLDivElement>(null);
  const r = selected !== null ? GATE_RESULT[selected] : null;
  return (
    <div className={styles.gate}>
      <div className={styles.lobby}>
        <span className={`${styles.wallClock} mono`} aria-hidden="true">
          {w.clock}
        </span>
        <div className={styles.turnstile} aria-hidden="true">
          <span className={styles.arm} data-open={r?.tone === 'ok' || undefined} />
          <span className={styles.post} />
        </div>
        <div ref={reader} className={`${styles.reader} ${r ? TONE[r.tone] : scanned ? styles.toneBad : ''}`} role="status">
          <small>KART OKUYUCU</small>
          <b className="mono">{r ? r.screen : scanned ? 'ERKEN ÇIKIŞ TESPİT EDİLDİ' : 'KARTINIZI OKUTUN'}</b>
          {scanned && !r && <span>Yönetici onayı bekleniyor…</span>}
        </div>
      </div>
      {!scanned ? (
        <div className={styles.pocket}>
          <BadgeCard
            reader={reader}
            onScan={() => {
              audioEngine.playUi('click');
              setScanned(true);
            }}
          />
          <p>Kartınızı tutup okuyucunun üstüne sürükleyin.</p>
        </div>
      ) : (
        <div className={styles.gateActions}>
          {GATE_ACTIONS.map((a, i) => (
            <button
              key={a}
              className={`${styles.gateBtn} ${selected === i ? styles.gateOn : ''}`}
              onClick={() => {
                click();
                onAnswer(i);
              }}
            >
              {a}
            </button>
          ))}
        </div>
      )}
      {r && <p className={styles.gateNote}>{r.note}</p>}
    </div>
  );
}
