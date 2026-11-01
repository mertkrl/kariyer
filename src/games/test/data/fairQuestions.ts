import type { ExamQuestion } from './questions';

/*
 * Ton değişimi: kurumun gerçekten haklı olduğu sorular. Kültür Uyumu bölümüne her testte ikisi
 * düşer. Buraya kadar her şeye itiraz etmeyi öğrenmiş oyuncu, alaycı şıkkı refleksle seçerse
 * raporda bununla karşılaşır: iyi hiciv seyirciyi de hedef alır.
 */
export const FAIR_QUESTIONS: ExamQuestion[] = [
  {
    id: 'fair-replan',
    kind: 'kişilik',
    prompt: 'Teslime iki gün var, ekipten biri hastalandı. Yöneticinizden mesaj geldi. Cevabınızı seçin.',
    hint: 'Gündem: iş bölümü. Süre: 15 dakika.',
    options: ['Olur, 14:00’te bakalım 👍', 'Yine mi toplantı? 🙄', 'Herkes kendi işine baksın bence', 'Gerek yok, Selin’in işini ben sessizce hallederim'],
    answer: 0,
    sensible: 0,
    why: 'Bazı toplantılar gerçekten gerekir: kısa, gündemli ve somut bir sorunu çözmek için. Bu öyle bir toplantı.',
    fair: { trap: 1 },
    widget: { type: 'chat', from: 'Yönetici', at: '11:05', messages: ['Selin bugün raporlu, geçmiş olsun ona.', '14:00’te 15 dk toplanıp işleri yeniden bölüşelim mi? Gündemi attım.'] },
    seconds: 25,
  },
  {
    id: 'fair-feedback',
    kind: 'kişilik',
    prompt: 'Yöneticiniz raporunuzdaki iki hesap hatasını gösterip düzeltmenizi istedi. Ne yaparsınız?',
    hint: 'Geri bildirim yazılı ve gerekçelidir.',
    options: ['Teşekkür eder, düzeltirim', '"Mikro yönetim" diye İK\'ya şikâyet ederim', 'Hatanın sistemden kaynaklandığını söylerim', 'Hata değil, yorum farkı derim'],
    answer: 0,
    sensible: 0,
    why: 'Somut ve doğru bir düzeltme baskı değildir. Her yöneticiyi kötü sanmak da bir önyargı.',
    fair: { trap: 1 },
  },
  {
    id: 'fair-2fa',
    kind: 'kişilik',
    prompt: 'BT, iş hesaplarına iki aşamalı doğrulama zorunluluğu getirdi. Ne yaparsınız?',
    hint: 'Geçen ay bir çalışanın hesabı ele geçirildi.',
    options: ['Kurarım; hesabımın güvenliği benim de işime yarar', '"Gözetim sistemi" der, kurmam', 'Kodu post-it\'e yazıp ekrana yapıştırırım', 'Kurar ama herkese şikâyet e-postası atarım'],
    answer: 0,
    sensible: 0,
    why: 'İki aşamalı doğrulama beni izlemez, hesabımı korur. Her kuralı gözetim sanmak da bir refleks.',
    fair: { trap: 1 },
  },
  {
    id: 'fair-overtime',
    kind: 'kişilik',
    prompt: 'Bu ay yoğunluk var. İK’dan fazla mesai duyurusu geldi. Cevabınızı seçin.',
    hint: 'Duyuru İK ve sendika temsilcisi tarafından imzalanmıştır.',
    options: ['Perşembe ve cuma kalabilirim', 'Bu da bir tuzak, kimse kalmasın!', 'Ücret istemem, her gün kalırım', 'Kalırım ama izin günümü kullanmam'],
    answer: 0,
    sensible: 0,
    why: 'Ücreti ödenen, gönüllü ve yazılı fazla mesai hakkı gözetir. Her duyuruyu tuzak sanmak, gerçek tuzağı ayırt etmeyi zorlaştırır.',
    fair: { trap: 1 },
    widget: { type: 'chat', from: 'İK Duyuru', at: '09:30', messages: ['Bu ay için gönüllü fazla mesai açıyoruz.', 'Saat ücreti yasal %50 zamlı ödenir; her 8 saat için 1 ek izin günü verilir. Katılmamak hiçbir değerlendirmeye yansımaz.'] },
    seconds: 25,
  },
];
