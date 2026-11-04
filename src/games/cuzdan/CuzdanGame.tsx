import { useEffect, useState } from 'react';
import { audioEngine } from '../../shared/audio/audioEngine';
import { Boot } from './Boot';
import { clearSlot, isRecord, readSlot, writeSlot } from '../../arcade/saveSlot';
import { YEARS, type Year } from './data';
import { Desktop } from './Desktop';
import { customPersona, PERSONAS, salaryPersona, START_YEAR, themeOf, type Persona } from './model';
import { sfx } from './sfx';
import s from './Shell.module.css';

/*
 * Cüzdan Zamanı: 2002'den bugüne Türk lirası, bir "Cüzdan TL" bilgisayarında. Tez: arayüz de
 * enflasyona uğrar. Saat geri alınınca fiyatlarla birlikte işletim sisteminin kendisi de o yıla
 * döner (2002 mavi pencereler, 2008–2012 cam, 2016 sonrası düz) ve ekran bir an titrer. Ekran
 * tam ekrandır; görev çubuğunun tepsisi sağ altta olduğu için stüdyo imzası bu oyunda yoktur.
 * Bu dosya temayı ve açılıştan masaüstüne geçişi tutar.
 */

/**
 * Oturum kaydı: kim olarak girildi ve saat hangi yılda. Dönen oyuncu açılışı beklemeden kendi
 * masaüstüne döner; "Oturumu kapat" kaydı siler. Maaş yalnızca bu cihazda tutulur.
 */
const SAVE_KEY = 'kariyerweb-cuzdan-oturum-v1';
interface Session {
  who: string;
  /** Maaşlı kişide bugünkü maaş, özel kişide 2005 cüzdanı. */
  amount?: number;
  year: number;
}
const isSession = (v: unknown): v is Session => isRecord(v) && typeof v.who === 'string' && (YEARS as readonly number[]).includes(v.year as number) && (v.amount === undefined || (typeof v.amount === 'number' && v.amount > 0));

function personaOf(s: Session): Persona | null {
  if (s.who === 'maas' && s.amount) return salaryPersona(s.amount);
  if (s.who === 'ozel' && s.amount) return customPersona(s.amount);
  return PERSONAS.find((p) => p.id === s.who) ?? null;
}

function sessionOf(p: Persona, year: Year): Session {
  if (p.salary) return { who: 'maas', amount: p.salary, year };
  if (p.id.startsWith('ozel-')) return { who: 'ozel', amount: Number(p.id.slice(5)), year };
  return { who: p.id, year };
}

export function CuzdanGame() {
  const [saved] = useState(() => readSlot(SAVE_KEY, isSession));
  const [persona, setPersona] = useState<Persona | null>(() => (saved ? personaOf(saved) : null));
  // altı sıfır atıldıktan sonraki ilk yıl: YTL ile başlanır, 2002'nin milyonları saatten açılır
  const [year, setYear] = useState<Year>(() => (saved && personaOf(saved) ? (saved.year as Year) : START_YEAR));
  useEffect(() => {
    if (persona) writeSlot(SAVE_KEY, sessionOf(persona, year));
  }, [persona, year]);
  const [degauss, setDegauss] = useState(false);

  useEffect(() => {
    audioEngine.setMusicMood('off');
  }, []);

  const changeYear = (y: Year) => {
    setYear(y);
    setDegauss(true);
    sfx.hum();
    window.setTimeout(() => setDegauss(false), 950);
  };

  return (
    <div className={s.app} data-theme={themeOf(year)}>
      {/* ekran okuyucunun başlık listesinde oyunun adı (görsel başlık sahnenin içinde) */}
      <h1 className="sr-only">Cüzdan Zamanı</h1>
      <div className={`${s.screen} ${degauss ? s.degauss : ''}`}>
        {!persona ? (
          <Boot onLogin={setPersona} />
        ) : (
          <Desktop
            key={persona.id}
            year={year}
            persona={persona}
            onYear={changeYear}
            onLogout={() => {
              clearSlot(SAVE_KEY);
              setPersona(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
