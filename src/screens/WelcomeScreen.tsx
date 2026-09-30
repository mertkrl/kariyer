import { useState, type MouseEvent } from 'react';
import { useGameStore } from '../game/store';
import { Button } from '../components/ui/Button';
import { days } from '../game/data/days';
import { readSave } from '../game/save';
import styles from './WelcomeScreen.module.css';
import { ORCHID_CREDIT } from '../components/desk/OrchidArt';

export function WelcomeScreen() {
  const startGame = useGameStore((s) => s.startGame);
  const continueGame = useGameStore((s) => s.continueGame);
  // a checkpoint from an earlier visit, kept in this browser
  const [save] = useState(readSave);
  const savedDay = save ? days[save.data.currentDayIndex ?? 0] : null;
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

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

        {savedDay ? (
          <div className={styles.actions}>
            <Button variant="gold" sound="start" onClick={continueGame}>
              DEVAM ET · {savedDay.dayName} →
            </Button>
            <Button variant="ghost" sound="start" onClick={startGame}>
              Yeni oyun
            </Button>
            <small className={styles.saveNote}>Kayıt yalnızca bu tarayıcıda durur. Yeni oyunda ilanı seçtiğin anda eski kaydın üzerine yazılır.</small>
          </div>
        ) : (
          <Button variant="gold" sound="start" onClick={startGame}>
            İŞE BAŞLA →
          </Button>
        )}
      </div>

      <div className={styles.bottomInfo}>
        Gerçek iş arama deneyimlerinden ilham alınmıştır.
        <br />
        <small style={{ opacity: 0.7 }}>{ORCHID_CREDIT}</small>
      </div>
    </div>
  );
}
