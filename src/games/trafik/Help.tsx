import type { Tools } from './model';
import styles from './TrafikGame.module.css';

/*
 * Kontrol merkezinin cep kartı: paneldeki her şeyin bir cümlelik sade anlatımı. Yalnızca bu
 * bölümde açık olan araçlar yazılır; oyun bu kart açıkken durur.
 */

const TERMS: { term: string; text: string; tool?: keyof Tools }[] = [
  { term: 'Işık kartı', text: 'Aşağıdaki her kart, birlikte yeşil yanan yolların ışığı. Kartta o yolların adı ve ışığın şu an ne yaptığı yazar: “Yeşil · 8 sn kaldı”, “Kırmızı · 20 sn sonra yeşil”.' },
  { term: 'Yeşil lamba', text: 'Yeşil hemen o yollara geçer. Yanan yeşil önce sarıya, sonra kırmızıya döner; güvenli geçiş birkaç saniye sürer.' },
  { term: 'Sarı lamba', text: 'Yanan yeşili bitirir: en az 5 saniye yeşil yandıktan sonra sarı, sonra kırmızı yanar.' },
  { term: 'Kırmızı lamba', text: 'Işığı kırmızıda tutar: sırası gelince atlanır, kart soluk görünür. Bir daha basınca yeniden sıraya girer.' },
  { term: 'Yeşil kalsın', text: 'Yanan yeşil, süresi dolsa da yanmaya devam eder. Ambulans ya da konvoy geçerken kullan. Bitince “Normale dön”e bas.' },
  { term: 'Yeşil − / +', text: 'Her kartın altında. O ışığın her turda kaç saniye yeşil yanacağı. Kalabalık yola uzun, boş yola kısa yeşil ver.' },
  { term: 'Sarı − / +', text: 'O ışığın yeşilden sonra kaç saniye sarı yanacağı: sürücüye “dur” uyarısı. Kısa olursa hızlı gelen duramaz, kırmızıda geçer.' },
  { term: 'Hepsi kırmızı − / +', text: 'O ışık söndükten sonra bütün yollar kaç saniye kırmızıda bekler; kavşağın ortasında kalan araç çıkar. Kısa olursa kaza olur.' },
  { term: 'Bir tur', text: 'Bütün ışıkların sırayla bir kez yeşil yanması. Uzun tur kalabalığa iyi gelir ama bekleyenin sabrını tüketir.' },
  { term: 'Akıllı mod', text: 'Yola gömülü algılayıcı araca bakar: boş yola yeşil yakmaz, araç gelmeyince yeşili erken bitirir. Ani kalabalıkta ya da konvoyda yine sen karar verirsin.', tool: 'detect' },
  { term: 'Yeşil dalga', text: 'Caddedeki ışıkları sıraya dizmek: araç birinde yeşil alınca ötekine de yeşilde varır. Çizelgede kesikli çizgi yeşil kutulardan geçiyorsa dalga oturmuştur. Bir ışığı elle değiştirirsen dalga kayar.', tool: 'wave' },
  { term: 'Yollar', text: 'Bir yolu kapatırsan oraya gidecek sürücüler başka yöne çevrilir ya da ara sokaklara sapar. Yol çalışmasında yol kapalı olmalı.', tool: 'roads' },
  { term: 'Ekipler', text: 'Kaza, arıza, park ya da düğün çıkınca soldaki karttaki düğmeye bas: trafik polisi, çekici ya da elektrik ekibi gelir. Çağırmazsan olay dakikalarca yolu tıkar.' },
  { term: 'Sinyal arızası', text: 'Işıklar sarı yanıp söner, sürücüler çizgide durup sırayla geçer. Kavşak çok yavaşlar; yalnızca elektrik ekibi onarır.' },
  { term: 'Kuyruk taşarsa', text: 'Bir yolun kuyruğu haritanın dışına taşar ve birikirse kavşak kilitlenir, vardiya biter. Haritada kuyruğu uzayan yola hemen yeşil yak.' },
];

export function Help({ tools, onClose }: { tools: Tools; onClose: () => void }) {
  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="trafik-yardim" onClick={onClose}>
      <article className={`${styles.order} ${styles.help}`} onClick={(e) => e.stopPropagation()}>
        <header>
          <span>TRAFİK KONTROL MERKEZİ · CEP KARTI</span>
          <span>oyun durdu</span>
        </header>
        <h2 id="trafik-yardim">Panel ne diyor?</h2>
        <p className={styles.tipLine}>Amaç: sürücülerin sabrı tükenmeden herkesi geçirmek. Kalabalığa yeşil, boş yola az yeşil; olaya ekip, ambulansa yol.</p>
        <dl className={styles.terms}>
          {TERMS.filter((t) => !t.tool || tools[t.tool]).map((t) => (
            <div key={t.term}>
              <dt>{t.term}</dt>
              <dd>{t.text}</dd>
            </div>
          ))}
        </dl>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={onClose} autoFocus>
            Anladım, sürdür
          </button>
        </div>
      </article>
    </div>
  );
}
