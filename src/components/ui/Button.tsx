import type { ButtonHTMLAttributes, MouseEvent } from 'react';
import { audioEngine } from '../../audio/audioEngine';
import styles from './Button.module.css';

type Variant = 'primary' | 'danger' | 'ghost' | 'gold';
export type ButtonSound = 'start' | 'confirm' | 'connect' | 'click' | 'none';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Geri bildirim sesi; varsayılanı nötr bir tık. Eylem kendi sesini çalıyorsa 'none' kullan. */
  sound?: ButtonSound;
}

export function Button({ variant = 'primary', sound = 'click', className, onClick, ...rest }: ButtonProps) {
  const classes = [styles.button, styles[variant], className].filter(Boolean).join(' ');
  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (sound !== 'none') {
      audioEngine.init(); // ilk tık sesi açan tık olabilir
      audioEngine.playUi(sound);
    }
    onClick?.(e);
  }
  return <button className={classes} onClick={handleClick} {...rest} />;
}
