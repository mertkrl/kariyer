import { useEffect, useRef, useState, type ReactNode } from 'react';
import { navigate } from '../../arcade/route';
import * as sfx from './sfx';
import styles from './MailScene.module.css';

/*
 * Raporun önündeki kapanış sahnesi: adayın bilgisayarında bir web postası açık. Solda klasörler,
 * ortada gelen kutusu, sağda geniş okuma bölmesi. Bir an sonra İK'dan ileti düşer: geçen adaya iş
 * teklifi ("İlk iş günü" düğmesi Sen İK'sin oyununa götürür), kalan adaya kalıp bir ret. Kutudaki
 * eski e-postalar da açılıp okunur. İki durumda da rapor bir tık ötededir.
 */

interface Mail {
  id: string;
  from: string;
  addr: string;
  subject: string;
  preview: string;
  at: string;
  /** Avatarın rengi. */
  tone: string;
  body: ReactNode;
}

const OLD_MAILS: Mail[] = [
  {
    id: 'portal',
    from: 'Kariyer Portalı',
    addr: 'bildirim@kariyerportali.test',
    subject: 'Profiliniz 3 işveren tarafından görüntülendi',
    preview: 'Tebrikler! Profiliniz bu hafta ilgi gördü…',
    at: 'Dün',
    tone: '#7a5bc4',
    body: (
      <>
        <p>Merhaba,</p>
        <p>Profiliniz bu hafta <b>3 işveren</b> tarafından görüntülendi. Hangi işverenler olduğunu görmek için Premium üyeliğe geçin (aylık ₺449, ilk ay ₺448).</p>
        <p>Görüntüleyenlerden biri profilinizde ortalama 0,8 saniye kaldı. Bu, sektör ortalamasının üzerindedir.</p>
        <p>
          Kariyer yolculuğunuzda yanınızdayız,
          <br />
          Kariyer Portalı Ekibi
        </p>
      </>
    ),
  },
  {
    id: 'invite',
    from: 'UyumMetre',
    addr: 'davet@uyummetre.test',
    subject: 'Değerlendirme davetiniz: Genel Yetenek ve Uyum Testi',
    preview: 'Değerli adayımız, başvurunuzun bir sonraki adımı…',
    at: 'Pzt',
    tone: '#2b62c0',
    body: (
      <>
        <p>Değerli Adayımız,</p>
        <p>
          Başvurunuzun bir sonraki adımı olarak sizi <b>Genel Yetenek ve Uyum Testi</b>'ne davet ediyoruz. Test yaklaşık 24 dakika sürer; sessiz bir ortamda, kameranız açıkken ve hayatınızın
          geri kalanını askıya alarak çözmenizi öneririz.
        </p>
        <p>Testin doğru cevabı yoktur. Yanlış cevabı vardır.</p>
        <p>
          Başarılar dileriz,
          <br />
          UyumMetre Aday Deneyimi Ekibi
        </p>
      </>
    ),
  },
  {
    id: 'newsletter',
    from: 'Kariyer Bülteni',
    addr: 'bulten@ilham-kariyer.test',
    subject: '"Hayalinizdeki işi bulmanın 47 yolu"',
    preview: '1. Erken kalkın. 2. Daha erken kalkın…',
    at: 'Pzt',
    tone: '#c98a1d',
    body: (
      <>
        <p>Bu haftanın seçkisi:</p>
        <ol>
          <li>Erken kalkın.</li>
          <li>Daha erken kalkın.</li>
          <li>LinkedIn başlığınıza "tutkulu" yazın.</li>
          <li>Maaş beklentinizi sorulduğunda "konuşuruz" deyin. Konuşulmaz.</li>
        </ol>
        <p>Kalan 43 madde Premium üyelere özeldir.</p>
      </>
    ),
  },
  {
    id: 'bank',
    from: 'Bankanız',
    addr: 'kampanya@banka.test',
    subject: 'Size özel: Maaşınızı bize taşıyın, simit bizden!',
    preview: 'Maaş müşterimiz olun, ayda bir simit hediye…',
    at: 'Paz',
    tone: '#2f7a4e',
    body: (
      <>
        <p>Değerli Müşterimiz,</p>
        <p>Maaşınızı bankamıza taşıyın, her ay bir simit bizden! Kampanya, maaşı olan müşterilerimiz için geçerlidir.</p>
        <p>
          <small>Kampanya koşulları: Simit, ay sonunda hesabınızda en az ₺250.000 bulunması hâlinde şubeden teslim alınır.</small>
        </p>
      </>
    ),
  },
  {
    id: 'mom',
    from: 'Annem',
    addr: 'annem@aile.test',
    subject: 'Fwd: Fwd: Fwd: Bu mesajı 10 kişiye gönder iş bulursun',
    preview: 'Oğlum/kızım bunu okudun mu, Ayşe teyzenin oğlu…',
    at: 'Cmt',
    tone: '#c4475a',
    body: (
      <>
        <p>Bunu okudun mu? Ayşe teyzenin oğlu bu mesajı 10 kişiye göndermiş, ertesi gün bankada işe başlamış.</p>
        <p>Bir de devlet sınavlarına bak bence. Hem garantili.</p>
        <p>Yemek yedin mi?</p>
        <p>
          <small>iPhone'umdan gönderildi</small>
        </p>
      </>
    ),
  },
];

