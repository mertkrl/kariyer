import type { ScreenTab } from '../data/questions';
import styles from './MockPages.module.css';

/*
 * Ekran paylaşımı sorusunun sekmelerindeki sahte sayfalar: tablo, müzik çalar, dilekçe, hava
 * durumu, forum, tatil ilanı, gündem. Hepsi düz HTML/CSS; görsel ya da dış bağlantı yok.
 */

const SHEET = [
  ['Bölge', 'Hedef', 'Gerçekleşen', 'Oran'],
  ['Marmara', '1.200', '1.188', '%99'],
  ['Ege', '800', '776', '%97'],
  ['İç Anadolu', '650', '640', '%98'],
  ['Toplam', '2.650', '2.604', '%98'],
];

function Sheet() {
  return (
    <div className={styles.sheet}>
      <div className={styles.sheetBar}>
        <b>fx</b> =TOPLA(C2:C4)
      </div>
      <table>
        <thead>
          <tr>
            <th />
            {['A', 'B', 'C', 'D'].map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SHEET.map((row, r) => (
            <tr key={r} className={r === 0 ? styles.headRow : r === SHEET.length - 1 ? styles.totalRow : undefined}>
              <th>{r + 1}</th>
              {row.map((cell, c) => (
                <td key={c}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Music({ tab }: { tab: ScreenTab }) {
  return (
    <div className={styles.music}>
      <div className={styles.cover} aria-hidden="true">
        🌧️
      </div>
      <div className={styles.track}>
        <small>Çalma listesi · Odaklanma</small>
        <b>{tab.peek}</b>
        <span className={styles.artist}>Doğa Sesleri Kolektifi</span>
        <div className={styles.progress}>
          <i />
        </div>
        <div className={styles.times}>
          <span>2:14:07</span>
          <span>8:00:00</span>
        </div>
        <div className={styles.controls} aria-hidden="true">
          ⏮ <span>⏸</span> ⏭
        </div>
      </div>
    </div>
  );
}

function Doc({ tab }: { tab: ScreenTab }) {
  return (
    <div className={styles.docWrap}>
      <div className={styles.paper}>
        <p className={styles.docTitle}>{tab.peek}</p>
        <p>Sayın Müdürüm,</p>
        <p>
          Şirketinizde <mark>[GÖREV]</mark> olarak çalışmaktayım. <mark>[TARİH]</mark> itibarıyla görevimden kendi isteğimle ayrılmak istiyorum. Gereğinin yapılmasını arz ederim.
        </p>
        <p className={styles.sig}>Ad Soyad · İmza</p>
        <span className={styles.dl}>⬇ Word olarak indir (12.418 kez indirildi)</span>
      </div>
    </div>
  );
}

function Weather({ tab }: { tab: ScreenTab }) {
  return (
    <div className={styles.weather}>
      <div className={styles.now}>
        <span className={styles.sun} aria-hidden="true">
          ☀️
        </span>
        <div>
          <b>24°</b>
          <span>İstanbul · {tab.peek}</span>
        </div>
      </div>
      <ol className={styles.days}>
        {[
          ['Cum', '☀️', '24°'],
          ['Cmt', '🌤️', '26°'],
          ['Paz', '☀️', '27°'],
          ['Pzt', '🌧️', '17°'],
          ['Sal', '🌧️', '16°'],
        ].map(([d, i, t]) => (
          <li key={d}>
            <span>{d}</span>
            <span aria-hidden="true">{i}</span>
            <b>{t}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Forum({ tab }: { tab: ScreenTab }) {
  return (
    <div className={styles.forum}>
      <p className={styles.crumb}>İş Hayatı › Yöneticiler</p>
      <p className={styles.thread}>{tab.peek}</p>
      <div className={styles.post}>
        <span className={styles.votes}>▲ 128</span>
        <div>
          <b>anonim_calisan_42</b> · 2 saat önce
          <p>Her toplantıya 15 dakika geç geliyor, sonra "neden kimse hazırlıklı değil" diyor. Bende mi sorun var?</p>
        </div>
      </div>
      <div className={styles.post}>
        <span className={styles.votes}>▲ 96</span>
        <div>
          <b>sabirli_uzman</b> · 1 saat önce
          <p>Bizimki de aynı. Bir de cuma 17:55'te "kısa bir şey soracağım" diyor.</p>
        </div>
      </div>
    </div>
  );
}

function Travel({ tab }: { tab: ScreenTab }) {
  return (
    <div className={styles.travel}>
      <div className={styles.photo} aria-hidden="true">
        🏖️
        <span className={styles.badge}>Son 2 oda!</span>
      </div>
      <div className={styles.offer}>
        <b>Bodrum Koy Otel ★★★★</b>
        <span>{tab.peek}</span>
        <span className={styles.price}>
          <s>₺12.900</s> ₺8.400
        </span>
        <span className={styles.book}>Hemen rezerve et</span>
        <small>Bu sayfaya şu an 37 kişi bakıyor. Biri sizin müdürünüz olabilir.</small>
      </div>
    </div>
  );
}

function Agenda({ tab }: { tab: ScreenTab }) {
  return (
    <div className={styles.docWrap}>
      <div className={styles.paper}>
        <p className={styles.docTitle}>{tab.peek}</p>
        <ol className={styles.agenda}>
          <li>Geçen haftaki hizalanmanın gözden geçirilmesi</li>
          <li>Hizalanma süreçlerinin senkronizasyonu</li>
          <li>Bir sonraki toplantının planlanması</li>
          <li>Diğer (zaman kalırsa)</li>
        </ol>
      </div>
    </div>
  );
}

export function MockPage({ tab }: { tab: ScreenTab }) {
  switch (tab.page) {
    case 'sheet':
      return <Sheet />;
    case 'music':
      return <Music tab={tab} />;
    case 'doc':
      return <Doc tab={tab} />;
    case 'weather':
      return <Weather tab={tab} />;
    case 'forum':
      return <Forum tab={tab} />;
    case 'travel':
      return <Travel tab={tab} />;
    case 'agenda':
      return <Agenda tab={tab} />;
  }
}
