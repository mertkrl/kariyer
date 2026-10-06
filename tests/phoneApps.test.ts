/*
 * The phone apps' logic, apart from their screens: the traffic model behind "Trafik", the
 * map's pan/zoom limits, and how Kariyergram builds its feed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTES, arrival, congestionColor, smooth, trafficAt } from '../src/components/phone/apps/traffic/trafficModel';
import { clampView } from '../src/components/phone/apps/traffic/useMapView';
import { EXPLORE_EXTRA, buildFeed, handleOf, toggled } from '../src/components/phone/apps/social/socialFeed';
import { SOCIAL_DAYS } from '../src/components/phone/apps/socialContent';

test('trafik: akşam yoğunluğu araba süresini uzatır, sabah normaldir', () => {
  const morning = trafficAt(60, 0);
  const evening = trafficAt(540, 0);
  assert.equal(morning.rush, 0);
  assert.equal(evening.rush, 1);
  const car = ROUTES.find((r) => r.id === 'car15')!;
  assert.ok(evening.eta(car) > morning.eta(car));
  // the metrobus has its own lane: it barely notices the rush
  const bus = ROUTES.find((r) => r.mode === 'bus')!;
  assert.ok(evening.eta(bus) - morning.eta(bus) < evening.eta(car) - morning.eta(car));
});

test('trafik: kötü havada vapur iptal olur ve seçilemez', () => {
  const calm = trafficAt(300, 0);
  const storm = trafficAt(300, 0.3);
  assert.equal(calm.ferryCancelled, false);
  assert.ok(calm.available.some((r) => r.mode === 'ferry'));
  assert.equal(storm.ferryCancelled, true);
  assert.ok(!storm.available.some((r) => r.mode === 'ferry'));
  assert.ok(storm.incidents.some((i) => i.label.includes('vapur')));
  assert.ok(storm.available.includes(storm.best));
});

test('trafik: yoğunluk 0–1 arasında kalır, renkler hızlıdan yavaşa sıralanır', () => {
  for (const level of trafficAt(600, 1).levels) assert.ok(level >= 0 && level <= 1);
  assert.equal(congestionColor(0.2), '#2fb266');
  assert.equal(congestionColor(0.95), '#a4161a');
});

test('trafik: varış saati mesai dakikasından hesaplanır ve gece yarısını aşar', () => {
  assert.equal(arrival(0), '08:00');
  assert.equal(arrival(9 * 60 + 45), '17:45');
  assert.equal(arrival(16 * 60 + 30), '00:30');
});

test('trafik: yumuşatılmış yol geçerli bir SVG yoludur', () => {
  const d = smooth([[0, 0], [10, 10], [20, 0]]);
  assert.match(d, /^M0 0 C/);
  assert.match(smooth([[0, 0], [10, 0], [10, 10]], true), / Z$/);
});

test('harita: yakınlaştırma 1–3.2 arasında kalır, harita çerçeveden kaçmaz', () => {
  assert.equal(clampView({ x: 0, y: 0, k: 10 }).k, 3.2);
  assert.equal(clampView({ x: 0, y: 0, k: 0.2 }).k, 1);
  const v = clampView({ x: 500, y: -5000, k: 2 });
  assert.equal(v.x, 0);
  assert.equal(v.y, 300 * (1 - 2));
});

test('kariyergram: reddedilen adaylar akışa serpiştirilir, iş bulanlar en üstte', () => {
  const content = SOCIAL_DAYS[0];
  const rejected = [
    { name: 'Deniz Kaya', initials: 'DK', color: '#123456' },
    { name: 'Ömer Şahin', initials: 'ÖŞ', color: '#654321' },
  ];
  const echoes = [{ id: 'c1', name: 'Zeynep Ak', initials: 'ZA', color: '#abcdef', text: 'Yeni işime başladım!' }];
  const posts = buildFeed(content, rejected, echoes);
  assert.equal(posts.length, content.feed.length + rejected.length + echoes.length);
  assert.equal(posts[0].handle, 'zeynep.dev');
  assert.equal(posts[2].handle, 'deniz7');
  assert.ok(posts.filter((p) => p.candidate).length === 3);
  assert.equal(new Set(posts.map((p) => p.id)).size, posts.length, 'her gönderinin kimliği tekil');
});

test('kariyergram: kullanıcı adı Türkçe harfleri korur, gerisini atar', () => {
  assert.equal(handleOf('Şükrü Öztürk'), 'şükrü');
  assert.equal(handleOf("O'Brien Smith"), 'obrien');
});

test('kariyergram: keşfet gönderilerinin hepsi fotoğraflı', () => {
  assert.ok(EXPLORE_EXTRA.length > 0);
  assert.ok(EXPLORE_EXTRA.every((p) => p.photo));
});

test('kariyergram: toggled kümeyi değiştirmeden yeni küme döner', () => {
  const a = new Set([1]);
  const b = toggled(a, 2);
  assert.deepEqual([...a], [1]);
  assert.deepEqual([...b].sort(), [1, 2]);
  assert.deepEqual([...toggled(b, 1)], [2]);
  assert.deepEqual([...toggled(b, 1, true)].sort(), [1, 2]);
});
