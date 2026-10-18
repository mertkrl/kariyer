import type { Difficulty, EndingVariant } from '../types';
import { FIRED_BELOW, leavesCompany, offerWithheld, type OfferResult } from '../events/offer';
import type { ReformKind } from '../day/desk';

export { FIRED_BELOW };

/*
 * Haftanın nasıl bittiği, ikisi de Defne'nin olan iki adımda: Cuma 18:40'ta Hakan Bey'in
 * teklifine ne dediği (iş) ve o gece annesine ne söylediği (çevresindeki hayat). Puanlar sonu
 * seçmez; ona tonunu verir (nasıl biri olarak kaldığı, nasıl biri olarak gittiği) ve Hakan Bey'in
 * en başta neyi teklif edebileceğine karar verir (offer.ts).
 */

/** İki puanın ötesinde haftanın nasıl bittiğini şekillendiren her şey. */
export interface EndingContext {
  refusals: number;
  /** 1–5: işe alınan kişinin bir yıl sonra nasıl çıktığı. */
  hireFit: number;
  aiUses: number;
  /** Cuma gecesi annene söylediğin son şey: breakfast · sleep · quit (gitmeyi düşünmek) · search. */
  weekendChoice: string | null;
  difficulty: Difficulty;
  /** Müdürün yeğenini işe aldın mı? */
  hiredNephew?: boolean;
  /** Cuma 18:40. Yoksa (eski bir kayıt, bir test): puanlardan, onun yapacağı gibi okunur. */
  offer?: OfferResult | null;
}

const DEFAULT_CTX: EndingContext = { refusals: 0, hireFit: 3, aiUses: 0, weekendChoice: null, difficulty: 'normal' };

const REFORM_DONE: Record<ReformKind, string> = {
  structured: 'Pazartesi sabahı mülakat formu herkes için aynıydı: aynı sorular, aynı puan kartı. Küçük bir değişiklik. Ama bir sonraki Kerem, bir sonraki Seda aynı soruları duydu; kimse onlara emekliliğini, çocuk planını sormadı.',
  blind: 'Bir sonraki ilanda isimler, yaşlar, fotoğraflar gizlendi. Hakan Bey holding sunumunda bunu kendi fikri gibi anlattı. Sen bir şey demedin; ilk ay kısa listeye giren üç kişinin ikisi, eski tabloda hiç masana gelmeyecek insanlardı.',
  audit: '',
};

