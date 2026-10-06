import type { DeskCall } from './desk';
import { candidateOf } from './data/candidates';

/*
 * Geri çevirdiğin insanlar geri gelir. Kerem'i, Derya'yı ya da Seda'yı reddettiğin günün ertesi
 * sabahı santral çalar: dış hatta seni soruyorlar. Onları bağlatabilir (ve sonra ne söyleyeceğine
 * karar verebilir), meşgul olduğunu iletebilir ya da santrale onları asla bağlamamasını
 * söyleyebilirsin. Bir önceki gece özel mesaja dürüst cevap vermek işi çözer: aramazlar.
 */

export const VISIT_PREFIX = 'visit:';
export const LOBBY_PREFIX = 'lobby:';

interface Visitor {
  id: string;
  /** Geldikleri günün sırası (redden sonraki gün). */
  day: number;
  /** Resepsiyonun aradığı mesai dakikası. */
  at: number;
  reception: string[];
  /** Bağlandıktan sonra söyledikleri. */
  lobby: string[];
  honest: { text: string; reply: string };
  template: { text: string; reply: string };
  /** Meşgul olduğunu ilettin. */
  busy: string;
  missed: string;
}

const VISITORS: Visitor[] = [
  {
    id: 'kerem',
    day: 2,
    at: 50,
    reception: ['Santral, Gülay. Dış hattan Kerem Aksoy diye bir beyefendi sizi soruyor.', '"Beş dakikanızı alacağım" diyor. Bağlayayım mı?'],
    lobby: [
      '"Merhaba. Kusura bakmayın, santrale rica ettim. Mail yazdım, cevap gelmedi.',
      'Tek bir şey soracağım: yaşım yüzünden mi? Söylemeseniz de anlarım."',
    ],
    honest: {
      text: 'Size her şeyi söyleyemem. Ama CV\'nizden doğum yılını çıkarın, deneyiminizi yönettiğiniz sistemler üzerinden yazın.',
      reply: 'Bir süre sessizlik. Kâğıt hışırtısı; not alıyor. "On sekiz yıldır ilk kez biri doğruyu söyledi. Teşekkür ederim."',
    },
    template: {
      text: 'Süreç şirket politikalarına göre yürütüldü; ek açıklama yapamıyorum.',
      reply: '"Anladım. Herkes aynı cümleyi kuruyor. İyi günler." Hat kapanıyor.',
    },
    busy: 'Tamam, not aldım. …Tekrar arayacağını söyledi ama.',
    missed: 'Santral aramış, açmadın. Dış hattan biri seni sormuş; bir süre beklemiş, sonra kapatmış.',
  },
  {
    id: 'derya',
    day: 2,
    at: 320,
    reception: ['Santral, Gülay. Derya Yıldız diye bir hanım sizi arıyor.', '"Başvurumdaki boşluğu açıklamak istiyorum" diyor. Bağlayayım mı?'],
    lobby: [
      '"Merhaba, ben Derya. Boşluğu açıklamak istedim: iki yıl babamın batan şirketinin borçlarını kapattım.',
      'Tasfiye belgelerini de gönderebilirim. Kimse sormuyor ama… belki siz bakarsınız."',
    ],
    honest: {
      text: 'Bu belgeleri alamam, dosyanıza girmemeli. Ama o iki yılı CV\'nizde saklamayın: açıkça yazın, neler yönettiğinizle birlikte.',
      reply: '"Saklamayayım yani." Sesi biraz gevşiyor. "Sorduğunuz için… dinlediğiniz için teşekkürler."',
    },
    template: {
      text: 'Değerlendirme tamamlandı, belge kabul edemiyoruz. İyi günler dilerim.',
      reply: '"Peki. İyi günler." Kısa bir sessizlik, sonra hat kapanıyor.',
    },
    busy: 'Peki, not aldım. Belgeleri e-postayla göndermek istedi; "gerek yok" dedim.',
    missed: 'Santral aramış, açmadın. Bir hanım seni sormuş; adını bıraktı: Derya Yıldız.',
  },
  {
    id: 'seda',
    day: 3,
    at: 150,
    reception: ['Santral, Gülay. Seda Uysal diye bir hanım sizi arıyor; arkadan bir çocuk sesi geliyor.', '"Bir dakika sürmez" diyor. Bağlayayım mı?'],
    lobby: [
      '"Merhaba, ben Seda. Kreş kar yüzünden kapalı, kızım yanımda, kusura bakmayın.',
      'Ret mailini okudum. Anlamak istiyorum: "Kişisel hayatınız iş temponuzu etkiler mi?" sorusuna dürüst cevap verdiğim için mi?"',
    ],
    honest: {
      text: 'O sorunun sorulmaması gerekirdi. Cevabınız sizin eksiğiniz değil. Esnek çalışmayı açıkça yazan şirketlere başvurun.',
      reply: 'Bir an sessizlik. "Bunu bir İK\'cıdan duymak…" Arkadan kızının sesi: "Anne, kiminle konuşuyorsun?"',
    },
    template: {
      text: 'Adayları birçok kritere göre değerlendiriyoruz. Size başarılar dilerim.',
      reply: '"Birçok kriter. Anladım." Hat kapanıyor.',
    },
    busy: 'Not aldım. Tekrar aramayacağını söyledi.',
    missed: 'Santral aramış, açmadın. Bir hanım seni sormuş; arkadan çocuk sesi geliyormuş.',
  },
];

const RECEPTION = { caller: 'Gülay Hanım', line: 'Santral · dahili 100' };

/** Bugün gelecek ziyaretçiler: bir gün önce reddedilen ve henüz dürüstçe cevaplanmamış olanlar. */
export function visitorsToday(dayIndex: number, keyDecisions: Record<string, string>, dmHandled: Record<string, string>) {
  // günde en fazla bir ziyaretçi: lobi bir sıra değil
  return VISITORS.filter((v) => v.day === dayIndex && keyDecisions[v.id] === 'reject' && dmHandled[v.id] !== 'honest').map((v) => ({
    id: VISIT_PREFIX + v.id,
    at: v.at,
  })).slice(0, 1);
}

export function visitCall(id: string, dayIndex: number): DeskCall | undefined {
  if (id.startsWith(VISIT_PREFIX)) {
    const v = VISITORS.find((x) => x.id === id.slice(VISIT_PREFIX.length));
    if (!v) return undefined;
    return {
      id,
      day: dayIndex,
      at: v.at,
      ...RECEPTION,
      lines: v.reception,
      choices: [
        { text: 'Bağlayın lütfen.', reply: 'Bağlıyorum, hatta kalın.', next: LOBBY_PREFIX + v.id },
        { text: 'Şu an müsait değilim, not alır mısınız?', reply: v.busy, vicdan: -1 },
        { text: 'Bu tür aramaları bana bağlamayın lütfen.', reply: '…Peki. Bir daha bağlamam.', performans: 1, vicdan: -4 },
      ],
      minutes: 2,
      missed: { note: v.missed, vicdan: -1 },
    };
  }
  if (id.startsWith(LOBBY_PREFIX)) {
    const v = VISITORS.find((x) => x.id === id.slice(LOBBY_PREFIX.length));
    if (!v) return undefined;
    return {
      id,
      day: dayIndex,
      at: v.at,
      caller: candidateOf(v.id).name,
      line: 'Dış hat · santralden bağlandı',
      lines: v.lobby,
      choices: [
        { ...v.honest, vicdan: 4, performans: -1, honestFor: v.id },
        { ...v.template, vicdan: -1 },
      ],
      minutes: 8,
      missed: { note: '' },
    };
  }
  return undefined;
}
