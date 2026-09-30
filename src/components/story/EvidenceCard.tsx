import { useGameStore } from '../../game/store';
import type { EvidenceAction } from '../../game/story';
import { audioEngine } from '../../audio/audioEngine';
import styles from '../../screens/ReckoningScreen.module.css';

/*
 * Thursday night, at home: the photo of the red folder is on your phone and Zehra said
 * "tonight". Five roads, none of them clean — the photo itself may break confidentiality.
 */

/** Real roads, none of them clean — the photo itself may break the data protection law. */
const ACTIONS: { id: EvidenceAction; icon: string; title: string; text: string }[] = [
  { id: 'tihek', icon: '⚖️', title: 'Resmî şikâyet: TİHEK', text: 'Eşitlik kurumuna başvur. Yavaş, bürokratik — ama kayıtlı.' },
  { id: 'anon', icon: '🕶', title: 'Anonim paylaş', text: 'Kimliğini gizleyerek internette yayınla. Hızlı yayılır, hızlı unutulur.' },
  { id: 'zehra', icon: '✉️', title: "Zehra'ya gönder", text: 'Dava dosyasına girsin. Ona güveniyor musun?' },
  { id: 'director', icon: '🏢', title: 'İK direktörüne götür', text: 'Kurum içinde çözülsün. Hakan Bey\'in de üstü.' },
  { id: 'delete', icon: '🗑', title: 'Fotoğrafı sil', text: 'Kiran var, kardeşin var, deneme süren var. Sessiz kal.' },
];

const RESULT: Record<EvidenceAction, string> = {
  tihek: 'e-Devlet üzerinden başvuru yaptın. Ekranda tek satır: "Başvurunuz alınmıştır. Başvuru no: 2026-04471."',
  anon: 'Yeni bir hesap açtın, fotoğrafı yüzleri ve imzayı karartarak paylaştın. Bir saatte iki bin kez paylaşıldı.',
  zehra: 'Gönderildi. Birkaç dakika sonra tek kelime: "Teşekkürler." — Z. Sonra hiçbir şey.',
  director: 'Direktöre randevu maili attın: "Pazartesi 09:00 — Özel konu." Cevap hemen geldi: "Görüşelim."',
  delete: 'Fotoğrafı sildin. "Son silinenler"den de. Ekranı kapattın.',
};

export function EvidenceCard() {
  const story = useGameStore((s) => s.story);
  const setEvidence = useGameStore((s) => s.setEvidence);
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span>🖼 Galeri · IMG_4471.jpg</span>
        <span>Kırmızı dosya</span>
      </div>
      <div className={styles.photo}>
        <div className={styles.photoSheet}>
          <b>Aday Ön Eleme — Puan Ağırlık Tablosu</b>
          <span>Kariyer evresi uyumu (40+) ···· −25</span>
          <span>Devamlılık riski (aile) ···· −20</span>
          <span>Güncellik riski (boşluk) ···· −30</span>
          {story.photoPages >= 2 && <span>Kültür uyumu: iç referans ···· +40</span>}
          {story.photoPages < 2 && <span>(Sayfa 1/2)</span>}
          <em>Onay: H. Kaya</em>
        </div>
      </div>
      {story.evidence === null ? (
        <div className={styles.actions}>
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              className={styles.action}
              onClick={() => {
                audioEngine.playUi(a.id === 'delete' ? 'click' : 'confirm');
                setEvidence(a.id);
              }}
            >
              <span className={styles.actionIcon}>{a.icon}</span>
              <span>
                <b>{a.title}</b>
                <small>{a.text}</small>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className={styles.result}>{RESULT[story.evidence]}</p>
      )}
    </div>
  );
}
