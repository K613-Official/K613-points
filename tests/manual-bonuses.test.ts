import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadManualBonuses } from '../src/snapshot/manual-bonuses.js';

async function withFile<T>(content: string, fn: (path: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'k613-mb-'));
  const path = join(dir, 'bonuses.json');
  await writeFile(path, content);
  try {
    return await fn(path);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('snapshot/manual-bonuses', () => {
  it('parses a valid bonus file (lowercases addr, coerces amount, defaults kind)', async () => {
    const list = await withFile(
      JSON.stringify({
        weekNumber: 2,
        bonuses: [
          { address: '0xAAAA000000000000000000000000000000000000', amount: '1000', kind: 'og' },
          { address: '0xbbbb000000000000000000000000000000000000', amount: 42 },
        ],
      }),
      loadManualBonuses,
    );
    expect(list.weekNumber).toBe(2);
    expect(list.bonuses[0]).toEqual({
      address: '0xaaaa000000000000000000000000000000000000',
      amount: 1000n,
      kind: 'og',
    });
    expect(list.bonuses[1]?.amount).toBe(42n);
    expect(list.bonuses[1]?.kind).toBe('other'); // default
  });

  it('rejects a file with a malformed address', async () => {
    await expect(
      withFile(
        JSON.stringify({ weekNumber: 1, bonuses: [{ address: '0xnothex', amount: '1' }] }),
        loadManualBonuses,
      ),
    ).rejects.toThrow();
  });

  it('rejects a file with a negative amount', async () => {
    await expect(
      withFile(
        JSON.stringify({
          weekNumber: 1,
          bonuses: [{ address: '0x1111111111111111111111111111111111111111', amount: '-5' }],
        }),
        loadManualBonuses,
      ),
    ).rejects.toThrow(/non-negative/);
  });

  it('rejects a non-positive weekNumber', async () => {
    await expect(
      withFile(JSON.stringify({ weekNumber: 0, bonuses: [] }), loadManualBonuses),
    ).rejects.toThrow();
  });
});
