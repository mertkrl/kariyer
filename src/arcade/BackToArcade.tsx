import { SITE_NAME } from './games';
import { hrefOf } from './route';
import styles from './BackToArcade.module.css';

/** Oyunun açılış ekranından salona dönüş. */
/** `inline`: sabit durmaz, oyunun kendi üst çubuğunda akar. */
export function BackToArcade({ centered = false, inline = false }: { centered?: boolean; inline?: boolean }) {
  return (
    <a className={`${styles.back} ${centered ? styles.centered : ''} ${inline ? styles.inline : ''} mono`} href={hrefOf('arcade')}>
      ← {SITE_NAME}
    </a>
  );
}
