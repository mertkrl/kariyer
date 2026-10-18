import { useLayoutEffect, useState, type RefObject } from 'react';
import { audioEngine } from '../../audio/audioEngine';
import styles from './Orientation.module.css';

/*
 * 1. gün, portalda ilk sefer: yeni işe başlayan birinin bir iş arkadaşından aldığı türden bir
 * oryantasyon. Gerçek portal ekranda kalır; her seferinde bir parçası aydınlatılır, gerisi
 * karartılır ve bir kart onun ne olduğunu söyler. Son adım iş gününü başlatır.
 */

interface Step {
  /** Portalın içindeki seçici; hedef yoksa ortada bir kart. */
  target?: string;
  title: string;
  text: string;
}

const STEPS: Step[] = [
  {
    title: 'Hoş geldin! İlk gün: oryantasyon',
    text: 'Tavrinsa Labs İK ekibine hoş geldin. Mesai başlamadan portalı birlikte tanıyalım; iki dakika sürer. Bu hafta tek bir pozisyon için başvuruları değerlendireceksin: Yazılım Geliştirici.',
  },
  { target: '[data-tour="queue"]', title: 'Adaylar', text: 'Bugün masana gelen dosyalar burada. Bir isme tıklayınca CV açılır. İsmin yanındaki süre o CV\'ye ne kadar baktığını sayar; birkaç saniye okuyunca yanında ✓ belirir. Okumadan verilen kararlar daha ağır sayılır.' },
  { target: '[data-tour="cv"]', title: 'CV', text: 'Profil, iş deneyimi, öne çıkanlar, şirket sorularına cevaplar, beceriler ve eğitim. Dosyayı gerçekten okuyup okumadığın kararlarının ağırlığını değiştirir.' },
  { target: '[data-tour="reference"]', title: 'Referansı ara', text: 'CV\'deki bir iddiayı doğrulamanın yolu: eski işverenini ararsın. Sabit hattan yapılır ve 8 dakika sürer.' },
  { target: '[data-tour="ai"]', title: 'Yapay Zekâ Analizi', text: '"Değerlendir" dersen sistem bir ATS raporu ve öneri üretir. Kullanmak zorunda değilsin; sistemin neye baktığını, neye bakmadığını da not al.' },
  { target: '[data-tour="actions"]', title: 'Karar', text: 'Her dosya için "Mülakata Çağır" ya da "Reddet". Her gün en fazla 3 kişiyi mülakata çağırabilirsin. Yanlış bir kararı "Kararı Geri Al" ile düzeltebilirsin.' },
  { target: '[data-tour="right"] > :nth-child(2)', title: 'Günün temposu', text: 'Karar süren, temponu ve son kararların buradan izlenir. Hakan Bey de aynı ekrana bakıyor.' },
  { target: '[data-tour="finish"]', title: 'Günün sonu', text: 'Bütün dosyalar karara bağlanınca reddettiklerine gidecek bildirimi seçersin; bildirimler 17:00\'de gönderilir. Ardından günü bitirebilirsin.' },
  {
    title: 'Hazırsın',
    text: 'Portal bu kadar. Unutma: her dosyanın arkasında bir insan var ve sistem çoğunu sen görmeden eledi bile. Önüne gelenlere nasıl bakacağın sana kalmış. Saat 08:00, ilk dosya seni bekliyor.',
  },
];

interface Props {
  /** Adımların işaret ettiği portal alanı. */
  container: RefObject<HTMLElement | null>;
  onDone: () => void;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function Orientation({ container, onDone }: Props) {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  useLayoutEffect(() => {
    function measure() {
      const root = container.current;
      const el = step.target && root ? root.querySelector<HTMLElement>(step.target) : null;
      if (!root || !el || !started) {
        setBox(null);
        return;
      }
      const r = el.getBoundingClientRect();
      const c = root.getBoundingClientRect();
      const pad = 6;
      setBox({ top: r.top - c.top - pad, left: r.left - c.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 });
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [container, step, started]);

  function next() {
    audioEngine.playUi('click');
    if (last) {
      audioEngine.playUi('connect');
      onDone();
      return;
    }
    if (!started) setStarted(true);
    setIndex(index + 1);
  }

  return (
    <div className={styles.layer} role="dialog" aria-modal="true" aria-label="Oryantasyon">
      {box ? <div className={styles.spot} style={box} /> : <div className={styles.dim} />}
      <div className={`${styles.card} ${styles.centered}`}>
        <div className={styles.progress}>
          {index === 0 ? 'Oryantasyon' : `Adım ${index} / ${STEPS.length - 1}`}
          <span className={styles.dots}>
            {STEPS.slice(1).map((_, i) => (
              <i key={i} className={i < index ? styles.dotOn : undefined} />
            ))}
          </span>
        </div>
        <h3>{step.title}</h3>
        <p>{step.text}</p>
        <div className={styles.actions}>
          {!last && (
            <button className={styles.skip} onClick={onDone}>
              Oryantasyonu atla
            </button>
          )}
          {index > 0 && (
            <button className={styles.back} onClick={() => setIndex(index - 1)}>
              ← Geri
            </button>
          )}
          <button className={styles.next} onClick={next}>
            {index === 0 ? 'Oryantasyonu başlat →' : last ? 'Mesaiye Başla' : 'Devam →'}
          </button>
        </div>
      </div>
    </div>
  );
}
