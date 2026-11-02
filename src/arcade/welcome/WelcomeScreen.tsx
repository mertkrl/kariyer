import { useEffect, useState, type ReactNode } from 'react';
import { audioEngine } from '../../audio/audioEngine';
import { MUSIC_VOLUME_KEY, readStoredVolume, SFX_VOLUME_KEY, storeMuted, storeVolume } from '../../game/lib/prefs';
import { prefersReducedMotion } from '../../components/ui/motion';
import { loadProgress } from '../progress';
import { hrefOf } from '../route';
import type { GameRoute } from '../slugs';
import { Model, type Leaving } from './Model';
import type { Stop } from './stops';
import * as sfx from '../mahalle/sfx';
import './fonts.css';
import s from './Welcome.module.css';

/*
 * Mesai Dışı'nın ilk ekranı, Figma'daki "İzometrik Mahalle / Mimari Maket" çerçevesi (1600×1000)
 * birebir: solda karşılama, sağda mahallenin etkileşimli maketi (Model.tsx). Maketteki bir yere
 * tıklayan doğrudan o yerin oyununa dalar (dövizci → Cüzdan Zamanı). Sitenin ana sayfasıdır;
 * oyunlardan dönüş de buraya gelir.
 */

/** Oyun açılırken ekranın son rengi: her oyunun yüklenirken gösterdiği zemin (Root.tsx). */
const LOADING_BG: Record<GameRoute, string> = { iseAlim: '#100e0b', test: '#f4f6fa', insaat: '#bcd9ea', bakkal: '#f4e6c8', ekran: '#23262d', meydan: '#ece6da', asfalt: '#e9e4d8', trafik: '#1d2128', cuzdan: '#efe9da' };

/** Figma'daki ikonlar (lucide): 18×18, 1.5 kalınlık. */
const ICONS = {
  volume:
    'M12 6.75a3.75 3.75 0 0 1 0 4.5M14.52 13.77a6.75 6.75 0 0 0 0-9.54M8.25 3.53a.53.53 0 0 0-.9-.37L4.8 5.69a1.05 1.05 0 0 1-.75.31H2.25a.75.75 0 0 0-.75.75v4.5c0 .41.34.75.75.75h1.81c.28 0 .55.11.75.31l2.54 2.54a.53.53 0 0 0 .9-.38z',
  help: 'M6.82 6.75a2.25 2.25 0 0 1 4.37.75c0 1.5-2.25 2.25-2.25 2.25M9 12.75h.01M16.5 9A7.5 7.5 0 1 1 1.5 9a7.5 7.5 0 0 1 15 0z',
  settings: 'M7.5 3.75H2.25M9 14.25H2.25M10.5 2.25v3M10.5 3.75h5.25M12 12.75v3M12 14.25h3.75M15.75 9H9M6 7.5v3M6 9H2.25',
};

function ToolButton({ label, pressed, onClick, children }: { label: string; pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={s.tool} aria-label={label} aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  );
}

function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <aside className={s.panel} role="dialog" aria-label={title}>
      <div className={s.panelHead}>
        <h2>{title}</h2>
        <button type="button" className={s.close} aria-label="Paneli kapat" onClick={onClose}>
          ×
        </button>
      </div>
      <div className={s.panelBody}>{children}</div>
    </aside>
  );
}

