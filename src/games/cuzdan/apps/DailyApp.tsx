import { useMemo, useState } from 'react';
import { markPlayed } from '../../../arcade/progress';
import { ShareButton } from '../../../arcade/ShareButton';
import { paintCuzdanCard } from '../shareCard';
import { NOW, YEAR_NOTE } from '../data';
import { DAILY_ROUNDS, dailyShare, dayNumber, loadDaily, makeDaily, nextStreak, saveDaily, type DailyState } from '../daily';
import { money, times } from '../model';
import { sfx } from '../sfx';
import a from '../Apps.module.css';
import d from '../Daily.module.css';

/*
 * Günün Sepeti penceresi: beş soru, dört şık. Bugün zaten oynandıysa doğrudan sonuç kartı açılır
 * (yeşil/kırmızı kareler, seri, paylaş). Sonuç cihazda saklanır; yarın yeni sepet gelir.
 */

export function DailyApp({ onDone }: { onDone: (hits: number) => void }) {
  const day = useMemo(() => dayNumber(new Date()), []);
  const rounds = useMemo(() => makeDaily(day), [day]);
  const [saved, setSaved] = useState<DailyState | null>(() => {
    const s = loadDaily();
    return s && s.day === day ? s : null;
  });
  const [picks, setPicks] = useState<number[]>([]);
  const [n, setN] = useState(0);
  const done = saved ?? null;
  const final = done ? done.picks : picks;
  const hits = rounds.filter((r, i) => r.options[final[i]] === r.answer).length;

  if (done) {
    return (
      <div className={a.pad}>
        <div className={d.dailyHead}>
          <b>Günün Sepeti #{day}</b>
          <span>
            {hits}/{DAILY_ROUNDS} · seri {done.streak} gün
          </span>
        </div>
        <div className={d.grid} aria-label={`${hits} doğru, ${DAILY_ROUNDS - hits} yanlış`}>
          {rounds.map((r, i) => (
            <span key={i} className={r.options[done.picks[i]] === r.answer ? d.cellOk : d.cellNo} />
          ))}
        </div>
        <ol className={a.recap}>
          {rounds.map((r, i) => (
            <li key={i} className={r.options[done.picks[i]] === r.answer ? a.recapOk : a.recapNo}>
              <span>
                {r.item.emoji} {r.item.name} · {r.year}
              </span>
              <small>
                {money(r.answer, r.year)} → bugün {money(r.item.prices[NOW], NOW)}
              </small>
              <b>{times(r.item.prices[NOW] / r.answer)}</b>
            </li>
          ))}
        </ol>
        <p className={a.dim}>Yarın yeni sepet. Arkadaşın da bugün aynı beş soruyu görüyor.</p>
        <div className={a.buttons}>
          <ShareButton
            className={`${a.btn} ${a.def}`}
            make={() => ({
              route: 'cuzdan',
              kicker: `Günün Sepeti #${day}`,
              title: `${hits}/${DAILY_ROUNDS}`,
              note: rounds.map((r, i) => (r.options[done.picks[i]] === r.answer ? '🟩' : '🟥')).join(' '),
              stats: [
                { label: 'Doğru', value: `${hits}/${DAILY_ROUNDS}` },
                { label: 'Seri', value: `${done.streak} gün` },
              ],
              question: 'Bugünün sepetini sen kaç bilirsin?',
              text: dailyShare(day, rounds, done.picks),
              paint: paintCuzdanCard({
                kicker: `Günün Sepeti #${day}`,
                title: `${hits}/${DAILY_ROUNDS} bildim`,
                marks: rounds.map((r, i) => r.options[done.picks[i]] === r.answer),
                rows: [
                  ['Doğru', `${hits}/${DAILY_ROUNDS}`],
                  ['Seri', `${done.streak} gün`],
                ],
                question: 'Bugünün sepetini sen kaç bilirsin?',
                seal: ['GÜNÜN SEPETİ', `#${day} · KASADAN ÇIKTI`],
                seed: day,
              }),
            })}
          />
        </div>
      </div>
    );
  }

  const r = rounds[n];
  const picked = picks[n];
  const answered = picked !== undefined;
  const pick = (i: number) => {
    if (answered) return;
    const next = [...picks, i];
    setPicks(next);
    (r.options[i] === r.answer ? sfx.ok : sfx.error)();
  };
  const advance = () => {
    sfx.click();
    if (n + 1 < DAILY_ROUNDS) return setN(n + 1);
    const prev = loadDaily();
    const state: DailyState = { day, picks, streak: nextStreak(prev, day), last: day };
    saveDaily(state);
    setSaved(state);
    const h = rounds.filter((x, i) => x.options[picks[i]] === x.answer).length;
    markPlayed('cuzdan', `Günün Sepeti ${h}/${DAILY_ROUNDS}`);
    onDone(h);
  };

  return (
    <div className={a.pad}>
      <div className={d.dailyHead}>
        <b>Günün Sepeti #{day}</b>
        <span>
          Soru {n + 1} / {DAILY_ROUNDS}
        </span>
      </div>
      <div className={a.itemHead}>
        <span className={a.sunkenIcon} aria-hidden="true">
          {r.item.emoji}
        </span>
        <div>
          <b className={a.itemName}>{r.item.unit}</b>
          <div>
            <b>{r.year}</b> yılında kaç liraydı?
          </div>
          <div className={a.dim}>{YEAR_NOTE[r.year]}</div>
        </div>
      </div>
      <div className={d.options} role="group" aria-label="Fiyat şıkları">
        {r.options.map((o, i) => {
          const state = !answered ? '' : o === r.answer ? a.choiceOk : i === picked ? d.optionNo : '';
          return (
            <button key={i} type="button" className={`${a.choice} ${state}`} disabled={answered} onClick={() => pick(i)}>
              <b>{money(o, r.year)}</b>
            </button>
          );
        })}
      </div>
      {answered && (
        <p className={a.dim} role="status">
          {r.options[picked] === r.answer ? '✔ Doğru! ' : `✖ Doğrusu ${money(r.answer, r.year)}. `}
          Bugün {money(r.item.prices[NOW], NOW)}.
        </p>
      )}
      <div className={a.buttons}>
        <button type="button" className={`${a.btn} ${a.def}`} disabled={!answered} onClick={advance} autoFocus={answered}>
          {n + 1 < DAILY_ROUNDS ? 'Sonraki ›' : 'Sonucu gör'}
        </button>
      </div>
    </div>
  );
}
