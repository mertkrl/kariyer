import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { GameRoute } from '../slugs';
import s from './SidePicker.module.css';

/*
 * Plazanın 14. katı: ekran ortadan ikiye bölünür. Solda masanın İK tarafı (Sen İK'sin: koyu
 * terminal, CV yığını, RED damgası), sağda aday tarafı (UyumMetre: açık test ekranı, süre halkası,
 * işaretlenmeyi bekleyen kutular). Oyuncu hangi tarafta oturacağını seçer; üstüne geldiği taraf
 * genişler. Esc ya da × asansöre geri döndürür.
 */

interface Props {
  onPick: (route: GameRoute) => void;
  onClose: () => void;
  played: Partial<Record<GameRoute, unknown>>;
}

export function SidePicker({ onPick, onClose, played }: Props) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div className={s.root} role="dialog" aria-modal="true" aria-labelledby="side-title">
      <header className={s.head}>
        <p className={s.floor}>
          <span className={s.led}>14</span> KASM Plaza · İnsan Kaynakları katı
        </p>
        <h2 id="side-title">Masanın hangi tarafındasın?</h2>
        <button type="button" className={s.close} onClick={onClose} aria-label="Asansöre geri dön">
          ×
        </button>
      </header>

      <div className={s.split}>
        {/* İK tarafı */}
        <section className={`${s.side} ${s.hr}`}>
          <HrArt />
          <div className={s.copy}>
            <p className={s.kicker}>Masanın bu tarafı</p>
            <h3>İK'cı ol</h3>
            <ul>
              <li>Koltuk döner, kahve bedava.</li>
              <li>Bir CV'ye ortalama 6 saniye bakarsın.</li>
              <li>Vicdan: isteğe bağlı, şirket politikası değil.</li>
            </ul>
            <button ref={first} type="button" className={s.pick} onClick={() => onPick('iseAlim')}>
              <span>
                <small>{played.iseAlim ? 'Tekrar oyna' : 'Oyna'}</small>
                Sen İK'sin
              </span>
              <Arrow />
            </button>
          </div>
        </section>

        <div className={s.vs} aria-hidden="true">
          <span>ya da</span>
        </div>

        {/* aday tarafı */}
        <section className={`${s.side} ${s.cand}`}>
          <CandidateArt />
          <div className={s.copy}>
            <p className={s.kicker}>Masanın öbür tarafı</p>
            <h3>Aday ol</h3>
            <ul>
              <li>Sandalye sabit, su bardağı plastik.</li>
              <li>142 soruluk uyum testi, sekmeyi değiştirme.</li>
              <li>Sonuç: “Sizi arayacağız.”</li>
            </ul>
            <button type="button" className={s.pick} onClick={() => onPick('test')}>
              <span>
                <small>{played.test ? 'Tekrar oyna' : 'Oyna'}</small>
                UyumMetre
              </span>
              <Arrow />
            </button>
          </div>
        </section>
      </div>

      <p className={s.foot}>İki taraf da akşam aynı asansörle iniyor.</p>
    </div>,
    document.body,
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** İK masası: monitörde aday listesi, masada CV yığını, inen RED damgası, kahve. */
function HrArt() {
  return (
    <svg className={s.art} viewBox="0 0 320 200" aria-hidden="true">
      {/* masa */}
      <rect x="10" y="150" width="300" height="12" rx="3" fill="#3a2a1e" stroke="#0b0907" strokeWidth="2" />
      <rect x="24" y="162" width="10" height="34" fill="#2a1f17" />
      <rect x="286" y="162" width="10" height="34" fill="#2a1f17" />
      {/* monitör */}
      <rect x="150" y="40" width="140" height="92" rx="6" fill="#1b1712" stroke="#0b0907" strokeWidth="2.5" />
      <rect x="158" y="48" width="124" height="76" rx="2" fill="#120f0b" />
      <text x="164" y="62" fontSize="8" fontFamily="monospace" fill="#f0b24a" fontWeight="700">
        ADAYLAR · 247
      </text>
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect x="164" y={70 + i * 10} width={60 + ((i * 23) % 40)} height="5" rx="1" fill="#5c4a30" />
          <text x="262" y={75 + i * 10} fontSize="7" fontFamily="monospace" fill={i === 2 ? '#7fd38a' : '#e0604a'} fontWeight="700">
            {i === 2 ? '✓' : '✕'}
          </text>
        </g>
      ))}
      <rect x="212" y="132" width="16" height="12" fill="#2a2219" />
      <rect x="196" y="144" width="48" height="6" rx="2" fill="#2a2219" />
      {/* CV yığını */}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={36 + (i % 2) * 4} y={140 - i * 6} width="70" height="9" rx="1" fill={i === 4 ? '#f3ead6' : '#d9cfbb'} stroke="#0b0907" strokeWidth="1.2" transform={`rotate(${(i % 3) - 1} 70 ${140 - i * 6})`} />
      ))}
      {/* damga iner */}
      <g className={s.stamp}>
        <rect x="60" y="76" width="20" height="22" rx="3" fill="#7a5a3c" stroke="#0b0907" strokeWidth="1.6" />
        <rect x="52" y="98" width="36" height="9" rx="2" fill="#b8432f" stroke="#0b0907" strokeWidth="1.6" />
      </g>
      <g className={s.mark}>
        <rect x="46" y="112" width="44" height="14" rx="2" fill="none" stroke="#e0604a" strokeWidth="2" transform="rotate(-10 68 119)" />
        <text x="68" y="123" textAnchor="middle" fontSize="10" fontWeight="800" fill="#e0604a" fontFamily="monospace" transform="rotate(-10 68 119)">
          RED
        </text>
      </g>
      {/* kahve */}
      <path d="M120 132 h18 l-2 18 h-14 Z" fill="#f3ead6" stroke="#0b0907" strokeWidth="1.6" />
      <path d="M138 136 q8 0 6 8 q-2 4 -7 4" fill="none" stroke="#0b0907" strokeWidth="1.6" />
      <path className={s.steam} d="M126 126 q-4 -6 0 -12 q4 -6 0 -12 M133 126 q-4 -6 0 -12" fill="none" stroke="rgba(243,234,214,.5)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Aday: test ekranı, işaretlenen kutular, eriyen süre halkası, terleyen bir el. */
