import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { COLS, ROWS, colName, compute, refOf, show, type Cells, type Value } from './sheet';
import { isSalary, jokeOf, salaryAt } from './jokes';
import {
  COMMENTS,
  CORPORATE,
  COWORKERS,
  CV,
  EDIT_NOTES,
  EMAILS,
  LEAVER,
  RAW_DATA,
  STORY_COMMENTS,
  STORY_NOTES,
  SUMMARY,
  TOO_LONG_AT,
  bumpOpenCount,
  fileName,
  openCount,
  storyStage,
  type Comment,
} from './officeLore';
import { COLORS, FILLS, MENU, RIBBONS, type Act } from './ribbon';
import { SECRETS, loadSecrets, saveSecrets } from './secrets';
import { around, newMines, reveal, toggleFlag, type Mines } from './mines';
import { drawSheet, type ShotCell } from './share';
import s from './BossSheet.module.css';

/*
 * Patron geliyor: defter bir anda sıkıcı bir hesap tablosuna döner. Tablo gerçekten çalışır:
 * hücreye tıklayınca seçilir, yazınca değişir (çift tık ya da Enter düzenler), formül çubuğundan
 * da yazılır; ok tuşları, Enter ve Tab gezdirir, Delete siler. Oran, Sapma, Durum ve Toplam satırı
 * formüldür: rakam değişince yeniden hesaplanır (motor: sheet.ts). Esc ya da başlıktaki düğme
 * deftere döner; düzenlerken ya da gizli oyundayken Esc yalnızca o işi bırakır.
 *
 * Tablonun içi şakayla doludur: yazılan sözcüklere tepki (jokes.ts), her düğmesi bir şey yapan
 * şerit (ribbon.ts), ofis hikâyesi, gezinen mesai arkadaşları ve e-postalar (officeLore.ts),
 * =OYNA() ile açılan mayın tarlası (mines.ts) ve resim olarak paylaşma (share.ts). Bulunan
 * şakalar "Sırlar" sayacında birikir (secrets.ts). Sekmenin başlığı tablonun adına döner.
 */

const HEAD = ['Bölge', 'Hedef', 'Gerçekleşen', 'Oran (%)', 'Sapma', 'Sorumlu', 'Durum', 'Not'];
const REGIONS = ['Marmara', 'Ege', 'İç Anadolu', 'Akdeniz', 'Karadeniz', 'Doğu', 'Güneydoğu', 'Trakya', 'Kurumsal', 'E-ticaret', 'Bayi', 'İhracat', 'Kamu', 'Diğer'];
const OWNERS = [LEAVER, 'S. Kaya', 'M. Demir', 'E. Çelik', 'B. Şahin'];
const SHEETS = ['Özet', 'Bölgeler', 'Ham_veri', 'CV_güncel'];
const MAIN = 1;
const CV_TAB = 3;
/** Ana sayfa dışındaki sayfalar: düz, salt okunur tablolar. */
const STATIC: Record<number, string[][]> = { 0: SUMMARY, 2: RAW_DATA, 3: CV };
const TAB_SECRET: Record<number, string> = { 0: 'ozet', 2: 'ham', 3: 'cv' };
/** Fazla uzun saklanma: tablo açık kaldıkça gelen bildirimler (sn, metin). */
const NAGS: [number, string][] = [
  [120, 'Görünüşe göre çalışıyorsunuz. Size 4 yeni görev atandı.'],
  [300, 'Verimliliğiniz fark edildi. Ödülünüz: daha fazla iş.'],
];
/** İlk e-posta kaç saniye sonra gelir, sonrakiler kaç saniyede bir. */
const MAIL_FIRST = 18;
const MAIL_EVERY = 55;
/** Mesai arkadaşlarının imleci kaç saniyede bir kıpırdar; kaç kıpırdamada bir rakam değiştirir. */
const PEER_EVERY = 6;
const PEER_EDITS_EVERY = 5;
const GAME = /^=\s*OYNA\s*\(\s*\)\s*$/i;

