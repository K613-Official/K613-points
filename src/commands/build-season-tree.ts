import '../cli-setup.js';
import { Command } from 'commander';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { formatEther } from 'viem';
import { logger } from '../util/logger.js';
import { makeLeafValues } from '../merkle/leaf.js';
import { buildTree } from '../merkle/tree.js';
import { aggregateAllWeeks } from '../snapshot/aggregate.js';
import { loadWeeklyPoints } from '../snapshot/points-file.js';
import { buildLeaderboard } from '../snapshot/leaderboard.js';
import { getWeekWindow } from '../config/season.js';
import { cleanEnv } from '../config/env.js';
import { getPublicClient } from '../chain/clients.js';
import { readDistributorState } from '../chain/distributor.js';
import { k613S1Abi } from '../chain/abi.js';

/**
 * Final season Merkle tree for the `K613SeasonClaim` contract.
 *
 * ALLOCATION BASIS — entitlement, not ERC20 balance.
 * `totalAllocation` is each user's cumulative season-to-date points from the
 * weekly snapshots (weeks 1..N), i.e. the same figure the last Distributor root
 * commits to. Points a user has NOT yet claimed from `K613S1Distributor` are
 * therefore included. This is safe because:
 *   - `K613S1Distributor` has no claim deadline, so K613S1 can be claimed at any
 *     later time and then converted here;
 *   - K613S1 is non-transferable (`approve`/`transferFrom` revert
 *     `NonTransferable`), so a balance can only ever lag entitlement by the
 *     unclaimed amount — it can never exceed it via transfers in.
 *
 * Conversion is 1:1 (`K613SeasonClaim` has no rate; vesting alone stages the
 * payout), so the leaf amount doubles as the K613 funding requirement.
 *
 * CONSEQUENCE: with a 1:1 entitlement basis the season leaves are identical to
 * the final weekly leaves, so `finalRoot` is expected to equal the last posted
 * Distributor root. `--verify-onchain` asserts exactly that.
 *
 * Users must claim their K613S1 from the Distributor before calling
 * `K613SeasonClaim.claim`, because each claim burns K613S1 from the caller.
 */

const program = new Command();

program
  .name('build-season-tree')
  .description('Build the final season Merkle tree + leaderboard + proofs for K613SeasonClaim')
  .requiredOption('--through-week <n>', 'final week of the season (1-indexed)', (v) =>
    Number.parseInt(v, 10),
  )
  .option('--in <dir>', 'snapshots directory to read weekly points from', 'snapshots')
  .option('--out <dir>', 'output directory for the season artifacts')
  .option(
    '--verify-onchain',
    'cross-check the tree against the Distributor root and K613S1 supply (needs RPC_URL)',
    false,
  );

program.parse();

const opts = program.opts<{
  throughWeek: number;
  in: string;
  out?: string;
  verifyOnchain: boolean;
}>();

interface OnchainCheck {
  distributorRoot: string;
  distributorCumulativeSupply: string;
  k613s1TotalSupply: string;
  unclaimed: string;
  rootMatchesDistributor: boolean;
}

async function verifyOnchain(finalRoot: string, totalAllocation: bigint): Promise<OnchainCheck> {
  const env = cleanEnv();
  if (!env.K613S1_ADDRESS) {
    throw new Error('K613S1_ADDRESS is required for --verify-onchain');
  }

  const state = await readDistributorState();
  const totalSupply = (await getPublicClient().readContract({
    address: env.K613S1_ADDRESS,
    abi: k613S1Abi,
    functionName: 'totalSupply',
    args: [],
  })) as bigint;

  // The season tree commits to entitlement, so it must agree with the last root
  // the Distributor accepted. A mismatch means the snapshots on disk drifted
  // from what was actually posted — refuse to emit a tree in that case.
  if (state.lastRootCumulativeSupply !== totalAllocation) {
    throw new Error(
      `Entitlement mismatch: tree total is ${totalAllocation} but Distributor ` +
        `lastRootCumulativeSupply is ${state.lastRootCumulativeSupply}. ` +
        `The weekly snapshots on disk do not match the posted root.`,
    );
  }

  return {
    distributorRoot: state.merkleRoot,
    distributorCumulativeSupply: state.lastRootCumulativeSupply.toString(),
    k613s1TotalSupply: totalSupply.toString(),
    // Entitled but never claimed out of the Distributor. These addresses must
    // claim their K613S1 before they can convert, since conversion burns it.
    unclaimed: (state.lastRootCumulativeSupply - totalSupply).toString(),
    rootMatchesDistributor: state.merkleRoot.toLowerCase() === finalRoot.toLowerCase(),
  };
}

