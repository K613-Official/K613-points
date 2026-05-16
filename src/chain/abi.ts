import k613S1DistributorAbiJson from './abis/K613S1Distributor.json' assert { type: 'json' };

import k613SeasonClaimAbiJson from './abis/K613SeasonClaim.json' assert { type: 'json' };

import k613AbiJson from './abis/K613.json' assert { type: 'json' };

import k613S1AbiJson from './abis/K613S1.json' assert { type: 'json' };

import aaveOracleAbiJson from './abis/AaveOracle.json' assert { type: 'json' };

import erc20AbiJson from './abis/ERC20.json' assert { type: 'json' };

/**
 * The JSON files are Foundry build artifacts that wrap the ABI under `.abi`.
 * viem expects the ABI array itself, so unwrap it (tolerate raw-array JSON too).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAbi(json: any): any {
  return Array.isArray(json) ? json : json.abi;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const k613S1DistributorAbi: any = toAbi(k613S1DistributorAbiJson);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const k613SeasonClaimAbi: any = toAbi(k613SeasonClaimAbiJson);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const k613Abi: any = toAbi(k613AbiJson);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const k613S1Abi: any = toAbi(k613S1AbiJson);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const aaveOracleAbi: any = toAbi(aaveOracleAbiJson);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const erc20Abi: any = toAbi(erc20AbiJson);
