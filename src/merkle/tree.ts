import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { LEAF_TYPES, type LeafValue } from './leaf.js';
import { readJson, writeJson } from '../util/json.js';

export type Tree = StandardMerkleTree<[string, string]>;

/**
 * Build a StandardMerkleTree over (address, uint256) leaves.
 * The library mutates input — we coerce bigints to strings to match the
 * declared schema.
 */
export function buildTree(values: readonly LeafValue[]): Tree {
  const stringValues = values.map(([addr, amt]) => [addr, amt.toString()] as [string, string]);
  return StandardMerkleTree.of(stringValues, [...LEAF_TYPES]);
}

export async function dumpTreeToFile(tree: Tree, path: string): Promise<void> {
  await writeJson(path, tree.dump());
}

export async function loadTreeFromFile(path: string): Promise<Tree> {
  const dumped = await readJson<ReturnType<Tree['dump']>>(path);
  return StandardMerkleTree.load(dumped);
}