async function run() {
  try {
    // 1. Cumulative entitlement over weeks 1..N. loadWeeklyPoints fails loudly
    //    on any gap, so a missing week cannot silently shrink allocations.
    const { weeks, weekN } = await loadWeeklyPoints(opts.in, opts.throughWeek);
    const cumulative = aggregateAllWeeks(weeks);

    // 2. Leaves are ['address','uint256'] under StandardMerkleTree — the exact
    //    double-keccak encoding K613SeasonClaim.claim(totalAllocation, proof)
    //    verifies against.
    const leaves = makeLeafValues(cumulative);
    if (leaves.length === 0) {
      throw new Error(
        `No positive allocations found in ${opts.in} through week ${opts.throughWeek}`,
      );
    }
    const tree = buildTree(leaves);
    // 1:1 conversion — the allocation total IS the K613 that must be funded.
    const totalK613ToFund = leaves.reduce((acc, [, amount]) => acc + amount, 0n);

    const outDir = opts.out ?? join('snapshots', 'season-final');
    await mkdir(outDir, { recursive: true });

    const onchain = opts.verifyOnchain
      ? await verifyOnchain(tree.root, totalK613ToFund)
      : undefined;

    // 3. tree.json
    const treeData = {
      finalRoot: tree.root,
      totalK613ToFund: totalK613ToFund.toString(),
      throughWeek: opts.throughWeek,
      allocationBasis: 'entitlement-cumulative-weekly-points',
      conversionRatio: '1:1',
      leafEncoding: 'StandardMerkleTree(["address","uint256"])',
      leaves: leaves.length,
      finalizedAt: new Date().toISOString(),
      ...(onchain ? { onchain } : {}),
      tree: tree.dump(),
    };
    const treePath = join(outDir, 'tree.json');
    await writeFile(treePath, JSON.stringify(treeData, null, 2));

    // 4. leaderboard.json — ranked from the SAME cumulative map as the tree.
    const seasonStart = getWeekWindow(1).startTimestamp;
    const seasonEnd = getWeekWindow(opts.throughWeek).endTimestamp;
    const ranked = buildLeaderboard({
      week: opts.throughWeek,
      weekStart: seasonStart,
      weekEnd: seasonEnd,
      finalizedAt: treeData.finalizedAt,
      cumulative,
      weekN,
    });
    const leaderboard = {
      season: 1,
      throughWeek: opts.throughWeek,
      seasonStart,
      seasonEnd,
      finalizedAt: ranked.finalizedAt,
      finalRoot: tree.root,
      totalK613ToFund: totalK613ToFund.toString(),
      holders: ranked.rows.length,
      rows: ranked.rows.map((r) => ({
        rank: r.rank,
        address: r.address,
        cumulativePoints: r.cumulativePoints.toString(),
        totalAllocation: r.cumulativePoints.toString(),
      })),
    };
    const leaderboardPath = join(outDir, 'leaderboard.json');
    await writeFile(leaderboardPath, JSON.stringify(leaderboard, null, 2));

    // 5. proofs/ — one file per holder, keyed by lowercase address without 0x.
    const proofsDir = join(outDir, 'proofs');
    await mkdir(proofsDir, { recursive: true });
    for (const [i, leaf] of tree.entries()) {
      const [address, amount] = leaf;
      const proofData = {
        address,
        totalAllocation: amount.toString(),
        proof: tree.getProof(i),
        root: tree.root,
      };
      // eslint-disable-next-line no-await-in-loop
      await writeFile(
        join(proofsDir, `${address.toLowerCase().slice(2)}.json`),
        JSON.stringify(proofData, null, 2),
      );
    }

    const top5 = leaderboard.rows.slice(0, 5).map((r) => ({
      rank: r.rank,
      address: r.address,
      k613: formatEther(BigInt(r.totalAllocation)),
    }));

    logger.info(
      {
        finalRoot: tree.root,
        totalK613ToFund: totalK613ToFund.toString(),
        totalK613ToFundFormatted: formatEther(totalK613ToFund),
        holders: leaves.length,
        treePath,
        leaderboardPath,
        proofsDir,
        ...(onchain ? { onchain } : {}),
        top5,
      },
      'Season final tree built',
    );

    if (onchain && !onchain.rootMatchesDistributor) {
      logger.warn(
        { finalRoot: tree.root, distributorRoot: onchain.distributorRoot },
        'finalRoot differs from the posted Distributor root — expected them to match under a 1:1 entitlement basis; investigate before funding',
      );
    }
  } catch (error) {
    logger.error(error, 'Build season tree failed');
    process.exit(1);
  }
}

run();
