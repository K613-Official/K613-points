import { GraphQLClient } from 'graphql-request';
import { cleanEnv } from '../config/env.js';

let cached: GraphQLClient | undefined;

export function getSubgraphClient(): GraphQLClient {
  if (!cached) {
    const env = cleanEnv();
    cached = new GraphQLClient(env.SUBGRAPH_URL, {
      headers: { 'content-type': 'application/json' },
    });
  }
  return cached;
}
