export interface ToUsd18Input {
  /** Min nominal token balance over the week (token decimals). */
  minBalance: bigint;
  /** Asset price from AaveOracle (oracleDecimals decimals, USD). */
  price: bigint;
  /** ERC20 decimals of the underlying token. */
  tokenDecimals: bigint;
  /** Oracle price decimals (Aave v3 = 8). */
  oracleDecimals: bigint;
}

/**
 * USD value scaled to 18 decimals using integer math:
 *   usd18 = minBalance * price * 1e18 / 10^(tokenDecimals + oracleDecimals)
 * 1 USD => 1e18. Sub-dollar amounts no longer collapse to 0
 * (only the tail below 1e-18 USD is lost).
 */
export function toUsd18(input: ToUsd18Input): bigint {
  const scale = 10n ** (input.tokenDecimals + input.oracleDecimals);
  return (input.minBalance * input.price * 10n ** 18n) / scale;
}
