import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE, browser, closeBrowser, watch } from './browser';

after(closeBrowser);

test('oyunun dosyası inmezse oyuna özgü "yeni sürüm" ekranı ve salona dönüş', async () => {
  const b = await browser();
  const ctx = await b.newContext();
  await ctx.route(/BakkalGame-.*\.js$/, (r) => r.abort());
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.goto(`${BASE}#/bakkal`);
  await page.getByText('Mahalleye yeni bir sürüm geldi.').waitFor();
  assert.match(await page.locator('[role=alert]').innerText(), /Köy Bakkalı · YENİ SÜRÜM/);
  await page.getByRole('button', { name: 'Salona dön' }).click();
  await page.waitForURL(/#\/$/);
  await ctx.close();
});

test('bilinmeyen adres: salonda not, adres düzelir, yenileyince not çıkmaz', async () => {
  const b = await browser();
  const page = await b.newPage();
  await page.goto(`${BASE}#/eski-oyun`);
  await page.getByText('Bu sokakta öyle bir dükkân yok.').waitFor();
  assert.match(page.url(), /#\/$/);
  await page.reload();
  await page.waitForTimeout(800);
  assert.equal(await page.getByText('Bu sokakta öyle bir dükkân yok.').count(), 0);
  await page.close();
});

test('Köy Bakkalı: kepenk, tanıtımı onayla atla, levhayı çevir, ilk satış, sıradaki müşteri', async () => {
  const b = await browser();
  const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const problems = watch(page);
  await page.goto(`${BASE}#/bakkal`);
  await page.getByText('Kepengi aç').click();
  await page.getByLabel('Tanıtımı kapat').click();
  await page.getByText('Tanıtımı atlamak istiyor musun?').waitFor();
  await page.getByText('Evet, atla').click();
  await page.locator('[data-tour="sign"]').click();
  // müşteri ister; fiyat klavyeden yazılır
  await page.waitForTimeout(1500);
  await page.keyboard.type('40');
  await page.keyboard.press('Enter');
  const next = page.getByRole('button', { name: /Sıradaki müşteri|Kepengi indir/ });
  // ilk ziyaret eski hesap ya da pazarlık olabilir: sonuç adımına kadar ilerle
  for (let i = 0; i < 4 && !(await next.isVisible()); i++) {
    const option = page.locator('main button').first();
    if (await option.isVisible()) await option.click();
    await page.waitForTimeout(1200);
  }
  await next.click();
  await page.waitForTimeout(1500);
  assert.deepEqual(problems, []);
  await page.close();
});

test('telefonda Sen İK\'sin: oyun başlamaz, çıkışlar var', async () => {
  const b = await browser();
  const page = await b.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(`${BASE}#/ise-alim`);
  await page.getByText('Bu masa telefona sığmıyor').waitFor();
  assert.equal(await page.getByText('İşe başla').isVisible(), false);
  await page.getByRole('button', { name: 'Salona dön' }).click();
  await page.waitForURL(/#\/$/);
  await page.close();
});

test('eski biçimli defter (ilk sürüm) okunur: salonda sayaç ve kartta sonuç', async () => {
  const b = await browser();
  const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => localStorage.setItem('kariyerweb-defter', JSON.stringify({ played: { bakkal: { result: 'Mahallenin Bakkalı', at: 1 } } })));
  await page.goto(BASE);
  await page.getByText('durakta mesai bitti').waitFor();
  assert.match(await page.locator('[aria-label="Mahalle Postası"]').innerText(), /1\/9/);
  await page.close();
});

test('salonda mahalle karnesi: düğme kartı indirir (salonun adresiyle)', async () => {
  const b = await browser();
  const ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const problems = watch(page);
  await page.addInitScript(() => localStorage.setItem('kariyerweb-defter', JSON.stringify({ v: 2, played: { asfalt: { result: 'Usta Yamacı', at: 2, plays: 1 } } })));
  await page.goto(BASE);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'karneni paylaş' }).click()]);
  assert.equal(dl.suggestedFilename(), 'mesai-disi-mahalle-karnesi.png');
  assert.deepEqual(problems, []);
  await ctx.close();
});