type Fmt = { b?: boolean; i?: boolean; u?: boolean; fill?: string; color?: string; align?: 'left' | 'center' | 'right' };
type Toast = { text: string; id: number; title?: string; mail?: boolean };
type Peer = { who: string; color: string; ref: string };

/** Uydurma rapor: her bölgenin hedefi ve gerçekleşeni sayı; gerisi formül. */
function initial(): Cells {
  const c: Cells = {};
  HEAD.forEach((h, i) => (c[refOf(i, 0)] = h));
  const last = REGIONS.length + 1;
  REGIONS.forEach((name, k) => {
    const n = k + 2;
    const target = 1200 + ((k * 397) % 900);
    c[`A${n}`] = name;
    c[`B${n}`] = String(target);
    c[`C${n}`] = String(Math.round(target * (0.82 + ((k * 53) % 30) / 100)));
    c[`D${n}`] = `=YUVARLA(C${n}/B${n}*100;1)`;
    c[`E${n}`] = `=C${n}-B${n}`;
    c[`F${n}`] = OWNERS[k % OWNERS.length];
    c[`G${n}`] = `=EĞER(D${n}>=100;"Tamam";"Takipte")`;
    c[`H${n}`] = `=EĞER(D${n}>=100;"";"Q4 telafi")`;
  });
  const t = last + 1;
  c[`A${t}`] = 'Toplam';
  c[`B${t}`] = `=TOPLA(B2:B${last})`;
  c[`C${t}`] = `=TOPLA(C2:C${last})`;
  c[`D${t}`] = `=YUVARLA(C${t}/B${t}*100;1)`;
  c[`E${t}`] = `=C${t}-B${t}`;
  c[`G${t}`] = `=EĞER(D${t}>=100;"Tamam";"Takipte")`;
  return c;
}

/** Sayfa açık kaldıkça tablodaki değişiklikler durur: patron gidip gelince kaybolmaz. */
let kept: { cells: Cells; fmt: Record<string, Fmt>; extra: Record<string, Comment[]> } | null = null;

const clampCell = ([c, r]: [number, number]): [number, number] => [Math.max(0, Math.min(COLS - 1, c)), Math.max(0, Math.min(ROWS - 1, r))];
const cycle = (list: string[], cur: string | undefined) => list[(list.indexOf(cur ?? '') + 1) % list.length] || undefined;
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

