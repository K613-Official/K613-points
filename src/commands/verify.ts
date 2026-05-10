import '../cli-setup.js';
import { Command } from 'commander';
import { logger } from '../util/logger.js';

const program = new Command();

program
  .name('verify')
  .description('Locally verify a single user proof for week N')
  .requiredOption('--week <n>', 'week number (1-indexed)', (v) => Number.parseInt(v, 10))
  .requiredOption('--address <addr>', 'user address to verify');

program.parse();

const opts = program.opts<{ week: number; address: string }>();

logger.info({ week: opts.week, address: opts.address }, 'TODO: verify command not implemented');
process.exit(0);
