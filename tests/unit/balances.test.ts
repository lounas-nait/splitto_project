import { describe, it, expect } from 'vitest';
import { computeBalances } from '../../src/domain/balances';
import type { Group, Expense } from '../../src/domain/types';

// ─── Helpers ────────────────────────────────────────────────────────
const makeGroup = (memberIds: string[]): Group => ({
  id: 'group-1',
  name: 'Test Group',
  currency: 'EUR',
  members: memberIds.map(id => ({ id, name: id, email: `${id}@test.com` })),
});

const makeExpense = (overrides: Partial<Expense> & Pick<Expense, 'amount' | 'paidBy' | 'split'>): Expense => ({
  id: 'exp-1',
  groupId: 'group-1',
  description: 'Test expense',
  currency: 'EUR',
  paidAt: new Date('2024-01-01'),
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

// ─── Tests ──────────────────────────────────────────────────────────

describe('computeBalances', () => {

  // CAS 1 — Groupe vide
  it('retourne un objet vide pour un groupe sans membres', () => {
    const group = makeGroup([]);
    expect(computeBalances(group, [])).toEqual({});
  });

  // CAS 2 — Equal : payeur inclus comme bénéficiaire
  it('dépense equal entre 3 personnes, payeur inclus', () => {
    const group = makeGroup(['alice', 'bob', 'charlie']);
    const expense = makeExpense({
      amount: 30,
      paidBy: 'alice',
      split: { mode: 'equal', beneficiaries: ['alice', 'bob', 'charlie'] },
    });
    const balances = computeBalances(group, [expense]);
    expect(balances['alice']).toBeCloseTo(20);   // paie 30, doit 10
    expect(balances['bob']).toBeCloseTo(-10);
    expect(balances['charlie']).toBeCloseTo(-10);
  });

  // CAS 3 — Equal : payeur PAS bénéficiaire
  it('dépense equal entre 3 personnes, payeur pas bénéficiaire', () => {
    const group = makeGroup(['alice', 'bob', 'charlie']);
    const expense = makeExpense({
      amount: 30,
      paidBy: 'alice',
      split: { mode: 'equal', beneficiaries: ['bob', 'charlie'] },
    });
    const balances = computeBalances(group, [expense]);
    expect(balances['alice']).toBeCloseTo(30);
    expect(balances['bob']).toBeCloseTo(-15);
    expect(balances['charlie']).toBeCloseTo(-15);
  });

  // CAS 4 — Plusieurs dépenses qui se compensent
  it('plusieurs dépenses qui se compensent partiellement', () => {
    const group = makeGroup(['alice', 'bob']);
    const exp1 = makeExpense({
      id: 'exp-1', amount: 100, paidBy: 'alice',
      split: { mode: 'equal', beneficiaries: ['alice', 'bob'] },
    });
    const exp2 = makeExpense({
      id: 'exp-2', amount: 60, paidBy: 'bob',
      split: { mode: 'equal', beneficiaries: ['alice', 'bob'] },
    });
    const balances = computeBalances(group, [exp1, exp2]);
    expect(balances['alice']).toBeCloseTo(20);
    expect(balances['bob']).toBeCloseTo(-20);
  });

  // CAS 5 — Weighted
  it('dépense weighted avec poids non-uniformes', () => {
    const group = makeGroup(['alice', 'bob', 'charlie']);
    const expense = makeExpense({
      amount: 120,
      paidBy: 'alice',
      split: { mode: 'weighted', weights: { alice: 1, bob: 2, charlie: 3 } },
    });
    const balances = computeBalances(group, [expense]);
    // total poids = 6 → alice: 20, bob: 40, charlie: 60
    expect(balances['alice']).toBeCloseTo(100);  // 120 - 20
    expect(balances['bob']).toBeCloseTo(-40);
    expect(balances['charlie']).toBeCloseTo(-60);
  });

  // CAS 6 — Percentage avec arrondis
  it('dépense percentage avec arrondis (100€ entre 3)', () => {
    const group = makeGroup(['alice', 'bob', 'charlie']);
    const expense = makeExpense({
      amount: 100,
      paidBy: 'alice',
      split: {
        mode: 'percentage',
        percentages: { alice: 33.33, bob: 33.33, charlie: 33.34 },
      },
    });
    const balances = computeBalances(group, [expense]);
    const total = balances['alice'] + balances['bob'] + balances['charlie'];
    expect(total).toBeCloseTo(0);
    expect(balances['alice']).toBeCloseTo(66.67);
  });

  // CAS LIMITE 1 — Liste vide de dépenses
  it('retourne tous les soldes à 0 si aucune dépense', () => {
    const group = makeGroup(['alice', 'bob']);
    const balances = computeBalances(group, []);
    expect(balances['alice']).toBe(0);
    expect(balances['bob']).toBe(0);
  });

  // CAS LIMITE 2 — Dépense avec un seul bénéficiaire (le payeur lui-même)
  it('dépense où le payeur est le seul bénéficiaire → solde 0', () => {
    const group = makeGroup(['alice', 'bob']);
    const expense = makeExpense({
      amount: 50,
      paidBy: 'alice',
      split: { mode: 'equal', beneficiaries: ['alice'] },
    });
    const balances = computeBalances(group, [expense]);
    expect(balances['alice']).toBeCloseTo(0);
    expect(balances['bob']).toBeCloseTo(0);
  });

  // CAS LIMITE 3 — Membre supprimé dans une vieille dépense
  it('ignore les membres absents du groupe dans les dépenses', () => {
    const group = makeGroup(['alice', 'bob']);
    const expense = makeExpense({
      amount: 30,
      paidBy: 'alice',
      split: { mode: 'equal', beneficiaries: ['alice', 'bob', 'ghost'] },
    });
    const balances = computeBalances(group, [expense]);
    expect(balances['ghost']).toBeUndefined();
    expect(balances['alice']).toBeCloseTo(20);
    expect(balances['bob']).toBeCloseTo(-10);
  });

});