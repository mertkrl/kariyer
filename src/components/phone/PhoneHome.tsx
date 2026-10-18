import { AppIcon, type IconId } from './AppIcons';
import { APPS, DOCK, type AppId } from './phoneShared';
import styles from './PhoneHome.module.css';

/** Telefonun ana ekranı: saat aracı, uygulamalar ve dok. */
export function PhoneHome({ dayName, clock, totalUnread, dmPending, onOpen }: { dayName: string; clock: string; totalUnread: number; dmPending: number; onOpen: (app: AppId | 'chats') => void }) {
  const icon = (app: (typeof APPS)[number], inDock = false) => (
    <button key={app.id} className={styles.appIcon} onClick={() => onOpen(app.id)} aria-label={app.label}>
      <span className={styles.appGlyph}>
        <AppIcon id={app.id as IconId} />
        {app.id === 'chats' && totalUnread > 0 && <span className={styles.appBadge}>{totalUnread}</span>}
        {app.id === 'social' && dmPending > 0 && <span className={styles.appBadge}>{dmPending}</span>}
      </span>
      {!inDock && <span className={styles.appLabel}>{app.label}</span>}
    </button>
  );
  return (
    <div className={styles.home}>
      <div className={styles.widget}>
        <span className={styles.widgetDay}>{dayName}</span>
        <strong className={styles.widgetTime}>{clock}</strong>
        <span className={styles.widgetNote}>Tavrinsa Labs · mesai 08:00–17:00</span>
      </div>
      <div className={styles.appGrid}>{APPS.filter((a) => !DOCK.includes(a.id)).map((a) => icon(a))}</div>
      <div className={styles.pageDots} aria-hidden="true">
        <i className={styles.pageDotOn} />
        <i />
      </div>
      <div className={styles.dockBar}>{APPS.filter((a) => DOCK.includes(a.id)).map((a) => icon(a, true))}</div>
    </div>
  );
}
