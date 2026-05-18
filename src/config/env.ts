import { cleanEnv as envalidCleanEnv, url, str, num, makeValidator } from 'envalid';

export const DEFAULT_SUBGRAPH_URL =
  'https://api.studio.thegraph.com/query/1748605/k-613-prod/version/latest';

/** AaveOracle contract address on Monad. */
export const DEFAULT_AAVE_ORACLE_ADDRESS = '0x0dFfb00A751a74ac8CF8B022Bf86b1ECd9D7ae6F';

const hexAddressOrEmpty = makeValidator<`0x${string}` | ''>((x: string) => {
  if (!x) {
    return '';
  }
  if (!/^0x[a-fA-F0-9]{40}$/iu.test(x)) {
    throw new Error('must be 0x-prefixed 40 hex chars (20 bytes)');
  }
  return x as `0x${string}`;
});

const hexPrivateKeyOrEmpty = makeValidator<`0x${string}` | ''>((x: string) => {
  if (!x) {
    return '';
  }
  if (!/^0x[a-fA-F0-9]{64}$/iu.test(x)) {
    throw new Error('must be 0x-prefixed 64 hex chars (32 bytes)');
  }
  return x as `0x${string}`;
});

const _cleanEnv = (source?: NodeJS.ProcessEnv) =>
  envalidCleanEnv(source ?? process.env, {
    SUBGRAPH_URL: url({
      default: DEFAULT_SUBGRAPH_URL,
      desc: 'Aave subgraph URL for K613-Official/protocol-subgraph',
    }),
    RPC_URL: url({
      default: '',
      desc: 'Monad mainnet RPC endpoint',
    }),
    K613S1_ADDRESS: hexAddressOrEmpty({
      default: '',
      desc: 'K613S1 token contract address (optional for snapshot)',
    }),
    DISTRIBUTOR_ADDRESS: hexAddressOrEmpty({
      default: '',
      desc: 'K613S1Distributor contract address (optional for snapshot)',
    }),
    AAVE_ORACLE_ADDRESS: hexAddressOrEmpty({
      default: DEFAULT_AAVE_ORACLE_ADDRESS,
      desc: 'AaveOracle contract address on Monad (defaults to known prod oracle)',
    }),
    OPERATOR_PRIVATE_KEY: hexPrivateKeyOrEmpty({
      default: '',
      desc: 'Private key for operator EOA (only needed for post-root)',
    }),
    LOG_LEVEL: str({
      default: 'info',
      desc: 'Pino log level',
      choices: ['trace', 'debug', 'info', 'warn', 'error', 'fatal'],
    }),
    SEASON_1_START_TIMESTAMP: num({
      default: 0,
      desc: 'Unix seconds of Season 1 week-1 start; required by snapshot/build-tree',
    }),
    CHAIN_ID: num({
      default: 143,
      desc: 'EVM chain id (Monad mainnet=143, Arbitrum Sepolia=421614)',
    }),
    CHAIN_NAME: str({
      default: 'Monad',
      desc: 'Human-readable chain name for the viem client',
    }),
    NATIVE_CURRENCY_SYMBOL: str({
      default: 'MON',
      desc: 'Native currency symbol (e.g. ETH on Arbitrum Sepolia)',
    }),
    MULTICALL3_ADDRESS: hexAddressOrEmpty({
      default: '0xcA11bde05977b3631167028862bE2a173976CA11',
      desc: 'Multicall3 contract (canonical address on most chains incl. Arbitrum Sepolia)',
    }),
    GALXE_API_URL: url({
      default: 'https://graphigo.prd.galaxy.eco/query',
      desc: 'Galxe GraphQL endpoint (host stayed galaxy.eco after the rebrand)',
    }),
    GALXE_ACCESS_TOKEN: str({
      default: '',
      desc: 'Galxe access-token header (space owner/admin; only for build-galxe-bonus)',
    }),
    GALXE_SPACE_ID: str({
      default: '86004',
      desc: 'Galxe space id to pull campaign participants from',
    }),
    GALXE_CAMPAIGN_IDS: str({
      default: '',
      desc: 'Comma-separated Galxe campaign ids (explicit; space.campaigns is unreliable). If empty, falls back to space.campaigns enumeration.',
    }),
  });

export type Env = ReturnType<typeof _cleanEnv>;

export function cleanEnv(source?: NodeJS.ProcessEnv): Env {
  return _cleanEnv(source);
}
