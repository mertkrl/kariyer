import { useState } from 'react';
import { ShareButton } from '../../../arcade/ShareButton';
import { ITEMS, MIN_WAGE, NOW, YEARS, YEAR_NOTE, type AnyYear, type Year } from '../data';
import { cpiMultiple, duration, money, realChange, successOf, times, vsInflation, titleFor, workMinutes, type Mode, type Persona, type RoundLog } from '../model';
import a from '../Apps.module.css';

/*
 * Cüzdan TL'nin yardımcı pencereleri: bordro.txt (Not Defteri), Tarih ve Saat Özellikleri (yılı
 * değiştirir) ve masaların karnesi (unvan, puan, döküm, paylaşım kartı).
 */

const simit = ITEMS.find((i) => i.id === 'simit')!;

export function NoteApp({ persona }: { persona: Persona }) {
  const rows = ([...YEARS, NOW] as AnyYear[]).map((y) => `${y}  ${money(MIN_WAGE[y], y).padStart(16)}   1 simit = ${duration(workMinutes(simit.prices[y], y))}`);
  // 2002'den bugüne en hızlı ve en yavaş pahalananlar, enflasyona göre
  const ranked = [...ITEMS].sort((x, y) => realChange(y, 2002) - realChange(x, 2002));
  const line = (it: (typeof ITEMS)[number]) => `  ${it.name.padEnd(16)} ${times(it.prices[NOW] / it.prices[2002]).padStart(9)}  ${vsInflation(realChange(it, 2002))}`;
  const text = [
    'ASGARİ ÜCRET BORDROSU (NET, AYLIK)',
    `${persona.name} için hazırlandı`,
    '='.repeat(44),
    ...rows,
    '='.repeat(44),
    `2002'den bugüne TÜFE: ${times(cpiMultiple(2002))}`,
    'En hızlı pahalananlar:',
    ...ranked.slice(0, 4).map(line),
    'En yavaş pahalananlar:',
    ...ranked.slice(-4).map(line),
    '='.repeat(44),
    "Not: 2005'te altı sıfır atıldı.",
    '1.000.000 TL = 1 YTL',
    'Ayda 225 saat çalışma üzerinden.',
  ].join('\n');
  return (
    <div>
      <div className={a.menu} aria-hidden="true">
        <span>Dosya</span>
        <span>Düzen</span>
        <span>Biçim</span>
        <span>Yardım</span>
      </div>
      <textarea className={a.note} readOnly value={text} aria-label="bordro.txt" />
    </div>
  );
}

const DAYS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'];

export function ClockApp({ year, onApply, onCancel }: { year: Year; onApply: (y: Year) => void; onCancel: () => void }) {
  const [pending, setPending] = useState<Year>(year);
  const first = (new Date(pending, 0, 1).getDay() + 6) % 7;
  const d = new Date();
  const ha = (((d.getHours() % 12) * 30 + d.getMinutes() / 2) * Math.PI) / 180;
  const ma = (d.getMinutes() * 6 * Math.PI) / 180;
  return (
    <div className={a.pad}>
      <div className={a.clockGrid}>
        <div>
          <b>Yıl</b>
          <div className={a.years} role="radiogroup" aria-label="Yıl">
            {YEARS.map((y) => (
              <button key={y} type="button" role="radio" aria-checked={y === pending} className={y === pending ? a.yearOn : ''} onClick={() => setPending(y)}>
                {y}
              </button>
            ))}
          </div>
          <div className={a.cal} aria-hidden="true">
            {DAYS.map((x) => (
              <b key={x}>{x}</b>
            ))}
            {Array.from({ length: first }, (_, i) => (
              <span key={`e${i}`} />
            ))}
            {Array.from({ length: 31 }, (_, i) => (
              <span key={i} className={i === 14 ? a.today : ''}>
                {i + 1}
              </span>
            ))}
          </div>
        </div>
        <div>
          <svg className={a.clockFace} viewBox="0 0 110 110" aria-hidden="true">
            <circle cx="55" cy="55" r="52" fill="#fff" stroke="#7f9db9" strokeWidth="2" />
            {Array.from({ length: 12 }, (_, i) => {
              const t = (i * 30 * Math.PI) / 180;
              return <circle key={i} cx={55 + 44 * Math.sin(t)} cy={55 - 44 * Math.cos(t)} r={i % 3 ? 1.5 : 3} fill="#0a5ce0" />;
            })}
            <line x1="55" y1="55" x2={55 + 26 * Math.sin(ha)} y2={55 - 26 * Math.cos(ha)} stroke="#222" strokeWidth="4" strokeLinecap="round" />
            <line x1="55" y1="55" x2={55 + 38 * Math.sin(ma)} y2={55 - 38 * Math.cos(ma)} stroke="#222" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="55" cy="55" r="3" fill="#c00" />
          </svg>
          <p className={a.dim}>{YEAR_NOTE[pending]}. Saat geri alınınca fiyatlar ve ekran o yıla döner.</p>
        </div>
      </div>
      <div className={a.buttons}>
        <button type="button" className={`${a.btn} ${a.def}`} onClick={() => onApply(pending)}>
          Uygula
        </button>
        <button type="button" className={a.btn} onClick={onCancel}>
          İptal
        </button>
      </div>
    </div>
  );
}

const NAME: Record<Exclude<Mode, 'makine'>, { kicker: string; question: string }> = {
  gecmis: { kicker: 'Geçmişi Bil · Karne', question: '2002’de simit kaç liraydı, biliyor musun?' },
  ucuz: { kicker: 'Hangisi Ucuz? · Karne', question: 'Sen etikete mi bakarsın, emeğe mi?' },
};

export function ReportApp({ mode, log, max, year, onAgain }: { mode: Exclude<Mode, 'makine'>; log: RoundLog[]; max: number; year: Year; onAgain: () => void }) {
  const total = log.reduce((s, r) => s + r.score, 0);
  const t = titleFor(mode, successOf(mode, log, max));
  const hits = log.filter((r) => r.ok ?? r.score >= 70).length;
  return (
    <div className={a.pad}>
      <div className={a.report}>
        <span className={a.reportIcon} aria-hidden="true">
          🏆
        </span>
        <div>
          <div className={a.dim}>
            {NAME[mode].kicker} · {year}
          </div>
          <b className={a.reportTitle}>{t.title}</b>
          <p>{t.note}</p>
        </div>
      </div>
      <div className={a.between}>
        <span>
          Puan: <b>{total.toLocaleString('tr-TR')}</b> / {max.toLocaleString('tr-TR')}
        </span>
        <span>
          İsabet: <b>{hits}</b> / {log.length}
        </span>
      </div>
      <ol className={a.recap}>
        {log.map((r, i) => (
          <li key={i} className={(r.ok ?? r.score >= 70) ? a.recapOk : a.recapNo}>
            <span>{r.label}</span>
            <small>{r.detail}</small>
            <b>{r.score}</b>
          </li>
        ))}
      </ol>
      <div className={a.buttons}>
        <ShareButton
          className={`${a.btn} ${a.def}`}
          make={() => ({
            route: 'cuzdan',
            kicker: NAME[mode].kicker,
            title: t.title,
            note: t.note,
            stats: [
              { label: 'Puan', value: `${total}/${max}` },
              { label: 'İsabet', value: `${hits}/${log.length}` },
            ],
            question: NAME[mode].question,
            text: `Cüzdan Zamanı'nda ${total}/${max} puanla "${t.title}" oldum.`,
          })}
        />
        <button type="button" className={a.btn} onClick={onAgain}>
          Yeniden oyna
        </button>
      </div>
    </div>
  );
}
