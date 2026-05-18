/**
 * Thin Galxe GraphQL boundary. ISOLATED ON PURPOSE: the exact query shape
 * (space -> campaigns, campaign -> participants) must be confirmed against the
 * live schema with a real access token — same approach used for the Aave
 * subgraph bring-up. All business logic lives in ./bonus.ts (pure, tested);
 * this file only fetches.
 *
 * Auth: header `access-token` (space owner/admin token).
 * Endpoint default: https://graphigo.prd.galaxy.eco/query
 *
 * To verify the schema live:
 *   query { space(id:"86004"){ id campaigns(input:{first:50}){ list{ id name } } } }
 *   query { campaign(id:"<cid>"){ participants(first:1000){ list{ address }
 *           pageInfo{ endCursor hasNextPage } } } }
 * Adjust SPACE_CAMPAIGNS_QUERY / CAMPAIGN_PARTICIPANTS_QUERY below if fields differ.
 */

export interface GalxeClient {
  listCampaignIds(spaceId: string): Promise<string[]>;
  listParticipantAddresses(campaignId: string): Promise<string[]>;
}

export interface GalxeClientConfig {
  url: string;
  accessToken: string;
  /** Page size for participant pagination. */
  pageSize?: number;
}

const SPACE_CAMPAIGNS_QUERY = `
  query SpaceCampaigns($id: Int!) {
    space(id: $id) {
      id
      campaigns(input: { first: 200 }) {
        list { id name }
      }
    }
  }
`;

const CAMPAIGN_PARTICIPANTS_QUERY = `
  query CampaignParticipants($id: ID!, $first: Int!, $after: String) {
    campaign(id: $id) {
      participants {
        participants(first: $first, after: $after) {
          list { address { address } }
          pageInfo { endCursor hasNextPage }
        }
      }
    }
  }
`;

interface SpaceCampaignsResp {
  space?: { campaigns?: { list?: Array<{ id: string }> } };
}

interface ParticipantsResp {
  campaign?: {
    participants?: {
      participants?: {
        list?: Array<{ address?: { address?: string } }>;
        pageInfo?: { endCursor: string | null; hasNextPage: boolean };
      };
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
    async listCampaignIds(spaceId: string): Promise<string[]> {
      const data: SpaceCampaignsResp = await gql<SpaceCampaignsResp>(
        config,
        SPACE_CAMPAIGNS_QUERY,
        { id: Number(spaceId) },
      );
      return (data.space?.campaigns?.list ?? []).map((c) => c.id);
    },

    async listParticipantAddresses(campaignId: string): Promise<string[]> {
      const out: string[] = [];
      let after: string | null = null;
      // Cursor pagination: sequential by necessity (next page needs prev cursor).
      for (;;) {
        // eslint-disable-next-line no-await-in-loop
        const data: ParticipantsResp = await gql<ParticipantsResp>(
          config,
          CAMPAIGN_PARTICIPANTS_QUERY,
          { id: campaignId, first: pageSize, after },
        );

        const conn = data.campaign?.participants?.participants;
        for (const row of conn?.list ?? []) {
          const a = row.address?.address;
          if (a) {
            out.push(a);
          }
        }
        if (!conn?.pageInfo?.hasNextPage || !conn.pageInfo.endCursor) {
          break;
        }
        after = conn.pageInfo.endCursor;
      }
      return out;
    },
  };
}
