export type SolidityType = 'address' | 'uint256';

export const LEAF_TYPES: readonly SolidityType[] = ['address', 'uint256'];

export type Address = `0x${string}`;

/** A single leaf as accepted by `StandardMerkleTree.of`. */
export type LeafValue = readonly [Address, bigint];

export function makeLeafValue(account: Address, cumulativeAmount: bigint): LeafValue {
  if (cumulativeAmount < 0n) {
    throw new Error(`cumulativeAmount must be non-negative, got ${cumulativeAmount}`);
  }
  return [account, cumulativeAmount];
}

export function makeLeafValues(
  totals: ReadonlyMap<Address, bigint> | Iterable<readonly [Address, bigint]>,
): LeafValue[] {
  const entries =
    totals instanceof Map ? [...totals.entries()] : ([...totals] as Array<readonly [Address, bigint]>);
  return entries
    .filter(([, amount]) => amount > 0n)
    .sort(([a], [b]) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0))
    .map(([addr, amt]) => makeLeafValue(addr, amt));
}
