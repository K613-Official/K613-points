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

export async function postMerkleRoot(input: PostRootInput): Promise<Hex> {
  const state = await readDistributorState();

  if (input.cumulativeSupply < state.lastRootCumulativeSupply) {
    throw new Error(
      `cumulativeSupply (${input.cumulativeSupply}) < lastRootCumulativeSupply (${state.lastRootCumulativeSupply}) — monotonicity violation`,
    );
  }

  const delta = input.cumulativeSupply - state.lastRootCumulativeSupply;
  if (delta > state.weeklyMintCap) {
    throw new Error(`weekly delta (${delta}) exceeds weeklyMintCap (${state.weeklyMintCap})`);
  }

  const walletClient = getWalletClient();
  const address = getDistributorAddress();

  const hash = await walletClient.writeContract({
    address,
    abi: k613S1DistributorAbi,
    functionName: 'setMerkleRoot',
    args: [input.root, input.cumulativeSupply, BigInt(input.weekNumber)],
  } as unknown as Parameters<typeof walletClient.writeContract>[0]);

  const publicClient = getPublicClient();
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
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
    client.readContract({
      address,
      abi: k613S1DistributorAbi,
      functionName: 'merkleRoot',
      args: [],
    }) as Promise<Hex>,
    client.readContract({
      address,
      abi: k613S1DistributorAbi,
      functionName: 'lastRootCumulativeSupply',
      args: [],
    }) as Promise<bigint>,
    client.readContract({
      address,
      abi: k613S1DistributorAbi,
      functionName: 'weeklyMintCap',
      args: [],
    }) as Promise<bigint>,
  ]);
  return { merkleRoot, lastRootCumulativeSupply, weeklyMintCap };
}

export { getDistributorAddress, getWalletClient };
