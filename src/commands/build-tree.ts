import '../cli-setup.js';
import { Command } from 'commander';
import { logger } from '../util/logger.js';

const program = new Command();

program
  .name('build-tree')
  .description('Read points.json for week N and build Merkle tree + leaderboard + proofs')
  .requiredOption('--week <n>', 'week number (1-indexed)', (v) => Number.parseInt(v, 10))
  .option('--in <dir>', 'snapshots directory', 'snapshots');

program.parse();

const opts = program.opts<{ week: number; in: string }>();

logger.info({ week: opts.week, in: opts.in }, 'TODO: build-tree command not implemented');
process.exit(0);
