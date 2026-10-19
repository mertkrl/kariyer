import { useState } from 'react';
import { photo, useLater } from './kit';
import type { SiteProps } from './registry';
import s from './TolgaSite.module.css';

/*
 * Tolga'nın gönüllü yaptığı site: görme engelliler için çalışan bir derneğin sitesi. Sıradan bir
 * dernek sitesi gibi görünür; farkı, herkesin kullanabilmesi: yazı büyütülür, yüksek karşıtlık
 * açılır, her şey klavyeyle çalışır, formdaki hata neyin yanlış olduğunu söyler. "Maaşlı deneyim
 * 0" diye elenen birinin işi.
 */
const EVENTS = [
  { id: 1, day: '12', mon: 'Nis', title: 'Sesli betimlemeli film gösterimi', place: 'Kadıköy Halk Eğitim', going: 34 },
  { id: 2, day: '19', mon: 'Nis', title: 'Bastonla şehir yürüyüşü', place: 'Moda sahili, buluşma: iskele', going: 18 },
  { id: 3, day: '03', mon: 'May', title: 'Ekran okuyucu ile telefon kullanımı atölyesi', place: 'Dernek merkezi', going: 22 },
];
const AREAS = ['Okuma kaydı (sesli kitap)', 'Etkinliklerde refakat', 'Bilgisayar eğitimi'];

