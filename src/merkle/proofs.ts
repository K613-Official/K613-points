import { join } from 'node:path';
import type { Tree } from './tree.js';
import { writeJson } from '../util/json.js';

export interface UserProof {
  address: `0x${string}`;
  cumulativeAmount: string;
  leafHash: `0x${string}`;
  proof: `0x${string}`[];
  root: `0x${string}`;
  treeIndex: number;
}

/**
 * Iterate every leaf in the tree and emit per-user proof JSON files.
 * `outDir` is created if it doesn't exist.
 */
export async function exportProofs(tree: Tree, outDir: string): Promise<UserProof[]> {
  const root = tree.root as `0x${string}`;
  const proofs: UserProof[] = [];
  for (const [i, value] of tree.entries()) {
    const [address, amountStr] = value;
    const proof = tree.getProof(i) as `0x${string}`[];
    const leafHash = tree.leafHash(value) as `0x${string}`;
    const entry: UserProof = {
      address: address.toLowerCase() as `0x${string}`,
      cumulativeAmount: amountStr,
      leafHash,
      proof,
      root,
      treeIndex: i,
    };
    proofs.push(entry);
    await writeJson(join(outDir, `${entry.address}.json`), entry);
  }
  return proofs;
}
