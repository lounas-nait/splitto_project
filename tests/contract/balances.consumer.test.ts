import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { join } from 'path';

const { like, regex, eachLike } = MatchersV3;

const provider = new PactV3({
  consumer: 'splitto-frontend',
  provider: 'splitto-api',
  dir: join(process.cwd(), 'pacts'),
  logLevel: 'error',
});

describe('splitto-frontend → splitto-api (balances)', () => {

  // ─── INTERACTION 1 : groupe avec dépenses → 200 ─────────────
  it('GET /api/groups/group-1/balances retourne 200 avec balances', async () => {
    await provider
      .addInteraction({
        states: [{ description: 'group-1 a 3 membres et 2 dépenses' }],
        uponReceiving: 'une requête pour les balances du groupe group-1',
        withRequest: {
          method: 'GET',
          path: '/api/groups/group-1/balances',
        },
        willRespondWith: {
  status: 200,
  headers: { 'Content-Type': 'application/json' },  // ← string simple
  body: {
    groupId: like('group-1'),
    balances: like({ alice: 20, bob: -10, charlie: -10 }),
    settlements: eachLike({
      from: like('bob'),
      to: like('alice'),
      amount: like(10),
    }),
  },
},
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(
          `${mockServer.url}/api/groups/group-1/balances`,
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.groupId).toBeDefined();
        expect(body.balances).toBeDefined();
        expect(body.settlements).toBeDefined();
      });
  });

  // ─── INTERACTION 2 : groupe inexistant → 404 ────────────────
  it('GET /api/groups/inexistant/balances retourne 404', async () => {
    await provider
      .addInteraction({
        states: [{ description: 'aucun groupe inexistant' }],
        uponReceiving: 'une requête pour un groupe inexistant',
        withRequest: {
          method: 'GET',
          path: '/api/groups/inexistant/balances',
        },
        willRespondWith: {
  status: 404,
  headers: { 'Content-Type': 'application/json' },  // ← string simple
  body: {
    error: like('Group not found'),
  },
},
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(
          `${mockServer.url}/api/groups/inexistant/balances`,
        );
        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body.error).toBeDefined();
      });
  });

});