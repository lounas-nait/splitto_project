// src/domain/balances.ts — calcul des soldes d'un groupe

import type { Group, Expense, Balances } from './types';

export function computeBalances(group: Group, expenses: Expense[]): Balances {
  // Initialise tous les membres à 0
  const balances: Balances = {};
  for (const member of group.members) {
    balances[member.id] = 0;
  }

  for (const expense of expenses) {
    const { amount, paidBy, split } = expense;

    // 1. Le payeur est crédité du montant total
    if (paidBy in balances) {
      balances[paidBy] = (balances[paidBy] ?? 0) + amount;
    }

    // 2. Chaque bénéficiaire est débité de sa quote-part
    if (split.mode === 'equal') {
      const share = amount / split.beneficiaries.length;
      for (const memberId of split.beneficiaries) {
        if (memberId in balances) {
          balances[memberId] = (balances[memberId] ?? 0) - share;
        }
      }

    } else if (split.mode === 'weighted') {
      const totalWeight = Object.values(split.weights).reduce((a, b) => a + b, 0);
      for (const [memberId, weight] of Object.entries(split.weights)) {
        if (memberId in balances) {
          const share = (weight / totalWeight) * amount;
          balances[memberId] = (balances[memberId] ?? 0) - share;
        }
      }

    } else if (split.mode === 'percentage') {
      for (const [memberId, pct] of Object.entries(split.percentages)) {
        if (memberId in balances) {
          const share = (pct / 100) * amount;
          balances[memberId] = (balances[memberId] ?? 0) - share;
        }
      }
    }
  }

  return balances;
}