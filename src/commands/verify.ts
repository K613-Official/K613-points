import '../cli-setup.js';
import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { logger } from '../util/logger.js';

const program = new Command();

program
  .name('verify')
  .description('Locally verify a single user proof for week N')
  .requiredOption('--week <n>', 'week number (1-indexed)', (v) => Number.parseInt(v, 10))
  .requiredOption('--address <addr>', 'user address to verify');

program.parse();

const opts = program.opts<{ week: number; address: string }>();

async function run() {
  try {
    const treeData = JSON.parse(
      await readFile(join('snapshots', `week-${opts.week}`, 'tree.json'), 'utf-8'),
    );

    const tree = StandardMerkleTree.load(treeData.tree);
    const addr = opts.address.toLowerCase();

    let found = false;
    for (const [i, leaf] of tree.entries()) {
      if (leaf[0].toLowerCase() === addr) {
        const proof = tree.getProof(i);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const verified = tree.verify(i, leaf as any);

        logger.info(
          {
            address: leaf[0],
            amount: leaf[1].toString(),
            proof,
            verified,
          },
          verified ? 'Proof verified ✓' : 'Proof invalid ✗',
        );
        found = true;
        break;
      }
    }

    if (!found) {
      logger.warn({ address: opts.address }, 'Address not in merkle tree');
      process.exit(1);
    }
  } catch (error) {
    logger.error(error, 'Verify failed');
    process.exit(1);
  }
}

run();