/** Ayarlar: oyunlardaki Ayarlar'la aynı ses tercihlerini yazar. */
function Settings() {
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

export function WelcomeScreen({ preload }: { preload: (route: string) => void }) {
  const [muted, setMuted] = useState(() => audioEngine.isMuted());
  const [panel, setPanel] = useState<'help' | 'settings' | null>(null);
  const toggle = (p: 'help' | 'settings') => setPanel((cur) => (cur === p ? null : p));
  const [progress] = useState(loadProgress);
  const [leaving, setLeaving] = useState<Leaving | null>(null);

  // kamera durağa dalar, ekran oyunun zemin rengine döner, sonra oyun açılır
  const enterGame = (stop: Stop, route: GameRoute) => {
    if (leaving) return;
    sfx.wake();
    sfx.enter();
    preload(route);
    setPanel(null);
    if (prefersReducedMotion()) {
      window.location.hash = hrefOf(route);
      return;
    }
    setLeaving({ stop, route });
    window.setTimeout(() => (window.location.hash = hrefOf(route)), 900);
  };

  useEffect(() => {
    audioEngine.setMusicMood('off');
  }, []);
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPanel(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel]);

  return (
    <div className={`${s.page} ${leaving ? s.leaving : ''}`}>
      <div className={s.frame}>
        <div className={s.model}>
          <Model src={`${import.meta.env.BASE_URL}mahalle/giris.webp`} progress={progress} leaving={leaving} onEnter={enterGame} preload={preload} />
        </div>

        <header className={s.top}>
          <a className={s.identity} href={hrefOf('arcade')} aria-label="KASM Mahallesi, Mesai Dışı Sk.">
            <span className={s.brand}>
              <b>KASM</b>
              <small>MAHALLESİ</small>
            </span>
            <span className={s.divider} aria-hidden="true" />
            <span className={s.street}>Mesai Dışı Sk.</span>
          </a>
          <nav className={s.tools} aria-label="Oyun araçları">
            <ToolButton
              label={muted ? 'Sesi aç' : 'Sesi kapat'}
              pressed={muted}
              onClick={() => {
                audioEngine.init();
                audioEngine.setMuted(!muted);
                storeMuted(!muted);
                setMuted(!muted);
              }}
            >
              <svg viewBox="0 0 18 18" aria-hidden="true">
                <path d={ICONS.volume} />
              </svg>
              {muted && <span className={s.slash} aria-hidden="true" />}
            </ToolButton>
            <ToolButton label="Yardım" pressed={panel === 'help'} onClick={() => toggle('help')}>
              <svg viewBox="0 0 18 18" aria-hidden="true">
                <path d={ICONS.help} />
              </svg>
            </ToolButton>
            <ToolButton label="Ayarlar" pressed={panel === 'settings'} onClick={() => toggle('settings')}>
              <svg viewBox="0 0 18 18" aria-hidden="true">
                <path d={ICONS.settings} />
              </svg>
            </ToolButton>
          </nav>
        </header>

        <section className={s.intro}>
          <p className={s.kicker}>MESAİ BİTTİ, OYUN BAŞLASIN.</p>
          <h1 className={s.title}>
            Mahalleye
            <br />
            hoş geldin.
          </h1>
          <p className={s.lead}>Her köşede başka bir hikâye, her durakta yeni bir oyun.</p>
          <span className={s.rule} aria-hidden="true" />
        </section>

        <footer className={s.foot}>
          <svg viewBox="0 0 13 13" aria-hidden="true">
            <path d="M10.83 5.42c0 2.7-3 5.52-4 6.39a.54.54 0 0 1-.66 0c-1-.87-4-3.69-4-6.39a4.33 4.33 0 0 1 8.66 0z" />
            <circle cx="6.5" cy="5.42" r="1.63" />
          </svg>
          MESAİ DIŞI SK. / İSTANBUL
          <span className={s.labs} aria-label="KASM Labs">
            <b>KASM</b>
            <small>LABS</small>
          </span>
        </footer>
      </div>

      <div className={s.fade} style={leaving ? { background: LOADING_BG[leaving.route] } : undefined} />

      {panel === 'help' && (
        <Panel title="Mahalle rehberi" onClose={() => setPanel(null)}>
          <p>KASM Mahallesi'ne hoş geldiniz. Mahallemiz sekiz duraktan oluşur; her durak, mesai sonrası için titizlikle hazırlanmış kısa bir oyundur.</p>
        </Panel>
      )}
      {panel === 'settings' && (
        <Panel title="Ayarlar" onClose={() => setPanel(null)}>
          <Settings />
        </Panel>
      )}
    </div>
  );
}
