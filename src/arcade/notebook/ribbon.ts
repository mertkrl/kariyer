/*
 * Patron tablosunun şeridi: her menünün araç grupları. Bir düğme ya gerçekten bir şey yapar (`act`:
 * kalın, dolgu, grafik, yazım denetimi…; BossSheet karşılar) ya da kurumsal bir şakayla cevap verir
 * (`say`: köşede bildirim). Hiçbir düğme ölü değildir.
 */

export type Act = 'bold' | 'italic' | 'underline' | 'fill' | 'color' | 'left' | 'center' | 'right' | 'greenwash' | 'chart' | 'corporate' | 'share' | 'close';
export type Tool = { label: string; act?: Act; say?: string; hint?: string };
export type Group = { name: string; tools: Tool[] };

export const MENU = ['Dosya', 'Giriş', 'Ekle', 'Çizim', 'Sayfa Düzeni', 'Formüller', 'Veri', 'Gözden Geçir', 'Görünüm', 'Yardım'];

export const RIBBONS: Group[][] = [
  // Dosya
  [
    {
      name: 'Dosya',
      tools: [
        { label: '💾 Kaydet', say: 'Kaydedildi. Zaten otomatik kaydediliyordu ama içiniz rahat etsin.' },
        { label: '⇪ Paylaş', act: 'share' },
        { label: '🖨 Yazdır', say: 'Yazıcı kuyruğunda 47 belge var. Sizinki 48. sırada. Toner bitti.' },
        { label: '✖ Kapat', act: 'close', hint: 'Deftere dön (Esc)' },
      ],
    },
  ],
  // Giriş
  [
    {
      name: 'Pano',
      tools: [
        { label: '📋 Yapıştır', say: 'Panoda yalnızca "tamam abi" yazıyor.' },
        { label: '✂', say: 'Kesildi: bütçeden %15.', hint: 'Kes' },
        { label: '⧉', say: 'Kopyalandı. Ahmet Bey de CC\'de.', hint: 'Kopyala' },
      ],
    },
    {
      name: 'Yazı Tipi',
      tools: [
        { label: 'Calibri ▾', say: 'Yazı tipi seçenekleri: Calibri, Calibri ve Calibri.' },
        { label: 'K', act: 'bold', hint: 'Kalın' },
        { label: 'T', act: 'italic', hint: 'İtalik' },
        { label: 'A̲', act: 'underline', hint: 'Altı çizili' },
        { label: '▦ Dolgu', act: 'fill', hint: 'Dolgu rengi' },
        { label: 'A Renk', act: 'color', hint: 'Yazı rengi' },
      ],
    },
    {
      name: 'Hizalama',
      tools: [
        { label: '⇤', act: 'left', hint: 'Sola hizala' },
        { label: '≡', act: 'center', hint: 'Ortala' },
        { label: '⇥', act: 'right', hint: 'Sağa hizala' },
        { label: '⊞ Birleştir', say: 'Birleşme onaylandı. 2 departman, 1 müdür, 0 ek bütçe.' },
      ],
    },
    {
      name: 'Stiller',
      tools: [
        { label: 'Koşullu Biçimlendirme', act: 'greenwash' },
        { label: 'Hücre Stilleri', say: 'Kurumsal stil kılavuzu yükleniyor (182 sayfa).' },
      ],
    },
    {
      name: 'Düzenleme',
      tools: [
        { label: 'Σ Otomatik Toplam', say: 'Toplam: Yetersiz.' },
        { label: 'Sırala', say: 'Sıralandı: önce Ahmet Bey\'in sevdikleri.' },
        { label: '🔍 Bul', say: 'Aradığınız şey (motivasyon) bulunamadı.' },
      ],
    },
  ],
  // Ekle
  [
    { name: 'Grafikler', tools: [{ label: '📈 Grafik', act: 'chart' }, { label: '🥧 Pasta', say: 'Pasta grafiği hazır. Pastayı yönetim yedi.' }] },
    {
      name: 'Tablolar',
      tools: [
        { label: 'Pivot Tablo', say: 'Pivot tabloyu kimse anlamaz. Herkes anlamış gibi yapar.' },
        { label: '🖼 Resim', say: 'Resim eklendi: ofis kedisi. Görünmüyor, çünkü ofisin kedisi yok.' },
      ],
    },
  ],
  // Çizim
  [{ name: 'Kalemler', tools: [{ label: '✏ Kalem', say: 'Burada çizmek yasak. Çizim için defterinize dönün (Esc).' }] }],
  // Sayfa Düzeni
  [
    {
      name: 'Sayfa',
      tools: [
        { label: 'Kenar Boşlukları', say: 'Kenar boşlukları: iş-yaşam dengeniz kadar dar.' },
        { label: 'Yönlendirme', say: 'Yönlendirme: kariyer koçunuza danışın.' },
      ],
    },
  ],
  // Formüller
  [
    {
      name: 'İşlevler',
      tools: [
        { label: 'fx İşlev Ekle', say: 'İpucu: =MAAŞ() yazmayı deneyin. Cesaretiniz varsa =OYNA() da var.' },
        { label: 'Σ Hesapla', say: 'Hesaplandı. Sonuç: kimse memnun değil.' },
      ],
    },
  ],
  // Veri
  [
    {
      name: 'Veri',
      tools: [
        { label: '⟳ Tümünü Yenile', say: 'Veriler yenilendi. Rakamlar aynı, umutlar azaldı.' },
        { label: 'Veri Doğrulama', say: 'Doğrulama başarısız: rakamlar Ahmet Bey\'in hissiyatıyla uyuşmuyor.' },
      ],
    },
  ],
  // Gözden Geçir
  [
    {
      name: 'Yazım',
      tools: [
        { label: 'abc Yazım Denetimi', act: 'corporate' },
        { label: '💬 Yeni Açıklama', say: 'Açıklamanız 6 kişiye bildirildi. 4\'ü "👍" bıraktı, kimse okumadı.' },
        { label: '🔒 Sayfayı Koru', say: 'Sayfa korundu. Sizi kim koruyacak?' },
      ],
    },
  ],
  // Görünüm
  [
    {
      name: 'Görünüm',
      tools: [
        { label: 'Bölmeleri Dondur', say: 'Bölmeler donduruldu. Maaşlar da.' },
        { label: '🔍 Yakınlaştır', say: 'Yakınlaştırıldı. Sorunlar daha net görünüyor, geri alalım.' },
      ],
    },
  ],
  // Yardım
  [
    {
      name: 'Yardım',
      tools: [
        { label: '❓ Yardım', say: 'BT Destek: "Kapatıp açmayı denediniz mi?"' },
        { label: '✉ Geri Bildirim', say: 'Geri bildiriminiz alındı ve uygun bir klasöre (çöp) taşındı.' },
      ],
    },
  ],
];

/** Dolgu ve yazı rengi düğmeleri basıldıkça bu renkler arasında döner (sonuncusu: renksiz). */
export const FILLS = ['#fff2cc', '#e2efda', '#fce4d6', '#ddebf7', ''];
export const COLORS = ['#c00000', '#2f75b5', '#548235', ''];
