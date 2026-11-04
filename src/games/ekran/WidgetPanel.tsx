import { FONTS, GRID, SCENES, KINDS, W, type Align, type Design, type FontId, type Kind, type SceneId, type Widget } from './model';
import { backdropOf, bestInk, contrast, hasReadableText } from './theme';
import styles from './EkranGame.module.css';
import tools from './Tools.module.css';

/* Atölyenin sağ paneli, seçili bileşen için: yazı, renk, hizalama, katman ve okunurluk ayarları. */

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

export function WidgetPanel({ design, wd, patch, onDelete, onCopy, onLayer }: { design: Design; wd: Widget; patch: (p: Partial<Widget>, commit?: boolean) => void; onDelete: () => void; onCopy: () => void; onLayer: (dir: 1 | -1) => void }) {
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
