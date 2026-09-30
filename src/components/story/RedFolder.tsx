import { useState } from 'react';
import { audioEngine } from '../../audio/audioEngine';
import { WEIGHT_TABLE } from '../../game/story';
import { useDialog } from '../ui/useDialog';
import styles from './RedFolder.module.css';

/*
 * The red folder Zehra left in the bottom-left drawer: the scoring weights the AI really uses,
 * printed and stamped "GİZLİ", with her handwriting in the margin. Photograph it, or put it back
 * as if you never saw it.
 */

interface Props {
  state: 'unlocked' | 'photographed' | 'returned';
  /** Pages already photographed. */
  photoPages: number;
  dayIndex: number;
  onDecide: (photo: boolean) => void;
  onClose: () => void;
}

export function RedFolder({ state, photoPages, dayIndex, onDecide, onClose }: Props) {
  const [flash, setFlash] = useState(false);
  const panel = useDialog<HTMLDivElement>(onClose);
  // Wednesday: page one. Thursday: the second page, taped under the drawer, is there too.
  const pages = dayIndex >= 3 ? 2 : 1;
  const rows = WEIGHT_TABLE.filter((r) => r.page <= pages);
  const decided = state === 'photographed' && photoPages >= pages;
  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Kırmızı dosya">
      <div className={styles.folder} ref={panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.tab}>K-3 · KİŞİYE ÖZEL</div>
        <div className={styles.sheet}>
          <div className={styles.stamp}>GİZLİ</div>
          <div className={styles.docHead}>
            <span>TAVRINSA LABS · İnsan Kaynakları</span>
            <span className="mono">HireBot v3.2 · Rev. 11</span>
          </div>
          <h3 className={styles.docTitle}>Aday Ön Eleme — Puan Ağırlık Tablosu</h3>
          <p className={styles.docLead}>
            Aşağıdaki ağırlıklar ATS skoruna aday görmeden uygulanır. Kriterler hukuk birimiyle "uyumlu" hâle getirilmiştir; tablo yalnızca İK Müdürlüğü erişimine açıktır ve dış denetim raporlarında yer almaz.
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Kriter</th>
                <th>Ağırlık</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.rule}>
                  <td>
                    {row.rule}
                    <span className={styles.decoded}>{row.decoded}</span>
                  </td>
                  <td className={`mono ${row.weight.startsWith('+') ? styles.plus : styles.minus}`}>{row.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pages === 1 ? (
            <div className={styles.pageNote}>Sayfa 1/2 — ikinci sayfa dosyada yok.</div>
          ) : (
            <div className={styles.pageNote}>Sayfa 2/2 — çekmecenin tabanına bantlanmıştı.</div>
          )}
          <div className={styles.sign}>Onay: H. Kaya · İK Müdürü</div>
          <div className={styles.note}>
            Kenardaki notlar benim. Hiçbir satırda "yaş" ya da "kadın" yazmıyor — yazmalarına gerek yok.
            <br />
            Bunu gördüğüm için gittim. Ya da gönderildim. Sen ne yapacaksın? — Z.
          </div>
          {flash && <div className={styles.flash} />}
        </div>
        <div className={styles.actions}>
          {decided ? (
            <>
              <span className={styles.status}>{state === 'photographed' ? `📸 ${photoPages === 2 ? 'İki sayfanın' : 'İlk sayfanın'} fotoğrafı telefonunda. Kimse görmedi… sanırım.` : 'Dosyayı yerine koydun. Hiçbir şey görmemiş gibi.'}</span>
              <button className={styles.close} onClick={onClose}>
                Çekmeceyi kapat
              </button>
            </>
          ) : (
            <>
              <button
                className={styles.photo}
                onClick={() => {
                  setFlash(true);
                  audioEngine.playUi('connect');
                  window.setTimeout(() => onDecide(true), 450);
                }}
              >
                📸 {photoPages > 0 ? 'İkinci sayfayı da çek' : 'Fotoğrafını çek'}
                <small>Kanıt sende kalır — ama aday verilerini fotoğraflamak KVKK ihlali sayılabilir.</small>
              </button>
              <button
                className={styles.back}
                onClick={() => {
                  audioEngine.playUi('click');
                  onDecide(false);
                  onClose();
                }}
              >
                Yerine koy
                <small>Hiçbir şey görmedin.</small>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
