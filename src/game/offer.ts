import type { ReformKind } from './desk';

/*
 * Friday, 18:40. The hire is done and the floor is empty; Hakan Bey stops at your door with his
 * coat on his arm. The trial is over and the post is for one: you or Ayşe, from Monday.
 *
 * This is where the week ends — by something Defne says, not by a score crossing a line. The
 * scores decide what's on the table (no offer at all for a week that sank; whether he can take
 * a condition) and how he says it; the choice is yours. Pure: the screen plays it, the ending
 * reads the result.
 */

export type OfferChoice = 'accept' | 'condition' | 'ayse' | 'quit';

/** Below this Performans the trial ends with you (no offer; also the "fired" ending). */
export const FIRED_BELOW = 35;

/**
 * stay — took the post as offered · stayReform — took it, and the condition stood ·
 * stayAfterRefusal — the condition was refused and you signed anyway · reformRefused — the
 * condition was refused and you walked · gaveToAyse — told him to give it to her · quit ·
 * notOffered — the week ended with no offer.
 */
export type OfferOutcome = 'stay' | 'stayReform' | 'stayAfterRefusal' | 'reformRefused' | 'gaveToAyse' | 'quit' | 'notOffered';

export interface OfferResult {
  outcome: OfferOutcome;
  /** What the condition was, when you set one. */
  reform?: ReformKind;
  /** How saying it weighed on (or lifted) the conscience. */
  vicdan: number;
}

export interface OfferContext {
  performans: number;
  refusals: number;
  complies: number;
  /** Thursday's pitch, if you made one. */
  reform: { kind: ReformKind; accepted: boolean } | null;
  hiredNephew: boolean;
}

export interface OfferOption {
  id: OfferChoice | 'sign' | 'refuse' | 'walk' | 'nod';
  label: string;
}

export interface OfferBeat {
  /** Hakan Bey's lines (and the stage directions between them). */
  lines: string[];
  options: OfferOption[];
}

const REFORM_LABEL: Record<ReformKind, string> = {
  structured: 'yapılandırılmış mülakat kalıcı olsun: her adaya aynı sorular, aynı puan kartı',
  blind: 'kör CV bir sonraki ilanda gerçekten uygulansın: isim, yaş, fotoğraf gizli',
  audit: 'sistemin puan tablosunu Ümit Bey\'le birlikte açıp bakalım',
};

/** Below this the trial simply isn't renewed (also the "fired" line). */
export const offerWithheld = (c: OfferContext) => c.performans < FIRED_BELOW || (c.refusals >= 5 && c.performans < 55);

/** What you would ask for: Thursday's pitch again, or — if you never made one — opening the table. */
export const conditionOf = (c: OfferContext): ReformKind => c.reform?.kind ?? 'audit';

/**
 * Whether he can say yes to the condition. What he already agreed to on Thursday he keeps; a
 * refused pitch gets a second hearing only from someone whose numbers carry it; the table
 * itself he never opens ("O tabloyu açarsak altında ilk ben kalırım").
 */
export function conditionHolds(c: OfferContext): boolean {
  const kind = conditionOf(c);
  if (kind === 'audit') return false;
  if (c.reform?.accepted) return true;
  return c.performans >= 65 && c.refusals <= 3;
}

export function offerOpening(c: OfferContext): OfferBeat {
  const door = 'Kat boşaldı. Ekranındaki son pencereyi kapatıyorsun. Kapıda Hakan Bey, ceketi kolunda.';
  if (offerWithheld(c)) {
    const pushed = c.performans >= FIRED_BELOW;
    return {
      lines: [
        door,
        '"Deneme süren bugün doluyor. Uzatmayacağım, sana bunu yüzüne söylemek istedim."',
        pushed
          ? '"Bu hafta bana beş kez hayır dedin. Bazılarında haklıydın, biliyorum. Ama bu masa her gün hayır diyen birini taşımıyor. Raporda \'uyum\' yazacak."'
          : '"Rakamlar ortada. Holding listeyi bu akşam istiyor, ben de ortadayım. Kadroyu Ayşe\'ye veriyorum."',
      ],
      options: [
        { id: 'nod', label: 'Anlıyorum.' },
        { id: 'walk', label: 'Kararlarımın arkasındayım Hakan Bey.' },
      ],
    };
  }
  const tone =
    c.complies >= 3
      ? '"Bu hafta bana güvendin. Ben de sana güveniyorum."'
      : c.refusals >= 3
        ? '"Bu hafta bana birkaç kez hayır dedin. Açık konuşayım: bazılarında haklıydın. Ama bu masada her gün hayır diyemezsin."'
        : '"Rakamların fena değil. Ayşe\'ninkiler de fena değil. Bunu biliyorsun."';
  return {
    lines: [
      door,
      '"Deneme süren bitti. Kadro tek kişilik, biliyorsun. Pazartesi ya sen ya Ayşe."',
      tone,
      ...(c.hiredNephew ? ['"Okan\'ın konusunu açmayalım. Gereğini yaptın, unutmam."'] : []),
      '"Kadroyu sana teklif ediyorum. Düşünme lüksün yok; holding ismi bu akşam istiyor."',
    ],
    options: [
      { id: 'accept', label: 'Kabul ediyorum.' },
      { id: 'condition', label: `Kabul ediyorum, bir şartla: ${REFORM_LABEL[conditionOf(c)]}.` },
      { id: 'ayse', label: 'Kadro Ayşe\'nin olsun.' },
      { id: 'quit', label: 'Ben ayrılıyorum Hakan Bey.' },
    ],
  };
}

