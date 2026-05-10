import { gql } from 'graphql-request';

/**
 * Active reserves at the latest indexed block. We exclude frozen reserves
 * (e.g. wsrUSD) so they don't accrue points. The `isActive` / `isFrozen`
 * flags live on the `reserve` entity in the Aave v3 subgraph.
 */
export const ACTIVE_RESERVES_QUERY = gql`
  query ActiveReserves {
    reserves(where: { isActive: true, isFrozen: false }, first: 1000) {
      id
      symbol
      decimals
      underlyingAsset
      aToken {
        id
      }
      vToken {
        id
      }
      sToken {
        id
      }
    }
  }
`;

/**
 * All distinct (user, reserve) pairs that ever held a non-zero a/v/s balance
 * up to `endTimestamp`. Used to enumerate which histories to fetch.
 *
 * We page through `userReserves` (Aave v3 subgraph entity) where the user has
 * either current scaled supply or borrow > 0 OR has a balance history record.
 */
export const USERS_WITH_BALANCE_QUERY = gql`
  query UsersWithBalance($first: Int!, $skip: Int!, $endTimestamp: Int!) {
    userReserves(
      first: $first
      skip: $skip
      where: {
        liquidityRate_gte: 0
        reserve_: { lastUpdateTimestamp_lte: $endTimestamp }
      }
    ) {
      id
      user {
        id
      }
      reserve {
        id
        symbol
        decimals
        underlyingAsset
      }
    }
  }
`;

/**
 * aToken balance history items for a single user/reserve, plus the immediately
 * preceding item (preItem) so we can reconstruct the balance at t0.
 *
 * NOTE: subgraph entity name is `aTokenBalanceHistoryItem` in aave-v3.
 * `scaledATokenBalance` × current liquidity index = nominal balance.
 *
 * aToken transfers ARE indexed by subgraph via handleBalanceTransfer,
 * creating history items for both sender and receiver at transfer block.
 */
export const ATOKEN_HISTORY_QUERY = gql`
  query ATokenHistory(
    $userReserve: String!
    $startTimestamp: Int!
    $endTimestamp: Int!
  ) {
    items: aTokenBalanceHistoryItems(
      where: {
        userReserve: $userReserve
        timestamp_gte: $startTimestamp
        timestamp_lt: $endTimestamp
      }
      orderBy: timestamp
      orderDirection: asc
      first: 1000
    ) {
      id
      timestamp
      scaledATokenBalance
      currentATokenBalance
      index
    }
    preItem: aTokenBalanceHistoryItems(
      where: { userReserve: $userReserve, timestamp_lt: $startTimestamp }
      orderBy: timestamp
      orderDirection: desc
      first: 1
    ) {
      id
      timestamp
      scaledATokenBalance
      currentATokenBalance
      index
    }
  }
`;

/**
 * vToken (variable-debt) balance history items, same shape as ATOKEN_HISTORY_QUERY.
 */
export const VTOKEN_HISTORY_QUERY = gql`
  query VTokenHistory(
    $userReserve: String!
    $startTimestamp: Int!
    $endTimestamp: Int!
  ) {
    items: vTokenBalanceHistoryItems(
      where: {
        userReserve: $userReserve
        timestamp_gte: $startTimestamp
        timestamp_lt: $endTimestamp
      }
      orderBy: timestamp
      orderDirection: asc
      first: 1000
    ) {
      id
      timestamp
      scaledVariableDebt
      currentVariableDebt
      index
    }
    preItem: vTokenBalanceHistoryItems(
      where: { userReserve: $userReserve, timestamp_lt: $startTimestamp }
      orderBy: timestamp
      orderDirection: desc
      first: 1
    ) {
      id
      timestamp
      scaledVariableDebt
      currentVariableDebt
      index
    }
  }
`;

/**
 * Reserve-level liquidity / variable-borrow index history. We need this to
 * convert scaled balances at any timestamp into nominal balances.
 */
export const RESERVE_PARAMS_HISTORY_QUERY = gql`
  query ReserveParamsHistory(
    $reserve: String!
    $startTimestamp: Int!
    $endTimestamp: Int!
  ) {
    items: reserveParamsHistoryItems(
      where: {
        reserve: $reserve
        timestamp_gte: $startTimestamp
        timestamp_lt: $endTimestamp
      }
      orderBy: timestamp
      orderDirection: asc
      first: 1000
    ) {
      id
      timestamp
      liquidityIndex
      variableBorrowIndex
    }
    preItem: reserveParamsHistoryItems(
      where: { reserve: $reserve, timestamp_lt: $startTimestamp }
      orderBy: timestamp
      orderDirection: desc
      first: 1
    ) {
      id
      timestamp
      liquidityIndex
      variableBorrowIndex
    }
  }
`;
