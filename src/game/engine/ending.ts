import type { Difficulty, EndingVariant } from '../types';
import type { EvidenceAction } from '../story';

/** Everything beyond the two scores that shapes how the week ends. */
export interface EndingContext {
  refusals: number;
  /** 1–5: how the hire turned out a year later. */
  hireFit: number;
  aiUses: number;
  weekendChoice: string | null;
  difficulty: Difficulty;
  evidence?: EvidenceAction | null;
  rentPaid?: boolean;
  /** Did you hire the manager's nephew? */
  hiredNephew?: boolean;
}

const DEFAULT_CTX: EndingContext = { refusals: 0, hireFit: 3, aiUses: 0, weekendChoice: null, difficulty: 'normal' };

export function getEnding(performans: number, vicdan: number, ctx: EndingContext = DEFAULT_CTX): EndingVariant {
  const rentLine = ctx.rentPaid === false ? ' Bu arada kira hâlâ ödenmedi; ev sahibinin ihtarnamesi kapıda.' : '';
  // The red folder decides the week before anything else does.
  if (ctx.evidence === 'tihek') {
    return {
      title: 'Resmî yoldan gittin.',
      left: true,
      body: `Başvurun on dört ay sürdü. Sonunda şirkete idari para cezası verildi, tablo kaldırıldı. Sen o sırada çoktan başka bir işteydin: deneme süren "uyum sorunu" gerekçesiyle bitirilmişti. Şirket bir de KVKK ihlali iddiasıyla sana ihtarname gönderdi; avukatın "kamu yararı" dedi, dosya düştü. Kimse sana teşekkür etmedi. Ama bir sonraki Kerem'in dosyası açıldı.${rentLine}`,
    };
  }
  if (ctx.evidence === 'anon') {
    return {
      title: 'Anonim kaldın.',
      body: `İki gün boyunca herkes tabloyu konuştu. Şirket "sahte belge" açıklaması yaptı, bir hafta sonra gündem değişti. Ama bir şey oldu: "yaş" satırı sessizce silindi. Kimse paylaşanın sen olduğunu bilmiyor — Hakan Bey hariç. Her sabah sana biraz daha uzun bakıyor.${rentLine}`,
    };
  }
  if (ctx.evidence === 'zehra') {
    return {
      title: "Zehra'ya güvendin.",
      body: `Fotoğraf dava dosyasına girdi. Zehra işe iade davasını kazandı, tazminatını aldı ve başka bir şehre taşındı. Tablonun kaldırılması davanın konusu değildi; tablo hâlâ yerinde. Son mesajı: "Borcumu unutmayacağım." Bir daha yazmadı. Doğru kişiye mi güvendin? Hâlâ bilmiyorsun.${rentLine}`,
    };
  }
  if (ctx.evidence === 'director') {
    return performans >= 55
      ? {
          title: 'Sistem biraz değişti.',
          body: `Direktör tabloyu okuyunca uzun süre sustu. Bir ay sonra "yaş" ve "aile durumu" satırları sessizce silindi. Kimse teşekkür etmedi; kimse de özür dilemedi. Ama bir sonraki Kerem'in dosyası açıldı.${rentLine}`,
        }
      : {
          title: 'Dosya kayboldu. Sonra sen.',
      left: true,
          body: `Direktör "ilgileneceğiz" dedi. İki hafta sonra performansın gerekçe gösterilerek sözleşmen yenilenmedi. Tablo hâlâ yerinde duruyor.${rentLine}`,
        };
  }
  if (ctx.evidence === 'delete') {
    return {
      title: 'Sistemin dişlisi oldun.',
      body: `Fotoğrafı sildin, kirayı düşündün. Pazartesi masana döndüğünde çekmecenin boş olduğunu fark ettin. Biri dosyayı almıştı. Hakan Bey sabah "günaydın" dedi — ilk kez gülümseyerek.${rentLine}`,
    };
  }
  if (ctx.hiredNephew && performans >= 60) {
    return {
      title: 'Dayının gözdesi.',
      body: `Okan'ı işe aldın. Hakan Bey seni terfi listesine yazdı. Ekip ise artık yanında konuşmuyor.${rentLine}`,
    };
  }
  if (vicdan >= 85 || (ctx.weekendChoice === 'quit' && vicdan >= 68)) {
    return {
      title: 'İstifa ettin.',
      left: true,
      body: 'Sistemi değiştiremedin ama içinde kalmayı da kabul edemedin. Çıkışta güvenlik masasına kartını bıraktın ve eve gidip bu deneyimi anlatan bir yazı yazdın. Belki de az önce oynadığın oyun, o yazının ta kendisi.',
    };
  }

  if (ctx.refusals >= 5 && performans < 55) {
    return {
      title: 'Müdürle yolların ayrıldı.',
      left: true,
      body: 'Pazartesi sabahı İK direktörünün odasına çağrıldın. "Uyum sorunu" dediler. Kapıdan çıkarken içinde garip bir hafiflik vardı — en azından hiçbir talimat için kendini eğmemiştin.',
    };
  }

  if (performans >= 70 && ctx.hireFit >= 4 && ctx.refusals <= 2) {
    return {
      title: 'Terfi aldın.',
      body: 'Hakan Bey seni kıdemli uzmanlığa önerdi. Yeni masanın manzarası daha güzel — ama önündeki CV yığını da daha yüksek. Bir sonraki haftada kaç tanesini gerçekten okuyacaksın?',
    };
  }

  if (ctx.hireFit >= 5 && vicdan >= 55) {
    return {
      title: 'Bir hayatı değiştirdin.',
      body: 'İşe aldığın kişi bir yıl sonra sana kısa bir mesaj attı: "Bana şans veren tek kişi sizdiniz." O mesajı hâlâ saklıyorsun. Kötü günlerde açıp tekrar okuyorsun.',
    };
  }

  if (ctx.aiUses >= 20 && vicdan < 50) {
    return {
      title: 'Algoritmanın gölgesinde.',
      body: 'Kararların çoğunu makine verdi, sen imzaladın. Rapor kusursuz görünüyor, müdür memnun. Peki o raporun neresinde sen varsın?',
    };
  }

  if (performans >= 65 && vicdan < 40) {
    return {
      title: 'Sen artık sistemin mükemmel bir parçasısın.',
      body: 'Kuralları hiç sorgulamadan uyguladın. İK Müdürü senden çok memnun. Ama geride bıraktığın dosyalar da bir yerlerde.',
    };
  }

  if (performans < 45 && vicdan >= 60) {
    return {
      title: 'İşten çıkarıldın.',
      left: true,
      body: 'Deneme süren "uyum sorunu" gerekçesiyle, tazminatsız bitirildi. Ama birkaç kişi senin yüzünden ikinci bir şans buldu. Sistem seni istemedi — belki de bu iyiye işaretti.',
    };
  }

  return {
    title: 'Sistemde kaldın.',
    body: 'Tam olarak uyum sağlamadın. Bazı geceler uyuyamadın. Ama devam ettin, çünkü kira ödenmesi gerekiyordu.',
  };
}
