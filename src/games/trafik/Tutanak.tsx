import { starsOf, verdict, type Level } from './levels';
import { DIFFICULTY, moveName, type Difficulty } from './model';
import { los, type Report } from './sim';
import { Timeline, type Sample } from './Hud';
import styles from './TrafikGame.module.css';

/*
 * Bölüm sonunun tutanağı: yıldızlar, kuyruk çizelgesi, kol kol bekleyiş, mühendisin tek öğüdü ve
 * mesleğin gerçek hâli. Play.tsx süre bitince açar.
 */

const horns = (delay: number) => Math.min(5, Math.floor(delay / 12));
const LOS_TONE: Record<string, string> = { A: '#3fae63', B: '#6dbb4a', C: '#c9b437', D: '#e6a813', E: '#e2783f', F: '#e2553f' };
/** Hizmet düzeyinin sade karşılığı. */
const LOS_TEXT: Record<string, string> = { A: 'su gibi aktı', B: 'rahat', C: 'kabul edilir', D: 'sıkışık', E: 'sınırda', F: 'kilit' };

/** Tutanaktaki tek öğüt: bir sonraki denemede neyi değiştirmeli. */
function coach(r: Report, level: Level, pass: number) {
  if (r.pedHits) return 'Yayaya çarpan araç sarıda ya da kırmızıda geçti. kartlardaki “Hepsi kırmızı” süresini uzat, yayaların yeşilini kısma.';
  if (r.jammed) return 'Bir yolun kuyruğu haritadan taştı. Kuyruk uzayınca o yolun ışığında hemen “Yeşil yak”a bas; “yetmiyor” diyen ışığın yeşil süresini + ile uzat.';
  if (r.cutIns > 2) return 'Ara sokaklarda uzun bekleyen sürücüler sabredemeyip araya daldı. Sokaklar panelinden o sokağın ağzına “Dur” koy ya da ana yolun kuyruğunu kısalt ki sokak ağzı tıkanmasın.';
  if (r.crashes) return 'Kavşağın ortasında kaza oldu: ışık kartlarında “Sarı” ya da “Hepsi kırmızı” süresini bir iki saniye uzat.';
  if (r.ambulanceLate) return 'Ambulans bekledi. Siren çıkınca söylenen ışığın “Yeşil yak” düğmesine hemen bas.';
  if (r.workHits) return 'İşçilerin yanından araç geçti. Telsiz uyarınca kolu çalışma başlamadan kapat.';
  if (r.detour > 20) return 'Kapalı yol yüzünden çok sürücü saptı. İş bitince kolu hemen yeniden aç.';
  const worst = r.worstMv ? `${r.worstAt && level.spec.nodes.length > 1 ? `${r.worstAt}’da ` : ''}${moveName(r.worstMv)}` : '';
  const more = 'ışığının yeşil süresini + ile uzat';
  if ((r.worst > 45 || r.score < pass) && worst) return `En çok ${worst} bekledi (${r.worst.toFixed(0)} sn). O yönün ${more}.`;
  if (r.score < pass) return 'Kuyruklar uzadı. “Yetmiyor” diyen ışığın yeşilini uzat, boş yolun yeşilini kıs.';
  if (level.spec.tools.wave && r.score < 85) return 'Ana caddeye yeterli yeşil verip dalgayı kurarsan batıdan gelenler hiç durmaz.';
  if (level.spec.tools.detect && r.score < 85) return 'Sakin zamanda ışıkların üstündeki “Akıllı mod”u aç; boş yola yeşil yanmasın.';
  return 'Mühendis gibi yönettin: yeşil kalabalığa, güvenlik önde.';
}

