import styles from './Shutter.module.css';

/*
 * Dükkânın kepengi: delikli galvaniz sac lameller, cıvatalı yan raylar, üstte kepenk kutusu, altta
 * kulplu ve asma kilitli alt profil ile kaldırım. Üstünde boyayla yazılmış dükkân adı, şablonla
 * sıkılmış "park etmeyiniz" yazısı ve bantlı bir kâğıt. Açılırken lameller kutuya sarılır, kutu
 * sonra kaybolur. Sesi oyun çalar (sfx.shutter).
 */
export function Shutter({ down }: { down: boolean }) {
  return (
    <div className={`${styles.shutter} ${down ? '' : styles.up}`} aria-hidden={!down} aria-label="Kepenk">
      <div className={styles.curtain}>
        <div className={styles.slats}>
          <p className={styles.paint}>
            HACI EMMİ
            <span>BAKKALİYE</span>
          </p>
          <p className={styles.stencil}>KEPENK ÖNÜNE ARAÇ PARK ETMEYİNİZ</p>
          <p className={styles.note}>
            Açılış 08.00
            <br />
            Kapanış 19.00
            <small>Ekmek sabah gelir</small>
          </p>
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
