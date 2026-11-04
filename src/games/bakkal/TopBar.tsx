import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ClockOut } from '../../arcade/ClockOut';
import { tl } from './data';
import { RETURN_DAY } from './week';
import type { TextSize, View } from './access';
import styles from './BakkalGame.module.css';
import bar from './TopBar.module.css';

/*
 * Üst çubuk: çıkış ve dükkânın göstergeleri. Göstergeler tek, sakin bir koyu ceviz panelde ince
 * ayraçlarla yan yana durur: ince çizgi simge, küçük harfle adı, altında değeri; üstüne gelince (ya da klavyeyle odaklanınca) ne anlama geldiğini
 * anlatan bir not açılır. Sağda ses: düğme açıp kapatır, yanındaki kaydırıcı düzeyi ayarlar.
 */

/** İtibarın sözle karşılığı ve rengi: 70 üstü iyi, 35 altı kötü (meter'ın eşikleri de bunlar). */
function repWord(rep: number) {
  if (rep >= 85) return { word: 'Çok sevilen', tone: bar.good };
  if (rep >= 70) return { word: 'İyi', tone: bar.good };
  if (rep >= 50) return { word: 'Fena değil', tone: '' };
  if (rep >= 35) return { word: 'Söyleniyorlar', tone: bar.warnTone };
  return { word: 'Küstüler', tone: bar.neg };
}

