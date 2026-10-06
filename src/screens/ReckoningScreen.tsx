import { useGameStore } from '../game/store';
import { RENT } from '../game/story';
import { audioEngine } from '../audio/audioEngine';
import { Button } from '../components/ui/Button';
import styles from './ReckoningScreen.module.css';

/*
 * Friday, 18:40. The hire is done, the floor is empty, only your monitor is on. One thing
 * left: the landlord wants the rent tonight.
 */

export function ReckoningScreen() {
  const story = useGameStore((s) => s.story);
  const payRent = useGameStore((s) => s.payRent);
  const finishReckoning = useGameStore((s) => s.finishReckoning);
  const done = story.rent !== null;
  const fmt = (n: number) => `${n.toLocaleString('tr-TR')} TL`;

  return (
    <div className={styles.screen}>
      <div className={styles.glow} />
      <div className={styles.content}>
        <div className={styles.eyebrow}>Cuma · 18:40 · Kat boşaldı</div>
        <h1 className={styles.title}>Masanda son on dakika</h1>
        <p className={styles.lead}>İşe alım bitti. Herkes çıktı, bir tek senin ekranın açık. Gitmeden önce bir şey kaldı.</p>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span>📱 Ev sahibi</span>
            <span className="mono">Bakiye: {fmt(story.money)}</span>
          </div>
          <p className={styles.msg}>"İyi akşamlar. Kira bu akşam, {fmt(RENT)}. Bekliyorum."</p>
          {story.rent === null ? (
            <div className={styles.row}>
              <button
                className={styles.primary}
                disabled={story.money < RENT}
                onClick={() => {
                  audioEngine.playUi('confirm');
                  payRent(true);
                }}
              >
                Kirayı öde · {fmt(RENT)}
                {story.money < RENT && <small>Bakiye yetmiyor: {fmt(RENT - story.money)} eksik</small>}
              </button>
              <button
                className={styles.secondary}
                onClick={() => {
                  audioEngine.playUi('click');
                  payRent(false);
                }}
              >
                Süre iste
                <small>"Gelecek hafta ödesem olur mu?"</small>
              </button>
            </div>
          ) : (
            <p className={styles.result}>
              {story.rent === 'paid' ? '✓ Kira ödendi. Hesapta ' + fmt(story.money) + ' kaldı.' : 'Ev sahibi: "Anlaştığımız gün bugündü. Pazartesi noterden ihtarname gönderiyorum." Telefonu kapattın.'}
            </p>
          )}
        </div>

        <Button variant="gold" sound="confirm" onClick={finishReckoning} disabled={!done}>
          {done ? 'EVE DÖN →' : 'Önce karar ver'}
        </Button>
      </div>
    </div>
  );
}
