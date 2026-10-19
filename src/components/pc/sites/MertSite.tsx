import { useState } from 'react';
import { photo, useLater } from './kit';
import type { SiteProps } from './registry';
import s from './MertSite.module.css';

/*
 * Mert'in stüdyo portfolyosu: dört yıllık freelance işin gerçek müşterileri. Her projede kendi
 * yaptığı kısmı, kimle çalıştığını ve sonucu ayrı yazar; başkasının işini kendine yazmaz. Küçük
 * bir animasyon laboratuvarı da gerçekten çalışır. CV'si "standart dışı format" diye okunmadı.
 */
const WORK = [
  {
    id: 'lavanta',
    cat: 'eticaret',
    client: 'Lavanta Butik',
    kind: 'E-ticaret · 2024',
    color: '#7c6aa8',
    did: 'Tasarım ve ön yüz benim; ödeme altyapısı müşterinin mevcut sağlayıcısı.',
    short: 'Dönüşüm +%22',
    result: 'Ödeme adımını üçten bire indirdik. Üç ayda sepetten satışa dönüşüm %2,7 → %3,3 (+%22), müşterinin kendi panelinden.',
    stack: 'React · TypeScript · Shopify API',
  },
  {
    id: 'kitap',
    cat: 'topluluk',
    client: 'Kadıköy Kitap Kulübü',
    kind: 'Topluluk sitesi · 2023',
    color: '#c46b3c',
    did: 'Baştan sona ben; içerik kulübün gönüllülerinden.',
    short: 'Ayda ~1.800 ziyaretçi',
    result: 'Ayda ~1.800 ziyaretçi. Gönüllüler etkinlikleri bana sormadan ekleyebiliyor: amacımız buydu.',
    stack: 'Next.js · basit bir içerik paneli',
  },
  {
    id: 'seramik',
    cat: 'randevu',
    client: 'Atölye Toprak',
    kind: 'Seramik atölyesi · randevu · 2023',
    color: '#4f8a6e',
    did: 'Ön yüz benim. Randevu takvimini bir arkadaşım (Ece D.) yazdı; ben arayüzünü bağladım.',
    short: 'Telefonla randevu yarıya indi',
    result: 'Telefonla alınan randevular yarıya indi. Atölye sahibi artık derste telefona bakmıyor.',
    stack: 'React · CSS animasyonları',
  },
  {
    id: 'tasima',
    cat: 'kurumsal',
    client: 'Yıldız Nakliyat',
    kind: 'Kurumsal site · 2022',
    color: '#3d6a9e',
    did: 'Ön yüz benim. Proje müşteri tarafında iptal edildi; site hiç yayına girmedi.',
    short: 'Yayına girmedi',
    result: 'Yayında değil. Burada tutuyorum çünkü en çok bu projede öğrendim: kapsamı yazılı yapmadan başlamamayı.',
    stack: 'Vue · Figma',
  },
];

type Work = (typeof WORK)[number];

const FILTERS = [
  ['hepsi', 'Hepsi'],
  ['eticaret', 'E-ticaret'],
  ['topluluk', 'Topluluk'],
  ['randevu', 'Randevu'],
  ['kurumsal', 'Kurumsal'],
] as const;

/** Müşterinin eski sitesi: karşılaştırmanın "önce"si. Kalabalık, gri, küçük yazılı. */
function OldPreview() {
  return (
    <svg viewBox="0 0 320 180" className={s.preview} aria-hidden="true">
      <rect width="320" height="180" fill="#9a9a9a" />
      <rect x="20" y="16" width="280" height="164" fill="#e8e8e8" />
      <rect x="20" y="16" width="280" height="16" fill="#555" />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={26 + i * 30} y="20" width="24" height="8" fill="#888" />
      ))}
      <rect x="26" y="38" width="268" height="26" fill="#c33" />
      <text x="160" y="56" fontSize="11" fill="#fff" textAnchor="middle" fontWeight="700">!!! KAMPANYA !!! %50 İNDİRİM !!!</text>
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={26 + (i % 6) * 45} y={70 + Math.floor(i / 6) * 50} width="40" height="44" fill="#bbb" />
      ))}
      <text x="26" y="176" fontSize="6" fill="#777">Ödeme için 3 adım · üyelik zorunlu · telefon ile sipariş</text>
    </svg>
  );
}

