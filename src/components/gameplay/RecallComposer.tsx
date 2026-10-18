import { useEffect, useRef, useState } from 'react';
import { PLAYER } from '../../game/lib/player';
import { audioEngine } from '../../audio/audioEngine';
import styles from './RecallComposer.module.css';

/*
 * Çarşamba öğleden sonra, Hakan Bey'in aramasından sonra: iki mülakat davetini geri alan e-posta.
 * Her şeyin üstünde bir açılır pencere olarak açılır (ekranın geri kalanına tıklanamaz ya da Tab'la
 * gidilemez, Esc onu kapatmaz) ve gönderilene kadar kalır; sana kalan tek seçim ifadedir: istediği
 * "sehven gönderildi" cümlesi ya da gerçekte olan.
 */

const BODIES = {
  lie: 'Tarafınıza gönderilen mülakat daveti sehven gönderilmiştir. Yaşanan karışıklık için anlayışınıza sığınırız.',
  honest:
    'Şirketimizin kadro planı bu hafta değişti ve açık pozisyon sayısı azaldı. Bu nedenle size gönderdiğimiz mülakat davetini geri almak zorunda kaldık. Bu karar değerlendirmenizle ilgili bir eksiklikten kaynaklanmıyor; bunu açıkça bilmenizi istedim.',
};

type Choice = keyof typeof BODIES;

export function RecallComposer({ to, onSend }: { to: string[]; onSend: (honest: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [choice, setChoice] = useState<Choice | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby="recall-title" onCancel={(e) => e.preventDefault()}>
      <div className={styles.window}>
        <div className={styles.titleBar}>
          <span id="recall-title">Yeni ileti · Mülakat davetiniz hk.</span>
        </div>

        <div className={styles.brief}>
          <b>Hakan Bey'den talimat</b>
          <span>Holding kadro planını revize etti. Bu iki davet geri alınacak; e-postaya "sehven gönderildi" yazılacak.</span>
        </div>

        <div className={styles.fields}>
          <div>
            <span>Kimden</span>
            {PLAYER.name} &lt;{PLAYER.address}&gt;
          </div>
          <div>
            <span>Kime</span>
            <span className={styles.chips}>
              {to.map((name) => (
                <em key={name}>{name}</em>
              ))}
            </span>
          </div>
          <div>
            <span>Konu</span>
            Mülakat davetiniz hk.
          </div>
        </div>

        <div className={styles.body}>
          <fieldset className={styles.choices}>
            <legend>Metin</legend>
            {(['lie', 'honest'] as const).map((k) => (
              <label key={k} className={`${styles.choice} ${choice === k ? styles.choiceOn : ''}`}>
                <input type="radio" name="recall" checked={choice === k} onChange={() => setChoice(k)} />
                <span>
                  <b>{k === 'lie' ? 'İstenen metin: "sehven gönderildi"' : 'Gerçek gerekçe: kadro planı değişti'}</b>
                  <small>{k === 'lie' ? 'Hakan Bey\'in talimatı' : 'Talimatın dışında'}</small>
                </span>
              </label>
            ))}
          </fieldset>

          <div className={styles.preview} aria-live="polite">
            {choice ? (
              <>
                <p>Sayın aday,</p>
                <p>{BODIES[choice]}</p>
                <p className={styles.signature}>
                  Saygılarımla,
                  <br />
                  {PLAYER.name}
                  <br />
                  {PLAYER.title} · Tavrinsa Labs
                </p>
              </>
            ) : (
              <p className={styles.placeholder}>Soldan bir metin seç. İleti iki adaya ayrı ayrı gönderilecek.</p>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.send}
            disabled={!choice}
            onClick={() => {
              if (!choice) return;
              audioEngine.playUi('confirm');
              onSend(choice === 'honest');
            }}
          >
            Gönder
          </button>
        </div>
      </div>
    </dialog>
  );
}
