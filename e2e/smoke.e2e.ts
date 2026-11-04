import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE, ROUTES, browser, closeBrowser, watch } from './browser';

after(closeBrowser);

// Her adres, telefon ve masaüstü genişliğinde: açılır, hata vermez, taşmaz, başlığı ve adları vardır.
for (const [w, h] of [
  [375, 812],
  [1280, 800],
]) {
  for (const route of ROUTES) {
    test(`${route || 'salon'} · ${w}px açılır, hatasız, erişilebilirliğin temelleri yerinde`, async () => {
      const b = await browser();
      const page = await b.newPage({ viewport: { width: w, height: h } });
      const problems = watch(page);
      await page.goto(`${BASE}#/${route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      const facts = await page.evaluate(() => ({
        h1: document.querySelectorAll('h1').length,
        hscroll: document.documentElement.scrollWidth > window.innerWidth + 1,
        crashed: !!document.querySelector('[role=alert] h1')?.textContent?.match(/takıldı|yeni bir sürüm|yanıt vermiyor/i),
        // görünen her düğme ve bağlantının bir adı var
        nameless: [...document.querySelectorAll('button, a[href], [role=button]')]
          .filter((e) => (e as HTMLElement).offsetParent !== null)
          .filter((e) => !(e.getAttribute('aria-label') || e.getAttribute('title') || e.textContent?.trim() || e.querySelector('img[alt]:not([alt=""]), svg[aria-label]')))
          .map((e) => e.outerHTML.slice(0, 80)),
        noAlt: [...document.querySelectorAll('img:not([alt])')].map((e) => e.outerHTML.slice(0, 80)),
        dupIds: (() => {
          const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
          return [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
        })(),
      }));
      await page.close();
      assert.deepEqual(problems, []);
      assert.equal(facts.crashed, false, 'hata ekranı açıldı');
      assert.ok(facts.h1 >= 1, 'h1 yok');
      assert.equal(facts.hscroll, false, 'yatay kaydırma');
      assert.deepEqual(facts.nameless, [], 'adı olmayan düğme');
      assert.deepEqual(facts.noAlt, [], 'alt metni olmayan görsel');
      assert.deepEqual(facts.dupIds, [], 'tekrar eden kimlik');
    });
  }
}
