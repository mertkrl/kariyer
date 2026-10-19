import { useState } from 'react';
import { tl } from './kit';
import type { SiteProps } from './registry';
import s from './FerhatSite.module.css';

/*
 * Ferhat'ın eniştesinin dükkânı için hafta sonları yaptığı site: Güler Hırdavat. İlk bakışta eski
 * usul ve sıradan: düz tablo, mavi bağlantılar, süs yok. Ama her şey hızlı ve doğru çalışır: arama
 * yazarken süzer, stok ve raf yeri bellidir, sipariş listesi tek tıkla WhatsApp mesajına dönüşür,
 * olmayan ürün için "gelince haber ver" kaydı alır. Yıllarca sahada çalışan program yazmış birinin
 * işi: gösterişsiz, kullanana göre.
 */
interface Item {
  code: string;
  name: string;
  unit: string;
  price: number;
  stock: number;
  shelf: string;
}
const ITEMS: Item[] = [
  { code: 'V-0412', name: 'Matkap ucu seti 13 parça (HSS)', unit: 'set', price: 485, stock: 14, shelf: 'A3' },
  { code: 'V-0155', name: 'Akıllı vida 4x40 (100 adet)', unit: 'paket', price: 95, stock: 62, shelf: 'B1' },
  { code: 'E-0920', name: 'Uzatma kablosu 5 m, 3 priz', unit: 'adet', price: 340, stock: 8, shelf: 'C2' },
  { code: 'B-0033', name: 'Silikon şeffaf 280 ml', unit: 'adet', price: 120, stock: 0, shelf: 'D4' },
  { code: 'S-1201', name: 'Musluk contası takımı', unit: 'set', price: 65, stock: 31, shelf: 'E1' },
  { code: 'E-0331', name: 'LED ampul 9W E27 gün ışığı', unit: 'adet', price: 75, stock: 120, shelf: 'C1' },
  { code: 'B-0210', name: 'Duvar boyası beyaz 2,5 L', unit: 'kutu', price: 690, stock: 5, shelf: 'D1' },
  { code: 'H-0088', name: 'Asma kilit 50 mm, 3 anahtar', unit: 'adet', price: 260, stock: 11, shelf: 'A1' },
];

