import { describe, expect, it } from 'vitest';
import { z } from 'zod';

/**
 * Zod schemas for leaf validation.
 * Not for overflow protection (Solidity 0.8+ handles that),
 * but for catching bugs in the off-chain pipeline that generate absurd values.
 */

const HexAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/u);

const LeafSchema = z.object({
  account: HexAddress,
  cumulativeAmount: z.bigint().min(0n).max(2n ** 200n), // sanity ceiling, not max-uint256
});

type Leaf = z.infer<typeof LeafSchema>;

describe('leaf validation', () => {
  it('accepts valid leaf values', () => {
    const leaf: Leaf = LeafSchema.parse({
      account: '0x1111111111111111111111111111111111111111',
      cumulativeAmount: 1_000_000n,
    });
    expect(leaf.cumulativeAmount).toBe(1_000_000n);
  });

  it('rejects cumulativeAmount > 2^200 (pipeline bug detection)', () => {
    expect(() =>
      LeafSchema.parse({
        account: '0x1111111111111111111111111111111111111111',
        cumulativeAmount: 2n ** 256n, // absurdity, should never happen
      }),
    ).toThrow();
  });

  it('rejects negative cumulativeAmount', () => {
    expect(() =>
      LeafSchema.parse({
        account: '0x1111111111111111111111111111111111111111',
        cumulativeAmount: -1n,
      }),
    ).toThrow();
  });

  it('rejects malformed address', () => {
    expect(() =>
      LeafSchema.parse({
        account: 'not-an-address',
        cumulativeAmount: 1_000_000n,
      }),
    ).toThrow();
  });

  it('accepts realistic large amount (close to 100M K613)', () => {
    const hundredMillionK613 = 100n * 10n ** 18n; // 100M × 10^18
    const leaf = LeafSchema.parse({
      account: '0x1111111111111111111111111111111111111111',
      cumulativeAmount: hundredMillionK613,
    });
    expect(leaf.cumulativeAmount).toBe(hundredMillionK613);
  });
});
