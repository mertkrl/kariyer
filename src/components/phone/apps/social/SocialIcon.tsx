import styles from '../SocialApp.module.css';

/** Kariyergram'ın sekme çubuğu ve gönderi eylemleri için çizgi simgeler. */

export type IconName = 'home' | 'search' | 'heart' | 'heartFill' | 'user' | 'comment' | 'send' | 'bookmark' | 'bookmarkFill';

export function Icon({ name }: { name: IconName }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden>
      {name === 'home' && <path {...common} d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z" />}
      {name === 'search' && (
        <g {...common}>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m20 20-4.8-4.8" />
        </g>
      )}
      {(name === 'heart' || name === 'heartFill') && (
        <path
          {...common}
          fill={name === 'heartFill' ? 'currentColor' : 'none'}
          d="M12 20.5s-7.5-4.6-9.2-9.1C1.5 7.8 3.8 4.5 7.1 4.5c2 0 3.4 1.1 4.9 2.9 1.5-1.8 2.9-2.9 4.9-2.9 3.3 0 5.6 3.3 4.3 6.9-1.7 4.5-9.2 9.1-9.2 9.1z"
        />
      )}
      {name === 'user' && (
        <g {...common}>
          <circle cx="12" cy="8.5" r="4" />
          <path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6" />
        </g>
      )}
      {name === 'comment' && <path {...common} d="M20.5 11.5a8.5 8 0 0 1-12.3 7.2L3.5 20l1.4-4.2A8 8 0 1 1 20.5 11.5z" />}
      {name === 'send' && <path {...common} d="M21 3 10 14M21 3l-7 18-4-7-7-4z" />}
      {(name === 'bookmark' || name === 'bookmarkFill') && (
        <path {...common} fill={name === 'bookmarkFill' ? 'currentColor' : 'none'} d="M6 3.5h12v17l-6-4.5-6 4.5z" />
      )}
    </svg>
  );
}
