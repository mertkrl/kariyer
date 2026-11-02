import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { markPlayed } from '../../arcade/progress';
import { STOP_SECONDS } from './lines';
import { CALL_SECONDS } from './live';
import { FONTS, GRID, PRESET_ACCENT, SCENES, H, KINDS, MAX_WIDGETS, W, blankDesign, currentDesign, makeWidget, sampleDesign, scopeOf, snap, draftKey, type Align, type Design, type FontId, type Kind, type SceneId, type Widget } from './model';
import { Screen } from './Screen';
import { ShareSheet } from './ShareSheet';
import { evaluate, saveStars, type Report, type Task } from './spec';
import { Checklist, ReportCard } from './Dossier';
import { ding } from './sfx';
import { applyTheme, backdropOf, bestInk, contrast, hasReadableText, readability, THEMES } from './theme';
import { useClock } from './useClock';
import styles from './EkranGame.module.css';
import tools from './Tools.module.css';

/*
 * Normal mod: serbest atölye. Solda bileşen paleti, ortada ekran, sağda seçilenin ayarları.
 * Bileşenler sürüklenir ve sağ alt köşesinden boyutlandırılır; ızgaraya oturur (Alt basılıyken
 * serbest). Her değişiklik geri alınabilir; taslak tarayıcıda saklanır, sayfa kapansa da kaybolmaz.
 */

interface History {
  past: Design[];
  present: Design;
  future: Design[];
}

type Drag = { id: string; mode: 'move' | 'resize'; px: number; py: number; start: Widget; before: Design };
type Guides = { x: number | null; y: number | null };

/** Sürüklerken yapışma payı (sanal piksel): ekranın ortasına, kenarlarına ve öbür bileşenlerin hizasına. */
const SNAP = 10;

/** Kutunun üç çizgisinden (baş, orta, son) birini en yakın hedefe oturtur; yoksa olduğu gibi bırakır. */
function align(pos: number, size: number, targets: number[]): { pos: number; line: number | null } {
  let best = { d: SNAP + 1, pos, line: null as number | null };
  for (const t of targets)
    for (const off of [0, size / 2, size]) {
      const d = Math.abs(pos + off - t);
      if (d < best.d) best = { d, pos: Math.round(t - off), line: t };
    }
  return best;
}

const KIND_ORDER: Kind[] = ['text', 'box', 'clock', 'date', 'number', 'patient', 'queue', 'nextStop', 'terminus', 'stops', 'lineMap', 'video', 'ticker', 'logo', 'taskbar'];
const TEXT_KINDS: Kind[] = ['text', 'ticker', 'logo', 'number', 'queue', 'nextStop', 'terminus', 'video'];
const ACCENT_KINDS: Kind[] = ['stops', 'lineMap'];
const NO_ALIGN: Kind[] = ['queue', 'ticker', 'logo', 'stops', 'lineMap', 'video'];
const MASK_KINDS: Kind[] = ['patient', 'queue'];
const TEXT_LABEL: Partial<Record<Kind, string>> = { number: 'Numaranın önündeki yazı', queue: 'Her satırın başındaki yazı', logo: 'Amblemdeki harf', nextStop: 'Durağın önündeki yazı', terminus: 'Durağın önündeki yazı', video: 'Köşedeki etiket' };
const ALIGNS: { id: Align; label: string }[] = [
  { id: 'start', label: 'Sola' },
  { id: 'middle', label: 'Ortaya' },
  { id: 'end', label: 'Sağa' },
];

interface EditorProps {
  initial: Design;
  /** Zor modda üzerinde çalışılan dosya; yoksa serbest atölye. */
  task?: Task;
  /** Taslağın saklandığı anahtar: ekran başına ya da dosya başına. */
  storeKey?: string;
  onFiles?: () => void;
  onNext?: () => void;
}