/** His answer, and either the result or — when he turns the condition down — one more question. */
export function offerReply(c: OfferContext, choice: OfferOption['id']): { lines: string[]; result?: OfferResult; next?: OfferBeat } {
  const kind = conditionOf(c);
  switch (choice) {
    case 'nod':
      return { lines: ['"Sağ ol. Kolay değil, biliyorum." Kapıyı kapatmadan bir an duruyor, sonra gidiyor.'], result: { outcome: 'notOffered', vicdan: 0 } };
    case 'walk':
      return { lines: ['"Biliyorum. Belki de sorun bu." Asansörün sesi. Sonra kat sessiz.'], result: { outcome: 'notOffered', vicdan: 1 } };
    case 'accept':
      return { lines: ['"Güzel. Pazartesi sekizde. Masanda yeni bir yığın olacak; Ayşe\'ye ben söylerim."'], result: { outcome: 'stay', vicdan: 0 } };
    case 'ayse':
      return {
        lines: ['Hakan Bey bir süre yüzüne bakıyor. "Bu masada bunu ilk kez duyuyorum."', '"Peki. Ayşe kalır." Ceketini giyiyor. "Sana iyi bir referans yazarım. Ciddiyim."'],
        result: { outcome: 'gaveToAyse', vicdan: 4 },
      };
    case 'quit':
      return {
        lines: ['"İstifanı Pazartesi yazılı ver." Kapıdan çıkarken duruyor.', '"Bir şey söyleyeyim mi? Ben de bir zamanlar bu cümleyi kurmak istemiştim. Kurmadım."'],
        result: { outcome: 'quit', vicdan: 2 },
      };
    case 'condition':
      if (conditionHolds(c)) {
        return {
          lines: [
            kind === 'structured'
              ? '"Perşembe söz verdim, sözümün arkasındayım. Formu sen hazırla; Ümit\'e de ben söylerim."'
              : '"Holding \'kapsayıcılık\' diye sever bunu. Bir sonraki ilanda yapıyoruz. Sunumu ben yaparım ama, bilesin."',
          ],
          result: { outcome: 'stayReform', reform: kind, vicdan: 3 },
        };
      }
      return {
        lines: [
          kind === 'audit' ? '"O tabloyu açarsak altında ilk ben kalırım. Bunu Perşembe de söyledim."' : '"Şartla kadro olmaz. Bu şirkette işler öyle yürümüyor."',
          '"Şartsız kabul ediyor musun? Etmiyorsan kadro Ayşe\'nin."',
        ],
        next: {
          lines: [],
          options: [
            { id: 'sign', label: 'Şartsız kabul ediyorum.' },
            { id: 'refuse', label: 'Etmiyorum.' },
          ],
        },
      };
    case 'refuse':
      return {
        lines: ['"Peki." Uzun bir sessizlik. "Ayşe\'ye Pazartesi ben söylerim." Asansörün sesi.'],
        result: { outcome: 'reformRefused', reform: kind, vicdan: 3 },
      };
    case 'sign':
      return { lines: ['"Tamam. Pazartesi sekizde." Kapı kapanıyor. Şartını bir kâğıda yazıp çekmeceye koyuyorsun.'], result: { outcome: 'stayAfterRefusal', reform: kind, vicdan: -2 } };
  }
}

/** You're no longer at the company after this outcome. */
export const leavesCompany = (o: OfferOutcome) => o === 'reformRefused' || o === 'gaveToAyse' || o === 'quit' || o === 'notOffered';
