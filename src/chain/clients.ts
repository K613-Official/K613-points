import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { cleanEnv } from '../config/env.js';
import { getChain } from '../config/network.js';

let publicClient: PublicClient | undefined;
let walletClient: WalletClient | undefined;

export function getPublicClient(): PublicClient {
  if (!publicClient) {
    const env = cleanEnv();
    if (!env.RPC_URL) {
      throw new Error('RPC_URL is required to create a public client');
    }
    publicClient = createPublicClient({ chain: getChain(), transport: http(env.RPC_URL) });
  }
  return publicClient;
}

/**
 * Wallet client gated behind OPERATOR_PRIVATE_KEY — only `post-root` should
 * touch this.
 */
export function getWalletClient(): WalletClient {
  if (!walletClient) {
    const env = cleanEnv();
    if (!env.RPC_URL) {
      throw new Error('RPC_URL is required to create a wallet client');
    }
    if (!env.OPERATOR_PRIVATE_KEY) {
      throw new Error('OPERATOR_PRIVATE_KEY is required to create a wallet client');
    }
    const account = privateKeyToAccount(env.OPERATOR_PRIVATE_KEY);
    walletClient = createWalletClient({
      account,
      chain: getChain(),
      transport: http(env.RPC_URL),
    });
  }
  return walletClient;
}