export function Editor({ initial, task, storeKey, onFiles, onNext }: EditorProps) {
  const [report, setReport] = useState<Report | null>(null);
  const [hist, setHist] = useState<History>({ past: [], present: initial, future: [] });
  const [selected, setSelected] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [bell, setBell] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [guides, setGuides] = useState<Guides>({ x: null, y: null });
  const [fresh, setFresh] = useState<string | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);
  const { seconds, now } = useClock(live);
  const design = hist.present;
  const sel = design.widgets.find((wd) => wd.id === selected) ?? null;

  const set = (d: Design, commit = true) => setHist((h) => (commit ? { past: [...h.past, h.present].slice(-100), present: d, future: [] } : { ...h, present: d }));
  const patch = (id: string, p: Partial<Widget>, commit = true) => set({ ...design, widgets: design.widgets.map((wd) => (wd.id === id ? { ...wd, ...p } : wd)) }, commit);
  const undo = () => setHist((h) => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h));
  const redo = () => setHist((h) => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h));
  const remove = (id: string) => {
    set({ ...design, widgets: design.widgets.filter((wd) => wd.id !== id) });
    setSelected(null);
  };
  const duplicate = (wd: Widget) => {
    if (design.widgets.length >= MAX_WIDGETS) return;
    const copy = makeWidget(wd.kind, { ...wd, id: undefined, x: wd.x + GRID * 3, y: wd.y + GRID * 3 });
    set({ ...design, widgets: [...design.widgets, copy] });
    setSelected(copy.id);
  };
  const layer = (id: string, dir: 1 | -1) => {
    const list = [...design.widgets];
    const i = list.findIndex((wd) => wd.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    set({ ...design, widgets: list });
  };
  const add = (kind: Kind) => {
    if (design.widgets.length >= MAX_WIDGETS) return flash(`Bir ekrana en fazla ${MAX_WIDGETS} bileşen sığar.`);
    const base = KINDS[kind].base;
    const wd = makeWidget(kind, { x: base.x ?? snap((W - (base.w ?? 200)) / 2), y: base.y ?? snap((H - (base.h ?? 80)) / 2) });
    set({ ...design, widgets: [...design.widgets, wd] });
    setSelected(wd.id);
    setFresh(wd.id);
  };
  const load = (d: Design, message: string) => {
    set(d);
    setSelected(null);
    flash(message);
  };

  const flash = (message: string) => {
    setNote(message);
    window.setTimeout(() => setNote((n) => (n === message ? null : n)), 2600);
  };

  // taslak her değişiklikte saklanır; gizli pencerede depolama yoksa sessizce geçilir
  useEffect(() => {
    try {
      localStorage.setItem(storeKey ?? draftKey(design.preset), JSON.stringify(design));
    } catch {
      /* depolama yok */
    }
  }, [design, storeKey]);

  // yeni hasta çağrılınca ya da durak değişince zil (açıksa)
  const hospital = design.preset === 'hastane';
  const callNo = Math.floor(seconds / (hospital ? CALL_SECONDS : STOP_SECONDS));
  useEffect(() => {
    if (bell && live && callNo > 0) ding();
  }, [callNo, bell, live]);

  // klavye: sil, ok tuşlarıyla kaydır, geri al / yinele, çoğalt
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (report || sharing || t.closest('input, textarea, select')) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        return e.shiftKey ? redo() : undo();
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        return redo();
      }
      if (!sel) return;
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        return duplicate(sel);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        return remove(sel.id);
      }
      if (e.key === 'Escape') return setSelected(null);
      const step = e.shiftKey ? GRID : 1;
      const move: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      const m = move[e.key];
      if (!m) return;
      e.preventDefault();
      patch(sel.id, { x: sel.x + m[0], y: sel.y + m[1] });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const scale = () => W / (stage.current?.getBoundingClientRect().width || W);

  const onDown = (e: ReactPointerEvent, wd: Widget, mode: Drag['mode']) => {
    e.stopPropagation();
    e.preventDefault();
    setSelected(wd.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id: wd.id, mode, px: e.clientX, py: e.clientY, start: wd, before: design };
  };
  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const k = scale();
    const dx = (e.clientX - d.px) * k;
    const dy = (e.clientY - d.py) * k;
    const fit = e.altKey ? Math.round : snap;
    let p: Partial<Widget>;
    if (d.mode === 'move') {
      // ekranın ortası ve kenarları, öbür bileşenlerin baş, orta ve son çizgileri; Alt basılıyken serbest
      const others = design.widgets.filter((wd) => wd.id !== d.id);
      const xs = [0, W / 2, W, ...others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w])];
      const ys = [0, H / 2, H, ...others.flatMap((o) => [o.y, o.y + o.h / 2, o.y + o.h])];
      const ax = e.altKey ? { pos: Math.round(d.start.x + dx), line: null } : align(d.start.x + dx, d.start.w, xs);
      const ay = e.altKey ? { pos: Math.round(d.start.y + dy), line: null } : align(d.start.y + dy, d.start.h, ys);
      p = { x: ax.line === null ? fit(d.start.x + dx) : ax.pos, y: ay.line === null ? fit(d.start.y + dy) : ay.pos };
      if (ax.line !== guides.x || ay.line !== guides.y) setGuides({ x: ax.line, y: ay.line });
    } else p = { w: Math.max(GRID, fit(d.start.w + dx)), h: Math.max(GRID, fit(d.start.h + dy)) };
    setHist((h) => ({ ...h, present: { ...h.present, widgets: h.present.widgets.map((wd) => (wd.id === d.id ? { ...wd, ...p } : wd)) } }));
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    setGuides({ x: null, y: null });
    if (!d) return;
    // sürükleme tek adım olarak geri alınır; hiç kımıldamadıysa geçmişe yazılmaz
    setHist((h) => (h.present === d.before || sameBox(h.present, d.before, d.id) ? h : { past: [...h.past, d.before].slice(-100), present: h.present, future: [] }));
  };

  const submit = () => {
    if (!task) return;
    const rep = evaluate(design, task);
    saveStars(task.id, rep.stars);
    // kurul kararı: salonun defterine tik ve yıldızlar
    markPlayed('ekran', `${'★'.repeat(rep.stars)}${'☆'.repeat(3 - rep.stars)} kurul kararı`);
    setReport(rep);
  };
  const openShare = () => {
    setSelected(null);
    setSharing(true);
  };

  return (
    <div className={styles.editor}>
      <aside className={styles.palette} aria-label="Bileşenler">
        <h2>Ekle</h2>
        {KIND_ORDER.filter((k) => KINDS[k].scope === 'all' || KINDS[k].scope === scopeOf(design.preset)).map((k) => (
          <button key={k} type="button" onClick={() => add(k)} title={KINDS[k].hint}>
            <b>{KINDS[k].label}</b>
            <small>{KINDS[k].hint}</small>
          </button>
        ))}
        <h2>Başlangıç</h2>
        <button type="button" onClick={() => load(currentDesign(design.preset), 'Ekran bugünkü hâline döndü.')}>
          <b>Mevcut hâl</b>
          <small>Duvardaki gibi</small>
        </button>
        <button type="button" onClick={() => load(sampleDesign(design.preset), 'Örnek tasarım yüklendi.')}>
          <b>Örnek tasarım</b>
          <small>Okunur bir başlangıç</small>
        </button>
        <button type="button" onClick={() => load(blankDesign(design.preset), 'Ekran boşaltıldı.')}>
          <b>Boş ekran</b>
          <small>Sıfırdan</small>
        </button>
      </aside>

      <section className={styles.work}>
        <div className={styles.toolbar} role="toolbar" aria-label="Ekran araçları">
          <button type="button" onClick={undo} disabled={!hist.past.length} title="Geri al (Ctrl+Z)">
            ↶ Geri al
          </button>
          <button type="button" onClick={redo} disabled={!hist.future.length} title="Yinele (Ctrl+Shift+Z)">
            ↷ Yinele
          </button>
          <span className={styles.sep} />
          <button type="button" aria-pressed={live} onClick={() => setLive((x) => !x)}>
            {live ? '⏸ Canlı' : '▶ Canlı'}
          </button>
          <button type="button" aria-pressed={bell} onClick={() => setBell((x) => !x)} title={hospital ? 'Yeni hasta çağrılınca zil çalsın' : 'Durak değişince zil çalsın'}>
            🔔 Zil
          </button>
          <span className={styles.grow} />
          <button type="button" className={styles.primary} onClick={openShare}>
            Paylaş
          </button>
        </div>

        {task && <Checklist task={task} design={design} onSubmit={submit} />}
        <div className={styles.stageWrap}>
          <div ref={stage} className={styles.stage} onPointerDown={() => setSelected(null)}>
            <Screen ref={svg} design={design} seconds={seconds} now={now} className={styles.screen} />
            <div className={styles.overlay} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
              {design.widgets.map((wd) => (
                <div
                  key={wd.id}
                  className={`${styles.handle} ${wd.id === selected ? styles.picked : ''} ${wd.id === fresh ? tools.fresh : ''}`}
                  onAnimationEnd={() => setFresh(null)}
                  style={{ left: `${(wd.x / W) * 100}%`, top: `${(wd.y / H) * 100}%`, width: `${(wd.w / W) * 100}%`, height: `${(wd.h / H) * 100}%` }}
                  onPointerDown={(e) => onDown(e, wd, 'move')}
                  title={KINDS[wd.kind].label}
                >
                  {wd.id === selected && <span className={styles.resize} onPointerDown={(e) => onDown(e, wd, 'resize')} aria-hidden="true" />}
                </div>
              ))}
              {guides.x !== null && <i className={tools.guideV} style={{ left: `${(guides.x / W) * 100}%` }} />}
              {guides.y !== null && <i className={tools.guideH} style={{ top: `${(guides.y / H) * 100}%` }} />}
            </div>
            {!design.widgets.length && <p className={tools.empty}>Ekran boş. Soldan bir bileşen ekle ya da hazır bir başlangıç seç.</p>}
          </div>
        </div>

        {note && (
          <p className={styles.note} role="status">
            {note}
          </p>
        )}
      </section>

      {sharing && <ShareSheet design={design} seconds={seconds} now={now} screen={() => svg.current} onClose={() => setSharing(false)} />}
      {task && report && <ReportCard task={task} report={report} onClose={() => setReport(null)} onFiles={() => onFiles?.()} onNext={onNext} />}

      <aside className={styles.inspector} aria-label="Ayarlar">
        {sel ? <WidgetPanel design={design} wd={sel} patch={(p, c) => patch(sel.id, p, c)} onDelete={() => remove(sel.id)} onCopy={() => duplicate(sel)} onLayer={(dir) => layer(sel.id, dir)} /> : <ScreenPanel design={design} set={set} />}
      </aside>
    </div>
  );
}

