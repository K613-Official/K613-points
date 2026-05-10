import { cleanEnv as envalidCleanEnv, url, str, makeValidator } from 'envalid';

export const DEFAULT_SUBGRAPH_URL =
  'https://api.studio.thegraph.com/query/1748605/k-613-prod/version/latest';

const hexAddressOrEmpty = makeValidator<`0x${string}` | ''>((x: string) => {
  if (!x) return '';
  if (!/^0x[a-fA-F0-9]{40}$/iu.test(x)) {
    throw new Error('must be 0x-prefixed 40 hex chars (20 bytes)');
  }
  return x as `0x${string}`;
});

const hexPrivateKeyOrEmpty = makeValidator<`0x${string}` | ''>((x: string) => {
  if (!x) return '';
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
    OPERATOR_PRIVATE_KEY: hexPrivateKeyOrEmpty({
      default: '',
      desc: 'Private key for operator EOA (only needed for post-root)',
    }),
    LOG_LEVEL: str({
      default: 'info',
      desc: 'Pino log level',
      choices: ['trace', 'debug', 'info', 'warn', 'error', 'fatal'],
    }),
  });

export type Env = ReturnType<typeof _cleanEnv>;

export function cleanEnv(source?: NodeJS.ProcessEnv): Env {
  return _cleanEnv(source);
}