function CandidateArt() {
  return (
    <svg className={s.art} viewBox="0 0 320 200" aria-hidden="true">
      <rect x="40" y="18" width="240" height="150" rx="10" fill="#fff" stroke="#1d2733" strokeWidth="2.5" />
      <rect x="40" y="18" width="240" height="26" rx="10" fill="#2b62c0" />
      <rect x="40" y="34" width="240" height="10" fill="#2b62c0" />
      <circle cx="58" cy="31" r="7" fill="none" stroke="#fff" strokeWidth="2" />
      <circle cx="58" cy="31" r="2.6" fill="#fff" />
      <text x="72" y="35" fontSize="11" fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif">
        UyumMetre
      </text>
      <text x="268" y="35" textAnchor="end" fontSize="9" fill="#d6e2f7" fontFamily="monospace">
        Soru 87/142
      </text>
      <text x="58" y="66" fontSize="10.5" fontWeight="700" fill="#1d2733" fontFamily="system-ui, sans-serif">
        Hafta sonu çalışmak sizi mutlu eder mi?
      </text>
      {['Kesinlikle evet', 'Evet', 'Çok evet'].map((t, i) => (
        <g key={t}>
          <rect x="58" y={80 + i * 22} width="14" height="14" rx="3" fill="#eef1f6" stroke="#9aa6b6" strokeWidth="1.4" />
          <rect className={s.tick} style={{ animationDelay: `${i * 0.5}s` }} x="58" y={80 + i * 22} width="14" height="14" rx="3" fill="#2b62c0" />
          <text x="80" y={91 + i * 22} fontSize="10" fill="#1d2733" fontFamily="system-ui, sans-serif">
            {t}
          </text>
        </g>
      ))}
      {/* süre halkası */}
      <circle cx="240" cy="110" r="22" fill="none" stroke="#eef1f6" strokeWidth="6" />
      <circle className={s.timer} cx="240" cy="110" r="22" fill="none" stroke="#b8432f" strokeWidth="6" strokeDasharray="138" strokeLinecap="round" transform="rotate(-90 240 110)" />
      <text x="240" y="114" textAnchor="middle" fontSize="11" fontWeight="800" fill="#b8432f" fontFamily="monospace">
        0:09
      </text>
      {/* sekmeyi değiştirmeyin */}
      <rect x="150" y="148" width="120" height="14" rx="3" fill="#fff4d6" />
      <text x="210" y="158" textAnchor="middle" fontSize="7.5" fill="#8a6a1c" fontFamily="monospace">
        ⚠ SEKMEYİ DEĞİŞTİRMEYİNİZ
      </text>
      {/* ter damlası */}
      <path className={s.drop} d="M300 70 q-5 8 0 11 q5 -3 0 -11 Z" fill="#8fc2e8" stroke="#1d2733" strokeWidth="1" />
    </svg>
  );
}