export function BossSheet({ onClose }: { onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [cells, setCells] = useState<Cells>(() => kept?.cells ?? initial());
  const [fmt, setFmt] = useState<Record<string, Fmt>>(() => kept?.fmt ?? {});
  /** Mesai arkadaşlarının sonradan bıraktığı yorumlar. */
  const [extra, setExtra] = useState<Record<string, Comment[]>>(() => kept?.extra ?? {});
  const [sel, setSel] = useState<[number, number]>([3, 3]);
  /**
   * Düzenlenen hücrenin taslağı (null: düzenlenmiyor). Ref'te de tutulur: art arda hızlı basılan
   * tuşlar yeniden çizimi beklemeden aynı taslağa eklenir.
   */
  const [draft, setDraftState] = useState<string | null>(null);
  const live = useRef<string | null>(null);
  const setDraft = (v: string | null) => {
    live.current = v;
    setDraftState(v);
  };
  const [menu, setMenu] = useState(1);
  const [tab, setTab] = useState(MAIN);
  /** Yorumu açık hücre (fareyle üstüne gelinen). */
  const [note, setNote] = useState<string | null>(null);
  const [corporate, setCorporate] = useState(false);
  const [greenwash, setGreenwash] = useState(false);
  const [chart, setChart] = useState(false);
  const [mines, setMines] = useState<Mines | null>(null);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [shot, setShot] = useState<{ url: string; blob: Blob } | null>(null);
  const [secretsOpen, setSecretsOpen] = useState(false);

  // her açılışta dosya adı bir sürüm uzar; sekmenin başlığı da aynı adı alır
  const [opens] = useState(() => openCount() + 1);
  const [tooLong, setTooLong] = useState(opens >= TOO_LONG_AT);
  const name = fileName(opens);
  const stage = storyStage(opens);
  const bumped = useRef(false);
  useEffect(() => {
    if (!bumped.current) bumpOpenCount();
    bumped.current = true;
    const title = document.title;
    document.title = `${name} · Tablolar`;
    return () => {
      document.title = title;
    };
  }, [name]);

  const values = useMemo(() => compute(cells), [cells]);
  const ref = refOf(sel[0], sel[1]);

  /** Köşede kayan bildirim; birkaç saniye sonra kaybolur. */
  const [toast, setToast] = useState<Toast | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.mail ? 6000 : 4500);
    return () => clearTimeout(t);
  }, [toast]);
  const say = (text: string) => setToast({ text, id: Date.now() });

  // sırlar: bulunan her şaka bir kez sayılır, başlıkta kısa bir an "Sır bulundu!" yanar
  const [found, setFound] = useState(loadSecrets);
  const [flash, setFlash] = useState<string | null>(null);
  const discover = (id: string) => {
    setFound((f) => {
      if (f.has(id)) return f;
      const next = new Set(f).add(id);
      saveSecrets(next);
      setFlash(`🔓 Sır bulundu! (${next.size}/${SECRETS.length})`);
      return next;
    });
  };
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3200);
    return () => clearTimeout(t);
  }, [flash]);
  useEffect(() => {
    if (tooLong) discover('uzun');
    if (stage === 3) discover('ayrildi');
    // yalnızca açılışta
  }, []);

  // maaş yazılı bir hücre varsa saat işler: maaş her saniye erir
  const opened = useRef(Date.now());
  const [now, setNow] = useState(Date.now());
  const hasSalary = useMemo(() => Object.values(cells).some(isSalary), [cells]);
  useEffect(() => {
    if (!hasSalary) return;
    opened.current = Date.now();
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [hasSalary]);

  useEffect(() => box.current?.focus(), []);
  useEffect(() => {
    kept = { cells, fmt, extra };
  }, [cells, fmt, extra]);

  // uzun saklanma bildirimleri ve e-postalar
  useEffect(() => {
    const timers = NAGS.map(([sec, text]) =>
      setTimeout(() => {
        setToast({ text, id: Date.now() });
        discover('verimli');
      }, sec * 1000),
    );
    let mail = 0;
    const send = () => {
      const m = EMAILS[mail++ % EMAILS.length];
      setToast({ title: m.from, text: m.subject, id: Date.now(), mail: true });
      if (m.subject === '(konu yok)') discover('eposta');
    };
    timers.push(setTimeout(send, MAIL_FIRST * 1000));
    const every = setInterval(send, MAIL_EVERY * 1000);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(every);
    };
  }, []);

  // mesai arkadaşları: imleçleri tabloda gezinir, arada bir rakam değiştirip yorum bırakırlar
  const moves = useRef(0);
  const selRef = useRef(ref);
  selRef.current = ref;
  useEffect(() => {
    const t = setInterval(() => {
      const who = pick(COWORKERS);
      const row = 2 + Math.floor(Math.random() * REGIONS.length);
      const edit = ++moves.current % PEER_EDITS_EVERY === 0;
      const at = `${edit ? pick(['B', 'C']) : pick(['B', 'C', 'F', 'G', 'H'])}${row}`;
      setPeer({ ...who, ref: at });
      if (!edit || at === selRef.current || live.current !== null) return;
      setCells((c) => {
        const n = Number(c[at]);
        if (!Number.isFinite(n)) return c;
        return { ...c, [at]: String(n + pick([-1, 1]) * (5 + Math.floor(Math.random() * 60))) };
      });
      setExtra((x) => ({ ...x, [at]: [...(x[at] ?? []), { who: who.who, text: pick(EDIT_NOTES) }] }));
      setToast({ text: `${who.who} ${at} hücresini değiştirdi.`, id: Date.now() });
      discover('meslektas');
    }, PEER_EVERY * 1000);
    return () => clearInterval(t);
  }, []);

  // CV_güncel bir an görünür, sonra tablo panikle Bölgeler'e döner
  useEffect(() => {
    if (tab !== CV_TAB) return;
    const t = setTimeout(() => {
      setTab(MAIN);
      say('Ahmet Bey arkanızdan geçti. Kıl payı.');
    }, 1600);
    return () => clearTimeout(t);
  }, [tab]);

  const openTab = (i: number) => {
    setTab(i);
    if (TAB_SECRET[i]) discover(TAB_SECRET[i]);
  };

  const commit = (move: [number, number] = [0, 0]) => {
    const text = live.current;
    if (text !== null && text !== (cells[ref] ?? '')) {
      setCells((c) => ({ ...c, [ref]: text }));
      const joke = jokeOf(text);
      if (joke) {
        say(joke.toast);
        discover(joke.id);
      }
      if (GAME.test(text)) startGame();
    }
    setDraft(null);
    setSel((p) => clampCell([p[0] + move[0], p[1] + move[1]]));
    box.current?.focus();
  };

  const undo = () => {
    say('Kararlarınız geri alınamaz. Bkz. kariyeriniz.');
    discover('geri');
  };
  const redo = () => {
    say('Yinelenecek bir şey yok. Tıpkı hafta sonu gibi.');
    discover('yinele');
  };

  const startGame = () => {
    setMines(newMines());
    discover('oyna');
  };
  const hideGame = () => {
    setMines(null);
    say('Oyun gizlendi. Rapor açık. Sakin olun.');
    box.current?.focus();
  };
  const playCell = (i: number, flag: boolean) => {
    if (!mines) return;
    const next = flag ? toggleFlag(mines, i) : reveal(mines, i);
    setMines(next);
    if (next.state === 'won' && mines.state !== 'won') {
      discover('mayin');
      say('Tebrikler! Bu başarı performans değerlendirmenize yansımayacak.');
    }
    if (next.state === 'lost' && mines.state !== 'lost') say('#PATLADI! Olayı "öğrenme fırsatı" olarak raporlayın.');
  };

  const format = (patch: (f: Fmt) => Fmt) => {
    setFmt((all) => ({ ...all, [ref]: patch(all[ref] ?? {}) }));
    discover('bicim');
  };

  const run = (act: Act) => {
    if (act === 'bold') format((f) => ({ ...f, b: !f.b }));
    else if (act === 'italic') format((f) => ({ ...f, i: !f.i }));
    else if (act === 'underline') format((f) => ({ ...f, u: !f.u }));
    else if (act === 'fill') format((f) => ({ ...f, fill: cycle(FILLS, f.fill) }));
    else if (act === 'color') format((f) => ({ ...f, color: cycle(COLORS, f.color) }));
    else if (act === 'left' || act === 'center' || act === 'right') format((f) => ({ ...f, align: act }));
    else if (act === 'greenwash') {
      setGreenwash((g) => !g);
      say(greenwash ? 'Riskler yeniden görünür. Kimseye söylemeyin.' : 'Bütün riskler yeşile boyandı. Sorun çözüldü.');
      discover('kosullu');
    } else if (act === 'chart') {
      setChart(true);
      discover('grafik');
    } else if (act === 'corporate') {
      setCorporate((c) => !c);
      say(corporate ? 'Sade Türkçeye dönüldü. Kimse fark etmedi.' : 'Yazım denetimi tamamlandı: 12 sözcük kurumsallaştırıldı.');
      discover('yazim');
    } else if (act === 'share') void share();
    else if (act === 'close') onClose();
    box.current?.focus();
  };

  /** Hücrede görünen değer: formül sonucu, şakalar, hikâye ve kurumsal dil hepsi burada birleşir. */
  const display = (c: number, r: number) => {
    const id = refOf(c, r);
    const raw = cells[id] ?? '';
    const joke = raw ? jokeOf(raw) : null;
    let v: Value = GAME.test(raw) ? '▶ Oyna' : isSalary(raw) ? salaryAt(Math.floor((now - opened.current) / 1000)) : (joke?.show ?? values[id] ?? '');
    let struck = false;
    if (raw === LEAVER && stage === 3) {
      v = `${LEAVER} (ayrıldı)`;
      struck = true;
    }
    if (c === 7 && stage > 0 && raw.startsWith('=') && cells[refOf(5, r)] === LEAVER) v = STORY_NOTES[stage];
    if (corporate && typeof v === 'string') v = CORPORATE[v] ?? v;
    const err = typeof v === 'string' && v.startsWith('#');
    const bad = (typeof v === 'number' && v < 0) || err || v === 'Takipte' || v === 'Gelişim alanı';
    return { id, raw, joke, v, struck, err, green: greenwash && bad && r > 0 };
  };

  const threadOf = (id: string): Comment[] | undefined => {
    const own = id === 'F2' ? STORY_COMMENTS[stage] : COMMENTS[id];
    const more = extra[id];
    if (!own && !more) return undefined;
    return [...(own ?? []), ...(more ?? [])];
  };

  const share = async () => {
    const rows: ShotCell[][] = Array.from({ length: 17 }, (_, r) =>
      Array.from({ length: 8 }, (_, c) => {
        const d = display(c, r);
        const f = fmt[d.id] ?? {};
        const text = d.green && typeof d.v === 'number' ? show(Math.abs(d.v)) : show(d.v);
        return { text, bold: r === 0 || f.b, num: typeof d.v === 'number', color: d.green ? '#548235' : f.color, fill: f.fill, struck: d.struck };
      }),
    );
    const blob = await drawSheet(name, rows, location.host);
    if (!blob) return say('Paylaşılamadı: görüntü oluşturulamadı.');
    setShot({ url: URL.createObjectURL(blob), blob });
    discover('paylas');
  };
  const closeShot = () => {
    if (shot) URL.revokeObjectURL(shot.url);
    setShot(null);
    box.current?.focus();
  };
  const copyShot = async () => {
    if (!shot) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': shot.blob })]);
      say('Görüntü panoya kopyalandı. Şimdi ofis grubuna yapıştırın.');
    } catch {
      say('Kopyalanamadı; "İndir" ile kaydedebilirsiniz.');
    }
  };
  const file = shot ? new File([shot.blob], 'Q3_rapor.png', { type: 'image/png' }) : null;
  const canShare = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const typing = e.target instanceof HTMLInputElement;
    if (e.key === 'Escape' && (mines || chart || shot || secretsOpen)) {
      // patron modunun içinde patron modu: Esc önce oyunu ya da açık pencereyi gizler
      e.stopPropagation();
      if (mines) hideGame();
      else if (shot) closeShot();
      setChart(false);
      setSecretsOpen(false);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'y') && live.current === null) {
      e.preventDefault();
      if (e.key === 'z' && !e.shiftKey) undo();
      else redo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'i' || e.key === 'u') && live.current === null) {
      e.preventDefault();
      run(e.key === 'b' ? 'bold' : e.key === 'i' ? 'italic' : 'underline');
      return;
    }
    if (tab !== MAIN || mines) return;
    if (live.current !== null) {
      if (e.key === 'Escape') {
        // düzenlemeyi bırakır; tablo açık kalır
        e.stopPropagation();
        setDraft(null);
        box.current?.focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        commit([0, e.shiftKey ? -1 : 1]);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commit([e.shiftKey ? -1 : 1, 0]);
      } else if (!typing && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // kutu henüz odaklanmadan gelen tuş taslağa eklenir
        e.preventDefault();
        setDraft(live.current + e.key);
      }
      return;
    }
    const step: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], Tab: [e.shiftKey ? -1 : 1, 0] };
    if (step[e.key]) {
      e.preventDefault();
      setSel((p) => clampCell([p[0] + step[e.key][0], p[1] + step[e.key][1]]));
    } else if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      if (GAME.test(cells[ref] ?? '')) startGame();
      else setDraft(cells[ref] ?? '');
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      setCells((c) => ({ ...c, [ref]: '' }));
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // yazmaya başlamak hücreyi baştan düzenler
      e.preventDefault();
      setDraft(e.key);
    }
  };

  // seçili sütunun sayıları: durum çubuğunda toplam, ortalama, adet
  const column = Array.from({ length: ROWS - 1 }, (_, r) => values[refOf(sel[0], r + 1)]).filter((v): v is number => typeof v === 'number');
  const sum = column.reduce((a, b) => a + b, 0);
  const flags = mines ? mines.flag.filter(Boolean).length : 0;

  const header = (on?: number) => (
    <thead>
      <tr>
        <th className={s.corner} />
        {Array.from({ length: COLS }, (_, c) => (
          <th key={c} className={c === on ? s.axisOn : undefined}>
            {colName(c)}
          </th>
        ))}
      </tr>
    </thead>
  );

  return (
    <div ref={box} className={s.sheet} role="dialog" aria-label="Hesap tablosu (patron geliyor modu). Esc ile deftere dön." tabIndex={-1} onKeyDown={onKey}>
      <div className={s.titlebar}>
        <span className={s.logo}>X</span>
        <span className={s.quick}>
          💾
          <button type="button" onClick={undo} aria-label="Geri al">
            ↶
          </button>
          <button type="button" onClick={redo} aria-label="Yinele">
            ↷
          </button>
          ▾
        </span>
        <span className={s.title} title={name}>
          {name} · {flash ? <b className={s.flash}>{flash}</b> : <i>Kaydedildi</i>}
        </span>
        <span className={s.search}>🔍 Ara</span>
        <span className={s.user}>AY</span>
        <span className={s.winBtn}>—</span>
        <span className={s.winBtn}>☐</span>
        <button type="button" className={s.close} onClick={onClose} aria-label="Deftere dön">
          ✕
        </button>
      </div>
      <div className={s.ribbon} role="tablist">
        {MENU.map((m, i) => (
          <button key={m} type="button" role="tab" aria-selected={i === menu} className={[i === 0 ? s.file : '', i === menu ? s.ribbonOn : ''].join(' ')} onClick={() => setMenu(i)}>
            {m}
          </button>
        ))}
        <span className={s.share}>💬 Açıklamalar</span>
        <button type="button" className={s.shareBtn} onClick={() => run('share')}>
          ⇪ Paylaş
        </button>
      </div>
      <div className={s.tools}>
        {RIBBONS[menu].map((g) => (
          <div key={g.name} className={s.group}>
            <div className={s.groupItems}>
              {g.tools.map((t) => {
                const f = fmt[ref] ?? {};
                const on =
                  (t.act === 'bold' && f.b) ||
                  (t.act === 'italic' && f.i) ||
                  (t.act === 'underline' && f.u) ||
                  (t.act === f.align && !!f.align) ||
                  (t.act === 'greenwash' && greenwash) ||
                  (t.act === 'corporate' && corporate);
                return (
                  <button
                    key={t.label}
                    type="button"
                    title={t.hint}
                    className={[s.tool, on ? s.toolOn : ''].join(' ')}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => (t.act ? run(t.act) : t.say && say(t.say))}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <div className={s.groupName}>{g.name}</div>
          </div>
        ))}
      </div>
      <div className={s.formula}>
        <b className={s.nameBox}>{ref} ▾</b>
        <span className={s.fxBtns}>⋮ ✕ ✓</span>
        <span className={s.fx}>fx</span>
        <input
          aria-label={`${ref} hücresinin içeriği`}
          value={draft ?? cells[ref] ?? ''}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => live.current === null && setDraft(cells[ref] ?? '')}
        />
      </div>
      {mines ? (
        <div className={s.grid}>
          <table className={s.minesTable}>
            {header()}
            <tbody>
              {Array.from({ length: ROWS }, (_, r) => (
                <tr key={r}>
                  <th>{r + 1}</th>
                  {Array.from({ length: COLS }, (_, c) => {
                    const i = r * mines.w + c;
                    if (c >= mines.w || r >= mines.h) {
                      if (r === mines.h + 1 && c === 0)
                        return (
                          <td key={c} className={s.gameNote}>
                            {mines.state === 'won' ? '🏆 Kazandınız!' : mines.state === 'lost' ? '💥 #PATLADI!' : `🚩 ${mines.count - flags} mayın`} · Sağ tık: bayrak · Esc: rapora dön
                          </td>
                        );
                      if (r === mines.h + 2 && c === 0 && mines.state !== 'play')
                        return (
                          <td key={c} className={s.gameNote}>
                            <button type="button" className={s.again} onClick={startGame}>
                              ↻ Yeniden oyna
                            </button>
                          </td>
                        );
                      return <td key={c} />;
                    }
                    const open = mines.open[i];
                    const n = open && !mines.mine[i] ? around(mines, i) : 0;
                    return (
                      <td
                        key={c}
                        className={[s.mine, open ? s.mineOpen : '', open && mines.mine[i] ? s.mineBoom : '', n ? s[`n${n}`] : ''].join(' ')}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => playCell(i, false)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          playCell(i, true);
                        }}
                      >
                        {open ? (mines.mine[i] ? '💣' : n || '') : mines.flag[i] ? '🚩' : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab !== MAIN ? (
        <div className={`${s.grid} ${s.plain}`}>
          <table>
            {header()}
            <tbody>
              {Array.from({ length: ROWS }, (_, r) => (
                <tr key={r}>
                  <th>{r + 1}</th>
                  {Array.from({ length: COLS }, (_, c) => (
                    <td key={c} className={r === 0 ? s.headCell : undefined}>
                      {STATIC[tab][r]?.[c] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={s.grid}>
          <table>
            {header(sel[0])}
            <tbody>
              {Array.from({ length: ROWS }, (_, r) => (
                <tr key={r}>
                  <th className={r === sel[1] ? s.axisOn : undefined}>{r + 1}</th>
                  {Array.from({ length: COLS }, (_, c) => {
                    const d = display(c, r);
                    const { id, v } = d;
                    const on = c === sel[0] && r === sel[1];
                    const thread = threadOf(id);
                    const f = fmt[id];
                    const here = peer?.ref === id ? peer : null;
                    return (
                      <td
                        key={c}
                        className={[
                          r === 0 ? s.headCell : '',
                          typeof v === 'number' ? s.num : '',
                          on ? s.picked : '',
                          d.err && !d.green ? s.err : '',
                          d.green ? s.green : '',
                          d.struck ? s.struck : '',
                          thread ? s.noted : '',
                          note === id || here ? s.noteOpen : '',
                        ].join(' ')}
                        style={
                          f || here
                            ? {
                                fontWeight: f?.b ? 700 : undefined,
                                fontStyle: f?.i ? 'italic' : undefined,
                                textDecoration: f?.u ? 'underline' : undefined,
                                background: f?.fill,
                                color: f?.color,
                                textAlign: f?.align,
                                boxShadow: here ? `inset 0 0 0 2px ${here.color}` : undefined,
                              }
                            : undefined
                        }
                        title={d.joke?.tip}
                        onMouseEnter={
                          thread
                            ? () => {
                                setNote(id);
                                discover('yorum');
                              }
                            : undefined
                        }
                        onMouseLeave={thread ? () => setNote(null) : undefined}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (live.current !== null && !on) commit();
                          setSel([c, r]);
                          box.current?.focus();
                        }}
                        onDoubleClick={() => (GAME.test(d.raw) ? startGame() : setDraft(cells[id] ?? ''))}
                      >
                        {on && <span className={s.handle} />}
                        {here && (
                          <span className={s.peerTag} style={{ background: here.color }}>
                            {here.who}
                          </span>
                        )}
                        {note === id && thread && (
                          <span className={s.note} role="note">
                            {thread.map((m, k) => (
                              <span key={k}>
                                <b>{m.who}:</b> {m.text}
                              </span>
                            ))}
                          </span>
                        )}
                        {on && draft !== null ? (
                          <input autoFocus className={s.edit} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => commit()} />
                        ) : d.green && typeof v === 'number' ? (
                          show(Math.abs(v))
                        ) : (
                          show(v)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {chart && (
        <div className={s.chart} role="dialog" aria-label="Grafik">
          <div className={s.chartBar}>
            <span>Grafik 1</span>
            <button type="button" onClick={() => setChart(false)} aria-label="Grafiği kapat">
              ✕
            </button>
          </div>
          <b>Gerçekleşen (yönetim sunumu için)</b>
          <svg viewBox="0 0 300 150" aria-hidden>
            {[30, 60, 90, 120].map((y) => (
              <line key={y} x1="30" x2="290" y1={y} y2={y} stroke="#e1e1e1" />
            ))}
            <polyline points="30,130 70,118 110,104 150,96 190,70 230,48 270,14" fill="none" stroke="#217346" strokeWidth="3" />
            {[30, 70, 110, 150, 190, 230, 270].map((x, k) => (
              <circle key={x} cx={x} cy={[130, 118, 104, 96, 70, 48, 14][k]} r="3.5" fill="#217346" />
            ))}
            <text x="30" y="146" fontSize="9" fill="#666">
              Ocak
            </text>
            <text x="250" y="146" fontSize="9" fill="#666">
              Sonsuzluk
            </text>
          </svg>
          <small>Not: Grafik veriden bağımsız olarak her zaman yükselir. Yönetim için optimize edilmiştir.</small>
        </div>
      )}
      {toast && (
        <div key={toast.id} className={[s.toast, toast.mail ? s.mail : ''].join(' ')} role="status">
          <b>{toast.mail ? `✉ ${toast.title}` : 'Bildirim'}</b>
          {toast.text}
        </div>
      )}
      <div className={s.tabs}>
        <span className={s.tabNav}>◀ ▶</span>
        {SHEETS.map((n, i) => (
          <button key={n} type="button" className={i === tab && !mines ? s.tabOn : s.tab} onClick={() => openTab(i)}>
            {n}
          </button>
        ))}
        {mines && <span className={s.tabOn}>Hücre_Patlatma</span>}
        <span className={s.tabAdd}>⊕</span>
      </div>

      {tooLong && (
        <div className={s.modalBack}>
          <div className={s.alert} role="alertdialog" aria-label="Microsoft Excel">
            <b>Microsoft Excel</b>
            <p>⚠ Dosya adı çok uzun. Lütfen daha kısa bir ad kullanın.</p>
            <p className={s.alertSub}>Öneri: Q3_rapor_SON.xlsx (bunu daha önce de denediniz)</p>
            <button type="button" onClick={() => setTooLong(false)}>
              Tamam
            </button>
          </div>
        </div>
      )}
      {shot && (
        <div className={s.modalBack}>
          <div className={s.shareBox} role="dialog" aria-label="Raporu paylaş">
            <div className={s.chartBar}>
              <span>Raporu paylaş</span>
              <button type="button" onClick={closeShot} aria-label="Kapat">
                ✕
              </button>
            </div>
            <img src={shot.url} alt="Tablonun görüntüsü" />
            <div className={s.shareBtns}>
              <a href={shot.url} download="Q3_rapor.png" className={s.primary}>
                ⬇ İndir
              </a>
              <button type="button" onClick={() => void copyShot()}>
                ⧉ Kopyala
              </button>
              {canShare && file && (
                <button type="button" onClick={() => void navigator.share({ files: [file], title: name }).catch(() => undefined)}>
                  ⇪ Paylaş
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {secretsOpen && (
        <div className={s.secrets} role="dialog" aria-label="Sırlar">
          <b>
            Sırlar {found.size}/{SECRETS.length}
          </b>
          <ul>
            {SECRETS.map((x) => (
              <li key={x.id} className={found.has(x.id) ? s.got : undefined}>
                {found.has(x.id) ? `✓ ${x.label}` : '🔒 ???'}
              </li>
            ))}
          </ul>
          <small>İpucu: hücrelere iş hayatından sözcükler yazın, düğmelere basın, sekmeleri gezin.</small>
        </div>
      )}
      <div className={s.status}>
        <span>{draft !== null ? 'Düzenle' : 'Hazır'}</span>
        <button type="button" className={s.secretBtn} onClick={() => setSecretsOpen((o) => !o)}>
          🔒 Sırlar {found.size}/{SECRETS.length}
        </button>
        <span className={s.stats}>{column.length ? `Ortalama: ${show(Math.round((sum / column.length) * 10) / 10)}    Sayı: ${column.length}    Toplam: ${show(sum)}` : ''}</span>
        <span>▦ ▤ ▥</span>
        <span>— ━━━━●━━━━ + 100%</span>
      </div>
    </div>
  );
}
