import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { budgetOption, contractOption, passwordOption, passwordRuleOk, shutdownOption, swipeOption, type ExamQuestion, type ExamWidget } from '../data/questions';
import * as sfx from '../sfx';
import styles from './DeskWidgets.module.css';

/*
 * Dördüncü dalganın sahneleri: sözleşme imzalamak, yan hakları kaydırmak, kurallı şifre
 * oluşturmak, 18:00'de bilgisayarı kapatmaya çalışmak, asansörde Genel Müdürle yalnız kalmak ve
 * bütçe dağıtmak. Hepsi parmakla oynanır; sonunda bir şık sırası verir (data/questions.ts'teki
 * saf işlevlerle).
 */

interface Props<T> {
  q: ExamQuestion;
  w: T;
  onAnswer: (option: number) => void;
  selected: number | null;
}

/** Bileşenin kendi içinde, bir kez karışan sıra (şıkların değil, kartların ya da düğmelerin). */
function useShuffled(n: number) {
  const [order] = useState(() => {
    const xs = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [xs[i], xs[j]] = [xs[j], xs[i]];
    }
    return xs;
  });
  return order;
}

/* ── sözleşme ── */

export function ContractWidget({ w, onAnswer }: Props<Extract<ExamWidget, { type: 'contract' }>>) {
  const box = useRef<HTMLDivElement>(null);
  const [read, setRead] = useState(false);
  const [done, setDone] = useState<'signed' | 'refused' | null>(null);
  const check = () => {
    const el = box.current;
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setRead(true);
  };
  // kaydırmaya gerek kalmadan sığıyorsa zaten okunmuştur
  useEffect(check, []);
  const finish = (signed: boolean) => {
    sfx.stamp(signed);
    setDone(signed ? 'signed' : 'refused');
    onAnswer(contractOption(read, signed));
  };
  return (
    <div className={styles.contract}>
      <div className={styles.paperHead}>
        <b>{w.title}</b>
        <small>{read ? 'Son sayfaya ulaşıldı' : `${w.clauses.length} madde · aşağı kaydırın`}</small>
      </div>
      <div ref={box} className={styles.clauses} onScroll={check} tabIndex={0} aria-label="Sözleşme maddeleri">
        <ol>
          {w.clauses.map((c, i) => (
            <li key={i}>
              <span>{c}</span>
            </li>
          ))}
        </ol>
        <p className={styles.signLine}>İmza: ______________________</p>
      </div>
      {done ? (
        <p className={`${styles.result} ${done === 'signed' ? styles.ok : styles.no}`}>
          {done === 'signed' ? 'İmzalandı. Aileye hoş geldiniz.' : 'İmzalanmadı. Dosyanız "uyum riski" olarak işaretlendi.'}
        </p>
      ) : (
        <div className={styles.actions}>
          <button type="button" className={styles.ghost} onClick={() => finish(false)}>
            İmzalamıyorum
          </button>
          <button type="button" className={styles.primary} onClick={() => finish(true)}>
            ✍️ İmzala
          </button>
        </div>
      )}
    </div>
  );
}

/* ── kart kaydırma ── */

const FLING = 90;

