import { useMemo, useState } from 'react';
import { isOldLira, type Year } from '../data';
import { QUICK_ROUNDS, cheaperSide, makeSameYearRounds, money, quickPoints, times, type CheaperRound, type RoundLog } from '../model';
import { sfx } from '../sfx';
import a from '../Apps.module.css';

/*
 * Hangisi Ucuz?: saatin gösterdiği yıldan iki ürün, fiyatlar kapalı. Doğru seçince Haberci'den
 * titreşim gelir, seri büyür; yanlış seçince pencere sallanır ve masaüstüne hata pencereleri yağar
 * (onWrong). Fiyatlar seçimden sonra açılır.
 */

export function CheaperApp({
  seed,
  year,
  onDone,
  onScore,
  onRight,
  onWrong,
}: {
  seed: number;
  year: Year;
  onDone: (log: RoundLog[]) => void;
  onScore: (total: number, streak: number) => void;
  onRight: (round: CheaperRound, streak: number) => void;
  onWrong: (round: CheaperRound, picked: 'a' | 'b') => void;
}) {
  const rounds = useMemo(() => makeSameYearRounds(seed, year), [seed, year]);
  const [n, setN] = useState(0);
  const [picked, setPicked] = useState<'a' | 'b' | null>(null);
  const [log, setLog] = useState<RoundLog[]>([]);
  const [streak, setStreak] = useState(0);
  const round = rounds[n];
  const win = cheaperSide(round);
  const cur = isOldLira(year) ? 'TL' : year < 2009 ? 'YTL' : 'TL';

  const pick = (side: 'a' | 'b') => {
    if (picked) return;
    const ok = side === win;
    const st = ok ? streak + 1 : 0;
    const w = round[win];
    const next = [...log, { label: `${round.a.item.emoji} ${round.a.item.name} / ${round.b.item.emoji} ${round.b.item.name}`, detail: `ucuzu ${w.item.name}`, score: ok ? quickPoints(st) : 0, ok }];
    setPicked(side);
    setStreak(st);
    setLog(next);
    onScore(
      next.reduce((s, r) => s + r.score, 0),
      st,
    );
    if (ok) onRight(round, st);
    else onWrong(round, side);
  };

  const ratio = Math.max(round.a.item.prices[year], round.b.item.prices[year]) / Math.min(round.a.item.prices[year], round.b.item.prices[year]);

  return (
    <div>
      <div className={a.menu} aria-hidden="true">
        <span>Dosya</span>
        <span>Düzen</span>
        <span>Görünüm</span>
        <span>Yardım</span>
      </div>
      <div className={a.pad}>
        <p className={a.info}>
          <span aria-hidden="true">ℹ️</span>
          <span>
            {year} yılında hangisi <b>daha ucuzdu</b>? Fiyatlar gizli.
          </span>
        </p>
        <div className={a.pair}>
          {(['a', 'b'] as const).map((side) => {
            const p = round[side];
            return (
              <button key={side} type="button" className={`${a.choice} ${picked && side === win ? a.choiceOk : ''}`} onClick={() => pick(side)} disabled={!!picked} aria-label={p.item.unit}>
                <span className={a.choiceEmoji} aria-hidden="true">
                  {p.item.emoji}
                </span>
                <b>{p.item.unit}</b>
                <span>{picked ? money(p.item.prices[year], year) : `? ${cur}`}</span>
              </button>
            );
          })}
        </div>
        <div className={a.between} style={{ marginTop: 10 }} aria-live="polite">
          <span className={a.dim}>
            Tur {n + 1} / {QUICK_ROUNDS} · Seri <b>×{streak}</b>
          </span>
          {picked && (
            <span>
              {round[win].item.name} {times(ratio)} ucuz
            </span>
          )}
        </div>
        {picked && (
          <div className={a.buttons}>
            <button
              type="button"
              className={`${a.btn} ${a.def}`}
              autoFocus
              onClick={() => {
                sfx.click();
                if (n + 1 >= QUICK_ROUNDS) return onDone(log);
                setN(n + 1);
                setPicked(null);
              }}
            >
              {n + 1 < QUICK_ROUNDS ? 'Sonraki ›' : 'Karneyi göster'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
