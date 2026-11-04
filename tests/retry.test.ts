import { test } from 'node:test';
import assert from 'node:assert/strict';
import { retrying } from '../src/shared/retry';

// beklemeler gerçek zamanlayıcı yerine kaydedilir
const waits: number[] = [];
const wait = async (ms: number) => void waits.push(ms);

test('ilk deneme olursa beklenmez', async () => {
  waits.length = 0;
  assert.equal(await retrying(async () => 'ses', { wait }), 'ses');
  assert.deepEqual(waits, []);
});

test('bir kopukluktan sonra ikinci deneme sonucu döndürür', async () => {
  waits.length = 0;
  let n = 0;
  const got = await retrying(
    async () => {
      if (n++ === 0) throw new Error('Failed to fetch');
      return 42;
    },
    { wait },
  );
  assert.equal(got, 42);
  assert.deepEqual(waits, [1500]);
});

test('hep olmazsa son hata fırlatılır; bekleme katlanır', async () => {
  waits.length = 0;
  let n = 0;
  await assert.rejects(
    retrying(
      async () => {
        throw new Error(`deneme ${++n}`);
      },
      { tries: 3, wait },
    ),
    /deneme 3/,
  );
  assert.deepEqual(waits, [1500, 3000]);
});
