import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useGameStore } from '../../game/store/store';
import { audioEngine } from '../../audio/audioEngine';
import { TEXT_SCALES, applyTextScale, loadTextScale } from '../../game/lib/textScale';
import styles from './SettingsPanel.module.css';

function MusicGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </svg>
  );
}

function TextGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19 9 5l5 14M6 14h6" />
      <path d="M15 19l3-8 3 8M16 16.5h4" />
    </svg>
  );
}

function SfxGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h2l3-7 4 14 3-9 2 4h4" />
    </svg>
  );
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** Oyunun her kısayolu, çalıştığı yerle. Düğmelerin kendisi tuşlarını göstermez. */
const SHORTCUTS: { where: string; keys: [string[], string][] }[] = [
  {
    where: 'Masada',
    keys: [
      [['B'], 'Bilgisayara geç'],
      [['T'], 'Cep telefonunu al'],
      [['H'], 'Masa telefonunu aç (çalıyorsa)'],
      [['K'], 'Kahveden bir yudum'],
      [['Ç'], 'Çekmeceyi aç'],
      [['←', '↑', '→', '↓'], 'Masadaki nesneler arasında gez'],
    ],
  },
  {
    where: 'İşe Alım Portalı',
    keys: [
      [['M'], 'Mülakata çağır'],
      [['R'], 'Reddet'],
      [['S'], 'Sonraki aday'],
      [[isMac ? '⌘' : 'Ctrl', 'Z'], 'Kararı geri al'],
    ],
  },
  {
    where: 'Her yerde',
    keys: [
      [['Esc'], 'Bilgisayardan masaya dön · telefonu ya da pencereyi kapat · bu paneli kapat'],
      [['Boşluk'], 'Toplantıda konuşmayı ilerlet'],
    ],
  },
];

interface VolumeRowProps {
  id: string;
  icon: ReactNode;
  title: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
  onCommit?: () => void;
}

/** Tek satır: simge, ad, kaydırıcı ve değer. */
function VolumeRow({ id, icon, title, value, disabled, onChange, onCommit }: VolumeRowProps) {
  const percent = Math.round(value * 100);
  return (
    <div className={`${styles.row} ${disabled ? styles.rowDisabled : ''}`}>
      <span className={styles.rowIcon} aria-hidden="true">
        {icon}
      </span>
      <label htmlFor={id} className={styles.rowTitle}>
        {title}
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={percent}
        disabled={disabled}
        className={styles.slider}
        style={{ '--fill': `${percent}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        aria-valuetext={percent === 0 ? 'Kapalı' : `yüzde ${percent}`}
      />
      <span className={`${styles.rowValue} mono`}>{percent === 0 ? '—' : percent}</span>
    </div>
  );
}

/** Duraklatma menüsü: oyunu sürdürür ve ses karışımı kontrollerini tutar. */
export function SettingsPanel({ onResume }: { onResume: () => void }) {
  const musicVolume = useGameStore((s) => s.musicVolume);
  const sfxVolume = useGameStore((s) => s.sfxVolume);
  const muted = useGameStore((s) => s.muted);
  const setMusicVolume = useGameStore((s) => s.setMusicVolume);
  const setSfxVolume = useGameStore((s) => s.setSfxVolume);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const restart = useGameStore((s) => s.restart);
  const [confirmHome, setConfirmHome] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [textScale, setTextScale] = useState(loadTextScale);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onResume();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onResume]);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 id="settings-title" className={styles.title}>
            Ayarlar
          </h2>
          <span className={styles.paused}>Duraklatıldı</span>
        </div>

        <div className={styles.group}>
          <label className={styles.switchRow}>
            <span>Ses</span>
            <input type="checkbox" checked={!muted} onChange={toggleMute} />
            <span className={styles.switchTrack} aria-hidden="true">
              <span className={styles.switchThumb} />
            </span>
          </label>
          <VolumeRow id="music-volume" icon={<MusicGlyph />} title="Müzik" value={musicVolume} disabled={muted} onChange={setMusicVolume} />
          <VolumeRow
            id="sfx-volume"
            icon={<SfxGlyph />}
            title="Efektler"
            value={sfxVolume}
            disabled={muted}
            onChange={setSfxVolume}
            onCommit={() => audioEngine.playStamp('approve')}
          />
          <div className={styles.row}>
            <span className={styles.rowIcon} aria-hidden="true">
              <TextGlyph />
            </span>
            <span className={styles.rowTitle} id="text-size">
              Metin
            </span>
            <div className={styles.segmented} role="radiogroup" aria-labelledby="text-size">
              {TEXT_SCALES.map((s) => (
                <button
                  key={s.value}
                  role="radio"
                  aria-checked={textScale === s.value}
                  className={textScale === s.value ? styles.segOn : undefined}
                  onClick={() => {
                    setTextScale(s.value);
                    applyTextScale(s.value);
                    audioEngine.playUi('click');
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          className={styles.btn}
          aria-expanded={showKeys}
          onClick={() => {
            audioEngine.playUi('click');
            setShowKeys((v) => !v);
          }}
        >
          {showKeys ? 'Kısayolları gizle' : 'Kısayolları göster'}
        </button>
        {showKeys && (
        <div className={styles.shortcuts}>
          {SHORTCUTS.map((group) => (
            <div key={group.where} className={styles.shortcutGroup}>
              <div className={styles.shortcutWhere}>{group.where}</div>
              <dl className={styles.shortcutList}>
                {group.keys.map(([keys, what]) => (
                  <div key={what} className={styles.shortcutRow}>
                    <dt>
                      {keys.map((k) => (
                        <kbd key={k} className={`${styles.key} mono`}>
                          {k}
                        </kbd>
                      ))}
                    </dt>
                    <dd>{what}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
        )}

        {confirmHome ? (
          <div className={styles.confirmHome}>
            <span>İlerlemen kaybolacak. Emin misin?</span>
            <div className={styles.actions}>
              <button className={styles.btn} onClick={() => setConfirmHome(false)}>
                Vazgeç
              </button>
              <button className={`${styles.btn} ${styles.btnDanger}`} onClick={restart}>
                Ana sayfa
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.actions}>
            <button className={styles.btn} onClick={() => setConfirmHome(true)}>
              Ana sayfaya dön
            </button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onResume}>
              Devam et
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
