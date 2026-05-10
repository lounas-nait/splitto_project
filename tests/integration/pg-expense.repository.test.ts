import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PgExpenseRepository } from '../../src/infrastructure/pg-expense.repository';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Expense } from '../../src/domain/types';

let container: StartedPostgreSqlContainer;
let pool: Pool;
let repo: PgExpenseRepository;

// ─── SETUP ──────────────────────────────────────────────────────────

beforeAll(async () => {
  // Lance un conteneur Postgres 16-alpine via Testcontainers
  container = await new PostgreSqlContainer('postgres:16-alpine').start();

  pool = new Pool({ connectionString: container.getConnectionUri() });

  // Exécute les migrations SQL
  const migration = readFileSync(
    join(process.cwd(), 'migrations', '001-initial.sql'),
    'utf-8',
  );
  await pool.query(migration);

  repo = new PgExpenseRepository(pool);
}, 60_000);

afterAll(async () => {
  await pool.end();
  await container.stop();
});

beforeEach(async () => {
  // Nettoie les tables avant chaque test
  await pool.query('TRUNCATE expenses CASCADE');
});

// ─── HELPERS ────────────────────────────────────────────────────────

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: 'exp-1',
  groupId: 'group-1',
  description: 'Resto',
  amount: 60,
  currency: 'EUR',
  paidBy: 'alice',
  paidAt: new Date('2024-06-01T12:00:00Z'),
  split: { mode: 'equal', beneficiaries: ['alice', 'bob', 'charlie'] },
  createdAt: new Date('2024-06-01T12:00:00Z'),
  ...overrides,
});

// On doit insérer les données de référence (groups + members) avant les expenses
async function seedGroup() {
  await pool.query(
    `INSERT INTO groups (id, name, currency) VALUES ('group-1', 'Test Group', 'EUR')
     ON CONFLICT DO NOTHING`,
  );
  await pool.query(
    `INSERT INTO members (id, group_id, name, email) VALUES
      ('alice', 'group-1', 'Alice', 'alice@test.com'),
      ('bob',   'group-1', 'Bob',   'bob@test.com'),
      ('charlie', 'group-1', 'Charlie', 'charlie@test.com')
     ON CONFLICT DO NOTHING`,
  );
}

async function seedGroup2() {
  await pool.query(
    `INSERT INTO groups (id, name, currency) VALUES ('group-2', 'Autre Group', 'EUR')
     ON CONFLICT DO NOTHING`,
  );
  await pool.query(
    `INSERT INTO members (id, group_id, name, email) VALUES
      ('dave', 'group-2', 'Dave', 'dave@test.com')
     ON CONFLICT DO NOTHING`,
  );
}

// ─── TESTS ──────────────────────────────────────────────────────────

describe('PgExpenseRepository', () => {

  // TEST 1 — save puis findById
  it('save() puis findById() retourne la même expense', async () => {
    await seedGroup();
    const expense = makeExpense();

    await repo.save(expense);
    const found = await repo.findById('exp-1');

    expect(found).not.toBeNull();
    expect(found?.id).toBe('exp-1');
    expect(found?.description).toBe('Resto');
    expect(found?.amount).toBe(60);
    expect(found?.paidBy).toBe('alice');
  });

  // TEST 2 — findByGroupId retourne uniquement les expenses du bon groupe
  it('findByGroupId() retourne uniquement les expenses du groupe demandé', async () => {
    await seedGroup();
    await seedGroup2();

    await repo.save(makeExpense({ id: 'exp-1', groupId: 'group-1', paidBy: 'alice' }));
    await repo.save(makeExpense({ id: 'exp-2', groupId: 'group-1', paidBy: 'alice', paidAt: new Date('2024-06-02T12:00:00Z') }));
    await repo.save(makeExpense({ id: 'exp-3', groupId: 'group-2', paidBy: 'dave', split: { mode: 'equal', beneficiaries: ['dave'] } }));

    const results = await repo.findByGroupId('group-1');
    expect(results).toHaveLength(2);
    expect(results.every(e => e.groupId === 'group-1')).toBe(true);
  });

  // TEST 3 — findInDateRange filtre correctement
  it('findInDateRange() filtre correctement avec bornes inclusives', async () => {
    await seedGroup();

    await repo.save(makeExpense({ id: 'exp-1', paidAt: new Date('2024-01-01T00:00:00Z') }));
    await repo.save(makeExpense({ id: 'exp-2', paidAt: new Date('2024-06-15T00:00:00Z') }));
    await repo.save(makeExpense({ id: 'exp-3', paidAt: new Date('2024-12-31T00:00:00Z') }));

    const results = await repo.findInDateRange(
      'group-1',
      new Date('2024-06-01T00:00:00Z'),
      new Date('2024-12-31T00:00:00Z'),
    );

    expect(results).toHaveLength(2);
    expect(results.map(e => e.id)).toContain('exp-2');
    expect(results.map(e => e.id)).toContain('exp-3');
  });

  // TEST 4 — contrainte UNIQUE rejette un doublon
  it('save() rejette un doublon avec une exception', async () => {
    await seedGroup();
    const expense = makeExpense();

    await repo.save(expense);

    await expect(repo.save({ ...expense, id: 'exp-2' })).rejects.toThrow();
  });

  // TEST 5 — transaction rollback
  it('une transaction qui échoue rollback proprement', async () => {
    await seedGroup();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO expenses (id, group_id, description, amount, currency, paid_by, paid_at, split_mode, split_data, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        ['exp-tx', 'group-1', 'Test', 50, 'EUR', 'alice', new Date(), 'equal', JSON.stringify({ mode: 'equal', beneficiaries: ['alice'] }), new Date()],
      );
      // Force une erreur : viole la contrainte NOT NULL sur description
      await client.query(`INSERT INTO expenses (id) VALUES ('bad')`);
      await client.query('COMMIT');
    } catch {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }

    // Aucune ligne ne doit avoir été sauvegardée
    const result = await pool.query(`SELECT * FROM expenses WHERE id = 'exp-tx'`);
    expect(result.rows).toHaveLength(0);
  });

});