/** Müşteri sitesinin küçük bir önizlemesi: her proje kendi türünde. */
function Preview({ w }: { w: Work }) {
  const c = w.color;
  return (
    <svg viewBox="0 0 320 180" className={s.preview} role="img" aria-label={`${w.client} sitesinin önizlemesi`}>
      <rect width="320" height="180" fill={c} />
      <rect x="20" y="16" width="280" height="164" rx="10" fill="#fff" />
      <rect x="20" y="16" width="280" height="24" rx="10" fill="#f2f2ee" />
      <text x="34" y="32" fontSize="10" fontWeight="700" fill="#111">{w.client}</text>
      {w.id === 'lavanta' &&
        [0, 1, 2, 3].map((i) => (
          <g key={i}>
            <clipPath id={`lv${i}`}>
              <rect x={34 + i * 66} y="52" width="56" height="62" rx="6" />
            </clipPath>
            <image href={photo('mert/butik.jpg')} x={34 + i * 66 - i * 40} y="52" width="220" height="62" preserveAspectRatio="xMidYMid slice" clipPath={`url(#lv${i})`} />
            <rect x={34 + i * 66} y="120" width="40" height="6" rx="3" fill="#ccc" />
            <text x={34 + i * 66} y="140" fontSize="9" fontWeight="700" fill="#111">{[349, 520, 289, 410][i]} TL</text>
            <rect x={34 + i * 66} y="148" width="56" height="16" rx="4" fill={c} />
          </g>
        ))}
      {w.id === 'kitap' && <image href={photo('mert/kitap.jpg')} x="200" y="48" width="96" height="124" preserveAspectRatio="xMidYMid slice" />}
      {w.id === 'kitap' &&
        ['Pazar · Tutunamayanlar', 'Çarşamba · Şiir akşamı', 'Cumartesi · Takas günü'].map((t, i) => (
          <g key={t}>
            <rect x="34" y={54 + i * 38} width="34" height="30" rx="5" fill={c} opacity="0.85" />
            <text x="51" y={73 + i * 38} fontSize="10" fontWeight="700" fill="#fff" textAnchor="middle">{12 + i * 3}</text>
            <text x="78" y={68 + i * 38} fontSize="9.5" fill="#111">{t}</text>
            <rect x="78" y={74 + i * 38} width="120" height="5" rx="2.5" fill="#ddd" />

          </g>
        ))}
      {w.id === 'seramik' && (
        <g>
          {Array.from({ length: 21 }, (_, i) => (
            <rect key={i} x={34 + (i % 7) * 26} y={54 + Math.floor(i / 7) * 26} width="22" height="22" rx="4" fill={[3, 8, 9, 15].includes(i) ? c : '#eee'} />
          ))}
          <rect x="226" y="54" width="60" height="74" rx="6" fill="#f6f6f2" />
          <text x="234" y="70" fontSize="8.5" fill="#111">Perşembe</text>
          <text x="234" y="84" fontSize="8.5" fill="#555">19:00 çark</text>
          <rect x="234" y="104" width="44" height="16" rx="4" fill={c} />
          <text x="34" y="150" fontSize="9" fill="#555">4 boş saat bu hafta</text>
        </g>
      )}
      {w.id === 'tasima' && (
        <g>
          <rect x="34" y="52" width="252" height="62" rx="6" fill={c} opacity="0.15" />
          <text x="46" y="78" fontSize="13" fontWeight="800" fill="#111">Türkiye'nin her yerine</text>
          <rect x="46" y="88" width="70" height="14" rx="4" fill={c} />
          <path d="M210 100h44v-16h14l10 10v6h-68z" fill={c} />
          <circle cx="222" cy="102" r="5" fill="#111" />
          <circle cx="266" cy="102" r="5" fill="#111" />
          <rect x="34" y="126" width="80" height="40" rx="5" fill="#f2f2ee" />
          <rect x="120" y="126" width="80" height="40" rx="5" fill="#f2f2ee" />
          <rect x="206" y="126" width="80" height="40" rx="5" fill="#f2f2ee" />
          <text x="160" y="150" fontSize="9" fill="#999" textAnchor="middle">yayında değil</text>
        </g>
      )}
    </svg>
  );
}

