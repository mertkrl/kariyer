import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { flushSync } from 'react-dom';
import { drawResultCard, svgImage, type ResultCard } from '../../arcade/share';
import { markPlayed } from '../../arcade/progress';
import { Finale } from '../../arcade/Finale';
import { ShareButton } from '../../arcade/ShareButton';
import { GRID, GROUND, H, ITEM_KINDS, MAX_ITEMS, SIGN_KINDS, W, applySignCode, colorCount, draftKey, isJunk, itemsOn, makeItem, snap, withoutJunk, type Design, type Item, type Place, type Site, type SignKind, type Spec } from './model';
import { BuildingPanel, ColorField, ScoreStrip, SitePanel } from './Inspector';
import { makeover, openDefects, type Report } from './report';
import { SceneDefs, SceneLayers, type DragMode, type Pick } from './Scene';
import { paintMeydanCard } from './shareCard';
import styles from './MeydanGame.module.css';

/*
 * Serbest mod: meydanı istediğin gibi düzenle. Binaya tıklayınca renkleri, mimari seçenekleri
 * (cephe, doğrama, korkuluk, çatı, saçak, vitrin, ışık) ve yapısal seçenekleri (güçlendirme, kaçak
 * kat); boşluğa tıklayınca meydanın zemini, yeşili ve direkleri; tabelaya tıklayınca yazısı ve
 * renkleri değişir, sürüklenir, köşesinden boyutlanır, sökülür.
 * Her adım geri alınabilir; taslak tarayıcıda saklanır. Karşılaştırma, meydanın bugünkü hâliyle
 * senin hâlini bir sürgüyle yan yana gösterir. Paylaşılan kart ikisini alt alta koyar: o an, ekran
 * dışında, seçim çizgileri olmadan bir kez daha çizilir.
 */

interface History {
  past: Design[];
  present: Design;
  future: Design[];
}

/** Telefonda yakınlaşınca sahnenin büyüme oranı. */
const ZOOM = 2.2;

type Drag = { id: string; mode: DragMode; px: number; py: number; start: Item; before: Design };

