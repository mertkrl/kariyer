import styles from './Shutter.module.css';

/*
 * Dükkânın kepengi, yazısız: üstte cıvatalı sac kepenk kutusu ve altındaki gölge, iki yanda derin
 * U kanallı kılavuz raylar, ortada oluklu galvaniz sac lameller (her lamelde parlak kıvrım, gölgeli
 * kilit oluğu, bir sıra havalandırma deliği, hafif pas ve kir), altta kalın alt profil, krom kulplar,
 * yere inen kilit dili ve pirinç asma kilit, en altta derzli beton kaldırım ve bordür. Açılırken
 * lameller kutuya sarılır, kutu sonra kaybolur. Sesi oyun çalar (sfx.shutter).
 */
export function Shutter({ down }: { down: boolean }) {
  return (
    <div className={`${styles.shutter} ${down ? '' : styles.up}`} aria-hidden="true">
      <div className={styles.curtain}>
        <div className={styles.slats}>
          <span className={styles.wear} />
        </div>
        <div className={styles.rail}>
          <span className={styles.handle} />
          <span className={styles.hasp}>
            <span className={styles.lock} />
          </span>
          <span className={styles.handle} />
        </div>
        <div className={styles.ground} />
      </div>
      <div className={styles.box} />
    </div>
  );
}
