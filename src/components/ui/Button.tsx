import type { ButtonHTMLAttributes, MouseEvent } from 'react';
import { audioEngine } from '../../audio/audioEngine';
import styles from './Button.module.css';

type Variant = 'primary' | 'danger' | 'ghost' | 'gold';
export type ButtonSound = 'start' | 'confirm' | 'connect' | 'click' | 'none';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Feedback sound; defaults to a neutral click. Use 'none' when the action plays its own sound. */
  sound?: ButtonSound;
}

export function Button({ variant = 'primary', sound = 'click', className, onClick, ...rest }: ButtonProps) {
  const classes = [styles.button, styles[variant], className].filter(Boolean).join(' ');
  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (sound !== 'none') {
      audioEngine.init(); // first click may be the one that unlocks audio
      audioEngine.playUi(sound);
    }
    onClick?.(e);
  }
  return <button className={classes} onClick={handleClick} {...rest} />;
}
