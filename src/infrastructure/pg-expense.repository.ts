import type { Pool } from 'pg';
import type { Expense, ExpenseSplit, Currency } from '../domain/types';
import type { ExpenseRepository } from '../ports/expense.repository';

export class PgExpenseRepository implements ExpenseRepository {
  constructor(private readonly pool: Pool) {}

  async save(expense: Expense): Promise<void> {
    await this.pool.query(
      `INSERT INTO expenses
        (id, group_id, description, amount, currency, paid_by, paid_at, split_mode, split_data, category, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        expense.id,
        expense.groupId,
        expense.description,
        expense.amount,
        expense.currency,
        expense.paidBy,
        expense.paidAt,
        expense.split.mode,
        JSON.stringify(expense.split),
        expense.category ?? null,
        expense.createdAt,
      ],
    );
  }

  async findById(id: string): Promise<Expense | null> {
    const result = await this.pool.query(
      `SELECT * FROM expenses WHERE id = $1`,
      [id],
    );
    if (result.rows.length === 0) return null;
    return this.rowToExpense(result.rows[0]);
  }

  async findByGroupId(groupId: string): Promise<Expense[]> {
    const result = await this.pool.query(
      `SELECT * FROM expenses WHERE group_id = $1 ORDER BY paid_at DESC`,
      [groupId],
    );
    return result.rows.map(row => this.rowToExpense(row));
  }

  async findInDateRange(groupId: string, from: Date, to: Date): Promise<Expense[]> {
    const result = await this.pool.query(
      `SELECT * FROM expenses
       WHERE group_id = $1 AND paid_at >= $2 AND paid_at <= $3
       ORDER BY paid_at DESC`,
      [groupId, from, to],
    );
    return result.rows.map(row => this.rowToExpense(row));
  }

  private rowToExpense(row: any): Expense {
    return {
      id: row.id,
      groupId: row.group_id,
      description: row.description,
      amount: Number(row.amount),
      currency: row.currency as Currency,
      paidBy: row.paid_by,
      paidAt: new Date(row.paid_at),
      split: row.split_data as ExpenseSplit,
      category: row.category ?? undefined,
      createdAt: new Date(row.created_at),
    };
  }
}