export function Editor({ place, initial }: { place: Place; initial: Design }) {
  const [hist, setHist] = useState<History>({ past: [], present: initial, future: [] });
  const [picked, setPicked] = useState<Pick | null>(null);
  const [compare, setCompare] = useState(false);
  const [split, setSplit] = useState(50);
  // önce/sonra sınırı resmin üstünden de sürüklenir
  const splitting = useRef(false);
  const splitAt = (e: ReactPointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setSplit(Math.round(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100))));
  };
  const [note, setNote] = useState<string | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [shot, setShot] = useState(false);
  // telefonda meydan yakından düzenlenir: sahne iki kat büyür, altındaki sürgüyle yana kaydırılır
  const [zoom, setZoom] = useState(() => window.matchMedia?.('(max-width: 760px)').matches ?? false);
  const [pan, setPan] = useState(50);
  const shotBefore = useRef<SVGSVGElement>(null);
  const shotAfter = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);
  const design = hist.present;
  const item = picked?.type === 'item' ? (design.items.find((it) => it.id === picked.id) ?? null) : null;
  const building = picked?.type === 'building' ? (place.buildings.find((b) => b.id === picked.id) ?? null) : null;
  const spec = building ? design.specs.find((p) => p.id === building.id) : undefined;
  const report = makeover(place, design);

  const set = (d: Design) => setHist((h) => ({ past: [...h.past, h.present].slice(-100), present: d, future: [] }));
  const undo = () => setHist((h) => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h));
  const redo = () => setHist((h) => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h));
  const patchItem = (id: string, p: Partial<Item>) => set({ ...design, items: design.items.map((it) => (it.id === id ? { ...it, ...p } : it)) });
  const patchSpec = (id: string, p: Partial<Spec>) => set({ ...design, specs: design.specs.map((pt) => (pt.id === id ? { ...pt, ...p } : pt)) });
  const patchSite = (p: Partial<Site>) => set({ ...design, site: { ...design.site, ...p } });
  const signCode = () => {
    const next = applySignCode(design, place);
    const gone = design.items.length - next.items.length;
    set(next);
    if (item && !next.items.some((it) => it.id === item.id)) setPicked(null);
    flash(gone ? `${gone} afiş ve folyo söküldü, panolar hizaya girdi.` : 'Panolar vitrin bandına hizalandı.');
  };
  const removeItem = (id: string) => {
    set({ ...design, items: design.items.filter((it) => it.id !== id) });
    setPicked(null);
  };
  const toFront = (id: string) => {
    const it = design.items.find((x) => x.id === id);
    if (it) set({ ...design, items: [...design.items.filter((x) => x.id !== id), it] });
  };
  const duplicate = (it: Item) => {
    if (design.items.length >= MAX_ITEMS) return flash(`Bir meydana en fazla ${MAX_ITEMS} öğe asılabilir.`);
    const copy = makeItem(it.kind, { ...it, id: undefined, x: it.x + GRID * 4, y: it.y + GRID * 4 });
    set({ ...design, items: [...design.items, copy] });
    setPicked({ type: 'item', id: copy.id });
  };
  /** Yakındayken sahneyi bir noktaya kaydırır (meydan genişliğinin 1/ZOOM'u görünür). */
  const focusX = (x: number) => setPan(Math.round(Math.min(100, Math.max(0, ((x / W - 0.5 / ZOOM) / (1 - 1 / ZOOM)) * 100))));
  const add = (kind: SignKind) => {
    if (design.items.length >= MAX_ITEMS) return flash(`Bir meydana en fazla ${MAX_ITEMS} öğe asılabilir.`);
    const base = ITEM_KINDS[kind].base;
    // seçili bir bina varsa yeni tabela onun vitrininin üstüne, yoksa meydanın ortasına asılır
    const x = building ? building.x + (building.w - base.w) / 2 : (W - base.w) / 2;
    const y = building ? GROUND - building.groundH - base.h / 2 : GROUND - 160;
    const it = makeItem(kind, { x: snap(x), y: snap(y) });
    set({ ...design, items: [...design.items, it] });
    setPicked({ type: 'item', id: it.id });
    focusX(x + base.w / 2);
  };
  const clearJunk = () => {
    const n = design.items.filter((it) => isJunk(it.kind)).length;
    if (!n) return flash('Sökülecek klima, anten, depo ya da kablo kalmadı.');
    set(withoutJunk(design));
    if (item && isJunk(item.kind)) setPicked(null);
    flash(`${n} parça söküldü.`);
  };
  const clearFacade = () => {
    if (!building) return;
    const gone = new Set(itemsOn(design.items, building).map((it) => it.id));
    if (!gone.size) return flash('Bu cephede sökülecek bir şey yok.');
    set({ ...design, items: design.items.filter((it) => !gone.has(it.id)) });
    flash(`${gone.size} parça söküldü.`);
  };
  const reset = () => {
    set(place.original);
    setPicked(null);
    flash('Meydan bugünkü hâline döndü. Geri almak için “Geri al”.');
  };

  const flash = (message: string) => {
    setNote(message);
    window.setTimeout(() => setNote((n) => (n === message ? null : n)), 2600);
  };

  // taslak her değişiklikte saklanır; gizli pencerede depolama yoksa sessizce geçilir
  useEffect(() => {
    try {
      localStorage.setItem(draftKey(place.id), JSON.stringify(design));
    } catch {
      /* depolama yok */
    }
  }, [design, place.id]);

  // klavye: sök, ok tuşlarıyla kaydır, geri al / yinele, çoğalt
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        return e.shiftKey ? redo() : undo();
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        return redo();
      }
      if (e.key === 'Escape') return setPicked(null);
      if (!item || compare) return;
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        return duplicate(item);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        return removeItem(item.id);
      }
      const step = e.shiftKey ? GRID * 4 : GRID;
      const move: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      const m = move[e.key];
      if (!m) return;
      e.preventDefault();
      patchItem(item.id, { x: item.x + m[0], y: item.y + m[1] });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const scale = () => W / (svg.current?.getBoundingClientRect().width || W);

  const onItem = (id: string, e: ReactPointerEvent, mode: DragMode) => {
    e.stopPropagation();
    e.preventDefault();
    const it = design.items.find((x) => x.id === id);
    if (!it) return;
    setPicked({ type: 'item', id });
    svg.current?.setPointerCapture(e.pointerId);
    drag.current = { id, mode, px: e.clientX, py: e.clientY, start: it, before: design };
  };
  const onBuilding = (id: string, e: ReactPointerEvent) => {
    e.stopPropagation();
    setPicked({ type: 'building', id });
  };
  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const k = scale();
    const dx = (e.clientX - d.px) * k;
    const dy = (e.clientY - d.py) * k;
    const fit = e.altKey ? Math.round : snap;
    const p = d.mode === 'move' ? { x: fit(d.start.x + dx), y: fit(d.start.y + dy) } : { w: Math.max(GRID * 3, fit(d.start.w + dx)), h: Math.max(GRID * 3, fit(d.start.h + dy)) };
    setHist((h) => ({ ...h, present: { ...h.present, items: h.present.items.map((it) => (it.id === d.id ? { ...it, ...p } : it)) } }));
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    // sürükleme tek adım olarak geri alınır; hiç kımıldamadıysa geçmişe yazılmaz
    setHist((h) => {
      const now = h.present.items.find((it) => it.id === d.id);
      const moved = now && (now.x !== d.start.x || now.y !== d.start.y || now.w !== d.start.w || now.h !== d.start.h);
      return moved ? { past: [...h.past, d.before].slice(-100), present: h.present, future: [] } : h;
    });
  };

  const signs = design.items.filter((it) => !isJunk(it.kind)).length;
  const junk = design.items.length - signs;

  /** Meydan düzenlendi ve karşılaştırıldı ya da paylaşıldı: salonun defterine tik ve unvan. */
  const logMakeover = () => {
    if (report.title === 'Dokunulmamış Meydan') return;
    markPlayed('meydan', report.title);
  };

  /** Paylaşım kartı: önce/sonra o an, ekran dışında, seçim çizgileri olmadan bir kez daha çizilir. */
  const makeCard = async (): Promise<ResultCard> => {
    flushSync(() => setShot(true));
    try {
      const [before, after] = await Promise.all([svgImage(shotBefore.current!), svgImage(shotAfter.current!)]);
      const m = report;
      return {
        route: 'meydan',
        kicker: `${place.district} · ${place.title}`,
        title: m.title,
        stats: [
          { label: 'Estetik', value: `${m.scoreBefore}→${m.score}` },
          { label: 'Güvenli bina', value: `${m.safe}/${m.total}`, tone: '#3f6b63' },
          { label: 'Keşif', value: formatShort(m.cost) },
        ],
        question: 'Senin meydanın nasıl olurdu?',
        paint: paintMeydanCard({ place: `${place.district} · ${place.title}`, region: place.region, before, after, r: m, date: new Date().toLocaleDateString('tr-TR') }),
        text:
          m.signsAfter > m.signsBefore
            ? `${place.district} meydanına ${m.signsAfter - m.signsBefore} tabela daha astım. Belediye "Tabela Cenneti" dedi. Senin meydanın nasıl olurdu?`
            : `${place.district} ${place.title}: estetik puanı ${m.scoreBefore} → ${m.score}, ${m.safe}/${m.total} bina depreme hazır, ${m.junkRemoved} klima ve anten söküldü: "${m.title}". Senin meydanın nasıl olurdu?`,
      };
    } finally {
      setShot(false);
    }
  };

  const shareCard = () => {
    logMakeover();
    return makeCard();
  };

  return (
    <main className={styles.editor}>
      <aside className={styles.palette} aria-label="Tabela ve binalar">
        <h2>Tabela as</h2>
        {SIGN_KINDS.map((kind) => (
          <button key={kind} type="button" onClick={() => add(kind)} disabled={compare}>
            <span>{ITEM_KINDS[kind].label}</span>
            <small>{ITEM_KINDS[kind].hint}</small>
          </button>
        ))}
        <h2>Binalar</h2>
        {place.buildings.map((b, i) => (
          <button
            key={b.id}
            type="button"
            aria-pressed={picked?.type === 'building' && picked.id === b.id}
            onClick={() => {
              setPicked({ type: 'building', id: b.id });
              focusX(b.x + b.w / 2);
            }}
            disabled={compare}
          >
            <span className={styles.bRow}>
              <i style={{ background: design.specs[i]?.wall }} />
              {b.name}
              {openDefects(b, design.specs[i]).length > 0 && <em className={styles.badge}>{openDefects(b, design.specs[i]).length}</em>}
            </span>
          </button>
        ))}
      </aside>

      <section className={styles.work}>
        <div className={styles.toolbar} role="toolbar" aria-label="Düzenleme">
          <button type="button" onClick={undo} disabled={!hist.past.length || compare}>
            Geri al
          </button>
          <button type="button" onClick={redo} disabled={!hist.future.length || compare}>
            Yinele
          </button>
          <span className={styles.sep} />
          <button type="button" onClick={clearJunk} disabled={compare}>
            Klima, anten, kabloları sök
          </button>
          <button type="button" onClick={signCode} disabled={compare}>
            Tabela yönetmeliği
          </button>
          <button type="button" onClick={reset} disabled={compare}>
            Baştan başla
          </button>
          <span className={styles.grow} />
          <button type="button" className={compare ? styles.primary : undefined} aria-pressed={compare} onClick={() => {
              if (!compare) logMakeover();
              setCompare((c) => !c);
              setPicked(null);
            }}
          >
            {compare ? 'Düzenlemeye dön' : 'Önce / sonra'}
          </button>
          <button type="button" className={styles.zoomBtn} aria-pressed={zoom} onClick={() => setZoom((z) => !z)}>
            {zoom ? 'Uzaklaş' : 'Yakınlaş'}
          </button>
          <ShareButton className={styles.primary} label="Paylaş" make={shareCard} />
        </div>
        {shot && (
          <div className={styles.shot} aria-hidden="true">
            <svg ref={shotBefore} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
              <SceneDefs />
              <SceneLayers place={place} design={place.original} />
            </svg>
            <svg ref={shotAfter} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
              <SceneDefs />
              <SceneLayers place={place} design={design} />
            </svg>
          </div>
        )}

        <ScoreStrip r={report} />
        <div className={styles.stageWrap}>
          <div className={`${styles.stage} ${zoom ? styles.zoomed : ''}`} style={{ ['--pan' as string]: pan, ['--zoom' as string]: ZOOM }}>
            <svg
              ref={svg}
              viewBox={`0 0 ${W} ${H}`}
              className={styles.scene}
              role="img"
              aria-label={`${place.district} ${place.title}: ${compare ? 'önce ve sonra' : 'düzenleme alanı'}`}
              onPointerMove={(e) => {
                if (compare) {
                  if (splitting.current) splitAt(e);
                } else onMove(e);
              }}
              onPointerUp={() => {
                splitting.current = false;
                onUp();
              }}
              onPointerCancel={() => {
                splitting.current = false;
                onUp();
              }}
              onPointerDown={(e) => {
                if (!compare) return setPicked(null);
                splitting.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                splitAt(e);
              }}
            >
              <SceneDefs />
              {compare ? (
                <>
                  <SceneLayers place={place} design={design} />
                  <clipPath id="meydan-once">
                    <rect width={(W * split) / 100} height={H} />
                  </clipPath>
                  <g clipPath="url(#meydan-once)">
                    <SceneLayers place={place} design={place.original} />
                  </g>
                  <rect x={(W * split) / 100 - 1.5} width="3" height={H} fill="#fff" />
                  {/* tutamak: sürüklenebildiğini gösterir */}
                  <g transform={`translate(${(W * split) / 100} ${H / 2})`} style={{ cursor: 'ew-resize' }}>
                    <circle r="22" fill="#fff" stroke="#1d2733" strokeOpacity="0.25" strokeWidth="2" />
                    <path d="M -8 -7 L -14 0 L -8 7 M 8 -7 L 14 0 L 8 7" fill="none" stroke="#1d2733" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                  <Tag x={16} text="ÖNCE" />
                  <Tag x={W - 96} text="SONRA" />
                </>
              ) : (
                <SceneLayers place={place} design={design} interact={{ picked, onBuilding, onItem }} />
              )}
            </svg>
          </div>
          {zoom && (
            <label className={`${styles.slider} ${styles.panBar}`}>
              <span>◀</span>
              <input type="range" min="0" max="100" value={pan} onChange={(e) => setPan(Number(e.target.value))} aria-label="Meydanı yana kaydır" />
              <span>▶</span>
            </label>
          )}
          {compare && (
            <label className={styles.slider}>
              <span>Önce</span>
              <input type="range" min="0" max="100" value={split} onChange={(e) => setSplit(Number(e.target.value))} aria-label="Önce ve sonra sınırı" />
              <span>Sonra</span>
            </label>
          )}
          {compare && <CardPreview make={makeCard} share={shareCard} />}
          {compare && <PressRelease place={place} m={report} />}
          <p className={styles.hint}>{compare ? 'Sürgüyü kaydırarak meydanın bugünkü hâliyle karşılaştır.' : 'Binaya tıkla: cephesini, çatısını, taşıyıcısını yenile. Boşluğa tıkla: meydanın zemini ve yeşili. Tabelaya tıkla: sürükle, köşesinden boyutlandır, Delete ile sök.'}</p>
          {note && (
            <p className={styles.note} role="status">
              {note}
            </p>
          )}
        </div>
      </section>

      <aside className={styles.inspector} aria-label="Seçilenin ayarları">
        {item ? (
          <>
            <h2>{ITEM_KINDS[item.kind].label}</h2>
            {!isJunk(item.kind) && (
              <label className={styles.field}>
                <span>Yazı</span>
                <input type="text" value={item.text} maxLength={40} onChange={(e) => patchItem(item.id, { text: e.target.value })} />
              </label>
            )}
            {isJunk(item.kind) ? (
              <p className={styles.muted}>Cepheye sonradan eklenmiş bir parça. Sökmek için aşağıdaki düğmeye bas.</p>
            ) : (
              <>
                <ColorField label="Zemin" value={item.fill} onChange={(c) => patchItem(item.id, { fill: c })} />
                <ColorField label={item.kind === 'tente' ? 'Çizgi ve yazı' : 'Yazı rengi'} value={item.color} onChange={(c) => patchItem(item.id, { color: c })} />
              </>
            )}
            <div className={styles.actions}>
              <button type="button" className={styles.danger} onClick={() => removeItem(item.id)}>
                Sök
              </button>
              {!isJunk(item.kind) && (
                <button type="button" className={styles.ghost} onClick={() => duplicate(item)}>
                  Kopyala
                </button>
              )}
              <button type="button" className={styles.ghost} onClick={() => toFront(item.id)}>
                Öne al
              </button>
            </div>
          </>
        ) : building && spec ? (
          <BuildingPanel key={building.id} place={place} b={building} s={spec} onSpec={(p) => patchSpec(building.id, p)} onClear={clearFacade} />
        ) : (
          <SitePanel
            site={design.site}
            onSite={patchSite}
            onSignCode={signCode}
            stats={[
              { label: 'Tabela', value: signs },
              { label: 'Klima, anten, depo, kablo', value: junk },
              { label: 'Kullanılan renk', value: colorCount(design) },
            ]}
          />
        )}
      </aside>
    </main>
  );
}

