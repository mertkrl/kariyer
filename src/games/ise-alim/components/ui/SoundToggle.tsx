import { useGameStore } from '../../game/store/store';
import { SpeakerIcon, SpeakerMuteIcon } from './ControlIcons';
import styles from './SoundToggle.module.css';

interface SoundToggleProps {
  variant?: 'fixed' | 'inline';
}

export function SoundToggle({ variant = 'fixed' }: SoundToggleProps) {
  const muted = useGameStore((s) => s.muted);
  const toggleMute = useGameStore((s) => s.toggleMute);

  const classes = variant === 'inline' ? `${styles.toggle} ${styles.inline}` : styles.toggle;

  return (
    <button
      className={classes}
      onClick={toggleMute}
      aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}
      title={muted ? 'Sesi aç' : 'Sesi kapat'}
    >
      {muted ? <SpeakerMuteIcon className={styles.glyph} /> : <SpeakerIcon className={styles.glyph} />}
    </button>
  );
}
