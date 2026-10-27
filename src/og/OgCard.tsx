import { CraneArt, DeskArt, ExamArt, FacadeArt, JunctionArt, PatchArt, ScreenArt, ShopArt, WalletArt } from '../arcade/CardArt';
import { GAMES, SITE_NAME, SITE_TAGLINE, type ArcadeGame } from '../arcade/games';
import styles from './OgCard.module.css';

/*
 * Bağlantı önizlemesi görselleri (1200×630). Oyunun bir parçası değildir: yalnızca geliştirme
 * sunucusunda `scripts/og/index.html?g=<oyun>` adresinde açılır (giriş: main.tsx) ve `npm run og`
 * onu başsız Chrome'la fotoğraflayıp `public/og/` altına yazar. Kartlar salondaki çizimlerle
 * aynıdır, böylece paylaşılan bağlantı salondaki dosyanın kendisi gibi görünür.
 */

const ART = { iseAlim: DeskArt, test: ExamArt, insaat: CraneArt, bakkal: ShopArt, ekran: ScreenArt, meydan: FacadeArt, asfalt: PatchArt, trafik: JunctionArt, cuzdan: WalletArt } as const;

const fileNo = (n: number) => `DOSYA ${String(n).padStart(3, '0')}`;

export function GameOg({ game }: { game: ArcadeGame }) {
  const Art = ART[game.route];
  return (
    <div className={styles.card} style={{ ['--card' as string]: game.color }}>
      <div className={styles.art}>
        <span className={`${styles.tab} mono`}>{fileNo(game.file)}</span>
        <Art />
      </div>
      <div className={styles.text}>
        <p className={`${styles.meta} mono`}>
          ~{game.minutes} dakika
        </p>
        <h1 className={styles.title}>{game.title}</h1>
        <p className={styles.blurb}>{game.blurb}</p>
        <p className={styles.foot}>
          <b>{SITE_NAME}</b> · {SITE_TAGLINE} <span className={styles.play}>Oyna →</span>
        </p>
      </div>
    </div>
  );
}

export function SiteOg() {
  return (
    <div className={styles.site}>
      <div className={styles.siteHead}>
        <h1 className={styles.siteTitle}>{SITE_NAME}</h1>
        <p className={styles.siteLead}>{SITE_TAGLINE} Mesai bitti, kimse bakmıyor.</p>
      </div>
      <ul className={styles.tiles}>
        {GAMES.map((g) => {
          const Art = ART[g.route];
          return (
            <li key={g.route} style={{ ['--card' as string]: g.color }}>
              <Art />
              <span>{g.title}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
