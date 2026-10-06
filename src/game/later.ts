/*
 * Gecikmeli oyun olayları: müdürün cevap vermeden önce "yazıyor" olması, kuyruğu kapattıktan
 * sonra düşen birkaç dosya daha, son dosyadan bir an sonra biten gün. Onları planlayan haftaya
 * aittirler; bu yüzden bir haftayı başlatmak, sürdürmek ya da yeniden başlatmak, öncekinin
 * bekleyen işlerini yeni haftada patlamasına izin vermeden iptal eder.
 */
const pending = new Set<ReturnType<typeof setTimeout>>();

export function later(act: () => void, ms: number) {
  const id = setTimeout(() => {
    pending.delete(id);
    act();
  }, ms);
  pending.add(id);
}

export function cancelLater() {
  pending.forEach((id) => clearTimeout(id));
  pending.clear();
}
