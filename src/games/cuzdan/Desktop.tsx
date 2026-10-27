import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { markPlayed } from '../../arcade/progress';
import { YEAR_NOTE, type Year } from './data';
import { CheaperApp } from './apps/CheaperApp';
import { GuessApp } from './apps/GuessApp';
import { DailyApp } from './apps/DailyApp';
import { ShopApp } from './apps/ShopApp';
import { MusicApp } from './apps/MusicApp';
import { ClockApp, NoteApp, ReportApp } from './apps/Utility';
import { GUESS_ROUNDS, QUICK_ROUNDS, money, quickMax, successOf, themeOf, titleFor, type CheaperRound, type Mode, type Persona, type RoundLog } from './model';
import { music, trackForTheme, type TrackId } from './music';
import { Saver } from './Saver';
import { StartMenu } from './StartMenu';
import { setSound, sfx, soundOn } from './sfx';
import type { Pos, Size } from './drag';
import { AppIcon, type IconId } from './icons';
import { ICONS, type AppId } from './appList';
import { Mobile } from './Mobile';
import { useMobile } from './useMobile';
import { Window } from './Window';
import s from './Shell.module.css';

/*
 * Cüzdan TL'nin masaüstü: simgeler, pencereler, görev çubuğu, başlat menüsü, Haberci balonları,
 * yanlış cevaptaki hata yağmuru ve ekran koruyucu. Hangi pencerenin açık olduğu, sırası ve yeri
 * burada tutulur; masaların kendi turları kendi pencerelerinde. Yıl değişince masalar o yılla
 * baştan açılır (anahtarları yıla bağlı).
 */

type Quiz = Exclude<Mode, 'makine'>;

const WIDTH: Record<AppId, number> = { gunluk: 400, gecmis: 410, ucuz: 360, web: 620, not: 420, saat: 390, muzik: 320, karne: 440 };
const MAX: Record<Quiz, number> = { gecmis: GUESS_ROUNDS * 100, ucuz: quickMax(QUICK_ROUNDS) };

/** Pencerelerin ilk yerleri: ekranın genişliğine göre, birbirini az örtecek biçimde. */
function layout(): Record<AppId, Pos> {
  const W = Math.max(900, window.innerWidth);
  const H = Math.max(560, window.innerHeight - 40);
  return {
    gecmis: { x: Math.round(W * 0.1), y: 16 },
    ucuz: { x: Math.round(W * 0.47), y: 30 },
    web: { x: Math.round(W * 0.2), y: Math.round(H * 0.42) },
    not: { x: Math.round(W * 0.16), y: 110 },
    saat: { x: Math.round(W * 0.36), y: 80 },
    karne: { x: Math.round(W * 0.3), y: 40 },
    gunluk: { x: Math.round(W * 0.28), y: 24 },
    muzik: { x: W - 360, y: Math.round(H * 0.5) },
  };
}

interface ErrorWin {
  id: number;
  text: string;
  icon: string;
  pos: Pos;
}

