import { useEffect, useRef, useState } from 'react';
import { navigate } from '../../arcade/route';
import * as sfx from './sfx';
import styles from './MailScene.module.css';

/*
 * Raporun önündeki kapanış sahnesi: adayın bilgisayarında e-posta kutusu açık, bir an sonra İK'dan
 * ileti düşer. Geçen adaya iş teklifi gelir ve "İlk iş günü" düğmesi Sen İK'sin oyununa götürür;
 * kalan adaya kalıp bir ret e-postası gelir. İki durumda da rapor bir tık ötededir.
 */

const OLD_MAILS = [
  { from: 'Kariyer Portalı', subject: 'Profiliniz 3 işveren tarafından görüntülendi', at: 'Dün' },
  { from: 'UyumMetre', subject: 'Değerlendirme davetiniz: Genel Yetenek ve Uyum Testi', at: 'Pzt' },
  { from: 'Bülten', subject: '"Hayalinizdeki işi bulmanın 47 yolu"', at: 'Pzt' },
];

export function MailScene({ passed, title, company, onReport }: { passed: boolean; title: string; company: number; onReport: () => void }) {
  const [arrived, setArrived] = useState(false);
  const [open, setOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const id = window.setTimeout(() => {
      setArrived(true);
      sfx.warn();
    }, 1400);
    return () => window.clearTimeout(id);
  }, []);
  useEffect(() => {
    if (open) heading.current?.focus();
  }, [open]);

  const subject = passed ? 'İş Teklifi: Aramıza hoş geldiniz! 🎉' : 'Başvurunuz hakkında';
  const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  return (
    <main className={styles.desk}>
      <div className={styles.screen}>
        <div className={styles.bar}>
          <span className={styles.dots} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <b>Posta</b>
          <small>{arrived ? '1 okunmamış ileti' : 'Gelen kutusu güncelleniyor…'}</small>
        </div>
        <div className={styles.body}>
          <ul className={`${styles.list} ${open ? styles.listHidden : ''}`} aria-label="Gelen kutusu">
            {arrived && (
              <li>
                <button className={`${styles.mail} ${styles.unread}`} onClick={() => setOpen(true)}>
                  <span className={styles.from}>İnsan Kaynakları</span>
                  <span className={styles.subject}>{subject}</span>
                  <span className={styles.at}>{time}</span>
                </button>
              </li>
            )}
            {OLD_MAILS.map((m) => (
              <li key={m.subject}>
                <div className={styles.mail}>
                  <span className={styles.from}>{m.from}</span>
                  <span className={styles.subject}>{m.subject}</span>
                  <span className={styles.at}>{m.at}</span>
                </div>
              </li>
            ))}
          </ul>

          {open ? (
            <article className={styles.letter}>
              <button className={styles.back} onClick={() => setOpen(false)}>
                ← Gelen kutusu
              </button>
              <h1 ref={heading} tabIndex={-1} className={styles.letterTitle}>
                {subject}
              </h1>
              <p className={styles.meta}>
                <b>İnsan Kaynakları</b> &lt;noreply@sirketimiz.test&gt; · {time}
              </p>
              {passed ? (
                <div className={styles.text}>
                  <p>Değerli Aday,</p>
                  <p>
                    UyumMetre değerlendirmesinde <b>%{company}</b> şirket uyumuyla <b>“{title}”</b> profiline ulaştınız. Sizi ailemize katmaktan mutluluk duyuyoruz.
                  </p>
                  <p>İlk iş gününüz <b>yarın 08:30</b>. Lütfen 08:00’de ofiste olunuz. Maaş bilgileri ilk üç ay boyunca “sürpriz” olarak saklanacaktır.</p>
                  <p>Sevgilerle,
                    <br />
                    İK Ekibi <small>(bu e-posta otomatik olarak sevgi içerir)</small>
                  </p>
                </div>
              ) : (
                <div className={styles.text}>
                  <p>Sayın Aday,</p>
                  <p>Pozisyonumuza gösterdiğiniz ilgi için teşekkür ederiz. Başvurunuzu büyük bir dikkatle (0,4 saniye) inceledik.</p>
                  <p>
                    Niteliklerinizi etkileyici bulsak da, şu aşamada <b>kurum kültürümüzle daha uyumlu</b> adaylarla ilerleme kararı aldık. Değerlendirme sonucunuz: <b>“{title}”</b>.
                  </p>
                  <p>Bilgileriniz, uygun bir pozisyon açıldığında değerlendirilmek üzere yetenek havuzumuzda süresiz olarak saklanacaktır.</p>
                  <p>
                    Kariyerinizde başarılar dileriz,
                    <br />
                    İK Ekibi <small>(Bu e-postaya yanıt vermeyiniz. Yanıt verseniz de okunmaz.)</small>
                  </p>
                </div>
              )}
              <div className={styles.actions}>
                {passed && (
                  <button className={styles.primary} onClick={() => navigate('iseAlim')}>
                    İlk iş gününe başla →
                  </button>
                )}
                <button className={passed ? styles.ghost : styles.primary} onClick={onReport}>
                  Değerlendirme raporunu gör
                </button>
              </div>
            </article>
          ) : (
            <p className={styles.wait} aria-live="polite">
              {arrived ? 'Yeni bir iletiniz var. Açmak için tıklayın.' : 'Sonucunuz İK’ya iletildi. Lütfen bekleyin…'}
            </p>
          )}
        </div>
      </div>
      <button className={styles.skip} onClick={onReport}>
        Raporu doğrudan gör
      </button>
    </main>
  );
}
