import type { KeyboardEvent, ReactNode } from 'react';
import styles from './BreakRoom.module.css';

interface HitProps {
  label: string;
  onActivate: () => void;
  bumped?: boolean;
  children: ReactNode;
}

/** Clickable, keyboard-accessible SVG group. Never put a transform attribute on it — CSS animates it. */
export function Hit({ label, onActivate, bumped, children }: HitProps) {
  function onKeyDown(e: KeyboardEvent<SVGGElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  }
  return (
    <g
      className={`${styles.hit} ${bumped ? styles.bump : ''}`}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onActivate}
      onKeyDown={onKeyDown}
    >
      <title>{label}</title>
      {children}
    </g>
  );
}

export function Steam({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className={styles.steamGroup} pointerEvents="none">
      {[-9, 0, 9].map((dx, i) => (
        <path
          key={dx}
          d={`M${dx},0 c-6,-8 6,-16 0,-24 c-6,-8 6,-16 0,-24`}
          className={styles.steam}
          style={{ animationDelay: `${i * 0.7}s` }}
        />
      ))}
    </g>
  );
}
