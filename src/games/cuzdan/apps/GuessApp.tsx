import { useMemo, useState, type CSSProperties } from 'react';
import { ITEMS, MIN_WAGE, NOW, USD, type Year } from '../data';
import { GUESS_ROUNDS, cpiMultiple, duration, guessScore, makeGuessRoundsFor, money, multiple, niceRound, realChange, sliderValue, times, toneOf, vsInflation, workMinutes, type RoundLog } from '../model';
import { sfx } from '../sfx';
import a from '../Apps.module.css';

/*
 * Geçmişi Bil, "Fiyat Sihirbazı" penceresi: bugünkü fiyat elinde, saatin gösterdiği yıldaki fiyatı
 * kaydırıcıyla bulursun. Kaydırıcı logaritmik, dönemin parasıyla konuşur ve uçları her turda başka
 * yerde durur. "Tamam" deyince sarı ipucu balonu puanı söyler, ilerleme çubukları emeği tartar.
 */

const VERDICT = { good: '✔ İsabet!', mid: '⚠ Yaklaştınız', bad: '✖ Uzak' } as const;

export function GuessApp({ seed, year, onDone, onScore }: { seed: number; year: Year; onDone: (log: RoundLog[]) => void; onScore: (n: number) => void }) {
  const rounds = useMemo(() => makeGuessRoundsFor(seed, year), [seed, year]);
  const [n, setN] = useState(0);
  const [t, setT] = useState(0.5);
  const [log, setLog] = useState<RoundLog[]>([]);
  const { item, lo, hi } = rounds[n];
  const actual = item.prices[year];
  // tahmine dayanak: o yılın bilinen bir fiyatı (ekmek; soru ekmekse simit)
  const anchor = ITEMS.find((i) => i.id === (item.id === 'ekmek' ? 'simit' : 'ekmek'))!;
  const guess = niceRound(sliderValue(t, lo, hi), year);
  const revealed = log.length > n;
  const score = revealed ? log[n].score : 0;
  const total = log.reduce((s, r) => s + r.score, 0);
  const m1 = workMinutes(actual, year);
  const m2 = workMinutes(item.prices[NOW], NOW);
  const mx = Math.max(m1, m2);

  const submit = () => {
    if (revealed) return;
    const sc = guessScore(guess, actual);
    const next = [...log, { label: `${item.emoji} ${item.name}`, detail: `${money(guess, year)} dedin, ${money(actual, year)}`, score: sc }];
    setLog(next);
    onScore(next.reduce((s, r) => s + r.score, 0));
    (sc >= 30 ? sfx.ok : sfx.error)();
  };

  return (
    <div className={a.pad}>
      <div className={a.itemHead}>
        <span className={a.sunkenIcon} aria-hidden="true">
          {item.emoji}
        </span>
        <div>
          <b className={a.itemName}>{item.unit}</b>
          <div>
            Bugün ({NOW}): <b>{money(item.prices[NOW], NOW)}</b>
          </div>
          <div className={a.dim}>
            Soru {n + 1} / {GUESS_ROUNDS} · Puan {total}
          </div>
        </div>
      </div>

      <div className={a.dossier} aria-label={`${year} künyesi`}>
        <b>{year} künyesi</b>
        <span>
          Asgari ücret <b>{money(MIN_WAGE[year], year)}</b>
        </span>
        <span>
          1 $ = <b>{money(USD[year], year)}</b>
        </span>
        <span>
          {anchor.name} <b>{money(anchor.prices[year], year)}</b>
        </span>
      </div>

      <fieldset className={a.group}>
        <legend>{year}'de kaç liraydı?</legend>
        <div className={a.between}>
          <label htmlFor="cz-guess">Tahmininiz:</label>
          <output className={a.readout} htmlFor="cz-guess">
            {money(guess, year)}
          </output>
        </div>
        <div className={a.track} style={{ '--p': `${t * 100}%` } as CSSProperties}>
          <span className={a.rail} />
          <span className={a.ticks} aria-hidden="true">
            {Array.from({ length: 11 }, (_, i) => (
              <i key={i} />
            ))}
          </span>
          <span className={a.thumb} />
          <input
            id="cz-guess"
            type="range"
            min={0}
            max={1}
            step={0.004}
            value={t}
            disabled={revealed}
            onChange={(e) => setT(Number(e.target.value))}
            aria-valuetext={money(guess, year)}
          />
        </div>
        <div className={`${a.between} ${a.dim}`}>
          <span>{money(niceRound(lo, year), year)}</span>
          <span>{money(niceRound(hi, year), year)}</span>
        </div>
      </fieldset>

      {revealed && (
        <>
          <div className={a.balloon} role="status">
            <b>
              {VERDICT[toneOf(score)]} +{score}
            </b>
            Doğrusu {money(actual, year)}. Etiket {times(multiple(item, year))} arttı; genel fiyatlar (TÜFE) {times(cpiMultiple(year))}. {item.name} {vsInflation(realChange(item, year))}.
          </div>
          <fieldset className={a.group}>
            <legend>Asgari ücretle kaç dakikalık iş?</legend>
            <div className={a.labor}>
              <span>{year}</span>
              <span className={a.prog}>
                <i style={{ width: `${(m1 / mx) * 100}%` }} />
              </span>
              <b>{duration(m1)}</b>
              <span>{NOW}</span>
              <span className={a.prog}>
                <i style={{ width: `${(m2 / mx) * 100}%` }} />
              </span>
              <b>{duration(m2)}</b>
            </div>
          </fieldset>
        </>
      )}

      <div className={a.buttons}>
        {!revealed ? (
          <button type="button" className={`${a.btn} ${a.def}`} onClick={submit}>
            Tamam
          </button>
        ) : (
          <button
            type="button"
            className={`${a.btn} ${a.def}`}
            autoFocus
            onClick={() => {
              sfx.click();
              if (n + 1 >= GUESS_ROUNDS) return onDone(log);
              setN(n + 1);
              setT(0.5);
            }}
          >
            {n + 1 < GUESS_ROUNDS ? 'Sonraki ›' : 'Karneyi göster'}
          </button>
        )}
      </div>
    </div>
  );
}
