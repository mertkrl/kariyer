import { useState, type ReactNode } from 'react';
import { lineOf } from './lines';
import { PRESETS, currentDesign, sampleDesign, type PresetId } from './model';
import { Screen } from './Screen';
import { useClock } from './useClock';
import styles from './Lobby.module.css';

/*
 * Oyunun girişi: Ekran Yenileme Kurulu'nun loşu bir kontrol odası. Solda ihale ilanı, sağda
 * duvara asılı bir monitörde bugünkü ekranlar sırayla döner. Altta modlar birer ihale dosyası;
 * Zor mod mühürlü. Ekran seçiminde her ekran kendi askısıyla canlı oynar; üstüne gelince yenilenmiş
 * hâline geçer (önce / sonra).
 */

const ROTATE_SECONDS = 7;

/** Gerçek bir kurumu taklit etmeyen, uydurma şikâyetler. */
const COMPLAINTS = [
  '“Numaram geçti mi geçmedi mi, hâlâ bilmiyorum.” — Poliklinik 2 önündeki teyze',
  '“Ekranda Windows güncellemesi çıktı, durağı kaçırdım.” — 98G yolcusu',
  '“Sonraki durak yazıyor ama hangisi olduğu yazmıyor.” — Metrobüs, ayakta',
  '“Yazılar o kadar küçük ki gözlüğümü taktım, yine okuyamadım.” — Marmaray, Kartal',
  '“Kayan yazı 2014’teki bayramı kutluyor.” — Bekleme salonu',
  '“Saat iki dakika geri, doktor iki saat.” — Sıra 714',
];

const FACTS: Record<PresetId, (string | number)[]> = {
  hastane: ['Sıra ekranı', 'Son güncelleme: belirsiz', 'KVKK: yıldızlı'],
  metrobus: ['Tavan ekranı', `${lineOf('metrobus').stops.length} durak`, 'Video: kar'],
  otobus: ['98G', `${lineOf('otobus').stops.length} durak`, 'Bakırköy → Giyimkent'],
  marmaray: ['Hat ekranı', `${lineOf('marmaray').stops.length} istasyon`, 'Halkalı → Gebze'],
};

type Mount = 'wall' | 'ceiling';
const MOUNT: Record<PresetId, Mount> = { hastane: 'wall', metrobus: 'ceiling', otobus: 'ceiling', marmaray: 'ceiling' };

/** Asılı bir monitör: kalın çerçeve, cam parlaması, güç ışığı, askısı. */
export function Monitor({ children, mount = 'wall', live = false, label }: { children: ReactNode; mount?: Mount; live?: boolean; label?: string }) {
  return (
    <div className={`${styles.monitor} ${mount === 'ceiling' ? styles.ceiling : styles.wall}`}>
      <span className={styles.mount} aria-hidden="true" />
      <div className={styles.bezel}>
        <div className={styles.glass}>{children}</div>
        <span className={styles.glare} aria-hidden="true" />
        <span className={styles.led} aria-hidden="true" />
      </div>
      {label && (
        <span className={styles.onAir}>
          {live && <i aria-hidden="true" />}
          {label}
        </span>
      )}
    </div>
  );
}

