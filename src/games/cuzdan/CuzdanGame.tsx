import { useEffect, useState } from 'react';
import { audioEngine } from '../../audio/audioEngine';
import { Boot } from './Boot';
import type { Year } from './data';
import { Desktop } from './Desktop';
import { START_YEAR, themeOf, type Persona } from './model';
import { sfx } from './sfx';
import s from './Shell.module.css';

/*
 * Cüzdan Zamanı: 2002'den bugüne Türk lirası, bir "Cüzdan TL" bilgisayarında. Tez: arayüz de
 * enflasyona uğrar. Saat geri alınınca fiyatlarla birlikte işletim sisteminin kendisi de o yıla
 * döner (2002 mavi pencereler, 2008–2012 cam, 2016 sonrası düz) ve ekran bir an titrer. Ekran
 * tam ekrandır; görev çubuğunun tepsisi sağ altta olduğu için stüdyo imzası bu oyunda yoktur.
 * Bu dosya temayı ve açılıştan masaüstüne geçişi tutar.
 */

export function CuzdanGame() {
  const [persona, setPersona] = useState<Persona | null>(null);
  // altı sıfır atıldıktan sonraki ilk yıl: YTL ile başlanır, 2002'nin milyonları saatten açılır
  const [year, setYear] = useState<Year>(START_YEAR);
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
      <div className={`${s.screen} ${degauss ? s.degauss : ''}`}>
        {!persona ? (
          <Boot onLogin={setPersona} />
        ) : (
          <Desktop
            key={persona.id}
            year={year}
            persona={persona}
            onYear={changeYear}
            onLogout={() => setPersona(null)}
          />
        )}
      </div>
    </div>
  );
}