function Tag({ x, text }: { x: number; text: string }) {
  return (
    <g pointerEvents="none">
      <rect x={x} y={16} width="80" height="28" rx="4" fill="#1f1f1f" opacity="0.75" />
      <text x={x + 40} y={30} fill="#fff" fontSize="14" fontWeight="700" fontFamily="Arial, sans-serif" textAnchor="middle" dominantBaseline="central">
        {text}
      </text>
    </g>
  );
}

/** Kısa bedel: kartın sayı sütununa sığsın. */
function formatShort(tl: number) {
  return tl >= 1e6 ? `₺${(tl / 1e6).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} mn` : `₺${Math.round(tl / 1e3)} bin`;
}

/** Önce/sonra açıkken paylaşılacak kartın kendisi: oyuncu ne paylaşacağını görür. */
function CardPreview({ make, share }: { make: () => Promise<ResultCard>; share: () => Promise<ResultCard> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    // ilk çizim sahne oturduktan sonra: ekran dışındaki kopyalar o an kurulur
    const t = window.setTimeout(async () => {
      try {
        const card = await make();
        if (live && canvas.current) {
          drawResultCard(canvas.current, card);
          setReady(true);
        }
      } catch {
        /* önizleme olmazsa paylaşım yine çalışır */
      }
    }, 60);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
    // önizleme karşılaştırma her açıldığında bir kez çizilir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <figure className={styles.preview}>
      <canvas ref={canvas} className={styles.previewCard} data-ready={ready} aria-label="Paylaşılacak kartın önizlemesi" />
      <figcaption>
        <b>Proje paftası</b>
        <span>Paylaşınca bu kart iner ya da telefonda paylaşım menüsü açılır.</span>
        <ShareButton className={styles.primary} label="Paftayı paylaş" make={share} />
      </figcaption>
    </figure>
  );
}

/** Önce/sonra açıkken belediyenin basın bülteni: oyuncunun yaptığı, kurumsal dille. */
function PressRelease({ place, m }: { place: Place; m: Report }) {
  const fewer = m.signsBefore - m.signsAfter;
  return (
    <Finale kind="news" kicker={`${place.district} Belediyesi · Basın bülteni`} title={`${place.title} yeni yüzüne kavuştu: "${m.title}"`}>
      <p>
        Belediyemizin vizyon projesi kapsamında {place.title} cephelerinde kapsamlı bir düzenleme yapılmıştır.{' '}
        {m.works.length ? `${m.works.join(', ')}. ` : ''}
        {fewer > 0 ? `${fewer} tabela kaldırılmıştır. ` : fewer < 0 ? `Esnafımızın talebiyle ${-fewer} yeni tabela eklenmiştir. ` : ''}
        Projenin keşif bedeli {formatShort(m.cost)} olup {m.safe}/{m.total} binamız depreme karşı güvenli kabul edilmektedir.
      </p>
      <p>
        {m.note} Açılış töreni hafta sonu yapılacak olup kurdele kesimi sırasında meydan trafiğe kapatılacaktır.
      </p>
    </Finale>
  );
}
