import { beforeAll, afterAll, describe, it } from 'vitest';
import { Verifier } from '@pact-foundation/pact';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createApp } from '../../src/server';
import http from 'http';

let container: StartedPostgreSqlContainer;
let pool: Pool;
let server: http.Server;
let port: number;

beforeAll(async () => {
  // Lance Postgres via Testcontainers
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  pool = new Pool({ connectionString: container.getConnectionUri() });

  // Migrations
  const migration = readFileSync(
    join(process.cwd(), 'migrations', '001-initial.sql'),
    'utf-8',
  );
  await pool.query(migration);

  // Démarre le serveur Express
  const app = createApp(pool);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      port = (server.address() as any).port;
      resolve();
    });
  });
}, 60_000);

afterAll(async () => {
  server.close();
  await pool.end();
  await container.stop();
});

describe('splitto-api provider verification', () => {
  it('vérifie le contrat Pact', async () => {
    const verifier = new Verifier({
      provider: 'splitto-api',
      providerBaseUrl: `http://localhost:${port}`,
      pactUrls: [join(process.cwd(), 'pacts', 'splitto-frontend-splitto-api.json')],
      logLevel: 'error',

      stateHandlers: {
        // State 1 : groupe avec 3 membres et 2 dépenses
        'group-1 a 3 membres et 2 dépenses': async () => {
          await pool.query('TRUNCATE groups CASCADE');
          await pool.query(
            `INSERT INTO groups (id, name, currency) VALUES ('group-1', 'Test Group', 'EUR')`,
          );
          await pool.query(
            `INSERT INTO members (id, group_id, name, email) VALUES
              ('alice',   'group-1', 'Alice',   'alice@test.com'),
              ('bob',     'group-1', 'Bob',     'bob@test.com'),
              ('charlie', 'group-1', 'Charlie', 'charlie@test.com')`,
          );
          await pool.query(
            `INSERT INTO expenses
              (id, group_id, description, amount, currency, paid_by, paid_at, split_mode, split_data, created_at)
             VALUES
              ('exp-1', 'group-1', 'Resto', 30, 'EUR', 'alice', NOW(), 'equal',
               '{"mode":"equal","beneficiaries":["alice","bob","charlie"]}', NOW()),
              ('exp-2', 'group-1', 'Cinema', 20, 'EUR', 'bob', NOW() - interval '1 day', 'equal',
               '{"mode":"equal","beneficiaries":["alice","bob","charlie"]}', NOW())`,
          );
        },

        // State 2 : aucun groupe inexistant → base vide
        'aucun groupe inexistant': async () => {
          await pool.query('TRUNCATE groups CASCADE');
        },
      },
    });

    await verifier.verifyProvider();
  }, 60_000);
});