/** Kavşak tutanağı: yıldızlar, kısa yorum, kol kol korna haritası ve mesleğin gerçek hâli. */
export function Tutanak({ level, result, diff, last, onNext, onRetry, samples }: { level: Level; result: Report; diff: Difficulty; last: boolean; onNext: (score: number) => void; onRetry: () => void; samples: Sample[] }) {
  const pass = DIFFICULTY[diff].pass;
  const stars = starsOf(result.score, pass);
  const hasAmb = level.spec.events.some((e) => e.kind === 'ambulance');
  const hasVip = level.spec.events.some((e) => e.kind === 'motorcade');
  const hasWork = level.spec.events.some((e) => e.kind === 'roadwork');
  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="trafik-sonuc">
      <article className={styles.order}>
        <header>
          <span>TRAFİK KONTROL MERKEZİ · TUTANAK</span>
          <span>{result.score} / 100</span>
        </header>
        <h2 id="trafik-sonuc" className={styles.stars} aria-label={`${stars} yıldız`}>
          {[1, 2, 3].map((k) => (
            <span key={k} className={k <= stars ? styles.starOn : undefined} aria-hidden="true">
              ★
            </span>
          ))}
        </h2>
        <p>{verdict(result.score, !!result.jammed, result.pedHits, pass)}</p>
        <Timeline samples={samples} duration={level.spec.duration} />
        <dl>
          <div className={styles.row}>
            <dt>Araç başına bekleyiş</dt>
            <dd>{result.delay.toFixed(0)} sn</dd>
          </div>
          <div className={styles.row}>
            <dt>Hizmet düzeyi</dt>
            <dd>
              <b className={styles.los} style={{ background: LOS_TONE[result.los] }}>
                {result.los}
              </b>{' '}
              {LOS_TEXT[result.los]}
            </dd>
          </div>
          {result.worstMv && (
            <div className={styles.row}>
              <dt>En çok bekleyen</dt>
              <dd>
                {result.worstAt && level.spec.nodes.length > 1 ? `${result.worstAt} · ` : ''}
                {moveName(result.worstMv)} · {result.worst.toFixed(0)} sn
              </dd>
            </div>
          )}
          <div className={styles.row}>
            <dt>{level.spec.nodes.length > 1 ? 'Caddeden geçen araç' : 'Geçen araç'}</dt>
            <dd>{result.delivered}</dd>
          </div>
          {result.detour > 0 && (
            <div className={styles.row}>
              <dt>Kapalı yoldan sapan</dt>
              <dd>{result.detour} araç</dd>
            </div>
          )}
          {result.crashes + result.pedHits > 0 && (
            <div className={styles.row}>
              <dt>Kaza</dt>
              <dd className={styles.bad}>{result.crashes + result.pedHits}</dd>
            </div>
          )}
          {hasAmb && (
            <div className={styles.row}>
              <dt>Ambulans</dt>
              <dd>{result.ambulanceLate ? `${result.ambulanceLate} kez bekledi` : 'beklemeden geçti'}</dd>
            </div>
          )}
          {hasWork && (
            <div className={styles.row}>
              <dt>Yol çalışması</dt>
              <dd className={result.workHits ? styles.bad : undefined}>{result.workHits ? `${result.workHits} araç işçilerin yanından geçti` : 'işçiler güvende kaldı'}</dd>
            </div>
          )}
          {hasVip && (
            <div className={styles.row}>
              <dt>Makam konvoyu</dt>
              <dd>{result.parts.find((p) => p.label === 'Konvoy')?.got === 10 ? 'durmadan geçti' : 'kavşakta durdu'}</dd>
            </div>
          )}
        </dl>
        {result.legs.length > 0 && (
          <div className={styles.horns}>
            <b>Korna haritası</b>
            {result.legs.map((l) => (
              <div key={l.name} className={styles.hornRow}>
                <span>{l.name}</span>
                <i aria-hidden="true">
                  <em style={{ width: `${Math.min(100, (l.delay / 80) * 100)}%`, background: LOS_TONE[los(l.delay)] }} />
                </i>
                <span className="mono" aria-label={`${l.name}: ortalama ${l.delay.toFixed(0)} saniye bekleme`}>
                  {'📢'.repeat(horns(l.delay)) || '·'} {l.delay.toFixed(0)} sn
                </span>
              </div>
            ))}
          </div>
        )}
        <p className={styles.coach}>
          <b>Mühendisin yorumu</b> {coach(result, level, pass)}
        </p>
        <p className={styles.job}>
          <b>Gerçekte</b> {level.job}
        </p>
        <div className={styles.actions}>
          {stars > 0 && (
            <button type="button" className={styles.primary} onClick={() => onNext(result.score)}>
              {last ? 'Vardiyayı bitir' : 'Sonraki kavşak'}
            </button>
          )}
          <button type="button" className={stars > 0 ? styles.ghost : styles.primary} onClick={onRetry}>
            Tekrar dene
          </button>
        </div>
      </article>
    </div>
  );
}