export function SwipeWidget({ w, onAnswer }: Props<Extract<ExamWidget, { type: 'swipe' }>>) {
  const order = useShuffled(w.cards.length);
  const [n, setN] = useState(0);
  const [wanted, setWanted] = useState<Set<number>>(new Set());
  const [dx, setDx] = useState(0);
  const [fly, setFly] = useState<'left' | 'right' | null>(null);
  const [dragging, setDragging] = useState(false);
  const start = useRef<number | null>(null);
  const done = n >= w.cards.length;

  const decide = (right: boolean) => {
    if (fly || done) return;
    sfx.swipe(right);
    const card = order[n];
    const next = new Set(wanted);
    if (right) next.add(card);
    setWanted(next);
    setFly(right ? 'right' : 'left');
    window.setTimeout(() => {
      setFly(null);
      setDx(0);
      setN(n + 1);
      if (n + 1 >= w.cards.length) onAnswer(swipeOption(w.cards, next));
    }, 220);
  };
  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = e.clientX;
    setDragging(true);
  };
  const move = (e: ReactPointerEvent) => {
    if (start.current !== null) setDx(e.clientX - start.current);
  };
  const up = () => {
    if (start.current === null) return;
    start.current = null;
    setDragging(false);
    if (Math.abs(dx) > FLING) decide(dx > 0);
    else setDx(0);
  };
  const again = () => {
    sfx.click();
    setWanted(new Set());
    setN(0);
  };

  if (done)
    return (
      <div className={styles.swipe}>
        <p className={styles.deckTitle}>{w.deck} · seçimleriniz</p>
        <ul className={styles.picked}>
          {order.map((i) => (
            <li key={i} className={wanted.has(i) ? styles.ok : styles.no}>
              <span aria-hidden="true">{w.cards[i].icon}</span> {w.cards[i].title} <b>{wanted.has(i) ? '✓' : '✕'}</b>
            </li>
          ))}
        </ul>
        <button type="button" className={styles.ghost} onClick={again}>
          Baştan kaydır
        </button>
      </div>
    );

  const card = w.cards[order[n]];
  const hint = fly ? fly : dx > 30 ? 'right' : dx < -30 ? 'left' : null;
  return (
    <div className={styles.swipe}>
      <p className={styles.deckTitle}>
        {w.deck} · {n + 1}/{w.cards.length}
      </p>
      <div className={styles.deck}>
        {n + 1 < w.cards.length && <div className={`${styles.card} ${styles.cardBehind}`} aria-hidden="true" />}
        <div
          key={n}
          className={`${styles.card} ${fly === 'left' ? styles.flyLeft : fly === 'right' ? styles.flyRight : ''} ${dragging ? styles.dragging : ''}`}
          style={fly ? undefined : { transform: `translateX(${dx}px) rotate(${dx / 18}deg)` }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          aria-live="polite"
        >
          {hint && <span className={`${styles.stampMark} ${hint === 'right' ? styles.markYes : styles.markNo}`}>{hint === 'right' ? 'İSTİYORUM' : 'GEÇ'}</span>}
          <span className={styles.cardIcon} aria-hidden="true">
            {card.icon}
          </span>
          <b>{card.title}</b>
          {card.detail && <small>{card.detail}</small>}
        </div>
      </div>
      <div className={styles.swipeButtons}>
        <button type="button" className={styles.no} onClick={() => decide(false)} aria-label={`${card.title}: istemiyorum`}>
          ✕
        </button>
        <span>sürükleyin ya da dokunun</span>
        <button type="button" className={styles.yes} onClick={() => decide(true)} aria-label={`${card.title}: istiyorum`}>
          ✓
        </button>
      </div>
    </div>
  );
}

/* ── şifre ── */

export function PasswordWidget({ w, onAnswer }: Props<Extract<ExamWidget, { type: 'password' }>>) {
  const [pw, setPw] = useState('');
  // kurallar birer birer açılır ve açılan kural bir daha kapanmaz
  const [shown, setShown] = useState(1);
  const [exit, setExit] = useState<'submit' | 'ticket' | 'postit' | null>(null);
  const reachOf = (text: string) => {
    const fail = w.rules.findIndex((r) => !passwordRuleOk(r, text));
    return fail === -1 ? w.rules.length : fail + 1;
  };
  const type = (text: string) => {
    sfx.key();
    setPw(text);
    if (reachOf(text) > shown) {
      setShown(reachOf(text));
      sfx.warn();
    }
  };
  const all = w.rules.every((r) => passwordRuleOk(r, pw));
  const leave = (how: 'submit' | 'ticket' | 'postit') => {
    if (how === 'submit' && all) sfx.confirm();
    else sfx.click();
    setExit(how);
    onAnswer(passwordOption(how, w.rules, pw));
  };
  const visible = w.rules.slice(0, shown).map((r, i) => ({ r, i, ok: passwordRuleOk(r, pw) }));

  return (
    <div className={styles.password}>
      <label className={styles.pwField}>
        <span>Yeni şifre</span>
        <input
          type="text"
          value={pw}
          disabled={exit !== null}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={80}
          onChange={(e) => type(e.target.value)}
          placeholder="Şifrenizi yazın"
        />
        <small className="mono">{[...pw].length} karakter</small>
      </label>
      <ol className={styles.rules} aria-live="polite">
        {visible
          .slice()
          .reverse()
          .map(({ r, i, ok }) => (
            <li key={i} className={ok ? styles.ok : styles.no}>
              <b>{ok ? '✓' : '✕'}</b> Kural {i + 1}: {r.text}
            </li>
          ))}
      </ol>
      {exit ? (
        <p className={`${styles.result} ${exit === 'submit' && all ? styles.ok : styles.no}`}>
          {exit === 'ticket'
            ? 'Kayıt açıldı: #48213. Tahmini çözüm süresi: 6–8 hafta.'
            : exit === 'postit'
              ? 'Şifre ekranın kenarına yapıştırıldı. BT bunu "fiziksel iki aşamalı doğrulama" olarak kabul etti.'
              : all
                ? 'Şifreniz kaydedildi. 90 gün sonra yeniden değiştirmeniz gerekecek. Son 24 şifrenizi kullanamazsınız.'
                : 'Şifre politikaya uymuyor ama kaydedildi. Uyumsuzluk dosyanıza işlendi.'}
        </p>
      ) : (
        <div className={styles.actions}>
          {shown >= 3 && (
            <>
              <button type="button" className={styles.linkBtn} onClick={() => leave('postit')}>
                📝 Post-it'e yaz
              </button>
              <button type="button" className={styles.linkBtn} onClick={() => leave('ticket')}>
                🎫 BT'ye kayıt aç
              </button>
            </>
          )}
          <button type="button" className={styles.primary} onClick={() => leave('submit')} disabled={!pw}>
            Şifreyi kaydet
          </button>
        </div>
      )}
    </div>
  );
}

