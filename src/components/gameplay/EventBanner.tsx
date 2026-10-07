import { useGameStore } from '../../game/store/store';
import styles from '../../screens/GameplayScreen.module.css';

/** Günün kesintileri: her şeyin üstünde bir elektrik kesintisi ya da geri kalanlar için bir bildirim. */
export function EventBanner({ onBreak }: { onBreak: boolean }) {
  const activeEvent = useGameStore((s) => s.activeEvent);
  if (!activeEvent || onBreak) return null;
  if (activeEvent.kind === 'power')
    return (
      <div className={styles.powerOut} role="alert">
        <div className={styles.powerOutTitle}>⚡ Elektrik kesildi</div>
        <div className={styles.powerOutText}>Jeneratör devreye giriyor… Ekranlar kapalı, bu sırada karar veremezsin. Saat ise işliyor.</div>
      </div>
    );
  return (
    <div key={activeEvent.kind + activeEvent.until} className={`${styles.eventToast} ${activeEvent.kind === 'calendar' || activeEvent.kind === 'weather' ? styles.eventCalm : ''}`} role="status">
      {activeEvent.text ??
        (activeEvent.kind === 'meeting'
          ? '📅 Hakan Bey seni "5 dakikalık" acil toplantıya çağırdı — yarım saat gitti.'
          : '🖥 IT arızası! Yapay zekâ sistemi yaklaşık 1 saat devre dışı.')}
    </div>
  );
}
