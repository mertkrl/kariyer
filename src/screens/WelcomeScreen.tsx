import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { readSave, saveWasLost } from '../game/store/save';
import { loadStore, useLoadedStore, withStore } from '../game/store/storeLoader';
import { Button } from '../components/ui/Button';
import { days } from '../game/data/days';
import styles from './WelcomeScreen.module.css';
import { clearAllGameData } from '../game/lib/privacy';
import { useDialog } from '../components/ui/useDialog';

/** Yeni oyun kaydın üzerine yazar: oyunun kendi pencereleriyle aynı kâğıt kartta sorulur. */
function NewGameDialog({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  const ref = useDialog<HTMLDivElement>(onClose);
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={ref}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-game-title"
        aria-describedby="new-game-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${styles.dialogEyebrow} mono`}>UYARI · KAYITLI OYUN</div>
        <h2 id="new-game-title" className={styles.dialogTitle}>
          Yeni oyun başlatılsın mı?
        </h2>
        <p id="new-game-desc" className={styles.dialogText}>
          Kaldığın yer, kararların ve puanların silinir; hafta Pazartesi sabahından yeniden başlar. Bu geri alınamaz.
        </p>
        <div className={styles.dialogActions}>
          <button className={styles.dialogCancel} onClick={onClose}>
            Vazgeç
          </button>
          <Button variant="danger" sound="start" className={styles.dialogConfirm} onClick={onConfirm}>
            Evet, yeni oyun
          </Button>
        </div>
      </div>
    </div>
  );
}

export function WelcomeScreen() {
  // Bu ekran oyun yüklenmeden çizilir; oyun bu sırada indirilir.
  const store = useLoadedStore();
  useEffect(() => {
    void loadStore();
  }, []);
  const startGame = () => withStore((m) => m.useGameStore.getState().startGame());
  const continueGame = () => withStore((m) => m.useGameStore.getState().continueGame());
  // önceki bir ziyaretten, bu tarayıcıda tutulan kayıt: önce olduğu gibi kabul edilir, sonra
  // oyun yüklenince oyuna göre kontrol edilir (bu derlemenin sürdüremeyeceği bir kayıt kaybolur)
  const save = useMemo(() => (store ? store.loadSave() : readSave()), [store]);
  const savedDay = save ? days[save.data.currentDayIndex ?? 0] : null;
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMouse({ x, y });
  }

  const cornerX = Math.round(mouse.x * 8);
  const cornerY = Math.round(mouse.y * 6);

  return (
    <div className={styles.screen} onMouseMove={handleMouseMove}>
      <div className={styles.grid} />
      <div className={styles.glow} />
      <div className={styles.scanline} />

      <div
        className={`${styles.corner} ${styles.cornerTL}`}
        style={{ transform: `translate(${cornerX}px, ${cornerY}px)` }}
      />
      <div
        className={`${styles.corner} ${styles.cornerTR}`}
        style={{ transform: `translate(${-cornerX}px, ${cornerY}px)` }}
      />
      <div
        className={`${styles.corner} ${styles.cornerBL}`}
        style={{ transform: `translate(${cornerX}px, ${-cornerY}px)` }}
      />
      <div
        className={`${styles.corner} ${styles.cornerBR}`}
        style={{ transform: `translate(${-cornerX}px, ${-cornerY}px)` }}
      />

      <div className={styles.statusLeft}>
        <span className={styles.dot} />
        <span className="mono">İK SİSTEMİ v4.2 · ÇEVRİMİÇİ</span>
      </div>
      <div className={`${styles.statusRight} mono`}>OTURUM #0492</div>

      <div className={styles.readout} style={{ top: 160, left: 70, animationDelay: '0s' }}>
        REF#20264 · İNCELENİYOR
      </div>
      <div className={styles.readout} style={{ bottom: 190, left: 90, animationDelay: '2.6s' }}>
        ATS SKORU HESAPLANIYOR…
      </div>
      <div className={styles.readout} style={{ top: 180, right: 90, animationDelay: '5.2s' }}>
        KUYRUK: 3 DOSYA BEKLİYOR
      </div>
      <div className={styles.readout} style={{ bottom: 160, right: 110, animationDelay: '1.3s' }}>
        KARAR GÜNLÜĞÜ SENKRONİZE
      </div>

      <div className={styles.content}>
        <div className={styles.eyebrow}>{days.length} Günlük Bir İşe Alım Simülasyonu</div>
        <h1 className={styles.title}>Sen İK'sin.</h1>
        <p className={styles.subtitle}>
          Her gün onlarca CV masana düşecek. Kurallara uyacak mısın, yoksa vicdanını mı
          dinleyeceksin? Her tıkladığın buton, ekranın öbür ucunda birinin hayatını etkiliyor.
        </p>

        {savedDay && save ? (
          <div className={styles.actions}>
            <div className={styles.buttonRow}>
              <Button variant="gold" sound="start" className={styles.cta} onClick={continueGame}>
                Devam et
              </Button>
              <Button variant="ghost" className={styles.secondary} onClick={() => setConfirmNew(true)}>
                Yeni oyun
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.actions}>
            <Button variant="gold" sound="start" className={styles.cta} onClick={startGame}>
              İşe başla
            </Button>
            {save === null && saveWasLost() && (
              <small className={styles.saveNote} role="status">
                Önceki kaydın oyunun bu sürümüyle uyumlu değildi, kaldığın yerden devam edilemiyor. Üzgünüz.
              </small>
            )}
          </div>
        )}
      </div>

      <div className={styles.bottomInfo}>
        Karakterler, şirketler ve olaylar hayal ürünüdür; gerçek kişi ve kurumlarla benzerlik tesadüftür.
        <p className={styles.privacy}>
          Oyun hiçbir veri göndermez; ilerlemen ve ayarların yalnızca bu tarayıcıda durur.{' '}
          {confirmClear ? (
            <>
              Kayıt, başarımlar ve ayarlar silinsin mi?{' '}
              <button
                className={styles.privacyLink}
                onClick={() => {
                  void clearAllGameData().then(() => window.location.reload());
                }}
              >
                Evet, sil
              </button>{' '}
              <button className={styles.privacyLink} onClick={() => setConfirmClear(false)}>
                Vazgeç
              </button>
            </>
          ) : (
            <button className={styles.privacyLink} onClick={() => setConfirmClear(true)}>
              Verilerimi sil
            </button>
          )}
        </p>
      </div>
      {confirmNew && <NewGameDialog onConfirm={startGame} onClose={() => setConfirmNew(false)} />}
    </div>
  );
}
