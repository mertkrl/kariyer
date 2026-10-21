import { useEffect, useRef, useState } from 'react';
import type { Page, PageId, Pages } from './pages';
import styles from './Ledger.module.css';

/*
 * Hacı Emmi'nin defteri: boş, çizgili iki sayfa (Fiyatlar ve Veresiye). Oyun deftere hiçbir şey
 * yazmaz; ne not alınacağı oyuncunun işi. Kalemle fare ya da parmakla el yazısı yazılır, silgiyle
 * silinir; klavye modunda aynı sayfaya el yazısı yazı tipiyle yazılır. Mürekkep ve yazı sayfa
 * başına saklanır: defter kapanıp açılınca, gün değişince yerinde durur.
 */

type Tool = 'blue' | 'red' | 'eraser' | 'type';

const TITLES: Record<PageId, string> = { fiyat: 'Fiyatlar', veresiye: 'Veresiye' };
const INK = { blue: '#1f3f8a', red: '#b3261e' };

function InkLayer({ page, tool, onInk }: { page: Page; tool: Tool; onInk: (ink: string | null) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<{ x: number; y: number } | null>(null);
  // kurulurken kayıtlı mürekkep; sonrası zaten tuvalde (sayfa değişince bileşen yeniden kurulur)
  const saved = useRef(page.ink);

  // kâğıt boyutu değişince tuval yeniden boyutlanır ve kayıtlı mürekkep geri çizilir
  useEffect(() => {
    const c = canvas.current!;
    const fit = () => {
      const r = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      const ctx = c.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (saved.current) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, r.width, r.height);
        img.src = saved.current;
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  const at = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const line = (from: { x: number; y: number }, to: { x: number; y: number }, pressure: number) => {
    const ctx = canvas.current!.getContext('2d')!;
    const erase = tool === 'eraser';
    ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = erase ? '#000' : INK[tool as 'blue' | 'red'];
    ctx.lineWidth = erase ? 22 : 1.6 + pressure * 1.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  return (
    <canvas
      ref={canvas}
      className={`${styles.ink} ${tool === 'type' ? styles.passive : ''} ${tool === 'eraser' ? styles.erasing : ''}`}
      aria-label="Deftere el yazısı"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        const p = at(e);
        drawing.current = p;
        line(p, { x: p.x + 0.1, y: p.y + 0.1 }, e.pressure || 0.5);
      }}
      onPointerMove={(e) => {
        if (!drawing.current) return;
        const p = at(e);
        line(drawing.current, p, e.pressure || 0.5);
        drawing.current = p;
      }}
      onPointerUp={() => {
        if (!drawing.current) return;
        drawing.current = null;
        const ink = canvas.current!.toDataURL('image/png');
        saved.current = ink;
        onInk(ink);
      }}
      onPointerCancel={() => (drawing.current = null)}
    />
  );
}

export function Ledger({ pages, onChange, onClose }: { pages: Pages; onChange: (id: PageId, page: Page) => void; onClose: () => void }) {
  const [tab, setTab] = useState<PageId>('fiyat');
  const [tool, setTool] = useState<Tool>('blue');
  const [wipes, setWipes] = useState(0);
  const text = useRef<HTMLTextAreaElement>(null);
  const page = pages[tab];

  useEffect(() => {
    if (tool === 'type') text.current?.focus();
  }, [tool, tab]);

  const tools: [Tool, string, string][] = [
    ['blue', '🖊', 'Mavi kalem'],
    ['red', '🖍', 'Kırmızı kalem'],
    ['eraser', '🧽', 'Silgi'],
    ['type', '⌨️', 'Klavyeyle yaz'],
  ];

  return (
    <aside className={styles.book} aria-label="Defter">
      <header className={styles.head}>
        <h3>Hacı Emmi'nin Defteri</h3>
        <button className={styles.close} onClick={onClose} aria-label="Defteri kapat">
          ×
        </button>
      </header>
      <nav className={styles.bar}>
        <span className={styles.tabs}>
          {(Object.keys(TITLES) as PageId[]).map((id) => (
            <button key={id} className={tab === id ? styles.on : ''} onClick={() => setTab(id)}>
              {TITLES[id]}
            </button>
          ))}
        </span>
        <span className={styles.tools} role="toolbar" aria-label="Kalem">
          {tools.map(([t, icon, label]) => (
            <button key={t} className={tool === t ? styles.on : ''} onClick={() => setTool(t)} aria-label={label} aria-pressed={tool === t} title={label}>
              {icon}
            </button>
          ))}
          <button
            onClick={() => {
              if (!window.confirm(`${TITLES[tab]} sayfası tamamen silinsin mi?`)) return;
              onChange(tab, { ink: null, text: '' });
              setWipes((n) => n + 1);
            }}
            aria-label="Sayfayı temizle"
            title="Sayfayı temizle"
          >
            🗑
          </button>
        </span>
      </nav>
      <div className={styles.paper}>
        <p className={styles.pageTitle}>{TITLES[tab]}</p>
        <textarea
          ref={text}
          className={styles.text}
          value={page.text}
          onChange={(e) => onChange(tab, { ...page, text: e.target.value })}
          aria-label={`${TITLES[tab]} sayfasına yaz`}
          spellCheck={false}
          tabIndex={tool === 'type' ? 0 : -1}
        />
        <InkLayer key={`${tab}-${wipes}`} page={page} tool={tool} onInk={(ink) => onChange(tab, { ...page, ink })} />
      </div>
      <p className={styles.hint}>{tool === 'type' ? 'Klavyeyle yazıyorsun. Kaleme dönmek için 🖊.' : 'Fareyle ya da parmağınla yaz. Klavye için ⌨️.'}</p>
    </aside>
  );
}
