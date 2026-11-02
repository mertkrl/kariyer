import { useEffect, useRef, useState } from 'react';
import { loadProgress, markPlayed } from '../../arcade/progress';
import { drawResultCard, svgImage, type ResultCard } from '../../arcade/share';
import { ShareButton } from '../../arcade/ShareButton';
import { currentDesign, PRESETS, type Design } from './model';
import { screenPng } from './png';
import { Screen } from './Screen';
import { shareUrl } from './share';
import { paintEkranCard } from './shareCard';
import { readability } from './theme';
import styles from './Tools.module.css';

/*
 * Paylaş penceresi: solda inecek kartın önizlemesi, sağda üç yol: kartı paylaş, canlı ekranın
 * bağlantısını kopyala, yalnız ekranın PNG'sini indir. Kartın "eskisi" fotoğrafı için ekranın bugünkü
 * hâli görünmez bir kopyada çizilir; yeni hâl editördeki ekranın o anki karesidir.
 */

const pad = (n: number) => String(n).padStart(2, '0');

export function ShareSheet({ design, seconds, now, screen, onClose }: { design: Design; seconds: number; now: Date; screen: () => SVGSVGElement | null; onClose: () => void }) {
  const before = useRef<SVGSVGElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // kart açıldığı anın karesiyle çizilir; canlı akış arkada sürer
  const [frozen] = useState({ seconds, now });
  const preset = PRESETS.find((p) => p.id === design.preset)!;

  const make = async (): Promise<ResultCard> => {
    const after = screen();
    if (!after || !before.current) throw new Error('Ekran yok');
    const [a, b, url] = await Promise.all([svgImage(after), svgImage(before.current), link ? Promise.resolve(link) : shareUrl(design)]);
    const d = new Date();
    const { score } = readability(design);
    return {
      route: 'ekran',
      kicker: 'Ekran İhalesi',
      title: preset.title,
      stats: [],
      question: 'Sen olsan nasıl yapardın?',
      text: `${preset.title} ekranını baştan tasarladım, canlı hâli burada: ${url} Sen olsan nasıl yapardın?`,
      paint: paintEkranCard({
        title: preset.title,
        place: preset.place,
        transit: design.preset !== 'hastane',
        before: b,
        after: a,
        score,
        widgets: design.widgets.length,
        motion: design.motion === 'gecisli' ? 'Geçişli' : 'Sabit',
        accent: design.accent,
        date: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`,
        no: `${d.getFullYear() % 100}-${(design.widgets.length * 37 + score).toString().padStart(4, '0')}`,
      }),
    };
  };

  useEffect(() => {
    if (!loadProgress().played.ekran) markPlayed('ekran', 'Ekran tasarlandı');
    let live = true;
    void shareUrl(design).then((u) => live && setLink(u));
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
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      live = false;
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
    // pencere her açılışta bir kez çizer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* pano kapalı: kutudan seçilir */
    }
  };
  const png = async () => {
    const svg = screen();
    if (!svg) return;
    const url = URL.createObjectURL(await screenPng(svg));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ekran-${design.preset}.png`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className={styles.backdrop} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="Ekranı paylaş">
        <button type="button" className={styles.close} onClick={onClose} aria-label="Kapat">
          ✕
        </button>
        <div className={styles.cardWrap}>
          <canvas ref={canvas} className={styles.card} data-ready={ready} aria-label="Paylaşılacak kartın önizlemesi" />
        </div>
        <div className={styles.side}>
          <p className={styles.kicker}>Teslim zamanı</p>
          <h2>Ekranı paylaş</h2>
          <p className={styles.sub}>Yeni ekranın duvarda, eskisi köşede. Arkadaşın bağlantıyı açınca ekranı canlı görür, isterse üstünden düzenler.</p>
          <ShareButton className={styles.big} label="Kartı paylaş" make={make} />
          <div className={styles.linkRow}>
            <input readOnly value={link ?? 'Bağlantı hazırlanıyor…'} onFocus={(e) => e.currentTarget.select()} aria-label="Canlı ekranın bağlantısı" />
            <button type="button" onClick={copy} disabled={!link}>
              {copied ? 'Kopyalandı ✓' : 'Kopyala'}
            </button>
          </div>
          <div className={styles.minor}>
            {link && (
              <a href={link} target="_blank" rel="noopener">
                Yeni sekmede aç
              </a>
            )}
            <button type="button" onClick={png}>
              Yalnız ekranın PNG'si
            </button>
          </div>
        </div>
        <div className={styles.offscreen} aria-hidden="true">
          <Screen ref={before} design={currentDesign(design.preset)} seconds={frozen.seconds} now={frozen.now} />
        </div>
      </div>
    </div>
  );
}
