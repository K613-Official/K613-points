import type { Address, Hex } from 'viem';
import { cleanEnv } from '../config/env.js';
import { getPublicClient, getWalletClient } from './clients.js';
import { k613S1DistributorAbi } from './abi.js';

function getDistributorAddress(): Address {
  const env = cleanEnv();
  if (!env.DISTRIBUTOR_ADDRESS) {
    throw new Error('DISTRIBUTOR_ADDRESS is required');
  }
  return env.DISTRIBUTOR_ADDRESS;
}

export interface PostRootInput {
  root: Hex;
  cumulativeSupply: bigint;
  weekNumber: number;
}

export async function postMerkleRoot(_input: PostRootInput): Promise<Hex> {
  // TODO: implement.
  // - Read current merkleRoot, lastRootCumulativeSupply, weeklyMintCap (sanity).
  // - Validate input.cumulativeSupply >= lastRootCumulativeSupply and that the
  //   delta does not exceed weeklyMintCap (defence-in-depth; contract enforces too).
  // - walletClient.writeContract({ abi: k613S1DistributorAbi, functionName: 'setMerkleRoot', ... }).
  // - Wait for tx receipt and return the hash.
  throw new Error('postMerkleRoot: not implemented');
}

export interface DistributorState {
  merkleRoot: Hex;
  lastRootCumulativeSupply: bigint;
  weeklyMintCap: bigint;
}

export async function readDistributorState(): Promise<DistributorState> {
  const client = getPublicClient();
  const address = getDistributorAddress();
  const [merkleRoot, lastRootCumulativeSupply, weeklyMintCap] = await Promise.all([
    client.readContract({ address, abi: k613S1DistributorAbi, functionName: 'merkleRoot' }),
    client.readContract({
      address,
      abi: k613S1DistributorAbi,
      functionName: 'lastRootCumulativeSupply',
    }),
    client.readContract({ address, abi: k613S1DistributorAbi, functionName: 'weeklyMintCap' }),
  ]);
  return { merkleRoot, lastRootCumulativeSupply, weeklyMintCap };
}

export { getDistributorAddress, getWalletClient };