export function Home({ onNormal, onHard }: { onNormal: () => void; onHard: () => void }) {
  const { seconds, now } = useClock(true);
  const [pinned, setPinned] = useState<number | null>(null);
  const index = pinned ?? Math.floor(seconds / ROTATE_SECONDS) % PRESETS.length;
  const preset = PRESETS[index];
  return (
    <main className={styles.lobby}>
      <section className={styles.hero}>
        <div className={styles.notice}>
          <p className={styles.stamp}>
            İhale ilanı <span>Dosya 2026/EKR-0042</span>
          </p>
          <h2 className={styles.headline}>
            Ekran
            <br />
            <em>İhalesi</em>
          </h2>
          <p className={styles.pitch}>Hastane koridorunda, metrobüs tavanında, Marmaray vagonunda… Yıllardır aynı duran ekranlar yeniden tasarlanacak. İhaleyi sen aldın.</p>
          <dl className={styles.stats}>
            <div>
              <dt>Ekran</dt>
              <dd>{PRESETS.length}</dd>
            </div>
            <div>
              <dt>Son güncelleme</dt>
              <dd>2009</dd>
            </div>
            <div>
              <dt>Şikâyet</dt>
              <dd>∞</dd>
            </div>
          </dl>
          <div className={styles.cta}>
            <button type="button" className={styles.go} onClick={onNormal}>
              Atölyeye gir <span aria-hidden="true">→</span>
            </button>
            <button type="button" className={styles.ghostCta} onClick={onHard}>
              Şartnameyi oku
            </button>
          </div>
        </div>

        <div className={styles.stage}>
          <Monitor mount={MOUNT[preset.id]} live label="Şu an duvarda">
            <div key={preset.id} className={styles.fade}>
              <Screen design={currentDesign(preset.id)} seconds={seconds} now={now} className={styles.screen} />
            </div>
          </Monitor>
          <div className={styles.caption}>
            <div>
              <b>{preset.title}</b>
              <span>{preset.place}</span>
            </div>
            <div className={styles.dots} role="group" aria-label="Ekranlar">
              {PRESETS.map((p, i) => (
                <button key={p.id} type="button" aria-label={p.title} aria-pressed={i === index} onClick={() => setPinned(i === pinned ? null : i)} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.files} aria-label="Modlar">
        <button type="button" className={styles.file} onClick={onNormal}>
          <span className={styles.tab}>Dosya 01</span>
          <span className={`${styles.seal} ${styles.open}`}>Açık</span>
          <b>Normal mod</b>
          <strong>Serbest atölye</strong>
          <span className={styles.body}>Kural yok, kurul yok. Bileşenleri sürükle, renkleri değiştir, ekranı sabit ya da geçişli çalıştır, bağlantıyla paylaş.</span>
          <span className={styles.more}>Dosyayı aç →</span>
        </button>
        <button type="button" className={styles.file} onClick={onHard}>
          <span className={styles.tab}>Dosya 02</span>
          <span className={`${styles.seal} ${styles.red}`}>Gizli</span>
          <b>Zor mod</b>
          <strong>İhale şartnamesi</strong>
          <ul className={styles.terms}>
            <li>Müdürlük logosu ekranın en az %20'si olacak.</li>
            <li>Reklam alanı kaldırılamaz.</li>
            <li>Hasta adı açık yazılamaz (KVKK).</li>
          </ul>
          <span className={styles.more}>Kurula gir →</span>
        </button>
      </section>

      <div className={styles.ticker} aria-hidden="true">
        <div>
          {[...COMPLAINTS, ...COMPLAINTS].map((c, i) => (
            <span key={i}>{c}</span>
          ))}
        </div>
      </div>
    </main>
  );
}

function PresetCard({ id, title, place, seconds, now, onPick }: { id: PresetId; title: string; place: string; seconds: number; now: Date; onPick: () => void }) {
  const [after, setAfter] = useState(false);
  return (
    <button type="button" className={styles.card} onClick={onPick} onPointerEnter={() => setAfter(true)} onPointerLeave={() => setAfter(false)} onFocus={() => setAfter(true)} onBlur={() => setAfter(false)}>
      <Monitor mount={MOUNT[id]} label={after ? 'Senin elinde' : 'Bugün'} live={!after}>
        <div className={styles.swap}>
          <Screen design={currentDesign(id)} seconds={seconds} now={now} className={styles.screen} />
          <div className={`${styles.after} ${after ? styles.shown : ''}`}>
            <Screen design={sampleDesign(id)} seconds={seconds} now={now} className={styles.screen} />
          </div>
        </div>
      </Monitor>
      <span className={styles.cardText}>
        <b>{title}</b>
        <span>{place}</span>
        <span className={styles.chips}>
          {FACTS[id].map((f) => (
            <i key={f}>{f}</i>
          ))}
        </span>
        <span className={styles.more}>Tasarla →</span>
      </span>
    </button>
  );
}

export function Pick({ onPick }: { onPick: (id: PresetId) => void }) {
  const { seconds, now } = useClock(true);
  return (
    <main className={styles.lobby}>
      <header className={styles.pickHead}>
        <p className={styles.stamp}>
          Normal mod <span>Serbest atölye</span>
        </p>
        <h2>Hangi ekranı yenileyeceksin?</h2>
        <p className={styles.pitch}>Hepsi bugünkü hâliyle, canlı oynuyor. Üstüne gel: yenilenmiş hâli nasıl olabilir, gör.</p>
      </header>
      <div className={styles.grid}>
        {PRESETS.map((p) => (
          <PresetCard key={p.id} id={p.id} title={p.title} place={p.place} seconds={seconds} now={now} onPick={() => onPick(p.id)} />
        ))}
      </div>
    </main>
  );
}