/** İş: teklife verilen cevabın götürdüğü yer, arkasındaki haftanın tonuyla. */
function jobEnding(p: number, v: number, ctx: EndingContext, offer: OfferResult): EndingVariant {
  switch (offer.outcome) {
    case 'quit':
      return {
        title: 'İstifa ettin.',
        left: true,
        body: 'Sistemi değiştiremedin ama içinde kalmayı da kabul edemedin. Pazartesi istifa mektubunu verdin, güvenlik masasına kartını bıraktın ve eve gidip bu haftayı anlatan bir yazı yazdın. Belki de az önce oynadığın oyun, o yazının ta kendisi.',
      };
    case 'gaveToAyse':
      return {
        title: 'Yerini Ayşe\'ye bıraktın.',
        left: true,
        body:
          v >= 60
            ? 'Kadroyu ona bıraktın; "o da iki yıl iş aradı" dedin, kendine. Pazartesi masanı topladın. Ayşe asansörde sana sarıldı, bir şey demedi. Bazı kararların bedelini kimse görmez; bunu sen gördün.'
            : 'Kadroyu Ayşe\'ye bıraktın. Neden yaptığını tam bilmiyorsun: yorgunluk mu, utanç mı, cömertlik mi? Pazartesi yeniden iş ilanlarına baktın. Bu sefer ilanların altındaki küçük yazıları okuyarak.',
      };
    case 'reformRefused':
      return {
        title: 'Şartını koydun, kapı kapandı.',
        left: true,
        body: 'Kadroyu bir şartla istedin, Hakan Bey şartsız verdi ya da hiç vermedi. Sen ikincisini seçtin. Pazartesi masan Ayşe\'nindi. Elinde bir referans mektubu ve bir cümle kaldı: "Şartla kadro olmaz." Bir gün o cümleyi kuran sen olmayacaksın.',
      };
    case 'notOffered':
      if (ctx.refusals >= 5 && p >= FIRED_BELOW) {
        return {
          title: 'Müdürle yolların ayrıldı.',
          left: true,
          body: 'Deneme süren uzatılmadı. Raporda "uyum sorunu" yazıyordu. Kapıdan çıkarken içinde garip bir hafiflik vardı: hiçbir talimat için kendini eğmemiştin.',
        };
      }
      return {
        title: 'İşten çıkarıldın.',
        left: true,
        body:
          v >= 55
            ? 'Deneme süren "uyum sorunu" gerekçesiyle, tazminatsız bitirildi. Ama birkaç kişi senin yüzünden ikinci bir şans buldu. Sistem seni istemedi; belki de bu iyiye işaretti.'
            : 'Deneme süren "performans yetersizliği" gerekçesiyle, tazminatsız bitirildi. Ne sisteme yaranabildin ne de adaylara sahip çıkabildin. Masandaki dosyaları bir başkası devraldı.',
      };
    case 'stayReform':
      return { title: 'İçeriden bir kural değiştirdin.', body: REFORM_DONE[offer.reform ?? 'structured'] };
    case 'stayAfterRefusal':
      return {
        title: 'Şartını çekmeceye koydun.',
        body: 'Kadroyu şartsız imzaladın. Hakan Bey elini sıktı, Ayşe\'ye Pazartesi o söyledi. Şartını yazdığın kâğıt hâlâ çekmecende. Bazı sabahlar açıp bakıyorsun; bir gün yeniden soracaksın. Belki.',
      };
    case 'stay':
      break;
  }

  // Kadroyu teklif edildiği gibi aldın: arkandaki hafta nasıl biri olarak kaldığını söyler.
  if (ctx.hiredNephew) {
    return { title: 'Dayının gözdesi.', body: 'Okan\'ı işe aldın, kadroyu da aldın. Hakan Bey seni terfi listesine yazdı. Ekip ise artık yanında konuşmuyor.' };
  }
  if (p >= 75 && v < 35) {
    return {
      title: 'Sen artık sistemin mükemmel bir parçasısın.',
      body: 'Kuralları hiç sorgulamadan uyguladın, kadro da geldi. İK Müdürü senden çok memnun. Ama geride bıraktığın dosyalar da bir yerlerde.',
    };
  }
  if (p >= 70 && ctx.hireFit >= 4 && ctx.refusals <= 2) {
    return {
      title: 'Terfi aldın.',
      body: 'Altı ay sonra Hakan Bey seni kıdemli uzmanlığa önerdi. Yeni masanın manzarası daha güzel, ama önündeki CV yığını da daha yüksek. Bir sonraki haftada kaç tanesini gerçekten okuyacaksın?',
    };
  }
  if (ctx.hireFit >= 5 && v >= 55) {
    return {
      title: 'Bir hayatı değiştirdin.',
      body: 'İşe aldığın kişi bir yıl sonra sana kısa bir mesaj attı: "Bana şans veren tek kişi sizdiniz." O mesajı hâlâ saklıyorsun. Kötü günlerde açıp tekrar okuyorsun.',
    };
  }
  if (ctx.aiUses >= 20 && v < 50) {
    return {
      title: 'Algoritmanın gölgesinde.',
      body: 'Kararların çoğunu makine verdi, sen imzaladın; kadroyu da öyle aldın. Rapor kusursuz görünüyor, müdür memnun. Peki o raporun neresinde sen varsın?',
    };
  }
  return {
    title: 'Sistemde kaldın.',
    body: 'Tam olarak uyum sağlamadın. Bazı geceler uyuyamadın. Ama kadroyu aldın ve devam ettin: on bir ay işsizlikten sonra insan o kapıyı kendi eliyle kapatamıyor.',
  };
}

/** Gece: annenle telefon konuşmasından son bir satır, 18:40'ta yaptığının ışığında. */
function homeCoda(left: boolean, choice: string | null): string {
  if (left) {
    switch (choice) {
      case 'breakfast':
        return ' Pazar kahvaltısında annen hiçbir şey sormadı; sadece çayını tazeledi.';
      case 'sleep':
        return ' İki gün uyudun. Sonra yeniden CV yazmaya oturdun, bu sefer okuyacak olanı düşünerek.';
      case 'search':
        return ' Pazartesi yeni başvurular yaptın: bu sefer ilanın altında "başvurular insan tarafından değerlendirilir" yazan yerlere.';
      default:
        return '';
    }
  }
  switch (choice) {
    case 'breakfast':
      return ' Pazar sabahı annenin menemeni. Pazartesi\'yi bir sabahlığına düşünmedin.';
    case 'sleep':
      return ' Hafta sonunu uyuyarak geçirdin. Pazartesi masanda yeni bir yığın vardı.';
    case 'quit':
      return ' Annene iş değiştirmeyi düşündüğünü söyledin. Kadroya imza attın ama o cümle aklında kaldı.';
    default:
      return '';
  }
}

/** Cevabı kaydedilmemiş bir hafta için Hakan Bey'in yapacağı. */
const impliedOffer = (p: number, ctx: EndingContext): OfferResult =>
  offerWithheld({ performans: p, refusals: ctx.refusals, complies: 0, reform: null, hiredNephew: !!ctx.hiredNephew })
    ? { outcome: 'notOffered', vicdan: 0 }
    : { outcome: 'stay', vicdan: 0 };

export function getEnding(performans: number, vicdan: number, ctx: EndingContext = DEFAULT_CTX): EndingVariant {
  const offer = ctx.offer ?? impliedOffer(performans, ctx);
  const job = jobEnding(performans, vicdan, ctx, offer);
  const left = leavesCompany(offer.outcome);
  return { ...job, left: left || undefined, body: job.body + homeCoda(left, ctx.weekendChoice) };
}