/* ── bilgisayarı kapatmak ── */

export function ShutdownWidget({ w, onAnswer }: Props<Extract<ExamWidget, { type: 'shutdown' }>>) {
  // null: masaüstü; sayı: o sıradaki uyarı açık; 'off' | 'back' | 'left': bitti
  const [at, setAt] = useState<number | 'off' | 'back' | 'left' | null>(null);
  const answer = (passed: number, leftOn = false) => onAnswer(shutdownOption(passed, w.dialogs.length, leftOn));
  const open = (k: number) => {
    sfx.dialog();
    setAt(k);
  };
  const go = () => {
    if (typeof at !== 'number') return;
    if (at + 1 >= w.dialogs.length) {
      sfx.confirm();
      setAt('off');
      answer(w.dialogs.length);
    } else open(at + 1);
  };
  const back = () => {
    if (typeof at !== 'number') return;
    sfx.click();
    setAt('back');
    answer(at);
  };
  const d = typeof at === 'number' ? w.dialogs[at] : null;

  return (
    <div className={styles.shutdown}>
      <div className={`${styles.monitor} ${at === 'off' ? styles.monitorOff : ''}`}>
        <div className={styles.taskbar}>
          <span>⊞ Kurumsal Masaüstü</span>
          <b className="mono">{w.clock}</b>
        </div>
        {at === null && (
          <div className={styles.desktop}>
            <button type="button" className={styles.power} onClick={() => open(0)}>
              ⏻ Bilgisayarı kapat
            </button>
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => {
                sfx.click();
                setAt('left');
                answer(0, true);
              }}
            >
              Ekranı açık bırakıp sessizce çık
            </button>
          </div>
        )}
        {d && typeof at === 'number' && (
          <div key={at} className={styles.dialog} role="alertdialog" aria-labelledby="sd-title">
            <b id="sd-title">⚠️ {d.title}</b>
            <p>{d.body}</p>
            <small className="mono">
              Uyarı {at + 1}/{w.dialogs.length}
            </small>
            <div className={styles.actions}>
              <button type="button" className={styles.ghost} onClick={back}>
                Vazgeç
              </button>
              <button type="button" className={styles.primary} onClick={go}>
                Yine de kapat
              </button>
            </div>
          </div>
        )}
        {at === 'off' && <p className={styles.offText}>Bilgisayar kapandı. İyi akşamlar.</p>}
        {at === 'back' && <p className={styles.desktopNote}>Masanıza döndünüz. Saat 18:00 ve hâlâ 18:00.</p>}
        {at === 'left' && <p className={styles.desktopNote}>Ekran açık, siz yoksunuz. Yöneticiniz sizi hâlâ "müsait" görüyor.</p>}
      </div>
    </div>
  );
}

/* ── asansör ── */