/** Göstergelerin ince çizgi simgeleri: renkleri yazıdan gelir, göze batmaz. */
const ICONS = {
  day: (
    <>
      <rect x="4" y="5.5" width="16" height="14" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  cash: (
    <>
      <ellipse cx="12" cy="7" rx="7" ry="2.8" />
      <path d="M5 7v5c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V7M5 12v5c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-5" />
    </>
  ),
  book: (
    <>
      <path d="M5 4.5h11a2 2 0 012 2v13H7a2 2 0 01-2-2z" />
      <path d="M5 17.5a2 2 0 012-2h11M9 8.5h5" />
    </>
  ),
  rep: <path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z" />,
};

function Stat({ icon, name, tip, children, className = '' }: { icon: keyof typeof ICONS; name: string; tip: string; children: ReactNode; className?: string }) {
  return (
    <span className={`${bar.stat} ${className}`} tabIndex={0} aria-label={`${name}: ${tip}`}>
      <svg className={bar.icon} viewBox="0 0 24 24" aria-hidden="true">
        {ICONS[icon]}
      </svg>
      <span>
        <small>{name}</small>
        <b>{children}</b>
      </span>
      <span className={bar.tip} role="tooltip">
        <b>{name}</b>
        {tip}
      </span>
    </span>
  );
}

export function TopBar({
  intro,
  risk,
  day,
  clock,
  money,
  rep,
  unpaid,
  muted,
  onMute,
  volume,
  onVolume,
  view,
  onView,
}: {
  intro: boolean;
  risk?: string;
  day: number;
  clock: string;
  money: number;
  rep: number;
  /** Defterdeki açık veresiye. */
  unpaid: number;
  muted: boolean;
  onMute: () => void;
  volume: number;
  onVolume: (v: number) => void;
  view: View;
  onView: (v: View) => void;
}) {
  const [sound, setSound] = useState(false);
  const [look, setLook] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const lookBox = useRef<HTMLDivElement>(null);
  // görünüm paneli de dışarı tıklayınca ya da Esc ile kapanır
  useEffect(() => {
    if (!look) return;
    const away = (e: PointerEvent) => !lookBox.current?.contains(e.target as Node) && setLook(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setLook(false);
    window.addEventListener('pointerdown', away);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', away);
      window.removeEventListener('keydown', esc);
    };
  }, [look]);
  const toggle = (k: 'contrast' | 'bigKeys' | 'calm') => onView({ ...view, [k]: !view[k] });
  const SIZES: [TextSize, string][] = [
    ['normal', 'A'],
    ['lg', 'A+'],
    ['xl', 'A++'],
  ];
  // ses paneli dışarı tıklayınca ya da Esc ile kapanır
  useEffect(() => {
    if (!sound) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setSound(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setSound(false);
    window.addEventListener('pointerdown', away);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', away);
      window.removeEventListener('keydown', esc);
    };
  }, [sound]);
  const r = repWord(rep);
  const silent = muted || volume === 0;
  return (
    <header className={styles.top}>
      <ClockOut risk={risk} />
      <div className={bar.stats}>
        {!intro && (
          <div className={bar.panel} data-tour="stats">
            <Stat icon="day" name={`${day}. gün`} tip={`Şükrü Amca ${RETURN_DAY}. günün akşamı dönüyor: ${Math.max(0, RETURN_DAY - day)} gün kaldı. Dükkân 08.00'de açılır, 19.00'da kapanır.`}>
              {clock}
            </Stat>
            <Stat icon="cash" name="Kasa" className={money < 0 ? bar.neg : ''} tip="Kasadaki para. Her akşam elektrik, haftada bir vergi ve kira çıkar; toptancının malı da buradan ödenir. Eksiye düşerse dükkân batar.">
              {tl(money)}
            </Stat>
            {unpaid > 0 && (
              <Stat icon="book" name="Veresiye" tip="Defterde ödenmemiş veresiye. Vadesi geçen borç batabilir; itibarın düşükse veresiyeciler hiç ödemez.">
                {tl(unpaid)}
              </Stat>
            )}
            <Stat
              icon="rep"
              name="İtibar"
              className={r.tone}
              tip={`Köyün sana bakışı: ${rep}/100, "${r.word}". Adil fiyat, veresiye ve iyilik artırır; pahalı satış, küstürmek ve bayat mal düşürür. 35'in altında köylü kasabaya gider, gelenler yabancı olur.`}
            >
              <span className={bar.repBar} aria-hidden="true">
                <span style={{ width: `${rep}%` }} />
              </span>
              {r.word}
            </Stat>
          </div>
        )}
        <div className={bar.sound} ref={lookBox}>
          <button type="button" className={bar.mute} onClick={() => setLook((o) => !o)} aria-expanded={look} aria-label="Görünüm ve erişilebilirlik" title="Görünüm ve erişilebilirlik">
            <b aria-hidden="true">Aa</b>
          </button>
          {look && (
            <div className={bar.soundPanel} role="dialog" aria-label="Görünüm ve erişilebilirlik">
              <span>Yazı boyutu</span>
              <div className={bar.segment} role="radiogroup" aria-label="Yazı boyutu">
                {SIZES.map(([k, label]) => (
                  <button key={k} type="button" role="radio" aria-checked={view.text === k} className={view.text === k ? bar.segOn : ''} onClick={() => onView({ ...view, text: k })}>
                    {label}
                  </button>
                ))}
              </div>
              {(
                [
                  ['contrast', 'Yüksek kontrast'],
                  ['bigKeys', 'Büyük kasa tuşları'],
                  ['calm', 'Hareketi azalt'],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className={bar.check}>
                  <input type="checkbox" checked={view[k]} onChange={() => toggle(k)} />
                  {label}
                </label>
              ))}
            </div>
          )}
        </div>
        <div className={bar.sound} ref={box}>
          <button
            type="button"
            className={`${bar.mute} ${silent ? bar.muted : ''}`}
            onClick={() => setSound((o) => !o)}
            aria-expanded={sound}
            aria-label="Ses ayarı"
            title="Ses ayarı"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" className={bar.cone} />
              {silent ? (
                <path d="M15.5 9.5l5 5m0-5l-5 5" className={bar.cross} />
              ) : (
                <>
                  <path d="M15 9.2a4 4 0 010 5.6" className={bar.wave} />
                  {volume > 0.5 && <path d="M17.6 6.8a7.4 7.4 0 010 10.4" className={bar.wave} />}
                </>
              )}
            </svg>
            <span>{silent ? 'Sessiz' : `%${Math.round(volume * 100)}`}</span>
          </button>
          {sound && (
            <div className={bar.soundPanel} role="dialog" aria-label="Ses ayarı">
              <label>
                <span>Ses düzeyi</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(volume * 100)}
                  onChange={(e) => {
                    onVolume(Number(e.target.value) / 100);
                    if (muted && Number(e.target.value) > 0) onMute();
                  }}
                />
                <b>%{Math.round(volume * 100)}</b>
              </label>
              <button type="button" className={bar.soundToggle} onClick={onMute} aria-pressed={muted}>
                {muted ? '🔈 Sesi aç' : '🔇 Sessize al'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
