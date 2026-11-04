import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discoveryFiles, gameLd, gamePages, siteLd } from '../gamePages';
import { GAMES } from '../src/arcade/games';

const SITE = 'https://ornek.example/mesai';

test('robots.txt her derlemede; site haritası yalnızca adres bilinince ve mutlak', () => {
  assert.deepEqual(Object.keys(discoveryFiles()), ['robots.txt']);
  assert.doesNotMatch(discoveryFiles()['robots.txt'], /Sitemap/);
  const f = discoveryFiles(SITE);
  assert.match(f['robots.txt'], new RegExp(`Sitemap: ${SITE}/sitemap.xml`));
  const locs = [...f['sitemap.xml'].matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.equal(locs.length, GAMES.length + 1);
  for (const l of locs) assert.ok(l.startsWith(`${SITE}/`) && !l.includes('#'), l);
});

test('her oyun sayfası kendi VideoGame verisini taşır; veri bloğu sayfayı kapatamaz', () => {
  const pages = gamePages(SITE);
  for (const g of GAMES) {
    const html = Object.entries(pages).find(([k]) => k.includes(`/${g.route === 'iseAlim' ? 'ise-alim' : g.route}/`))![1];
    const block = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)![1];
    const data = JSON.parse(block);
    assert.equal(data['@type'], 'VideoGame');
    assert.equal(data.name, g.title);
    assert.equal(data.isAccessibleForFree, true);
  }
  const ld = JSON.stringify(gameLd({ ...GAMES[0], title: '</script><b>' }));
  assert.match(ld, /<\/script>/); // ham veride var, sayfaya yazılırken kaçışlı olmalı
  assert.doesNotMatch(gamePages(SITE)['oyun/cuzdan/index.html'].split('ld+json">')[1].split('</script>')[0], /</);
});

test('ana sayfanın verisi bütün oyunları içerir', () => {
  const d = siteLd(SITE);
  assert.equal(d['@type'], 'WebSite');
  assert.equal(d.hasPart.length, GAMES.length);
});
