import { describe, it, expect, vi } from 'vitest';
import { ExpenseService } from '../../src/domain/expense.service';
import type { ExpenseRepository } from '../../src/ports/expense.repository';
import type { EmailNotifier } from '../../src/ports/notifier';
import type { Clock } from '../../src/ports/clock';
import type { IdGenerator } from '../../src/ports/id-generator';
import type { Logger } from '../../src/ports/logger';
import type { Expense, CreateExpenseInput } from '../../src/domain/types';

// ─── DUMMY ──────────────────────────────────────────────────────────
// Un dummy est un objet passé en paramètre mais jamais utilisé.
// On s'en fiche de son comportement, il est là pour satisfaire le typage.
const dummyLogger: Logger = {
  info: () => {},
  error: () => {},
};

// ─── STUB ────────────────────────────────────────────────────────────
// Un stub retourne des valeurs prédéfinies.
// Ici on fixe la date et l'id pour avoir des valeurs prévisibles dans les tests.
const stubClock: Clock = {
  now: () => new Date('2024-06-01T10:00:00Z'),
};

const stubIdGen: IdGenerator = {
  next: () => 'expense-id-123',
};

// ─── FAKE ────────────────────────────────────────────────────────────
// Un fake est une vraie implémentation simplifiée (en mémoire ici).
// Contrairement au stub, il a un vrai comportement interne.
class FakeExpenseRepository implements ExpenseRepository {
  private store: Map<string, Expense> = new Map();

  async save(expense: Expense): Promise<void> {
    this.store.set(expense.id, expense);
  }

  async findById(id: string): Promise<Expense | null> {
    return this.store.get(id) ?? null;
  }

  async findByGroupId(groupId: string): Promise<Expense[]> {
    return [...this.store.values()].filter(e => e.groupId === groupId);
  }

  async findInDateRange(groupId: string, from: Date, to: Date): Promise<Expense[]> {
    return [...this.store.values()].filter(
      e => e.groupId === groupId && e.paidAt >= from && e.paidAt <= to,
    );
  }
}

// ─── SPY ─────────────────────────────────────────────────────────────
// Un spy enregistre les appels sans changer le comportement.
// On l'utilise pour vérifier que notifyGroupMembers a été appelé ou non.
const makeSpyNotifier = () => {
  const notifyGroupMembers = vi.fn().mockResolvedValue(undefined);
  const notifier: EmailNotifier = { notifyGroupMembers };
  return { notifier, notifyGroupMembers };
};

// ─── MOCK ────────────────────────────────────────────────────────────
// Un mock vérifie des attentes comportementales précises (appels, arguments).
// Ici on vérifie que le repo.save est appelé avec la bonne expense.
const makeMockRepository = () => {
  const save = vi.fn().mockResolvedValue(undefined);
  const findById = vi.fn().mockResolvedValue(null);
  const findByGroupId = vi.fn().mockResolvedValue([]);
  const findInDateRange = vi.fn().mockResolvedValue([]);
  const repo: ExpenseRepository = { save, findById, findByGroupId, findInDateRange };
  return { repo, save };
};

// ─── INPUT DE BASE ───────────────────────────────────────────────────
const baseInput: CreateExpenseInput = {
  groupId: 'group-1',
  description: 'Resto',
  amount: 60,
  currency: 'EUR',
  paidBy: 'alice',
  paidAt: new Date('2024-06-01'),
  split: { mode: 'equal', beneficiaries: ['alice', 'bob', 'charlie'] },
};

// ─── TESTS ───────────────────────────────────────────────────────────

describe('ExpenseService.create', () => {

  it('retourne une expense avec les bonnes valeurs (stub + dummy)', async () => {
    const fakeRepo = new FakeExpenseRepository();
    const { notifier } = makeSpyNotifier();

    const service = new ExpenseService(fakeRepo, notifier, stubClock, stubIdGen, dummyLogger);
    const result = await service.create(baseInput);

    expect(result.id).toBe('expense-id-123');
    expect(result.createdAt).toEqual(new Date('2024-06-01T10:00:00Z'));
    expect(result.description).toBe('Resto');
    expect(result.amount).toBe(60);
  });

  it('le repository contient bien l\'expense après save (fake)', async () => {
    const fakeRepo = new FakeExpenseRepository();
    const { notifier } = makeSpyNotifier();

    const service = new ExpenseService(fakeRepo, notifier, stubClock, stubIdGen, dummyLogger);
    await service.create(baseInput);

    const saved = await fakeRepo.findById('expense-id-123');
    expect(saved).not.toBeNull();
    expect(saved?.description).toBe('Resto');
  });

  it('notifier appelé si amount >= 100 (spy)', async () => {
    const fakeRepo = new FakeExpenseRepository();
    const { notifier, notifyGroupMembers } = makeSpyNotifier();

    const service = new ExpenseService(fakeRepo, notifier, stubClock, stubIdGen, dummyLogger);
    await service.create({ ...baseInput, amount: 150 });

    expect(notifyGroupMembers).toHaveBeenCalledOnce();
    expect(notifyGroupMembers).toHaveBeenCalledWith(
      'group-1',
      expect.stringContaining('importante'),
    );
  });

  it('notifier NON appelé si amount < 100 (spy)', async () => {
    const fakeRepo = new FakeExpenseRepository();
    const { notifier, notifyGroupMembers } = makeSpyNotifier();

    const service = new ExpenseService(fakeRepo, notifier, stubClock, stubIdGen, dummyLogger);
    await service.create({ ...baseInput, amount: 60 });

    expect(notifyGroupMembers).not.toHaveBeenCalled();
  });

  it('repo.save appelé avec la bonne expense (mock)', async () => {
    const { repo, save } = makeMockRepository();
    const { notifier } = makeSpyNotifier();

    const service = new ExpenseService(repo, notifier, stubClock, stubIdGen, dummyLogger);
    await service.create(baseInput);

    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      id: 'expense-id-123',
      description: 'Resto',
      amount: 60,
    }));
  });

});