import { useState } from 'react';
import { photo, tl, useLater } from './kit';
import type { SiteProps } from './registry';
import s from './VolkanSite.module.css';

/*
 * Volkan'ın CV'sine koyduğu site: Nar Lokanta. Güzel, şık ve baştan sona çalışıyor; rezervasyon
 * formu bile kusursuz. Ama kimin yaptığı belirsiz: altta bir ajansın adı ve "6 kişilik proje
 * ekibi" yazıyor, Volkan'ın adı hiçbir yerde geçmiyor. İşin kendisi iyi; sorulması gereken, bunun
 * ne kadarının onun olduğu.
 */
const DISHES = [
  { name: 'Közde patlıcanlı beğendi, kuzu incik', price: 780, note: '6 saat ağır ateşte' },
  { name: 'Ege otları ve keçi peyniri salatası', price: 340, note: 'Mevsimine göre değişir' },
  { name: 'Fırın sütlaç', price: 220, note: 'Taş fırında, tarçınsız' },
  { name: 'Günün balığı', price: 0, note: 'Fiyat sabah halden geldikten sonra belli olur' },
];

export function VolkanSite({ page, go }: SiteProps) {
  const later = useLater();
  const [people, setPeople] = useState(2);
  const [day, setDay] = useState('Cuma');
  const [time, setTime] = useState('20:00');
  const [name, setName] = useState('');
  const [tried, setTried] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'ok'>('idle');
  const full = day === 'Cumartesi' && time === '20:00';

  return (
    <div className={s.site}>
      <header className={s.head}>
        <button className={s.logo} onClick={() => go('home')}>
          NAR
          <small>lokanta</small>
        </button>
        <nav>
          <button onClick={() => go('home')}>Ana sayfa</button>
          <button onClick={() => go('menu')}>Menü</button>
          <button className={s.cta} onClick={() => go('rezervasyon')}>
            Rezervasyon
          </button>
        </nav>
      </header>

      {page === 'home' && (
        <>
          <section className={s.hero} style={{ backgroundImage: `linear-gradient(90deg, rgba(20,10,8,0.9), rgba(20,10,8,0.35)), url(${photo('market/peynir.jpg')})` }}>
            <small>Kadıköy · Moda</small>
            <h1>Ege mutfağı, ağır ateşte.</h1>
            <p>Menümüz her hafta pazardan gelen ürünlere göre değişir. Akşamları 18:00'den gece yarısına.</p>
            <button className={s.cta} onClick={() => go('rezervasyon')}>
              Masa ayırt
            </button>
          </section>
          <section className={s.strip}>
            {['kafe/turk-kahvesi.jpg', 'market/peynir.jpg', 'kafe/kek.jpg'].map((p) => (
              <img key={p} src={photo(p)} alt="" loading="lazy" />
            ))}
          </section>
          <section className={s.info}>
            <div>
              <h2>Bu haftadan</h2>
              <ul className={s.menu}>
                {DISHES.slice(0, 3).map((d) => (
                  <li key={d.name}>
                    <div>
                      <b>{d.name}</b>
                      <small>{d.note}</small>
                    </div>
                    <span>{d.price ? tl(d.price) : 'Sorunuz'}</span>
                  </li>
                ))}
              </ul>
              <button className={s.textLink} onClick={() => go('menu')}>
                Bütün menü →
              </button>
            </div>
            <div className={s.hours}>
              <h2>Saatler ve adres</h2>
              <p>Salı–Pazar 18:00–00:00 · Pazartesi kapalı</p>
              <p>Moda Cad. No: 112, Kadıköy</p>
              <p>Moda sahiline 3 dakika · vale yok, Moda otoparkına 5 dakika</p>
            </div>
          </section>
          <section className={s.press}>
            <blockquote>"Moda'nın en iddiasız ama en dikkatli mutfağı."</blockquote>
            <small>Bir yemek yazarının notu, 2024</small>
          </section>
        </>
      )}

      {page === 'menu' && (
        <main className={s.main}>
          <h1>Bu haftanın menüsü</h1>
          <ul className={s.menu}>
            {DISHES.map((d) => (
              <li key={d.name}>
                <div>
                  <b>{d.name}</b>
                  <small>{d.note}</small>
                </div>
                <span>{d.price ? tl(d.price) : 'Sorunuz'}</span>
              </li>
            ))}
          </ul>
        </main>
      )}

      {page === 'rezervasyon' && (
        <main className={s.main}>
          <h1>Rezervasyon</h1>
          {state === 'ok' ? (
            <p className={s.ok} role="status">
              {name.trim()}, {day} {time} için {people} kişilik masanız ayrıldı. Bir gün önce SMS ile hatırlatacağız.
            </p>
          ) : (
            <form
              className={s.form}
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                setTried(true);
                if (name.trim().length < 2 || full) return;
                setState('sending');
                later(() => setState('ok'), 900);
              }}
            >
              <label>
                Kişi
                <select value={people} onChange={(e) => setPeople(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                Gün
                <select value={day} onChange={(e) => setDay(e.target.value)}>
                  {['Perşembe', 'Cuma', 'Cumartesi', 'Pazar'].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label>
                Saat
                <select value={time} onChange={(e) => setTime(e.target.value)}>
                  {['18:30', '19:00', '20:00', '21:30'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                Ad soyad
                <input value={name} onChange={(e) => setName(e.target.value)} aria-invalid={tried && name.trim().length < 2} />
              </label>
              {full && <p className={s.warn}>Cumartesi 20:00 dolu. 21:30 ya da Pazar akşamı boş masa var.</p>}
              {tried && name.trim().length < 2 && <p className={s.warn}>Adınızı yazın.</p>}
              <button className={s.cta} disabled={state === 'sending'}>
                {state === 'sending' ? 'Ayrılıyor…' : 'Masayı ayır'}
              </button>
            </form>
          )}
        </main>
      )}

      <footer className={s.foot}>
        <span>Nar Lokanta · Moda Cad. No: 112, Kadıköy · 0216 555 30 30</span>
        <span>Tasarım ve yazılım: Pixelhane Dijital Ajans · Proje ekibi: 6 kişi</span>
      </footer>
    </div>
  );
}