export function FerhatSite({ page, go }: SiteProps) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<Record<string, number>>({});
  const [notify, setNotify] = useState<Record<string, string>>({});
  const [phone, setPhone] = useState('');
  const [sentMsg, setSentMsg] = useState(false);
  const hits = ITEMS.filter((i) => `${i.code} ${i.name}`.toLocaleLowerCase('tr').includes(q.trim().toLocaleLowerCase('tr')));
  const chosen = ITEMS.filter((i) => list[i.code]);
  const total = chosen.reduce((n, i) => n + i.price * list[i.code], 0);
  const message = `Merhaba, şunları ayırır mısınız?\n${chosen.map((i) => `- ${list[i.code]} ${i.unit} ${i.name} (${i.code})`).join('\n')}\nToplam: ${tl(total)}`;

  const set = (i: Item, n: number) => {
    setSentMsg(false);
    setList((cur) => {
      const next = { ...cur, [i.code]: Math.max(0, Math.min(i.stock, n)) };
      if (!next[i.code]) delete next[i.code];
      return next;
    });
  };

  return (
    <div className={s.site}>
      <header className={s.head}>
        <div>
          <b>GÜLER HIRDAVAT</b>
          <span>1987'den beri · Cevizli, Maltepe</span>
        </div>
        <span className={s.contact}>☎ 0216 555 44 21 · Hafta içi 08:30–19:00, Cumartesi 09:00–17:00</span>
      </header>
      <nav className={s.nav}>
        <a href="#" onClick={(e) => { e.preventDefault(); go('home'); }}>Ürünler ve stok</a> |{' '}
        <a href="#" onClick={(e) => { e.preventDefault(); go('liste'); }}>Sipariş listem ({chosen.length})</a> |{' '}
        <a href="#" onClick={(e) => { e.preventDefault(); go('adres'); }}>Adres ve yol tarifi</a>
      </nav>

      {page === 'home' && (
        <main className={s.main}>
          <p className={s.note}>Stok bilgisi her akşam 19:00'da dükkânın kasa programından güncellenir. Son güncelleme: dün 19:02.</p>
          <label className={s.search}>
            Ürün adı ya da kodu:{' '}
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ör. vida, ampul, V-0412" />
            <small>{hits.length} ürün</small>
          </label>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Kod</th>
                <th>Ürün</th>
                <th>Fiyat</th>
                <th>Stok</th>
                <th>Raf</th>
                <th>Listeye ekle</th>
              </tr>
            </thead>
            <tbody>
              {hits.map((i) => (
                <tr key={i.code} className={i.stock === 0 ? s.none : ''}>
                  <td className={s.mono}>{i.code}</td>
                  <td>{i.name}</td>
                  <td className={s.num}>{tl(i.price)}</td>
                  <td className={s.num}>{i.stock === 0 ? 'Yok' : `${i.stock} ${i.unit}`}</td>
                  <td className={s.mono}>{i.shelf}</td>
                  <td>
                    {i.stock === 0 ? (
                      notify[i.code] ? (
                        <small className={s.ok}>Gelince {notify[i.code]} numarasına SMS</small>
                      ) : (
                        <form
                          className={s.inline}
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (/^0?5\d{9}$/.test(phone.replace(/\s/g, ''))) setNotify({ ...notify, [i.code]: phone.trim() });
                          }}
                        >
                          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05XX..." aria-label="Telefon" />
                          <button>Gelince haber ver</button>
                        </form>
                      )
                    ) : (
                      <span className={s.inline}>
                        <input type="number" min={0} max={i.stock} value={list[i.code] ?? 0} onChange={(e) => set(i, Number(e.target.value))} aria-label={`${i.name} adedi`} />
                        {list[i.code] === i.stock && <small>stoktaki hepsi</small>}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hits.length === 0 && <p>Bu adla bir ürün bulamadık. Dükkânda 4.000'den fazla ürün var; telefonla sorabilirsiniz.</p>}
        </main>
      )}

      {page === 'liste' && (
        <main className={s.main}>
          <h1>Sipariş listem</h1>
          {chosen.length === 0 ? (
            <p>Listeniz boş. Ürünler sayfasından adet yazarak ekleyin.</p>
          ) : (
            <>
              <table className={s.table}>
                <tbody>
                  {chosen.map((i) => (
                    <tr key={i.code}>
                      <td>{i.name}</td>
                      <td className={s.num}>{list[i.code]} {i.unit}</td>
                      <td className={s.num}>{tl(i.price * list[i.code])}</td>
                      <td>Raf {i.shelf}</td>
                    </tr>
                  ))}
                  <tr className={s.totalRow}>
                    <td>Toplam</td>
                    <td />
                    <td className={s.num}>{tl(total)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
              <p>Listeyi WhatsApp'tan gönderin, ürünleriniz kasada hazır beklesin. Ödeme dükkânda.</p>
              <pre className={s.msg}>{message}</pre>
              <button className={s.btn} onClick={() => setSentMsg(true)}>
                WhatsApp'tan gönder
              </button>
              {sentMsg && <p className={s.ok}>Mesaj hazırlandı. Dükkân genelde 15 dakika içinde "hazır" diye dönüyor.</p>}
            </>
          )}
        </main>
      )}

      {page === 'adres' && (
        <main className={s.main}>
          <h1>Adres ve yol tarifi</h1>
          <p>
            <b>Güler Hırdavat</b>
            <br />
            Cevizli Mah. Tugay Yolu Cad. No: 58, Maltepe / İstanbul
            <br />
            Cevizli metro durağından 4 dakika yürüme. Dükkânın önünde 2 araçlık park yeri var.
          </p>
          <p>Ağır malzemeyi (çimento, boya kovası) Maltepe içine aynı gün getiriyoruz: 150 TL.</p>
        </main>
      )}

      <footer className={s.foot}>Güler Hırdavat · Maltepe · Vergi no: 4400112233</footer>
    </div>
  );
}
