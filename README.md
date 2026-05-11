# K613 Points Pipeline

Off-chain system for computing and distributing weekly rewards to K613 Protocol users.

## About

K613 is a lending protocol on Monad (an Aave v3 fork). Users earn **K613S1 points** for supplying and borrowing assets.

This repository is an **operator-side tool** used by the K613 team to, once per week:

1. Read user balances from the subgraph
2. Compute points (supply + borrow in USD)
3. Build a merkle tree of cumulative rewards
4. Publish the merkle root to the `K613S1Distributor` smart contract
5. Users then claim their K613S1 themselves via merkle proof

## Reward Lifecycle

```
Protocol activity → K613S1 (points) → K613 (post-TGE via vesting)
```

- **K613S1** — Season 1 points token. Earned weekly.
- **K613** — Primary token post-TGE. K613S1 converts to K613 through vesting (20% at TGE + 4×20% every 15 days).

## Season 1

- Duration: ~12 weeks
- Rewards distributed weekly
- Pipeline runs after each week ends
- All snapshots are committed to git as an audit trail

## Security

- Protected against flash deposits and gaming via **minimum balance over the full week**
- Protected against admin actions (freeze) via **subgraph configuration history**
- Protected against operator errors via **weekly mint cap** in the contract
- Roadmap: migration to multi-sig + timelock once the system stabilizes

## Why Off-chain?

Computing TWAB (time-weighted balance) and complex strategies directly in a contract is too gas-expensive. An off-chain pipeline provides flexibility: you can adjust the points formula, add manual bonuses, or filter reserves — without redeploying contracts. The contract stays minimal and just verifies merkle proofs.

## How It Works

| Role                         | Responsibility                                               |
| ---------------------------- | ------------------------------------------------------------ |
| User                         | Supply/borrow in K613 Markets → automatically accrues points |
| Operator (this pipeline)     | Computes weekly snapshot + publishes merkle root             |
| `K613S1Distributor` contract | Accepts the root, lets users claim K613S1 with proof         |
| `K613SeasonClaim` contract   | Converts K613S1 → K613 post-TGE (with vesting)               |

## Related Repositories

- **K613-Protocol** — Aave v3 fork for Monad (lending markets)
- **K613-Token** — K613, K613S1, K613S1Distributor, K613SeasonClaim contracts
- **k613-markets-config** — Market configuration
