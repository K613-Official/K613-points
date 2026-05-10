import { describe, expect, it } from 'vitest';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { encodeAbiParameters, keccak256, type Hex } from 'viem';
import { buildTree } from '../src/merkle/tree.js';
import { makeLeafValue } from '../src/merkle/leaf.js';

/**
 * Independently compute the leaf hash that K613S1Distributor.claim uses:
 *   inner = keccak256(abi.encode(account, cumulativeAmount))
 *   leaf  = keccak256(inner)
 * If this ever drifts from StandardMerkleTree's leafHash, on-chain
 * verification will fail — so we pin both to the same value here.
 */
function manualLeafHash(account: `0x${string}`, cumulativeAmount: bigint): Hex {
  const inner = keccak256(
    encodeAbiParameters(
      [
        { type: 'address', name: 'account' },
        { type: 'uint256', name: 'cumulativeAmount' },
      ],
      [account, cumulativeAmount],
    ),
  );
  return keccak256(inner);
}

describe('merkle leaf format ↔ contract', () => {
  const fixtures: ReadonlyArray<readonly [`0x${string}`, bigint]> = [
    ['0x1111111111111111111111111111111111111111', 1_000_000n],
    ['0x2222222222222222222222222222222222222222', 50_000n],
    ['0x3333333333333333333333333333333333333333', 999_999_999_999_999_999_999n],
    ['0x4444444444444444444444444444444444444444', 1n],
  ];

  it('makeLeafValue rejects negative amounts', () => {
    expect(() =>
      makeLeafValue('0x1111111111111111111111111111111111111111', -1n),
    ).toThrow();
  });

  it('OZ tree.leafHash matches manual double-keccak per leaf', () => {
    const tree = buildTree(fixtures);
    for (const [addr, amt] of fixtures) {
      const ozHash = tree.leafHash([addr, amt.toString()]);
      const manual = manualLeafHash(addr, amt);
      expect(ozHash.toLowerCase()).toBe(manual.toLowerCase());
    }
  });

  it('proofs verify against the tree root using OZ.verify', () => {
    const tree = buildTree(fixtures);
    for (const [i, value] of tree.entries()) {
      const proof = tree.getProof(i);
      const ok = StandardMerkleTree.verify(tree.root, ['address', 'uint256'], value, proof);
      expect(ok).toBe(true);
    }
  });

  it('produces a stable, deterministic root for known input', () => {
    const tree = buildTree(fixtures);
    expect(tree.root).toMatch(/^0x[0-9a-f]{64}$/u);
    // Building the tree again from the same input yields the same root.
    const tree2 = buildTree(fixtures);
    expect(tree2.root).toBe(tree.root);
  });
});
