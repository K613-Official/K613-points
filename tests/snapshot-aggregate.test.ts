import { describe, expect, it } from 'vitest';
import { aggregateAllWeeks, mergeWeeklyIntoCumulative } from '../src/snapshot/aggregate.js';

describe('snapshot/aggregate', () => {
  it('merges a single week into an empty cumulative', () => {
    const cumulative = mergeWeeklyIntoCumulative(new Map(), {
      weekNumber: 1,
      totals: new Map<`0x${string}`, bigint>([
        ['0x1111111111111111111111111111111111111111', 10n],
      ]),
    });
    expect(cumulative.get('0x1111111111111111111111111111111111111111')).toBe(10n);
  });

  it('aggregates across multiple weeks in order', () => {
    const out = aggregateAllWeeks([
      {
        weekNumber: 1,
        totals: new Map<`0x${string}`, bigint>([
          ['0x1111111111111111111111111111111111111111', 10n],
          ['0x2222222222222222222222222222222222222222', 20n],
        ]),
      },
      {
        weekNumber: 2,
        totals: new Map<`0x${string}`, bigint>([
          ['0x1111111111111111111111111111111111111111', 5n],
          ['0x3333333333333333333333333333333333333333', 7n],
        ]),
      },
    ]);
    expect(out.get('0x1111111111111111111111111111111111111111')).toBe(15n);
    expect(out.get('0x2222222222222222222222222222222222222222')).toBe(20n);
    expect(out.get('0x3333333333333333333333333333333333333333')).toBe(7n);
  });

  it.todo('respects week ordering even if input is unsorted');
});
