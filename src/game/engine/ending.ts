import type { Difficulty, EndingVariant } from '../types';

/** Everything beyond the two scores that shapes how the week ends. */
export interface EndingContext {
  refusals: number;
  /** 1–5: how the hire turned out a year later. */
  hireFit: number;
  aiUses: number;
  weekendChoice: string | null;
  difficulty: Difficulty;
  rentPaid?: boolean;
  /** Did you hire the manager's nephew? */
  hiredNephew?: boolean;
}

/** Below this the probation period ends with you. */
export const FIRED_BELOW = 35;

const DEFAULT_CTX: EndingContext = { refusals: 0, hireFit: 3, aiUses: 0, weekendChoice: null, difficulty: 'normal' };

export function getEnding(performans: number, vicdan: number, ctx: EndingContext = DEFAULT_CTX): EndingVariant {
  const rentLine = ctx.rentPaid === false ? ' Bu arada kira hâlâ ödenmedi; ev sahibinin ihtarnamesi kapıda.' : '';
  if (ctx.hiredNephew && performans >= 60) {
    return {
      title: 'Dayının gözdesi.',
      body: `Okan'ı işe aldın. Hakan Bey seni terfi listesine yazdı. Ekip ise artık yanında konuşmuyor.${rentLine}`,
    };
  }
  // Resigning is the rare ending: a very clear conscience *and* having said no out loud.
  if ((vicdan >= 85 && ctx.refusals >= 3) || (ctx.weekendChoice === 'quit' && vicdan >= 68)) {
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

  if (performans < FIRED_BELOW) {
    return {
      title: 'İşten çıkarıldın.',
      left: true,
      body:
        vicdan >= 55
          ? 'Deneme süren "uyum sorunu" gerekçesiyle, tazminatsız bitirildi. Ama birkaç kişi senin yüzünden ikinci bir şans buldu. Sistem seni istemedi — belki de bu iyiye işaretti.'
          : 'Deneme süren "performans yetersizliği" gerekçesiyle, tazminatsız bitirildi. Ne sisteme yaranabildin ne de adaylara sahip çıkabildin. Masandaki dosyaları bir başkası devraldı.',
    };
  }

  // Before the promotion: a high score bought with a low conscience is the system's ending.
  if (performans >= 75 && vicdan < 35) {
    return {
      title: 'Sen artık sistemin mükemmel bir parçasısın.',
      body: 'Kuralları hiç sorgulamadan uyguladın. İK Müdürü senden çok memnun. Ama geride bıraktığın dosyalar da bir yerlerde.',
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

  return {
    title: 'Sistemde kaldın.',
    body: 'Tam olarak uyum sağlamadın. Bazı geceler uyuyamadın. Ama devam ettin, çünkü kira ödenmesi gerekiyordu.',
  };
}
