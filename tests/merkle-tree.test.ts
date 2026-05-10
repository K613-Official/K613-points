import { describe, expect, it } from 'vitest';
import { buildTree } from '../src/merkle/tree.js';
import { makeLeafValues } from '../src/merkle/leaf.js';

describe('merkle/leaf utilities', () => {
  it('drops zero-amount leaves and sorts by address', () => {
    const totals = new Map<`0x${string}`, bigint>([
      ['0x3333333333333333333333333333333333333333', 30n],
      ['0x1111111111111111111111111111111111111111', 0n],
      ['0x2222222222222222222222222222222222222222', 20n],
    ]);
    const values = makeLeafValues(totals);
    expect(values.length).toBe(2);
    expect(values[0]?.[0]).toBe('0x2222222222222222222222222222222222222222');
    expect(values[1]?.[0]).toBe('0x3333333333333333333333333333333333333333');
  });

  it('builds a tree from a Map<address,bigint>', () => {
    const totals = new Map<`0x${string}`, bigint>([
      ['0x1111111111111111111111111111111111111111', 1n],
      ['0x2222222222222222222222222222222222222222', 2n],
    ]);
    const tree = buildTree(makeLeafValues(totals));
    expect(tree.root).toMatch(/^0x[0-9a-f]{64}$/u);
  });

  it.todo('round-trips through dump/load identically');
});
