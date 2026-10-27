import { useRef, type CSSProperties, type ReactNode } from 'react';
import { startDrag, startResize, type Pos, type Size } from './drag';
import { sfx } from './sfx';
import w from './Window.module.css';

/*
 * Cüzdan TL'nin penceresi: başlık çubuğu, simge, büyüt ve kapat düğmeleri. Görünüşü temadan gelir (mavi,
 * cam ya da düz). Başlıktan sürüklenir, tıklanınca öne gelir; büyüt düğmesi ya da başlığa çift
 * tıklama masaüstünü kaplatır, sağ alt köşeden boyutlandırılır.
 */

export function Window({
  title,
  icon,
  active,
  z,
  pos,
  width,
  onFocus,
  onMove,
  onClose,
  label,
  children,
  shake = false,
  className = '',
  size,
  maximized = false,
  onMaximize,
  onResize,
}: {
  title: string;
  icon?: ReactNode;
  active: boolean;
  z: number;
  pos: Pos;
  width: number;
  onFocus: () => void;
  onMove: (p: Pos) => void;
  onClose?: () => void;
  /** Ekran okuyucunun duyduğu ad; yoksa başlık. */
  label?: string;
  children: ReactNode;
  shake?: boolean;
  className?: string;
  /** Elle verilmiş boyut; yoksa genişlik `width`, yükseklik içerik kadar. */
  size?: Size;
  maximized?: boolean;
  onMaximize?: () => void;
  onResize?: (s: Size) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const box = maximized ? { left: 0, top: 0, width: '100%', height: '100%' } : { left: pos.x, top: pos.y, width: size?.w ?? width, height: size?.h };
  return (
    <section
      ref={ref}
      className={`${w.win} ${active ? '' : w.inactive} ${shake ? w.shake : ''} ${maximized ? w.max : ''} ${size || maximized ? `${w.sized} cz-sized` : ''} ${className}`}
      style={{ ...box, zIndex: z } as CSSProperties}
      onPointerDown={onFocus}
      aria-label={label ?? title}
      role="dialog"
    >
      <div className={w.bar} onPointerDown={(e) => !maximized && startDrag(e, pos, onMove)} onDoubleClick={(e) => !(e.target as HTMLElement).closest('button') && onMaximize?.()}>
        {icon && (
          <span className={w.barIcon} aria-hidden="true">
            {icon}
          </span>
        )}
        <span className={w.title}>{title}</span>
        <span className={w.ctl} aria-hidden="true">
          _
        </span>
        {onMaximize && (
          <button type="button" className={w.ctl} aria-label={maximized ? `${title} penceresini küçült` : `${title} penceresini büyüt`} onClick={(e) => (e.stopPropagation(), sfx.click(), onMaximize())}>
            {maximized ? '❐' : '□'}
          </button>
        )}
        {onClose && (
          <button
            type="button"
            className={`${w.ctl} ${w.close}`}
            aria-label={`${title} penceresini kapat`}
            onClick={(e) => {
              e.stopPropagation();
              sfx.click();
              onClose();
            }}
          >
            ✕
          </button>
        )}
      </div>
      <div className={w.body}>{children}</div>
      {onResize && !maximized && (
        <span
          className={w.grip}
          aria-hidden="true"
          onPointerDown={(e) => {
            const r = ref.current!.getBoundingClientRect();
            startResize(e, { w: r.width, h: r.height }, onResize);
          }}
        />
      )}
    </section>
  );
}
