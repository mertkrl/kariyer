import { useState } from 'react';
import { useGameStore } from '../game/store';
import { NEPHEW_ID } from '../game/data/candidates';
import { offerOpening, offerReply, type OfferBeat, type OfferContext, type OfferOption } from '../game/offer';
import { audioEngine } from '../audio/audioEngine';
import { Button } from '../components/ui/Button';
import styles from './OfferScreen.module.css';

/*
 * Friday, 18:40. The hire is done, the floor is empty, only Defne's monitor is on. Hakan Bey
 * stops at the door: the trial is over, the post is for one. What she says here is how the
 * week ends at work (offer.ts); the phone call with Mom that night is how it ends at home.
 */

type Line = { kind: 'his' | 'stage' | 'mine'; text: string };

/** A quoted line is his; anything else is a stage direction. */
const asLines = (texts: string[]): Line[] => texts.map((text) => ({ kind: text.startsWith('"') ? 'his' : 'stage', text }));

export function OfferScreen() {
  const performans = useGameStore((s) => s.performans);
  const stance = useGameStore((s) => s.managerStance);
  const difficulty = useGameStore((s) => s.difficulty);
  const reform = useGameStore((s) => s.story.reform);
  const settled = useGameStore((s) => s.story.offer);
  const hiredId = useGameStore((s) => s.hiredId);
  const settleOffer = useGameStore((s) => s.settleOffer);
  const finishOffer = useGameStore((s) => s.finishOffer);

  const [ctx] = useState<OfferContext>(() => ({
    performans,
    // hard mode starts him one refusal in; that one isn't yours
    refusals: Math.max(0, stance.refusals - (difficulty === 'hard' ? 1 : 0)),
    complies: stance.complies,
    reform,
    hiredNephew: hiredId === NEPHEW_ID,
  }));
  const [opening] = useState(() => offerOpening(ctx));
  const [lines, setLines] = useState<Line[]>(() => asLines(opening.lines));
  const [beat, setBeat] = useState<OfferBeat | null>(opening);
  const done = settled !== null;

  function choose(option: OfferOption) {
    audioEngine.playUi('select', 1);
    const reply = offerReply(ctx, option.id);
    setLines((ls) => [...ls, { kind: 'mine', text: option.label }, ...asLines(reply.lines)]);
    setBeat(reply.next ?? null);
    if (reply.result) settleOffer(reply.result);
  }

  return (
    <div className={styles.screen}>
      <div className={styles.glow} />
      <div className={styles.content}>
        <div className={styles.eyebrow}>Cuma · 18:40 · Kat boşaldı</div>
        <h1 className={styles.title}>Kapıda Hakan Bey</h1>

        <div className={styles.card} aria-live="polite">
          {lines.map((l, i) =>
            l.kind === 'mine' ? (
              <p key={i} className={styles.mine}>
                {l.text}
              </p>
            ) : (
              <p key={i} className={`${styles.say} ${l.kind === 'stage' ? styles.stage : ''}`}>
                {l.text}
              </p>
            ),
          )}
          {!done && beat && beat.options.length > 0 && (
            <div className={styles.options} role="group" aria-label="Cevabın">
              {beat.options.map((o) => (
                <button key={o.id} className={styles.option} onClick={() => choose(o)}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button variant="gold" sound="confirm" onClick={finishOffer} disabled={!done}>
          {done ? 'EVE DÖN →' : 'Önce cevap ver'}
        </Button>
      </div>
    </div>
  );
}
