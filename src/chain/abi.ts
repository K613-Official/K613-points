
export const k613S1DistributorAbi = [
  {
    type: 'function',
    name: 'setMerkleRoot',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'newRoot', type: 'bytes32' },
      { name: 'newCumulativeSupply', type: 'uint256' },
      { name: 'weekNumber', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'merkleRoot',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'lastRootCumulativeSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'weeklyMintCap',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'claimed',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

/**
 * Minimal AaveOracle ABI for fetching asset prices via multicall.
 */
export const aaveOracleAbi = [
  {
    type: 'function',
    name: 'getAssetPrice',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getAssetsPrices',
    stateMutability: 'view',
    inputs: [{ name: 'assets', type: 'address[]' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
] as const;
