/**
 * Thin Galxe GraphQL boundary. Isolated on purpose; all business logic lives
 * in ./bonus.ts (pure, tested).
 *
 * Auth: header `access-token` (space owner/admin token).
 * Endpoint default: https://graphigo.prd.galaxy.eco/query
 *
 * Why `space.loyaltyPointsRanks` and NOT `campaign.participants` × per-campaign
 * weight: Galxe campaigns can have multiple sub-tasks, each with their own
 * point reward. A wallet that completed 2 of 5 sub-tasks gets less than the
 * campaign's headline `loyaltyPoints`. The leaderboard exposes the real
 * earned total per address aggregated across all quests/sub-tasks in the
 * space — that's the only correct source.
 */

export interface AddressPoints {
  /** Lowercased EVM address. */
  address: string;
  /** Actual earned loyalty points for this space (sum across all sub-tasks). */
  points: number;
}

export interface GalxeClient {
  /** Paginates the space leaderboard, returning every address with > 0 points. */
  listAddressPoints(spaceId: string): Promise<AddressPoints[]>;
}

export interface GalxeClientConfig {
  url: string;
  accessToken: string;
  /** Page size for leaderboard pagination. Galxe accepts up to ~50–100. */
  pageSize?: number;
}

// IMPORTANT: use `cursorAfter`, NOT `after`. The `after` parameter on
// `loyaltyPointsRanks` is a Galxe API bug — it returns the SAME page with the
// SAME endCursor and hasNextPage=true forever (infinite loop). `cursorAfter`
// is the working parameter discovered by probing the live API.
const LOYALTY_RANKS_QUERY = `
  query SpaceLoyaltyRanks($id: Int!, $first: Int!, $cursorAfter: String) {
    space(id: $id) {
      loyaltyPointsRanks(first: $first, cursorAfter: $cursorAfter) {
        list { points address { address } }
        pageInfo { endCursor hasNextPage }
      }
    }
  }
`;

interface LoyaltyRanksResp {
  space?: {
    loyaltyPointsRanks?: {
      list?: Array<{ points?: number | null; address?: { address?: string } }>;
      pageInfo?: { endCursor: string | null; hasNextPage: boolean };
    };
  };
}

async function gql<T>(
  config: GalxeClientConfig,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(config.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'access-token': config.accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  let json: { data?: T; errors?: unknown };
  try {
    json = JSON.parse(text) as { data?: T; errors?: unknown };
  } catch {
    const snippet = text.slice(0, 200).replace(/\s+/g, ' ').trim();
    throw new Error(
      `Galxe returned non-JSON (HTTP ${res.status} ${res.statusText}); body starts: ${snippet}`,
    );
  }
  if (json.errors) {
    throw new Error(`Galxe GraphQL error: ${JSON.stringify(json.errors)}`);
  }
  if (!json.data) {
    throw new Error('Galxe GraphQL: empty data');
  }
  return json.data;
}

export function createGalxeClient(config: GalxeClientConfig): GalxeClient {
  const pageSize = config.pageSize ?? 50;

  return {
    async listAddressPoints(spaceId: string): Promise<AddressPoints[]> {
      const out: AddressPoints[] = [];
      let cursorAfter: string | null = null;
      const seenCursors = new Set<string>();
      // Cursor pagination: next page needs prev cursor, so sequential.
      for (;;) {
        // eslint-disable-next-line no-await-in-loop
        const data: LoyaltyRanksResp = await gql<LoyaltyRanksResp>(config, LOYALTY_RANKS_QUERY, {
          id: Number(spaceId),
          first: pageSize,
          cursorAfter,
        });
        const conn = data.space?.loyaltyPointsRanks;
        for (const row of conn?.list ?? []) {
          const addr = row.address?.address;
          const pts = row.points ?? 0;
          if (addr && pts > 0) {
            out.push({ address: addr.toLowerCase(), points: pts });
          }
        }
        const next = conn?.pageInfo?.endCursor;
        if (!conn?.pageInfo?.hasNextPage || !next) {
          break;
        }
        // Defensive: if Galxe ever regresses to a stuck cursor, fail loudly
        // instead of looping forever (we hit this once with `after`).
        if (seenCursors.has(next)) {
          throw new Error(`Galxe loyaltyPointsRanks pagination stuck at cursor ${next}`);
        }
        seenCursors.add(next);
        cursorAfter = next;
      }
      return out;
    },
  };
}