export function Desktop({ year, persona, onYear, onLogout }: { year: Year; persona: Persona; onYear: (y: Year) => void; onLogout: () => void }) {
  const [order, setOrder] = useState<AppId[]>([]);
  const [pos, setPos] = useState(layout);
  const [sizes, setSizes] = useState<Partial<Record<AppId, Size>>>({});
  const [maxed, setMaxed] = useState<Partial<Record<AppId, boolean>>>({});
  const [selected, setSelected] = useState<AppId | null>(null);
  const [seeds, setSeeds] = useState<Record<string, number>>(() => ({ gecmis: 1, ucuz: 2, web: 4 }));
  const [report, setReport] = useState<{ mode: Quiz; log: RoundLog[]; year: Year } | null>(null);
  const [errors, setErrors] = useState<ErrorWin[]>([]);
  const [shake, setShake] = useState(false);
  const [toast, setToast] = useState<{ icon: string; body: ReactNode; n: number } | null>(null);
  const [menu, setMenu] = useState(false);
  const closeMenu = useCallback(() => setMenu(false), []);
  const [saver, setSaver] = useState(false);
  const [sound, setSoundState] = useState(soundOn);
  const [clock, setClock] = useState(() => new Date());
  const errId = useRef(0);

  const top = order[order.length - 1];
  const focus = (id: AppId) => setOrder((o) => [...o.filter((x) => x !== id), id]);
  const open = (id: AppId) => {
    sfx.click();
    setMenu(false);
    focus(id);
  };
  const close = (id: AppId) => setOrder((o) => o.filter((x) => x !== id));
  const isOpen = (id: AppId) => order.includes(id);
  const move = (id: AppId) => (p: Pos) => setPos((all) => ({ ...all, [id]: p }));
  const say = (icon: string, body: ReactNode) => setToast((t) => ({ icon, body, n: (t?.n ?? 0) + 1 }));
  const reseed = (id: string) => setSeeds((x) => ({ ...x, [id]: Date.now() % 100000 }));

  // müzik: giriş tıklamasıyla başlar (tarayıcı izin verir), masaüstü kapanınca durur
  const theme = themeOf(year);
  const [playing, setPlaying] = useState(true);
  const [auto, setAuto] = useState(true);
  const [picked, setPicked] = useState<TrackId>(() => trackForTheme(theme));
  const track = auto ? trackForTheme(theme) : picked;
  useEffect(() => {
    if (playing) music.play(track);
    else music.stop();
  }, [playing, track]);
  useEffect(() => () => music.stop(), []);

  // açılış: ezgi ve ilk Haberci balonu
  useEffect(() => {
    sfx.chime();
    const a = window.setTimeout(() => say('🕰️', <><b>{year}</b>: altı sıfır atıldı, 1.000.000 TL artık 1 YTL. Milyonlu günleri görmek için saati 2002'ye al.</>), 1200);
    const b = window.setTimeout(() => say('🧺', <><b>Günün Sepeti</b> hazır: bugünün 5 sorusu herkese aynı. Simgesinden aç.</>), 6500);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
    // yalnızca masaüstü ilk açıldığında
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const t = window.setInterval(() => setClock(new Date()), 15000);
    return () => window.clearInterval(t);
  }, []);

  // 45 saniye hareketsizlikte ekran koruyucu: fiyatlar uçar
  useEffect(() => {
    let t = 0;
    const arm = () => {
      window.clearTimeout(t);
      setSaver(false);
      t = window.setTimeout(() => setSaver(true), 45000);
    };
    const evs = ['pointermove', 'pointerdown', 'keydown', 'wheel'] as const;
    evs.forEach((e) => window.addEventListener(e, arm));
    arm();
    return () => {
      window.clearTimeout(t);
      evs.forEach((e) => window.removeEventListener(e, arm));
    };
  }, []);

  const finish = (mode: Quiz) => (log: RoundLog[]) => {
    markPlayed('cuzdan', titleFor(mode, successOf(mode, log, MAX[mode])).title);
    setReport({ mode, log, year });
    sfx.chime();
    focus('karne');
  };

  const wrong = (round: CheaperRound, picked: 'a' | 'b') => {
    const cheap = round[picked === 'a' ? 'b' : 'a'].item;
    const bad = round[picked].item;
    setShake(true);
    window.setTimeout(() => setShake(false), 500);
    const base = pos.ucuz;
    const texts: [string, string][] = [
      ['⛔', 'Kritik hata: Etikete aldandınız.'],
      ['⛔', 'Hata: Seri sıfırlandı.'],
      ['⚠️', 'Uyarı: Cüzdan tutarsız.'],
      ['⛔', `Hata: ${bad.name} ucuz değildi.`],
      ['ℹ️', `${cheap.name}: ${money(cheap.prices[year], year)} · ${bad.name}: ${money(bad.prices[year], year)}`],
    ];
    texts.forEach(([icon, text], i) =>
      window.setTimeout(() => {
        sfx.error();
        setErrors((e) => [...e, { id: ++errId.current, icon, text, pos: { x: base.x + 30 + i * 22, y: base.y + 70 + i * 22 } }]);
      }, i * 120),
    );
  };

  const osName = theme === 'luna' ? 'TL' : theme === 'glass' ? 'TL Cam' : 'TL Düz';

  const ic = (id: IconId, size = 16) => <AppIcon id={id} theme={theme} size={size} />;

  /** Her uygulamanın başlığı, simgesi ve içeriği: geniş ekranda pencerede, telefonda tam sayfa açılır. */
  const apps: Partial<Record<AppId, { title: string; short: string; body: ReactNode; shake?: boolean }>> = {
    gunluk: {
      title: 'Günün Sepeti',
      short: 'Günün Sepeti',
      body: <DailyApp onDone={(h) => say('🧺', <>Günün Sepeti: <b>{h}/5</b>. Yarın yeni sepet!</>)} />,
    },
    gecmis: { title: 'Geçmişi Bil — Fiyat Sihirbazı', short: 'Geçmişi Bil', body: <GuessApp key={`${year}-${seeds.gecmis}`} seed={seeds.gecmis} year={year} onDone={finish('gecmis')} onScore={() => {}} /> },
    ucuz: {
      title: `Hangisi Ucuz? — ${year}`,
      short: 'Hangisi Ucuz?',
      shake,
      body: (
        <CheaperApp
          key={`${year}-${seeds.ucuz}`}
          seed={seeds.ucuz}
          year={year}
          onDone={finish('ucuz')}
          onScore={() => {}}
          onRight={(r, st) => {
            sfx.nudge();
            const c = r[r.a.item.prices[year] <= r.b.item.prices[year] ? 'a' : 'b'].item;
            say(c.emoji, <><b>{c.name}</b> sana titreşim gönderdi: Doğru! Seri ×{st}</>);
          }}
          onWrong={wrong}
        />
      ),
    },
    web: { title: theme === 'luna' ? `ZAMAN BAKKALI ${year} — İnternet Gezgini` : theme === 'glass' ? 'zamanbakkali.com — Gezgin' : 'zaman — Market uygulaması', short: 'Zaman Bakkalı', body: <ShopApp key={year} year={year} persona={persona} onPaid={(k) => say('🛒', <><b>Zaman Bakkalı</b>: Sepetin {Math.round(k)} kat pahalandı.</>)} /> },
    not: { title: 'bordro.txt — Not Defteri', short: 'bordro.txt', body: <NoteApp persona={persona} /> },
    muzik: {
      title: 'Medya Çalar',
      short: 'Medya Çalar',
      body: (
        <MusicApp
          track={track}
          playing={playing}
          auto={auto}
          onToggle={() => setPlaying((p) => !p)}
          onAuto={(v) => {
            setPicked(track);
            setAuto(v);
          }}
          onPlay={(t) => {
            setPicked(t);
            setAuto(false);
            setPlaying(true);
          }}
        />
      ),
    },
    saat: {
      title: 'Tarih ve Saat Özellikleri',
      short: 'Saati Geri Al',
      body: (
        <ClockApp
          year={year}
          onCancel={() => close('saat')}
          onApply={(y) => {
            close('saat');
            if (y === year) return;
            onYear(y);
            say('🕰️', <>Saat <b>{y}</b> olarak ayarlandı. Ekran da o yıla döndü.</>);
          }}
        />
      ),
    },
  };
  if (report)
    apps.karne = {
      title: `Karne — ${report.mode === 'gecmis' ? 'Geçmişi Bil' : 'Hangisi Ucuz?'}`,
      short: 'Karne',
      body: (
        <ReportApp
          mode={report.mode}
          log={report.log}
          max={MAX[report.mode]}
          year={report.year}
          onAgain={() => {
            const id = report.mode;
            reseed(id);
            close('karne');
            open(id);
          }}
        />
      ),
    };

  const mobile = useMobile();
  const toggleSound = () => {
    setSound(!sound);
    music.setEnabled(!sound);
    setSoundState(!sound);
  };
  const toastEl = toast && (
    <div key={toast.n} className={s.toast} role="status">
      <div className={s.toastHead}>👥 Haberci</div>
      <div className={s.toastBody}>
        <span className={s.toastIcon} aria-hidden="true">
          {toast.icon}
        </span>
        <span>{toast.body}</span>
      </div>
    </div>
  );

  if (mobile)
    return (
      <Mobile
        theme={theme}
        year={year}
        persona={persona}
        clock={clock}
        sound={sound}
        onSound={toggleSound}
        current={top && apps[top] ? top : null}
        apps={apps}
        icons={ICONS}
        onOpen={open}
        onBack={() => top && close(top)}
        onLogout={onLogout}
        errors={errors}
        onErrorsDone={() => setErrors([])}
        toast={toastEl}
        saver={saver && <Saver theme={theme} year={year} />}
      />
    );

  const appWin = (id: AppId) => {
    const app = apps[id];
    return (
      isOpen(id) &&
      app && (
        <Window
          key={id}
          title={app.title}
          icon={ic(id)}
          active={top === id}
          z={10 + order.indexOf(id)}
          pos={pos[id]}
          width={WIDTH[id]}
          size={sizes[id]}
          maximized={!!maxed[id]}
          onMaximize={() => setMaxed((x) => ({ ...x, [id]: !x[id] }))}
          onResize={(sz) => setSizes((x) => ({ ...x, [id]: sz }))}
          onFocus={() => top !== id && focus(id)}
          onMove={move(id)}
          onClose={() => close(id)}
          shake={app.shake}
        >
          {app.body}
        </Window>
      )
    );
  };

  return (
    <>
      <div className={s.desk}>
        <ul className={s.icons} aria-label="Masaüstü">
          {ICONS.map((app) => (
            <li key={app.id}>
              <button
                type="button"
                className={`${s.icon} ${selected === app.id ? s.iconSel : ''}`}
                onClick={() => {
                  setSelected(app.id);
                  if (window.matchMedia('(pointer: coarse)').matches) open(app.id);
                }}
                onDoubleClick={() => open(app.id)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), open(app.id))}
              >
                <span className={s.iconGlyph} aria-hidden="true">
                  {ic(app.id, 40)}
                </span>
                <span className={s.iconLabel}>{app.label}</span>
              </button>
            </li>
          ))}
        </ul>

        {(['karne', 'gunluk', 'gecmis', 'ucuz', 'web', 'not', 'muzik', 'saat'] as AppId[]).map(appWin)}

        {errors.map((e, i) => (
          <Window
            key={e.id}
            title="Cüzdan Zamanı"
            active={i === errors.length - 1}
            z={500 + i}
            pos={e.pos}
            width={300}
            className={s.errorWin}
            onFocus={() => {}}
            onMove={(p) => setErrors((all) => all.map((x) => (x.id === e.id ? { ...x, pos: p } : x)))}
            onClose={() => setErrors((all) => all.filter((x) => x.id !== e.id))}
            label={e.text}
          >
            <div className={s.errorBody}>
              <span aria-hidden="true">{e.icon}</span>
              <span>{e.text}</span>
            </div>
            <div className={s.errorBtn}>
              <button type="button" onClick={() => setErrors(i === errors.length - 1 ? [] : (all) => all.filter((x) => x.id !== e.id))} autoFocus={i === errors.length - 1}>
                Tamam
              </button>
            </div>
          </Window>
        ))}

        <div className={s.ver} aria-hidden="true">
          Cüzdan {osName} · {year}
          <br />
          {YEAR_NOTE[year]}
        </div>
      </div>

      {toastEl}

      {menu && <StartMenu theme={theme} year={year} persona={persona} onOpen={(id) => open(id as AppId)} onLogout={onLogout} onClose={closeMenu} />}

      <div className={s.taskbar}>
        <button type="button" className={s.start} onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label="Başlat" data-start>
          <span className={s.startFlag} aria-hidden="true">
            {ic('start', theme === 'luna' ? 20 : 26)}
          </span>
          <span className={s.startLabel}>başlat</span>
        </button>
        <div className={s.tasks}>
          {order
            .filter((id) => id !== 'karne' || report)
            .map((id) => {
              const label = ICONS.find((x) => x.id === id)?.label ?? 'Karne';
              return (
                <button key={id} type="button" className={`${s.task} ${top === id ? s.taskOn : ''}`} onClick={() => focus(id)} title={label}>
                  <span aria-hidden="true">{ic(id, theme === 'flat' ? 22 : 16)}</span> <span className={s.taskLabel}>{label}</span>
                </button>
              );
            })}
        </div>
        <div className={s.tray}>
          <button type="button" onClick={toggleSound} aria-label={sound ? 'Sesi kapat' : 'Sesi aç'}>
            {sound ? '🔊' : '🔇'}
          </button>
          <button type="button" onClick={() => open('muzik')} aria-label={`Medya Çalar: ${playing ? 'çalıyor' : 'durdu'}`}>
            {playing ? '🎵' : '🎶'}
          </button>
          <button type="button" className={s.clock} onClick={() => open('saat')} aria-label={`Saat ve tarih: ${year}. Yılı değiştir`}>
            {clock.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            <small>{year}</small>
          </button>
        </div>
      </div>

      {saver && <Saver theme={theme} year={year} />}
    </>
  );
}
