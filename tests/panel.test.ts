/*
 * Cuma kurulu, maaş tabanı, Hakan Bey'in gizli ilişki puanı ve ilk günün karşılaması.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ownerOf, panelRows, panelVerdict, hakanScore } from '../src/game/events/panel';
import { MIN_WAGE, salaryOffer, salaryMoves } from '../src/game/events/interview';
import { managerTone, RAPPORT_START } from '../src/game/day/manager';
import { AMBIENT } from '../src/game/data/phoneScript';
import type { Finalist } from '../src/game/store/storeTypes';

test('kurul: herkes kendi adayıyla görüşür', () => {
  assert.equal(ownerOf({ id: 'nehir', day: 0, by: 'ayse' }, []), 'ayse');
  assert.equal(ownerOf({ id: 'okan', day: 1, byManager: true }, []), 'hakan');
  assert.equal(ownerOf({ id: 'baris', day: 3 }, [{ candidateId: 'baris', want: 'approve' }]), 'hakan');
  assert.equal(ownerOf({ id: 'kerem', day: 1 }, []), 'you');
});

test('kurul: toplamı en yüksek ve bütçeye sığan işe alınır; Hakan Bey\'in önyargısı tabloda görünür', () => {
  const pool: Finalist[] = [
    { id: 'nehir', day: 0, by: 'ayse' },
    { id: 'sarp', day: 0, by: 'emre' },
    { id: 'okan', day: 1, byManager: true },
  ];
  const rows = panelRows(pool, [], {}, {});
  const okan = rows.find((r) => r.id === 'okan')!;
  assert.equal(okan.interviewer, 5, 'Hakan Bey kendi adamına tam puan verir');
  assert.equal(okan.tech, 1, 'Ümit Okan\'ı teknikte geçirmez');
  assert.equal(hakanScore('nehir', 'ayse'), 2, 'kadın adaya "uyum" puanı düşük');
  assert.equal(panelVerdict(rows), 'nehir');
  // Hakan Bey'in oyu kendi adayında bir kez sayılır: Okan = (Hakan 5 + Ümit 1) / 2
  assert.equal(okan.total, 3);
  // Defne'nin güçlü bulduğu biri (önyargı listesinde değil) Hakan Bey'in adayını geçebilir
  const vs = panelRows([{ id: 'tolga', day: 4 }, { id: 'baris', day: 4, byManager: true }], [], { tolga: 5 }, {});
  assert.equal(panelVerdict(vs), 'tolga');
  // yapılandırılmış mülakatta uyum sütunu yok
  assert.equal(panelRows(pool, [], {}, {}, true)[0].hakan, null);
  // senin puanın da sayılır
  const mine = panelRows([{ id: 'kerem', day: 1 }], [], { kerem: 5 }, {})[0];
  assert.equal(mine.interviewer, 5);
});

test('maaş: hiçbir teklif asgari ücretin altına inmez', () => {
  for (const id of ['ahmet', 'deniz', 'tolga', 'ilgin', 'melis']) {
    const offer = salaryOffer(id, 'squeeze');
    if (offer !== null) assert.ok(offer >= MIN_WAGE, `${id}: ${offer}`);
    if (salaryMoves(id).includes('squeeze')) assert.ok(salaryOffer(id, 'squeeze')! >= MIN_WAGE);
  }
});

test('Hakan Bey: ton karşı çıkma sayısından değil gizli ilişkiden gelir', () => {
  assert.equal(managerTone(RAPPORT_START), 1);
  assert.equal(managerTone(80), 0);
  assert.equal(managerTone(10), 3);
});

test('ilk gün: grupta önce teşekkür edilir', () => {
  const monday = AMBIENT[0].filter((a) => a.thread === 'office');
  const gate = monday.filter((a) => a.first);
  assert.equal(gate.length, 1);
  assert.ok(gate[0].replies?.every((r) => /teşekkür/i.test(r.text)));
  // karşılamadan önce cevap beklenen başka bir grup mesajı yok
  assert.ok(monday.filter((a) => a.replies && a.at < gate[0].at).length === 0);
});