const FOLDERS = [
  { name: 'Gelen Kutusu', icon: '📥' },
  { name: 'Yıldızlı', icon: '☆' },
  { name: 'Gönderilenler', icon: '➤' },
  { name: 'Taslaklar', icon: '✎', count: 14 },
  { name: 'Spam', icon: '⚠', count: 238 },
];

export function MailScene({ passed, title, company, onReport }: { passed: boolean; title: string; company: number; onReport: () => void }) {
  const [arrived, setArrived] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [read, setRead] = useState<ReadonlySet<string>>(new Set(['invite', 'newsletter', 'bank', 'mom']));
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

  const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const date = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  const hr: Mail = {
    id: 'hr',
    from: 'İnsan Kaynakları',
    addr: 'noreply@sirketimiz.test',
    subject: passed ? 'İş Teklifi: Aramıza hoş geldiniz! 🎉' : 'Başvurunuz hakkında',
    preview: passed ? 'Değerli Aday, sizi ailemize katmaktan mutluluk…' : 'Sayın Aday, pozisyonumuza gösterdiğiniz ilgi için…',
    at: time,
    tone: '#1d2733',
    body: passed ? (
      <>
        <p>Değerli Aday,</p>
        <p>
          UyumMetre değerlendirmesinde <b>%{company}</b> şirket uyumuyla <b>“{title}”</b> profiline ulaştınız. Sizi ailemize katmaktan mutluluk duyuyoruz.
        </p>
        <p>
          İlk iş gününüz <b>yarın 08:30</b>. Lütfen 08:00’de ofiste olunuz. Maaş bilgileri ilk üç ay boyunca “sürpriz” olarak saklanacaktır. Yan haklarınız arasında meyve tabağı (salı), sınırsız
          çay ve sınırlı izin bulunmaktadır.
        </p>
        <p>Ekteki 46 sayfalık sözleşmeyi bu akşam 23:59'a kadar imzalayıp göndermenizi rica ederiz. Okumanıza gerek yoktur.</p>
      </>
    ) : (
      <>
        <p>Sayın Aday,</p>
        <p>Pozisyonumuza gösterdiğiniz ilgi için teşekkür ederiz. Başvurunuzu büyük bir dikkatle (0,4 saniye) inceledik.</p>
        <p>
          Niteliklerinizi etkileyici bulsak da, şu aşamada <b>kurum kültürümüzle daha uyumlu</b> adaylarla ilerleme kararı aldık. Değerlendirme sonucunuz: <b>“{title}”</b>.
        </p>
        <p>
          Bilgileriniz, uygun bir pozisyon açıldığında değerlendirilmek üzere yetenek havuzumuzda süresiz olarak saklanacaktır. Havuzumuz şu anda 48.112 kişidir ve her geçen gün
          derinleşmektedir.
        </p>
        <p>Kariyerinizde başarılar dileriz.</p>
      </>
    ),
  };

  const mails = arrived ? [hr, ...OLD_MAILS] : OLD_MAILS;
  const current = mails.find((m) => m.id === open) ?? null;
  const unread = mails.filter((m) => !read.has(m.id)).length;
  const pick = (id: string) => {
    sfx.click();
    setOpen(id);
    setRead((r) => new Set(r).add(id));
  };

  return (
    <main className={styles.desk} data-fit>
      <div className={styles.screen}>
        <div className={styles.bar}>
          <span className={styles.dots} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <b className={styles.app}>✉ Posta</b>
          <span className={styles.search} aria-hidden="true">
            🔍 Postalarda ara
          </span>
          <small>{arrived ? `${unread} okunmamış ileti` : 'Gelen kutusu güncelleniyor…'}</small>
        </div>

        <div className={`${styles.body} ${current ? styles.reading : ''}`}>
          <nav className={styles.folders} aria-label="Klasörler">
            <span className={styles.compose} aria-hidden="true">
              ✎ Yeni ileti
            </span>
            {FOLDERS.map((f, i) => (
              <span key={f.name} className={`${styles.folder} ${i === 0 ? styles.folderOn : ''}`}>
                <i aria-hidden="true">{f.icon}</i>
                {f.name}
                {(i === 0 ? unread : f.count) ? <b>{i === 0 ? unread : f.count}</b> : null}
              </span>
            ))}
          </nav>

          <ul className={styles.list} aria-label="Gelen kutusu">
            {mails.map((m) => (
              <li key={m.id}>
                <button
                  className={`${styles.mail} ${!read.has(m.id) ? styles.unread : ''} ${open === m.id ? styles.mailOn : ''} ${m.id === 'hr' ? styles.fresh : ''}`}
                  onClick={() => pick(m.id)}
                >
                  <span className={styles.avatar} style={{ background: m.tone }} aria-hidden="true">
                    {m.from[0]}
                  </span>
                  <span className={styles.from}>{m.from}</span>
                  <span className={styles.at}>{m.at}</span>
                  <span className={styles.subject}>{m.subject}</span>
                  <span className={styles.preview}>{m.preview}</span>
                </button>
              </li>
            ))}
          </ul>

          {current ? (
            <article className={styles.letter}>
              <div className={styles.tools}>
                <button className={styles.back} onClick={() => setOpen(null)}>
                  ← Gelen kutusu
                </button>
                <span aria-hidden="true">↩ Yanıtla</span>
                <span aria-hidden="true">↪ İlet</span>
                <span aria-hidden="true">🗑 Sil</span>
              </div>
              <h1 ref={heading} tabIndex={-1} className={styles.letterTitle}>
                {current.subject}
              </h1>
              <div className={styles.sender}>
                <span className={styles.avatarBig} style={{ background: current.tone }} aria-hidden="true">
                  {current.from[0]}
                </span>
                <span>
                  <b>{current.from}</b> <small>&lt;{current.addr}&gt;</small>
                  <br />
                  <small>Alıcı: ben</small>
                </span>
                <small className={styles.when}>
                  {current.id === 'hr' ? `${date}, ${time}` : current.at}
                </small>
              </div>
              <div className={styles.text}>{current.body}</div>

              {current.id === 'hr' && (
                <>
                  <div className={styles.signature}>
                    <b>İnsan Kaynakları Departmanı</b>
                    <span>Yetenek Kazanımı ve Aday Deneyimi Mükemmeliyet Merkezi</span>
                    <span>Plaza Kule B, Kat 14 · Levent / İstanbul</span>
                  </div>
                  <p className={styles.legal}>
                    Bu e-posta ve ekleri yalnızca alıcısına özeldir. Yanıt vermeyiniz; bu adres izlenmemektedir. Yanıt verseniz de okunmaz. Okunsa da cevaplanmaz. Çevreyi korumak için bu e-postayı
                    yazdırmadan önce kariyerinizi bir kez daha düşününüz.
                  </p>
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
                </>
              )}
              {current.id !== 'hr' && arrived && (
                <div className={styles.actions}>
                  <button className={styles.ghost} onClick={() => pick('hr')}>
                    İK'dan gelen iletiye dön
                  </button>
                </div>
              )}
            </article>
          ) : (
            <div className={styles.empty} aria-live="polite">
              <span aria-hidden="true">✉</span>
              <p>{arrived ? 'Yeni bir iletiniz var. Okumak için soldan seçin.' : 'Sonucunuz İK’ya iletildi. Lütfen bekleyin…'}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