export function MertSite({ page, go }: SiteProps) {
  const later = useLater();
  const [spin, setSpin] = useState(0);
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>('hepsi');
  const [split, setSplit] = useState(50);
  const [form, setForm] = useState({ name: '', email: '', msg: '' });
  const [tried, setTried] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const work = WORK.find((w) => w.id === page);
  const errors = {
    name: form.name.trim().length < 2 ? 'Adını yaz.' : '',
    email: /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(form.email) ? '' : 'Geçerli bir e-posta adresi yaz.',
    msg: form.msg.trim().length < 10 ? 'Biraz daha anlat (en az 10 karakter).' : '',
  };
  const shown = WORK.filter((w) => filter === 'hepsi' || w.cat === filter);

  return (
    <div className={s.site}>
      <header className={s.head}>
        <button className={s.logo} onClick={() => go('home')}>
          mert<span>aydın</span>.studio
        </button>
        <nav>
          <button onClick={() => go('home')}>İşler</button>
          <button onClick={() => go('lab')}>Lab</button>
          <button onClick={() => go('iletisim')}>İletişim</button>
        </nav>
      </header>

      {page === 'home' && (
        <main className={s.main}>
          <section className={s.hero}>
            <h1>
              Küçük işletmeler için
              <br />
              hızlı, sade arayüzler.
            </h1>
            <p>Dört yıldır freelance çalışıyorum: 23 proje, 21'i yayında. Tasarımı da kodu da çoğunlukla ben yapıyorum; yapmadığım kısımları her projede yazdım.</p>
          </section>
          <div className={s.filters} role="tablist" aria-label="Projeleri süz">
            {FILTERS.map(([id, label]) => (
              <button key={id} role="tab" aria-selected={filter === id} className={filter === id ? s.filterOn : ''} onClick={() => setFilter(id)}>
                {label}
                <small>{id === 'hepsi' ? WORK.length : WORK.filter((w) => w.cat === id).length}</small>
              </button>
            ))}
          </div>
          <section className={s.grid}>
            {shown.map((w) => (
              <button key={w.id} className={s.card} onClick={() => go(w.id)}>
                <div className={s.thumb}>
                  <Preview w={w} />
                </div>
                <b>{w.client}</b>
                <small>{w.kind}</small>
                <em>{w.short}</em>
              </button>
            ))}
          </section>
          <p className={s.more}>+ 18 küçük proje (açılış sayfaları, menüler). Listesi istenirse gönderilir.</p>
        </main>
      )}

      {work && (
        <main className={s.case}>
          <button className={s.back} onClick={() => go('home')}>
            ← Tüm işler
          </button>
          {work.id === 'tasima' ? (
            <div className={s.caseHero}>
              <Preview w={work} />
            </div>
          ) : (
            <figure className={s.compare}>
              <div className={s.compareBox}>
                <OldPreview />
                <div className={s.compareAfter} style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
                  <Preview w={work} />
                </div>
                <i className={s.compareLine} style={{ left: `${split}%` }} aria-hidden="true" />
              </div>
              <input type="range" min="0" max="100" value={split} onChange={(e) => setSplit(Number(e.target.value))} aria-label="Önce ve sonra arasında kaydır" />
              <figcaption>
                <span>← Önceki site</span>
                <span>Benim yaptığım →</span>
              </figcaption>
            </figure>
          )}
          <h1>{work.client}</h1>
          <p className={s.kind}>{work.kind}</p>
          <dl className={s.facts}>
            <dt>Benim payım</dt>
            <dd>{work.did}</dd>
            <dt>Sonuç</dt>
            <dd>{work.result}</dd>
            <dt>Teknoloji</dt>
            <dd>{work.stack}</dd>
          </dl>
        </main>
      )}

      {page === 'lab' && (
        <main className={s.case}>
          <h1>Lab</h1>
          <p>Müşteri işlerinde kullandığım küçük animasyonların denemeleri. Hepsi saf CSS; kodu açık.</p>
          <div className={s.lab}>
            <button className={s.blob} style={{ transform: `rotate(${spin * 90}deg)` }} onClick={() => setSpin((n) => n + 1)} aria-label="Döndür">
              tıkla
            </button>
            <div className={s.loader} aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <div className={s.wave} aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <i key={i} style={{ animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
          </div>
        </main>
      )}

      {page === 'iletisim' && (
        <main className={s.case}>
          <h1>İletişim</h1>
          <p>Şu an tam zamanlı bir ekip arıyorum; freelance işlerimi Haziran'a kadar bitiriyorum.</p>
          {state === 'sent' ? (
            <div className={s.sent} role="status">
              <b>Teşekkürler, {form.name.trim()}.</b> Mesajın geldi; en geç bir iş günü içinde {form.email} adresine dönerim.
            </div>
          ) : (
            <form
              className={s.form}
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                setTried(true);
                if (errors.name || errors.email || errors.msg) return;
                setState('sending');
                later(() => setState('sent'), 1000);
              }}
            >
              {(['name', 'email', 'msg'] as const).map((k) => (
                <label key={k}>
                  {{ name: 'Adın', email: 'E-posta', msg: 'Ne yapmak istiyorsun?' }[k]}
                  {k === 'msg' ? (
                    <textarea value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} aria-invalid={tried && !!errors[k]} />
                  ) : (
                    <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} aria-invalid={tried && !!errors[k]} />
                  )}
                  {tried && errors[k] && <small>{errors[k]}</small>}
                </label>
              ))}
              <button className={s.send} disabled={state === 'sending'}>
                {state === 'sending' ? 'Gönderiliyor…' : 'Gönder'}
              </button>
            </form>
          )}
          <p className={s.kind}>ya da doğrudan: mert@mertaydin.studio</p>
        </main>
      )}

      <footer className={s.foot}>© 2025 Mert Aydın · Bu site React ile yazıldı, Figma'da çizildi.</footer>
    </div>
  );
}