export function TolgaSite({ page, go }: SiteProps) {
  const later = useLater();
  const [size, setSize] = useState(0);
  const [contrast, setContrast] = useState(false);
  const [joined, setJoined] = useState<Set<number>>(new Set());
  const [form, setForm] = useState({ name: '', phone: '', areas: [] as string[] });
  const [tried, setTried] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'ok'>('idle');
  const errors = {
    name: form.name.trim().length < 2 ? 'Adınızı yazın.' : '',
    phone: /^0?5\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/.test(form.phone.trim()) ? '' : 'Telefon 05XX XXX XX XX biçiminde olmalı.',
    areas: form.areas.length ? '' : 'En az bir alan seçin.',
  };

  return (
    <div className={`${s.site} ${contrast ? s.contrast : ''}`} style={{ fontSize: `${16 + size * 2}px` }}>
      <div className={s.tools} role="toolbar" aria-label="Görünüm ayarları">
        <span>Yazı boyutu</span>
        <button onClick={() => setSize((n) => Math.max(0, n - 1))} disabled={size === 0} aria-label="Yazıyı küçült">
          A−
        </button>
        <button onClick={() => setSize((n) => Math.min(3, n + 1))} disabled={size === 3} aria-label="Yazıyı büyüt">
          A+
        </button>
        <button onClick={() => setContrast((c) => !c)} aria-pressed={contrast}>
          ◐ Yüksek karşıtlık
        </button>
      </div>
      <header className={s.head}>
        <button className={s.logo} onClick={() => go('home')}>
          <span aria-hidden="true">☀</span> Işık Derneği
        </button>
        <nav>
          {[
            ['home', 'Ana sayfa'],
            ['etkinlikler', 'Etkinlikler'],
            ['gonullu', 'Gönüllü ol'],
          ].map(([id, l]) => (
            <button key={id} onClick={() => go(id)} aria-current={page === id ? 'page' : undefined} className={page === id ? s.on : ''}>
              {l}
            </button>
          ))}
        </nav>
      </header>

      {page === 'home' && (
        <main className={s.main}>
          <section className={s.hero}>
            <div>
            <h1>Görmeyen ve az gören bireylerle birlikte, 1998'den beri.</h1>
            <p>Sesli kitap kaydı, şehir yürüyüşleri ve teknoloji atölyeleri. Tüm etkinliklerimiz ücretsiz.</p>
            <div className={s.heroBtns}>
              <button className={s.primary} onClick={() => go('gonullu')}>
                Gönüllü ol
              </button>
              <button className={s.secondary} onClick={() => go('etkinlikler')}>
                Etkinlikleri gör
              </button>
            </div>
            </div>
            <img src={photo('dernek/atolye.jpg')} alt="Bilgisayar atölyesinde ekranlara bakan katılımcılar" />
          </section>
          <section className={s.numbers}>
            <div>
              <b>2.400</b>
              <span>sesli kitap kaydı</span>
            </div>
            <div>
              <b>180</b>
              <span>aktif gönüllü</span>
            </div>
            <div>
              <b>26</b>
              <span>yıldır</span>
            </div>
          </section>
          <h2>Haberler</h2>
          <div className={s.news}>
            {[
              ['Mart 2025', '2.400. sesli kitap kaydedildi', 'Gönüllümüz Necla Hanım, Sait Faik\'in Semaver\'ini okuyarak arşivimizin 2.400. kitabını tamamladı.'],
              ['Şubat 2025', 'Kadıköy Belediyesi ile sesli yol tarifi', 'Moda sahilindeki 12 durağa dokunsal zemin ve sesli anons eklendi; önerileri üyelerimiz verdi.'],
              ['Ocak 2025', 'Yeni dönem bilgisayar atölyesi', 'Ekran okuyucuyla e-Devlet ve bankacılık işlemleri. 18 kişilik kontenjan doldu, ikinci grup açılıyor.'],
            ].map(([d, t, x]) => (
              <article key={t}>
                <small>{d}</small>
                <b>{t}</b>
                <p>{x}</p>
              </article>
            ))}
          </div>

          <section className={s.support}>
            <div>
              <h2>Nasıl destek olabilirsiniz?</h2>
              <p>Sesli kitap okuyabilir, etkinliklerde refakat edebilir ya da bağış yapabilirsiniz. Bağışlarınız vergiden düşülebilir.</p>
            </div>
            <button className={s.primary} onClick={() => go('gonullu')}>
              Gönüllü başvurusu
            </button>
          </section>

          <h2>Yaklaşan etkinlik</h2>
          <article className={s.event}>
            <div className={s.date}>
              <b>{EVENTS[0].day}</b>
              <span>{EVENTS[0].mon}</span>
            </div>
            <div>
              <b>{EVENTS[0].title}</b>
              <span>{EVENTS[0].place}</span>
            </div>
          </article>
        </main>
      )}

      {page === 'etkinlikler' && (
        <main className={s.main}>
          <h1>Etkinlikler</h1>
          <ul className={s.events}>
            {EVENTS.map((e) => {
              const on = joined.has(e.id);
              return (
                <li key={e.id} className={s.event}>
                  <div className={s.date}>
                    <b>{e.day}</b>
                    <span>{e.mon}</span>
                  </div>
                  <div>
                    <b>{e.title}</b>
                    <span>
                      {e.place} · {e.going + (on ? 1 : 0)} kişi katılıyor
                    </span>
                  </div>
                  <button
                    className={on ? s.secondary : s.primary}
                    aria-pressed={on}
                    onClick={() =>
                      setJoined((cur) => {
                        const next = new Set(cur);
                        if (on) next.delete(e.id);
                        else next.add(e.id);
                        return next;
                      })
                    }
                  >
                    {on ? '✓ Katılıyorum' : 'Katılacağım'}
                  </button>
                </li>
              );
            })}
          </ul>
        </main>
      )}

      {page === 'gonullu' && (
        <main className={s.main}>
          <h1>Gönüllü ol</h1>
          {state === 'ok' ? (
            <p className={s.ok} role="status">
              Teşekkürler {form.name.trim()}! Gönüllü koordinatörümüz Selma Hanım iki gün içinde {form.phone.trim()} numarasından sizi arayacak.
            </p>
          ) : (
            <form
              className={s.form}
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                setTried(true);
                if (errors.name || errors.phone || errors.areas) return;
                setState('sending');
                later(() => setState('ok'), 900);
              }}
            >
              {tried && (errors.name || errors.phone || errors.areas) && (
                <div className={s.summary} role="alert">
                  Formda {[errors.name, errors.phone, errors.areas].filter(Boolean).length} eksik var. Aşağıda kırmızıyla işaretli.
                </div>
              )}
              <label>
                Ad soyad
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={tried && !!errors.name} />
                {tried && errors.name && <small>{errors.name}</small>}
              </label>
              <label>
                Telefon
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="05XX XXX XX XX" inputMode="tel" aria-invalid={tried && !!errors.phone} />
                {tried && errors.phone && <small>{errors.phone}</small>}
              </label>
              <fieldset aria-invalid={tried && !!errors.areas}>
                <legend>Hangi alanda yardım etmek istersiniz?</legend>
                {AREAS.map((a) => (
                  <label key={a} className={s.check}>
                    <input
                      type="checkbox"
                      checked={form.areas.includes(a)}
                      onChange={(e) => setForm({ ...form, areas: e.target.checked ? [...form.areas, a] : form.areas.filter((x) => x !== a) })}
                    />
                    {a}
                  </label>
                ))}
                {tried && errors.areas && <small>{errors.areas}</small>}
              </fieldset>
              <button className={s.primary} disabled={state === 'sending'}>
                {state === 'sending' ? 'Gönderiliyor…' : 'Başvuruyu gönder'}
              </button>
            </form>
          )}
        </main>
      )}

      <footer className={s.foot}>
        Işık Derneği · Kadıköy, İstanbul · 0216 555 18 98
      </footer>
    </div>
  );
}
