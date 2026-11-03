import { useEffect, useState } from 'react';
import { ClockOut } from '../../arcade/ClockOut';
import { customPersona, money, PERSONAS, salaryIn, salaryPersona, START_YEAR, walletFor, type Persona } from './model';
import { NOW } from './data';
import b from './Boot.module.css';
import s from './Shell.module.css';

/*
 * Cüzdan TL'nin açılışı: BIOS satırları (kur tablosu, sıfır atıcı, enflasyon sensörü), logo ve
 * kullanıcı seçimi. Kullanıcı "kimin cebiyle" oynanacağıdır: Zaman Bakkalı'nda cüzdan ona göre
 * dolar. "Açılışı atla" doğrudan kullanıcı seçimine geçer.
 */

const BIOS = [
  'CÜZDAN BIOS v2.05  (C) 2005 Cüzdan Bilişim',
  '',
  'İşlemci .......... 2.4 GHz ........ TAMAM',
  'Bellek ........... 512 MB ......... TAMAM',
  'Sabit disk ....... 80 GB .......... TAMAM',
  'Sıfır atıcı ...... 1.000.000 TL = 1 YTL .. TAMAM',
  'Kur tablosu ...... 1 USD = 1,34 YTL',
  'Enflasyon sensörü  %8,2 (2005)',
  '',
  'Cüzdan TL başlatılıyor…',
];

type Stage = 'bios' | 'logo' | 'login';

export function Boot({ onLogin }: { onLogin: (p: Persona) => void }) {
  const [stage, setStage] = useState<Stage>('bios');
  const [lines, setLines] = useState(0);

  useEffect(() => {
    if (stage === 'login') return;
    const t =
      stage === 'bios'
        ? window.setTimeout(() => (lines < BIOS.length ? setLines(lines + 1) : setStage('logo')), lines < BIOS.length ? 170 : 500)
        : window.setTimeout(() => setStage('login'), 2200);
    return () => window.clearTimeout(t);
  }, [stage, lines]);

  if (stage === 'bios')
    return (
      <div className={b.bios} aria-label="Bilgisayar açılıyor">
        {BIOS.slice(0, lines).map((l, i) => (
          <div key={i}>{l || ' '}</div>
        ))}
        <button type="button" className={b.skip} onClick={() => setStage('login')} autoFocus>
          Açılışı atla ›
        </button>
      </div>
    );

  if (stage === 'logo')
    return (
      <div className={b.splash} aria-label="Cüzdan TL yükleniyor">
        <div>
          <div className={b.word}>
            Cüzdan<sup>TL</sup>
          </div>
          <div className={b.splashSub}>Türk lirası sürümü · 1.000.000 → 1</div>
          <div className={b.loader}>
            <i />
          </div>
          <button type="button" className={b.skip} onClick={() => setStage('login')}>
            Açılışı atla ›
          </button>
        </div>
      </div>
    );

  return (
    <div className={b.login}>
      <div className={b.band}>
        <ClockOut tone="dark" />
      </div>
      <div className={b.loginMid}>
        <div className={b.intro}>
          <div className={b.welcome}>
            <b>hoş geldiniz</b>
            <span>
              Başlamak için kimin cebiyle
              <br />
              oynayacağınızı seçin
            </span>
          </div>
          <div className={b.yearBadge} aria-label={`Yıl ${START_YEAR}, Yeni Türk Lirası`}>
            <span className={b.calendar} aria-hidden="true">
              <i>OCAK</i>
              <b>{START_YEAR}</b>
            </span>
            <span>
              <b>Yıl {START_YEAR}</b>
              <small>1.000.000 TL = 1 YTL</small>
              <small>2002'ye saatten gidebilirsin.</small>
            </span>
          </div>
        </div>
        <div className={b.loginSep} aria-hidden="true" />
        <div className={b.users}>
          <div className={b.userList} role="group" aria-label="Kullanıcılar">
            {PERSONAS.map((p, i) => (
              <button key={p.id} type="button" className={b.user} onClick={() => onLogin(p)} autoFocus={i === 0}>
                <span className={s.avatar} aria-hidden="true">
                  {p.avatar}
                </span>
                <span>
                  <b>{p.name}</b>
                  <small>
                    {p.role} · {START_YEAR}'te {p.purse}: {money(walletFor(START_YEAR, p.share), START_YEAR)}
                  </small>
                </span>
              </button>
            ))}
            <SalaryUser onLogin={onLogin} />
            <CustomUser onLogin={onLogin} />
          </div>
        </div>
      </div>
      <div className={`${b.band} ${b.bandBottom}`}>
        <span>Saat 2005'te, Yeni Türk Lirası ile açılır; altı sıfırlı 2002'ye saatten gidebilirsin. Fiyatlar yaklaşıktır.</span>
      </div>
    </div>
  );
}

/** Senin maaşın: bugünkü net maaş yazılır; her yılda cüzdan onun enflasyonla karşılığıdır. */
function SalaryUser({ onLogin }: { onLogin: (p: Persona) => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const n = Number(amount.replace(/\./g, '').replace(',', '.'));
  const ok = n >= 1000 && n <= 10_000_000;
  if (!open)
    return (
      <button type="button" className={b.user} onClick={() => setOpen(true)}>
        <span className={s.avatar} aria-hidden="true">
          💼
        </span>
        <span>
          <b>Sen</b>
          <small>bugünkü maaşınla geçmişe git</small>
        </span>
      </button>
    );
  return (
    <form
     
      className={`${b.user} ${b.custom}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) onLogin(salaryPersona(n));
      }}
    >
      <span className={s.avatar} aria-hidden="true">
        💼
      </span>
      <span>
        <b>Senin maaşın</b>
        <label>
          <small>{NOW}'da net</small>
          <input type="text" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, '').slice(0, 12))} placeholder="ör. 45000" autoFocus aria-label={`${NOW} yılında aylık net maaş, TL`} />
          <small>₺</small>
          <button type="submit" disabled={!ok}>
            Gir ›
          </button>
        </label>
        <small>{ok ? `${START_YEAR}'te karşılığı: ${money(salaryIn(n, START_YEAR), START_YEAR)}. Maaş bu cihazdan çıkmaz.` : 'Aynı alım gücüyle, her yılın parasına çevrilir.'}</small>
      </span>
    </form>
  );
}

/** Özel: oyuncu 2005 cüzdanını kendisi yazar; öbür yıllarda asgari ücretle aynı oranda büyür ya da küçülür. */
function CustomUser({ onLogin }: { onLogin: (p: Persona) => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('50');
  const n = Number(amount.replace(',', '.'));
  const ok = n >= 1 && n <= 100_000;
  if (!open)
    return (
      <button type="button" className={b.user} onClick={() => setOpen(true)}>
        <span className={s.avatar} aria-hidden="true">
          ✏️
        </span>
        <span>
          <b>Özel</b>
          <small>kendi bütçeni belirle</small>
        </span>
      </button>
    );
  return (
    <form
     
      className={`${b.user} ${b.custom}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) onLogin(customPersona(n));
      }}
    >
      <span className={s.avatar} aria-hidden="true">
        ✏️
      </span>
      <span>
        <b>Özel bütçe</b>
        <label>
          <small>{START_YEAR}'te cebinde</small>
          <input type="number" min={1} max={100000} step="any" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus aria-label={`${START_YEAR} yılında cüzdan, YTL`} />
          <small>YTL</small>
          <button type="submit" disabled={!ok}>
            Gir ›
          </button>
        </label>
        <small>Öbür yıllarda asgari ücretle aynı oranda değişir.</small>
      </span>
    </form>
  );
}
