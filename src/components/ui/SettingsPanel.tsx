import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useGameStore } from '../../game/store';
import { audioEngine } from '../../audio/audioEngine';
import { Button } from './Button';
import { TEXT_SCALES, applyTextScale, loadTextScale } from '../../game/textScale';
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

interface VolumeRowProps {
  id: string;
  icon: ReactNode;
  title: string;
  hint: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
  onCommit?: () => void;
}

function VolumeRow({ id, icon, title, hint, value, disabled, onChange, onCommit }: VolumeRowProps) {
  const percent = Math.round(value * 100);
  return (
    <div className={`${styles.row} ${disabled ? styles.rowDisabled : ''}`}>
      <div className={styles.rowIcon}>{icon}</div>
      <div className={styles.rowBody}>
        <div className={styles.rowHead}>
          <label htmlFor={id} className={styles.rowTitle}>
            {title}
          </label>
          <span className={`${styles.rowValue} mono`}>{percent === 0 ? 'Kapalı' : `%${percent}`}</span>
        </div>
        <div className={styles.rowHint}>{hint}</div>
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
      </div>
    </div>
  );
}

/** Pause menu: resumes the game and holds the audio mix controls. */
export function SettingsPanel({ onResume }: { onResume: () => void }) {
  const musicVolume = useGameStore((s) => s.musicVolume);
  const seed = useGameStore((s) => s.seed);
  const sfxVolume = useGameStore((s) => s.sfxVolume);
  const muted = useGameStore((s) => s.muted);
  const setMusicVolume = useGameStore((s) => s.setMusicVolume);
  const setSfxVolume = useGameStore((s) => s.setSfxVolume);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const restart = useGameStore((s) => s.restart);
  const [confirmHome, setConfirmHome] = useState(false);
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
          <div>
            <div className={styles.eyebrow}>Oyun duraklatıldı · Zaman durdu</div>
            <h2 id="settings-title" className={styles.title}>
              Ayarlar
            </h2>
          </div>
          <span className={`${styles.kbd} mono`}>ESC</span>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>Ses Karışımı</span>
            <label className={styles.switch}>
              <span>Tüm sesler</span>
              <input type="checkbox" checked={!muted} onChange={toggleMute} />
              <span className={styles.switchTrack} aria-hidden="true">
                <span className={styles.switchThumb} />
              </span>
            </label>
          </div>

          <VolumeRow
            id="music-volume"
            icon={<MusicGlyph />}
            title="Müzik"
            hint="Arka plan müziği · molada ve duraklatmada otomatik kısılır"
            value={musicVolume}
            disabled={muted}
            onChange={setMusicVolume}
          />
          <VolumeRow
            id="sfx-volume"
            icon={<SfxGlyph />}
            title="Ses Efektleri"
            hint="Arayüz, damga, yapay zeka analizi ve ortam sesleri"
            value={sfxVolume}
            disabled={muted}
            onChange={setSfxVolume}
            onCommit={() => audioEngine.playStamp('approve')}
          />
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>Okuma</span>
          </div>
          <div className={styles.row}>
            <div className={styles.rowIcon}>
              <TextGlyph />
            </div>
            <div className={styles.rowBody}>
              <div className={styles.rowHead}>
                <span className={styles.rowTitle}>Metin boyutu</span>
              </div>
              <div className={styles.rowHint}>CV'ler, mesajlar, e-postalar ve diyaloglar</div>
              <div className={styles.segmented} role="radiogroup" aria-label="Metin boyutu">
                {TEXT_SCALES.map((s) => (
                  <button
                    key={s.value}
                    role="radio"
                    aria-checked={textScale === s.value}
                    className={textScale === s.value ? styles.segOn : undefined}
                    style={{ fontSize: `${13 * s.value}px` }}
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
        </div>

        <Button variant="gold" onClick={onResume} className={styles.resume}>
          Devam Et
        </Button>

        {confirmHome ? (
          <div className={styles.confirmHome}>
            <span>Oyundaki ilerlemen kaybolacak. Emin misin?</span>
            <div className={styles.confirmActions}>
              <Button variant="ghost" onClick={() => setConfirmHome(false)}>
                Vazgeç
              </Button>
              <Button variant="danger" onClick={restart}>
                Ana Sayfaya Dön
              </Button>
            </div>
          </div>
        ) : (
          <button className={styles.homeLink} onClick={() => setConfirmHome(true)}>
            ⌂ Ana Sayfaya Dön
          </button>
        )}
        <p className={`${styles.seed} mono`} title="Aynı haftayı yeniden oynamak için adresin sonuna ?seed=… ekle">
          Oyun kodu #{seed}
        </p>
      </div>
    </div>
  );
}
