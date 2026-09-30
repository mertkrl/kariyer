import { candidateOf } from './data/candidates';

/*
 * Reference checks over the landline: you dial a candidate's former employer to test a claim
 * on the CV. It costs time — and it's the only way to learn that Derya's gap really was her
 * mother, that Kerem was cut for his salary rather than his work, or that one of Volkan's
 * glowing references has never heard of him.
 */

export type ReferenceVerdict = 'ok' | 'mixed' | 'warn';

export interface ReferenceCheck {
  who: string;
  lines: string[];
  verdict: ReferenceVerdict;
  /** Shown on the candidate's card afterwards. */
  summary: string;
}

/** Game minutes a reference call takes. */
export const REFERENCE_MINUTES = 8;

const SPECIAL: Record<string, ReferenceCheck> = {
  derya: {
    who: 'Delta Lojistik · eski direktörü',
    lines: ['Derya mı? Keşke hiç bırakmasaydı.', 'Babasının şirketi batınca ayrıldı; iki yıl borçları kapatmak için aile işinde çalıştı. Bir süre "dönsün" diye pozisyonu boş tuttuk.', 'Boşluğu soran olursa söyleyin: o iki yıl onun en zor projesiydi.'],
    verdict: 'ok',
    summary: 'Boşluk aile şirketinin borçlarını kapatmak için — eski direktörü doğruladı, "keşke bırakmasaydı" dedi.',
  },
  kerem: {
    who: 'MegaYazılım A.Ş. · eski CTO',
    lines: ['Kerem\'i küçülmede biz çıkardık. Performansı yüzünden değil, maaşı yüzünden.', 'En iyi teknik direktörümdü. Gençler hâlâ ona danışıyor.', 'Yaşını soruyorsanız… soruyorsunuz, değil mi?'],
    verdict: 'ok',
    summary: 'Maaşı yüzünden çıkarılmış, performansı değil. Eski CTO: "En iyi teknik direktörümdü."',
  },
  seda: {
    who: 'Finteks Yazılım · eski direktörü',
    lines: ['Seda altı yılda tek bir teslim tarihi kaçırmadı.', 'Okul tatillerinde evden çalıştı, işler aksamadı. Esnek saat istedi, verdik; en verimli dönemimiz oydu.'],
    verdict: 'ok',
    summary: 'Altı yılda tek teslim tarihi kaçırmamış; esnek çalışmada daha verimliymiş.',
  },
  tolga: {
    who: 'BilgiNet Analitik · ekip lideri',
    lines: ['Tolga yarı zamanlıydı ama kullandığımız açık kaynak kütüphanenin yarısını o yazdı.', 'Tam zamanlı kadro veremedik, maaşlı deneyim diye görünmüyor. Ama bizim için kıdemliydi.'],
    verdict: 'ok',
    summary: 'Yarı zamanlı ama kütüphanenin yarısını yazmış. "Maaşlı deneyim" görünmüyor, işi kıdemli.',
  },
  emre: {
    who: 'Globalsoft · eski genel müdürü',
    lines: ['Emre mi… İşinin ehli, açık ara en iyisi. Sistemimizi o ayakta tuttu.', 'Ama bunu da bilin: ekipte iki kişi onun yüzünden istifa etti. Kimseyi dinlemez, kimseyi beğenmez.', 'İşe alırsanız bir süper yıldız alırsınız. Ekip mi ister, yıldız mı? Siz bilirsiniz.'],
    verdict: 'mixed',
    summary: 'Teknik olarak en iyisi — ama iki kişi onun yüzünden istifa etmiş.',
  },
  volkan: {
    who: 'Atlas Yazılım · insan kaynakları',
    lines: ['Volkan Tekin mi? Bir saniye, kayıtlara bakıyorum…', 'Hayır, bizde bu isimde biri hiç çalışmamış. CV\'de bizim adımız mı geçiyor? İlginç.', 'Referans mektubundaki imza da bizim müdürümüze ait değil.'],
    verdict: 'warn',
    summary: 'Referans tutarsız: CV\'deki şirketlerden biri onu tanımıyor, mektuptaki imza sahte.',
  },
  ferhat: {
    who: 'Yapıtaş İnşaat · kapanan şirketin genel müdürü',
    lines: ['Şirket battı, maaşları bile tam ödeyemedik.', 'Ferhat son gün bile ofisteydi; sunucudaki bordro kayıtlarını kurtarıp herkese tek tek teslim etti. Kimseyi yarı yolda bırakmadı.'],
    verdict: 'ok',
    summary: 'Şirket iflas etmiş; Ferhat son güne kadar kalıp herkesin kayıtlarını kurtarmış.',
  },
};

const NONE = /^(Yok|Belirtilmemiş)/;

/** The reference you'd get on the phone, or null when there is nobody to call. */
export function referenceFor(id: string): ReferenceCheck | null {
  if (SPECIAL[id]) return SPECIAL[id];
  const c = candidateOf(id);
  if (!c || NONE.test(c.references) || NONE.test(c.previousCompany)) return null;
  const company = c.previousCompany.split('—')[0].trim();
  const title = (c.previousCompany.split('—')[1] ?? '').replace(/\(.*\)/, '').replace('.', '').trim();
  const first = c.name.split(' ')[0];
  return {
    who: `${company} · insan kaynakları`,
    lines: [`Evet, ${first} bizde${title ? ` ${title} olarak` : ''} çalıştı. Tarihler doğru.`, 'Şirket politikası gereği performans hakkında yorum yapamıyoruz. İyi günler.'],
    verdict: 'ok',
    summary: 'Çalışma tarihleri ve unvanı doğrulandı.',
  };
}