export function ElevatorWidget({ q, w, onAnswer }: Props<Extract<ExamWidget, { type: 'elevator' }>>) {
  const order = useShuffled(q.options.length);
  const [stage, setStage] = useState<'ready' | 'ride' | 'done'>('ready');
  const [floor, setFloor] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const finished = useRef(false);
  const boarded = floor >= 2;

  const end = (option: number) => {
    if (finished.current) return;
    finished.current = true;
    setPicked(option);
    setStage('done');
    sfx.arrive();
    onAnswer(option);
  };
  useEffect(() => {
    if (stage !== 'ride') return;
    const id = window.setInterval(
      () =>
        setFloor((f) => {
          sfx.floor();
          return f + 1;
        }),
      (w.seconds * 1000) / w.floors,
    );
    return () => window.clearInterval(id);
  }, [stage, w.seconds, w.floors]);
  // kapı açılana kadar bir şey seçilmediyse sessizlik cevaptır
  useEffect(() => {
    if (stage === 'ride' && floor >= w.floors) end(w.silent);
  });

  return (
    <div className={styles.elevator}>
      <div className={styles.cabin}>
        <div className={styles.panel}>
          <span className="mono">{String(Math.min(floor, w.floors)).padStart(2, '0')}</span>
          <small>{stage === 'done' ? '▣ kapı açık' : stage === 'ride' ? '▲' : '▣'}</small>
        </div>
        <div className={styles.people} aria-hidden="true">
          <span>🧍</span>
          {boarded && <span className={styles.boss}>🕴️</span>}
        </div>
        <p className={styles.caption} aria-live="polite">
          {stage === 'ready' ? `Hedef: ${w.floors}. kat` : stage === 'done' ? (picked === w.silent ? 'Kapı açıldı. Kimse konuşmadı.' : 'Kapı açıldı.') : boarded ? `${w.who} bindi. Kapı kapandı.` : 'Asansör hareket ediyor…'}
        </p>
      </div>
      {stage === 'ready' ? (
        <button
          type="button"
          className={styles.primary}
          onClick={() => {
            sfx.click();
            finished.current = false;
            setFloor(0);
            setPicked(null);
            setStage('ride');
          }}
        >
          🔼 Asansörü çağır
        </button>
      ) : (
        <div className={styles.moves}>
          {order.map((i) => (
            <button key={i} type="button" className={`${styles.move} ${picked === i ? styles.moveOn : ''}`} disabled={!boarded || stage === 'done'} onClick={() => end(i)}>
              {q.options[i]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── bütçe ── */

const STEP = 10;

export function BudgetWidget({ w, onAnswer }: Props<Extract<ExamWidget, { type: 'budget' }>>) {
  const [alloc, setAlloc] = useState<number[]>(() => w.lines.map(() => 0));
  const [sent, setSent] = useState(false);
  const left = w.total - alloc.reduce((a, b) => a + b, 0);
  const change = (i: number, d: number) => {
    sfx.select(i);
    setAlloc((a) => a.map((v, k) => (k === i ? Math.max(0, Math.min(v + d, v + left)) : v)));
  };
  return (
    <div className={styles.budget}>
      <p className={`${styles.left} mono`}>
        Dağıtılmamış: <b>{left}</b> / {w.total}
      </p>
      <ul>
        {w.lines.map((line, i) => (
          <li key={line}>
            <span className={styles.lineName}>{line}</span>
            <span className={styles.bar} aria-hidden="true">
              <i style={{ width: `${(alloc[i] / w.total) * 100}%` }} />
            </span>
            <span className={styles.stepper}>
              <button type="button" onClick={() => change(i, -STEP)} disabled={sent || alloc[i] === 0} aria-label={`${line}: azalt`}>
                −
              </button>
              <b className="mono">{alloc[i]}</b>
              <button type="button" onClick={() => change(i, STEP)} disabled={sent || left === 0} aria-label={`${line}: artır`}>
                +
              </button>
            </span>
          </li>
        ))}
      </ul>
      {sent ? (
        <p className={`${styles.result} ${styles.ok}`}>Bütçe onaya gönderildi. Yönetim kurulu "bilgi edindi".</p>
      ) : (
        <button
          type="button"
          className={styles.primary}
          disabled={left !== 0}
          onClick={() => {
            sfx.confirm();
            setSent(true);
            onAnswer(budgetOption(alloc));
          }}
        >
          {left === 0 ? 'Bütçeyi onaya gönder' : `Önce ${left} birim daha dağıtın`}
        </button>
      )}
    </div>
  );
}
