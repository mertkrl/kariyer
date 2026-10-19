/*
 * Kanıt kartları: hafta boyunca oyuncunun kendisi baktığı şeyler (adayın sitesi, aradığı referans)
 * Cuma mülakatında adaya özel bir soruya dönüşür. Sorular bir İK uzmanının sorabileceği türdendir:
 * teknik değil, işi nasıl aldığı, kiminle nasıl çalıştığı, ters gidince ne yaptığı. Bakılmayan kanıtın sorusu çıkmaz; araştırmanın
 * karşılığı budur. Cevaplar adayın gerçekte kim olduğunu gösterir: güçlü aday somut ve sahiplenerek
 * anlatır, zayıf olan genel konuşur ya da konuyu değiştirir.
 */
import { portfolioOf } from './portfolios';
import { referenceFor } from '../day/references';
import { candidateDetails } from './candidateDetails';

/** Mülakat kaydındaki soru kodları: site 50, referans 51. */
export const EVIDENCE_SITE = 50;
export const EVIDENCE_REFERENCE = 51;

export interface EvidenceCard {
  code: number;
  /** Dosyada ve düğmede görünen kısa etiket. */
  label: string;
  question: string;
  answer: string;
}

const SITE_TALK: Record<string, { question: string; answer: string }> = {
  selin: {
    question: 'Durak Kahve\'nin sitesini inceledim, sipariş bile verdim. Bu işi nasıl aldınız, müşteriyle nasıl çalıştınız?',
    answer: 'Kafe sahibi üniversiteden bir arkadaşımın annesiydi; sabah sıralarından şikâyet ediyordu. İki hafta her sabah kafeye gidip kasada bekleyen insanları izledim, sonra ne yapacağımı yazıp onaylattım. Bir kere renkleri ona sormadan değiştirdim, geri döndük; o günden beri her şeyi yazılı onaylatıyorum.',
  },
  mert: {
    question: 'Sitenizde her projede "benim payım" diye ayrı bir bölüm var, bazı işleri başkalarıyla yaptığınızı yazıyorsunuz. Neden bu kadar açık yazdınız?',
    answer: 'Çünkü işe alındıktan sonra "bunu sen mi yaptın?" sorusuna mahcup olmak istemem. Atölye projesinde takvimi bir arkadaşım yazdı, adını da yazdım. Yaptığımı da yapmadığımı da rahatça anlatabiliyorum; bence ekipte güveni bu kuruyor.',
  },
  deniz: {
    question: 'Kargo sitenizi gerçek bir firma kullanıyormuş. Bu fırsatı nasıl buldunuz, bir sorun çıktığında ne yaptınız?',
    answer: 'Arkadaşımın çalıştığı firma denemek istedi. Bir gün kuryeler teslim saatlerini yanlış gördü; şube aradı, aynı akşam hatayı bulup düzelttim ve ertesi sabah şubeye gidip ne olduğunu anlattım. Bazı kısımları yapay zekâ yardımıyla yazdım, bunu da saklamadım.',
  },
  tolga: {
    question: 'Bir derneğin sitesini gönüllü yapmışsınız. Neden gönüllü, ve derneğin üyeleriyle nasıl çalıştınız?',
    answer: 'Bir arkadaşım görme engelli; onun kullandığı sitelerin çoğu işe yaramıyordu. Derneğe gidip üyelerle oturdum, siteyi birlikte kullandık, her şeyi onlara denettirdim. Para almadım ama en çok burada öğrendim: insanlara sormadan yapılan iş, çoğu zaman yanlış iş.',
  },
  zeynep: {
    question: 'Ege Sepeti\'ni hafta sonları yürütüyormuşsunuz. Bu iş size ne öğretti, bir şey ters gittiğinde ne yaptınız?',
    answer: 'Bir kere aynı balı stokta olandan fazla sattık; üç müşteriyi tek tek aradım, özür diledim, birine kendi cebimden kargo ödedim. Sonra siteyi stoktan fazlasını satmayacak şekilde değiştirdim. Küçük bir işte her müşteri bir insan; büyük şirkette unutulan şey bu.',
  },
  ferhat: {
    question: 'Güler Hırdavat\'ın sitesi çok sade. Bu bilinçli bir tercih mi, eniştenizle nasıl karar verdiniz?',
    answer: 'Bilinçli. Dükkâna gelenlerin çoğu ustalar ve emekliler; gösterişli bir siteyle uğraşmazlar. Eniştemle oturup "müşteri en çok neyi soruyor?" diye konuştuk: "Var mı, kaç para, ne zaman gelir?" Site sadece bunları cevaplıyor. Telefonla gelen soru yarıya indi.',
  },
  volkan: {
    question: 'Nar Lokanta\'nın sitesi çok şık. Altında bir ajansın adı ve 6 kişilik ekip yazıyor. Siz bu projede tam olarak neyi üstlendiniz?',
    answer: 'Projede yer aldım, ekip olarak çok iyi bir iş çıkardık. Süreçlerde aktif rol aldım, koordinasyona destek verdim. Detayları gizlilik nedeniyle tam paylaşamıyorum ama sonuç ortada; restoran çok memnun kaldı.',
  },
  serkan: {
    question: 'Sitenizi açtım; kayıt formunu boş gönderince "Welcome, undefined" yazdı, projeler de "Project One" diye duruyor. Bunu bana nasıl açıklarsınız?',
    answer: 'O site şu an sürekli geliştirme aşamasında, agile bir yaklaşımla ilerliyorum. İçerikleri yakında güncelleyeceğim; önemli olan vizyonun ve altyapının hazır olması.',
  },
};

/** Referansı aranmış bir adaya, referansın söylediğiyle yüzleşme. */
function referenceTalk(id: string, summary: string): { question: string; answer: string } {
  const fit = candidateDetails[id]?.hireFit ?? 3;
  return {
    question: `Referansınızı aradım. Bana şunu söyledi: "${summary}" Bu konuda siz ne düşünüyorsunuz?`,
    answer:
      fit >= 4
        ? 'Doğru, öyle oldu. O dönemi saklamıyorum; neyi neden yaptığımı ve oradan ne öğrendiğimi anlatabilirim. İsterseniz o yöneticimle bir kez daha konuşabilirsiniz.'
        : fit <= 2
          ? 'Açıkçası orada iletişim sorunları vardı, yönetim beni pek anlamadı. Herkesin kendi bakış açısı var; ben elimden geleni yaptım.'
          : 'Kısmen doğru. Orada her şey kusursuz değildi, ama işimi yaptım. Bir dahaki sefere bazı şeyleri daha erken konuşurdum.',
  };
}

/** Adayın bu hafta oyuncunun gerçekten baktığı kanıtlardan doğan soruları. */
export function evidenceFor(id: string, seen: { site: boolean; reference: boolean }): EvidenceCard[] {
  const cards: EvidenceCard[] = [];
  const p = portfolioOf(id);
  if (seen.site && p && SITE_TALK[id]) cards.push({ code: EVIDENCE_SITE, label: `Site: ${p.link}`, ...SITE_TALK[id] });
  const ref = referenceFor(id);
  if (seen.reference && ref) cards.push({ code: EVIDENCE_REFERENCE, label: 'Referans araması', ...referenceTalk(id, ref.summary) });
  return cards;
}