function sameBox(a: Design, b: Design, id: string) {
  const x = a.widgets.find((wd) => wd.id === id);
  const y = b.widgets.find((wd) => wd.id === id);
  return !!x && !!y && x.x === y.x && x.y === y.y && x.w === y.w && x.h === y.h;
}

function ScreenPanel({ design, set }: { design: Design; set: (d: Design) => void }) {
  return (
    <>
      <h2>Ekran</h2>
      <p className={styles.hint}>Bir bileşeni seçmek için üstüne tıkla. Sürükle, sağ alt köşesinden büyüt; pembe çizgiler hizayı gösterir.</p>
      <Meter design={design} />
      <div className={styles.field}>
        Hazır renkler
        <div className={tools.themes}>
          {THEMES.map((t) => (
            <button key={t.id} type="button" className={tools.theme} onClick={() => set(applyTheme(design, t))} title={`${t.label}: bütün ekranı bu renklere boya`}>
              <span className={tools.chips} aria-hidden="true">
                <i style={{ background: t.bg }} />
                <i style={{ background: t.strong }} />
                <i style={{ background: t.highlight }} />
              </span>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <label className={styles.field}>
        Zemin rengi
        <input type="color" value={design.bg} onChange={(e) => set({ ...design, bg: e.target.value })} />
      </label>
      <div className={styles.field}>
        Ekran türü
        <div className={styles.seg} role="group" aria-label="Ekran türü">
          <button type="button" aria-pressed={design.motion === 'sabit'} onClick={() => set({ ...design, motion: 'sabit' })}>
            Sabit
          </button>
          <button type="button" aria-pressed={design.motion === 'gecisli'} onClick={() => set({ ...design, motion: 'gecisli' })}>
            Geçişli
          </button>
        </div>
      </div>
      <p className={styles.hint}>
        {design.motion === 'sabit'
          ? 'Ekran hep aynı düzende durur.'
          : design.preset === 'hastane'
            ? 'Her çağrıda tam ekran "Sıradaki hasta" kartı iner.'
            : 'Durağa yaklaşınca "Sonraki durak", varınca "Duraktayız" kartları kayarak gelir.'}
      </p>
      {design.motion === 'gecisli' && (
        <label className={styles.field}>
          Geçiş kartlarının rengi
          <input type="color" value={design.accent} onChange={(e) => set({ ...design, accent: e.target.value })} />
        </label>
      )}
      {design.motion === 'gecisli' && design.accent !== PRESET_ACCENT[design.preset] && (
        <button type="button" className={styles.linkish} onClick={() => set({ ...design, accent: PRESET_ACCENT[design.preset] })}>
          Kurum rengine dön
        </button>
      )}
      <p className={styles.hint}>{design.widgets.length} bileşen · Ctrl+Z geri alır</p>
    </>
  );
}

/** Okunurluk göstergesi: yazıların kaçı üç metreden rahat okunur. */
function Meter({ design }: { design: Design }) {
  const { score, weak } = readability(design);
  const tone = score >= 80 ? '#3fb67a' : score >= 50 ? '#f0b429' : '#e0574a';
  return (
    <div className={tools.meter}>
      <span>
        <b>Okunurluk</b>
        <b style={{ color: tone }}>%{score}</b>
      </span>
      <span className={tools.bar}>
        <i style={{ width: `${score}%`, background: tone }} />
      </span>
      <small>{weak.length ? `${weak.length} yazı zor okunuyor: rengi zeminine yakın ya da çok küçük.` : 'Bütün yazılar uzaktan rahat okunuyor.'}</small>
    </div>
  );
}

/** Hızlı renk: ekranda zaten kullanılan renkler ve birkaç temel renk. */
function Swatches({ design, value, onPick }: { design: Design; value: string; onPick: (c: string) => void }) {
  const used = new Set<string>([design.bg, ...design.widgets.flatMap((wd) => [wd.fill, wd.color])]);
  used.delete('none');
  const list = [...new Set(['#ffffff', '#000000', '#14212b', '#f2c500', '#e0262d', ...used])].slice(0, 12);
  return (
    <div className={tools.swatches} role="group" aria-label="Hazır renkler">
      {list.map((c) => (
        <button key={c} type="button" style={{ background: c }} aria-pressed={c === value} aria-label={c} onClick={() => onPick(c)} />
      ))}
    </div>
  );
}

function WidgetPanel({ design, wd, patch, onDelete, onCopy, onLayer }: { design: Design; wd: Widget; patch: (p: Partial<Widget>, commit?: boolean) => void; onDelete: () => void; onCopy: () => void; onLayer: (dir: 1 | -1) => void }) {
  const hasText = wd.kind !== 'box' && wd.kind !== 'taskbar';
  const num = (key: 'x' | 'y' | 'w' | 'h', label: string) => (
    <label className={styles.small}>
      {label}
      <input type="number" value={wd[key]} step={GRID} onChange={(e) => Number.isFinite(e.target.valueAsNumber) && patch({ [key]: Math.round(e.target.valueAsNumber) })} />
    </label>
  );
  return (
    <>
      <h2>{KINDS[wd.kind].label}</h2>
      <Legibility design={design} wd={wd} patch={patch} />
      {TEXT_KINDS.includes(wd.kind) && (
        <label className={styles.field}>
          {TEXT_LABEL[wd.kind] ?? 'Yazı'}
          {wd.kind === 'text' ? <textarea rows={3} value={wd.text} maxLength={300} onChange={(e) => patch({ text: e.target.value })} /> : <input value={wd.text} maxLength={300} onChange={(e) => patch({ text: e.target.value })} />}
        </label>
      )}
      <div className={styles.grid4}>
        {num('x', 'X')}
        {num('y', 'Y')}
        {num('w', 'Genişlik')}
        {num('h', 'Yükseklik')}
      </div>
      <div className={styles.colors}>
        <label className={styles.field}>
          Zemin
          <input type="color" value={wd.fill === 'none' ? '#ffffff' : wd.fill} disabled={wd.fill === 'none'} onChange={(e) => patch({ fill: e.target.value })} />
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={wd.fill === 'none'} onChange={(e) => patch({ fill: e.target.checked ? 'none' : '#ffffff' })} />
          Saydam
        </label>
        {hasText && (
          <label className={styles.field}>
            Yazı rengi
            <input type="color" value={wd.color} onChange={(e) => patch({ color: e.target.value })} />
          </label>
        )}
      </div>
      {wd.fill !== 'none' && <Swatches design={design} value={wd.fill} onPick={(c) => patch({ fill: c })} />}
      {hasText && <Swatches design={design} value={wd.color} onPick={(c) => patch({ color: c })} />}
      {hasText && (
        <>
          <label className={styles.field}>
            Yazı boyutu: {wd.size}
            <input type="range" min={8} max={200} value={wd.size} onChange={(e) => patch({ size: e.target.valueAsNumber })} />
          </label>
          <label className={styles.field}>
            Yazı tipi
            <select value={wd.font} onChange={(e) => patch({ font: e.target.value as FontId })}>
              {(Object.keys(FONTS) as FontId[]).map((f) => (
                <option key={f} value={f}>
                  {FONTS[f].label}
                </option>
              ))}
            </select>
          </label>
          {!NO_ALIGN.includes(wd.kind) && (
            <div className={styles.seg} role="group" aria-label="Hizalama">
              {ALIGNS.map((a) => (
                <button key={a.id} type="button" aria-pressed={wd.align === a.id} onClick={() => patch({ align: a.id })}>
                  {a.label}
                </button>
              ))}
            </div>
          )}
          <label className={styles.check}>
            <input type="checkbox" checked={wd.bold} onChange={(e) => patch({ bold: e.target.checked })} />
            Kalın
          </label>
        </>
      )}
      {wd.kind === 'video' && (
        <label className={styles.field}>
          Görüntü
          <select value={wd.scene} onChange={(e) => patch({ scene: e.target.value as SceneId })}>
            {(Object.keys(SCENES) as SceneId[]).map((sc) => (
              <option key={sc} value={sc}>
                {SCENES[sc]}
              </option>
            ))}
          </select>
        </label>
      )}
      {ACCENT_KINDS.includes(wd.kind) && (
        <label className={styles.field}>
          Vurgu rengi (şimdiki durak)
          <input type="color" value={wd.accent} onChange={(e) => patch({ accent: e.target.value })} />
        </label>
      )}
      {MASK_KINDS.includes(wd.kind) && (
        <label className={styles.check}>
          <input type="checkbox" checked={wd.mask} onChange={(e) => patch({ mask: e.target.checked })} />
          Adı gizle (KVKK)
        </label>
      )}
      {wd.fill !== 'none' && (
        <label className={styles.field}>
          Köşe yuvarlaklığı: {wd.radius}
          <input type="range" min={0} max={80} value={wd.radius} onChange={(e) => patch({ radius: e.target.valueAsNumber })} />
        </label>
      )}
      <div className={styles.actions}>
        <button type="button" onClick={() => patch({ x: Math.round((W - wd.w) / 2) })} title="Ekranın tam ortasına al">
          Ortala
        </button>
        <button type="button" onClick={() => patch({ x: 0, w: W })} title="Soldan sağa bütün ekran">
          Tam genişlik
        </button>
        <button type="button" onClick={() => onLayer(1)} title="Öne getir">
          Öne
        </button>
        <button type="button" onClick={() => onLayer(-1)} title="Arkaya gönder">
          Arkaya
        </button>
        <button type="button" onClick={onCopy} title="Çoğalt (Ctrl+D)">
          Çoğalt
        </button>
        <button type="button" className={styles.danger} onClick={onDelete}>
          Sil
        </button>
      </div>
    </>
  );
}

/** Seçilen yazının zeminiyle karşıtlığı; zayıfsa tek tıkla en okunur renge çeker. */
function Legibility({ design, wd, patch }: { design: Design; wd: Widget; patch: (p: Partial<Widget>) => void }) {
  if (!hasReadableText(wd)) return null;
  const under = backdropOf(design, wd);
  const ratio = contrast(wd.color, under);
  if (ratio >= 4.5 && wd.size >= 16) return <p className={`${tools.warn} ${tools.ok}`}>✓ Okunur · karşıtlık {ratio.toFixed(1)}:1</p>;
  return (
    <p className={tools.warn}>
      {wd.size < 16 ? 'Yazı uzaktan okunmayacak kadar küçük.' : `Zor okunuyor · karşıtlık ${ratio.toFixed(1)}:1`}
      <button type="button" onClick={() => patch(ratio < 4.5 ? { color: bestInk(under), size: Math.max(16, wd.size) } : { size: 16 })}>
        Düzelt
      </button>
    </p>
  );
}
