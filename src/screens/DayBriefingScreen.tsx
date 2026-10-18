import { useState } from 'react';
import { useGameStore } from '../game/store/store';
import { days } from '../game/data/days';
import { Button } from '../components/ui/Button';
import styles from './DayBriefingScreen.module.css';

export function DayBriefingScreen() {
  const currentDayIndex = useGameStore((s) => s.currentDayIndex);
  const beginDay = useGameStore((s) => s.beginDay);
  const day = days[currentDayIndex];
  // ilk sabah: şirket sana onun için kim olduğunu söylemeden önce, kim olduğun
  const [introDone, setIntroDone] = useState(currentDayIndex > 0);

  if (!introDone) {
    return (
      <div className={styles.screen}>
        <div className={`${styles.card} ${styles.intro}`}>
          <div className={styles.header}>Pazartesi · 06:40 · Bağcılar</div>
          <h1 className={styles.title}>Defne Aral</h1>
          <div className={styles.divider} />
          <ul className={styles.introFacts}>
            <li>
              Alarm çalmadan uyandın. <b>11 aydır</b> ilk kez kalkman gereken bir sabah var.
            </li>
            <li>
              Telefonunda hâlâ o sayılar duruyor: <b>214</b> başvuru, <b>9</b> mülakat, <b>1</b> teklif. Bir şirketin
              ret maili, sen "gönder"e bastıktan 0,4 saniye sonra gelmişti. Kimse okumamıştı bile.
            </li>
            <li>
              Annen mutfakta çayı koymuş, "Bugün iyi giyin" diyor. Kardeşin yine staj başvurusu yapıyor; okulu "ilk
              10"da değil diye kimse dönmüyor.
            </li>
            <li>
              Bugün iki aylık deneme süren başlıyor. Kapıdaki kartında yazan unvan: <b>İşe Alım Uzmanı</b>.
            </li>
          </ul>
          <p className={styles.introLine}>Masana bir CV yığını gelecek. Bu kez okuyan sensin. Onlara, sana davranılmadığı gibi mi davranacaksın?</p>
          <Button variant="danger" sound="connect" className={styles.cta} onClick={() => setIntroDone(true)}>
            Müdürün Notunu Oku →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.stamp}>HİZMETE ÖZEL</div>

        <div className={styles.header}>Tavrinsa Labs Inc. — Müdürden Günün Notu</div>
        <h1 className={styles.title}>
          Gün {day.day} — {day.dayName}
        </h1>

        <div className={styles.divider} />

        <div className={styles.layout}>
        <div className={styles.memoBox}>
          <div className={styles.memoField}>KİMDEN: {day.memoFrom.toLocaleUpperCase('tr-TR')}</div>
          <div className={styles.memoField}>KİME: {day.memoTo.toLocaleUpperCase('tr-TR')}</div>
          <div className={styles.divider} />
          <div className={styles.memoBody}>{day.memoBody}</div>
          <div className={styles.signature}>— {day.memoFrom}</div>
        </div>

        <div className={styles.side}>
        <div className={styles.goalsLabel}>{day.final ? 'Final Günü:' : 'Bugünkü Hedefler & Kota:'}</div>
        <div className={styles.goals}>
          {day.goals.map((goal) => (
            <div key={goal} className={styles.goalRow}>
              <span className={styles.checkbox} />
              <span>{goal}</span>
            </div>
          ))}
        </div>

        <Button variant="danger" sound={day.final ? 'confirm' : 'connect'} className={styles.cta} onClick={beginDay}>
          {day.final ? 'Mülakat Gününe Başla →' : 'Masana Geç →'}
        </Button>
        </div>
        </div>
      </div>
    </div>
  );
}
