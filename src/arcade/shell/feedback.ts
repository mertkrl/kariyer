/*
 * Hata bildirimi: oyuncu hata ekranındaki bağlantıyla GitHub'da "Hata bildir" formunu
 * (.github/ISSUE_TEMPLATE/hata.yml) rapor alanı doldurulmuş olarak açar. Hiçbir şey kendiliğinden
 * gönderilmez; oyuncu formu görür, isterse gönderir. Rapor kişisel bilgi içermez (oyun adı, sürüm,
 * adres parçası, tarayıcı, hata yığını). Adres uzunluğu sınırına takılmasın diye rapor kısaltılır.
 */
export const ISSUES_URL = 'https://github.com/mertkrl/kariyer/issues/new';

/** Formun adresine sığacak en uzun rapor (karakter). */
const MAX_REPORT = 4000;

export function issueUrl(report: string): string {
  const body = report.length > MAX_REPORT ? `${report.slice(0, MAX_REPORT)}\n… (kısaltıldı)` : report;
  return `${ISSUES_URL}?template=hata.yml&rapor=${encodeURIComponent(body)}`;
}
