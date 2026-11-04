import { useState } from 'react';
import { audioEngine } from '../../shared/audio/audioEngine';
import { MUSIC_VOLUME_KEY, readStoredVolume, SFX_VOLUME_KEY, storeVolume } from '../../shared/prefs';
import { clearAllGameData } from '../../shared/privacy';
import s from './Welcome.module.css';

/*
 * Giriş ekranının rehber ve ayarlar panellerinin içi. Ayrı dosyada: yalnızca panel açılınca
 * yüklenir, ilk açılış paketine girmez (WelcomeScreen.tsx).
 */

/** Mahalle rehberi: maket, kayıt ve gizlilik, bütün verileri silmek. */
export function Help() {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <p>Mahallede her durak kısa bir oyun. Maketteki bir yere tıkla; bitirdiğin oyunun durağına tik düşer.</p>
      <h3 className={s.subhead}>Kayıt ve gizlilik</h3>
      <p>Hesap yok, sunucu yok; hiçbir veri gönderilmez. İlerlemen ve ayarların yalnızca bu tarayıcıda durur, oyunlar kaldığın yerden devam eder.</p>
      <p>
        {confirm ? (
          <>
            Bütün oyunların kayıtları, sonuçları ve ayarlar silinsin mi?{' '}
            <button type="button" className={s.textButton} onClick={() => void clearAllGameData().then(() => window.location.reload())}>
              Evet, sil
            </button>{' '}
            <button type="button" className={s.textButton} onClick={() => setConfirm(false)}>
              Vazgeç
            </button>
          </>
        ) : (
          <button type="button" className={s.textButton} onClick={() => setConfirm(true)}>
            Verilerimi sil
          </button>
        )}
      </p>
    </>
  );
}

/** Ayarlar: oyunlardaki Ayarlar'la aynı ses tercihlerini yazar. */
export function Settings() {
  const [music, setMusic] = useState(() => readStoredVolume(MUSIC_VOLUME_KEY));
  const [effects, setEffects] = useState(() => readStoredVolume(SFX_VOLUME_KEY));
  return (
    <>
      <label className={s.row}>
        <span>Müzik</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={music}
          onChange={(e) => {
            const v = Number(e.target.value);
            audioEngine.setMusicVolume(v);
            storeVolume(MUSIC_VOLUME_KEY, v);
            setMusic(v);
          }}
        />
      </label>
      <label className={s.row}>
        <span>Efektler</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={effects}
          onChange={(e) => {
            const v = Number(e.target.value);
            audioEngine.setSfxVolume(v);
            storeVolume(SFX_VOLUME_KEY, v);
            setEffects(v);
          }}
        />
      </label>
    </>
  );
}

