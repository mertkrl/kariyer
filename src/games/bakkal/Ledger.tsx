import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useFloating } from './drag';
import { BOOK, addStroke, clearPage, redo, undo, type Page, type PageId, type Pages, type PageSpec, type Stroke } from './pages';
import styles from './Ledger.module.css';

/*
 * Hacı Emmi'nin defteri: bez ciltli, köşeleri meşin, sayfaları ileri geri çevrilen kullanılmış bir
 * defter. Hacı Emmi'nin el yazısı satırları solmuş, eğri ve yer yer okunmaz; oyun bugünkü fiyatları
 * yazmaz, hesabı oyuncu yapar. Oyuncu yalnızca tükenmez kalemle yazar, silgiyle siler; her sayfanın
 * geri al / ileri al geçmişi vardır, çöp kutusu sayfayı hemen temizler (o da geri alınır).
 * Defter başlığından sürüklenir, sağ alt köşesinden büyütülüp küçültülür.
 */

type Tool = 'pen' | 'eraser';

const INK = '#1f3a8a';
const PEN = 2.2;
const ERASER = 22;
/** Kâğıdın üst boşluğu ve satır aralığı (CSS ile aynı). */
const TOP = 36;
const ROW = 28;

/** Darbeleri tuvale çizer: kalem mürekkep bırakır, silgi altındakini kazır. */
function paint(ctx: CanvasRenderingContext2D, s: Stroke) {
  const p = s.pts;
  ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
  ctx.strokeStyle = s.erase ? '#000' : INK;
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = s.erase ? ERASER : PEN;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (p.length <= 2) {
    ctx.beginPath();
    ctx.arc(p[0], p[1], ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // noktaların ortalarından geçen yumuşak eğri: el yazısı köşeli görünmesin
  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);
  for (let i = 2; i < p.length - 2; i += 2) ctx.quadraticCurveTo(p[i], p[i + 1], (p[i] + p[i + 2]) / 2, (p[i + 1] + p[i + 3]) / 2);
  ctx.lineTo(p[p.length - 2], p[p.length - 1]);
  ctx.stroke();
}

function InkLayer({ page, tool, onStroke }: { page: Page; tool: Tool; onStroke: (s: Stroke) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const current = useRef<number[] | null>(null);
  const strokes = useRef(page.strokes);

  const redraw = () => {
    const c = canvas.current!;
    const ctx = c.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    strokes.current.forEach((s) => paint(ctx, s));
  };

  // defter büyüyüp küçülünce tuval yeniden boyutlanır; yazılar yerinde kalır. Boyut dönüşümsüz
  // yerleşimden okunur: sayfa çevirme animasyonu sürerken ölçülen dönmüş sayfa tuvali küçük
  // kurar, kalem de imlecin çok üstüne yazardı.
  useEffect(() => {
    const c = canvas.current!;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(c.clientWidth * dpr);
      c.height = Math.round(c.clientHeight * dpr);
      redraw();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  // geri al, ileri al, temizle: sayfa değişince baştan çizilir
  useEffect(() => {
    strokes.current = page.strokes;
    redraw();
  }, [page.strokes]);

  /** İmlecin sayfa üzerindeki yeri, sayfanın kendi (dönüşümsüz) ölçüsünde. */
  const at = (e: React.PointerEvent) => {
    const c = canvas.current!;
    const r = c.getBoundingClientRect();
    const sx = c.clientWidth / (r.width || 1);
    const sy = c.clientHeight / (r.height || 1);
    return [Math.round((e.clientX - r.left) * sx * 10) / 10, Math.round((e.clientY - r.top) * sy * 10) / 10];
  };

  const end = () => {
    if (!current.current) return;
    onStroke({ erase: tool === 'eraser', pts: current.current });
    current.current = null;
  };

  return (
    <canvas
      ref={canvas}
      className={`${styles.ink} ${tool === 'eraser' ? styles.erasing : ''}`}
      aria-label="Deftere el yazısı"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        current.current = at(e);
        paint(canvas.current!.getContext('2d')!, { erase: tool === 'eraser', pts: current.current });
      }}
      onPointerMove={(e) => {
        const pts = current.current;
        if (!pts) return;
        const [x, y] = at(e);
        const lx = pts[pts.length - 2];
        const ly = pts[pts.length - 1];
        if (Math.hypot(x - lx, y - ly) < 1.2) return;
        pts.push(x, y);
        // canlı çizim: yalnızca son parça; bırakınca tüm darbe yumuşatılarak yeniden çizilir
        paint(canvas.current!.getContext('2d')!, { erase: tool === 'eraser', pts: [lx, ly, x, y] });
      }}
      onPointerUp={end}
      onPointerCancel={end}
    />
  );
}

/** Satıra göre hep aynı küçük sapma: el yazısı her açılışta aynı eğrilikte durur. */
const wobble = (i: number, k: number) => ((((i + 3) * k) % 9) - 4) / 4;

/** Hacı Emmi'nin satırları: kenarda tarih, ortada yazı, sağda tutar; eğri, silik, yer yer okunmaz. */
function Written({ spec }: { spec: PageSpec }) {
  if (!spec.written.length) return null;
  return (
    <ol className={styles.written} style={{ top: TOP }}>
      {spec.written.map((w, i) => {
        const hand: CSSProperties = {
          transform: `translateY(${wobble(i, 5) * 1.6}px) rotate(${wobble(i, 7) * 0.9}deg)`,
          fontWeight: 430 + Math.round(wobble(i, 4) * 60),
          letterSpacing: `${wobble(i, 11) * 0.35}px`,
        };
        return (
          <li key={i} style={{ height: ROW }} className={`${w.smudge ? styles.smudge : ''} ${w.big ? styles.big : ''}`}>
            <span className={styles.date}>{w.date}</span>
            <span className={`${styles.line} ${w.struck ? styles.struck : ''}`} style={hand}>
              {w.text}
            </span>
            {w.was && <span className={`${styles.amount} ${styles.struck} ${styles.was}`}>{w.was}</span>}
            {w.amount && (
              <span className={`${styles.amount} ${w.struck ? styles.struck : ''}`} style={{ transform: `rotate(${wobble(i, 3) * 2}deg)` }}>
                {w.amount}
              </span>
            )}
            {w.note && <span className={styles.redNote}>{w.note}</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function Ledger({
  pages,
  at,
  onTurn,
  onChange,
  onClose,
}: {
  pages: Pages;
  /** Açık sayfanın sırası. */
  at: number;
  onTurn: (at: number) => void;
  onChange: (id: PageId, page: Page) => void;
  onClose: () => void;
}) {
  const [dir, setDir] = useState<1 | -1>(1);
  const [tool, setTool] = useState<Tool>('pen');
  const { box, onMove, onResize } = useFloating('defter', () => {
    const w = Math.min(500, window.innerWidth - 24);
    return { w, h: Math.min(640, window.innerHeight - 120), x: window.innerWidth - w - 16, y: 96 };
  });
  const spec = BOOK[at];
  const page = pages[spec.id];
  const set = (p: Page) => p !== page && onChange(spec.id, p);

  const turn = (d: 1 | -1) => {
    const n = at + d;
    if (n < 0 || n >= BOOK.length) return;
    setDir(d);
    onTurn(n);
  };

  // Ctrl/Cmd+Z geri alır, Shift ile ileri alır
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      set(e.shiftKey ? redo(page) : undo(page));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <aside className={styles.book} style={{ left: box.x, top: box.y, width: box.w, height: box.h }} aria-label="Defter">
      <header className={styles.head} onPointerDown={onMove} title="Tutup sürükle">
        <h3>Veresiye Defteri · No 7</h3>
        <button className={styles.close} onClick={onClose} aria-label="Defteri kapat">
          ×
        </button>
      </header>
      <div className={styles.block}>
        <span className={styles.ribbon} aria-hidden="true" />
        <div key={spec.id} className={`${styles.paper} ${spec.written.length ? styles.used : ''} ${spec.stain ? styles.stain : ''} ${dir > 0 ? styles.fwd : styles.back}`}>
          {spec.title && <p className={styles.pageTitle}>{spec.title}</p>}
          <Written spec={spec} />
          <InkLayer key={spec.id} page={page} tool={tool} onStroke={(s) => set(addStroke(page, s))} />
          <button className={styles.folio} onClick={() => turn(1)} disabled={at === BOOK.length - 1} aria-label="Sayfayı çevir">
            {at + 1}
          </button>
        </div>
      </div>
      <nav className={styles.bar}>
        <span className={styles.pager}>
          <button onClick={() => turn(-1)} disabled={at === 0} aria-label="Önceki sayfa">
            ‹
          </button>
          <span aria-live="polite">
            {at + 1}/{BOOK.length}
          </span>
          <button onClick={() => turn(1)} disabled={at === BOOK.length - 1} aria-label="Sonraki sayfa">
            ›
          </button>
        </span>
        <span className={styles.tools} role="toolbar" aria-label="Yazı araçları">
          <button className={tool === 'pen' ? styles.on : ''} onClick={() => setTool('pen')} aria-pressed={tool === 'pen'} title="Kalem">
            <span className={styles.penIcon} />
          </button>
          <button className={tool === 'eraser' ? styles.on : ''} onClick={() => setTool('eraser')} aria-pressed={tool === 'eraser'} title="Silgi">
            <span className={styles.eraserIcon} />
          </button>
          <button onClick={() => set(undo(page))} disabled={!page.past.length} title="Geri al" aria-label="Geri al">
            ↶
          </button>
          <button onClick={() => set(redo(page))} disabled={!page.future.length} title="İleri al" aria-label="İleri al">
            ↷
          </button>
          <button onClick={() => set(clearPage(page))} disabled={!page.strokes.length} title="Sayfadaki yazılarımı sil" aria-label="Sayfadaki yazılarımı sil">
            🗑
          </button>
        </span>
      </nav>
      <span className={styles.grip} onPointerDown={onResize} title="Büyüt / küçült" aria-hidden="true" />
    </aside>
  );
}
