import type { Balances, Settlement } from './types';

export function simplifyDebts(balances: Balances): Settlement[] {
  const settlements: Settlement[] = [];

  const credits = Object.entries(balances).filter(([, v]) => v > 0);
  const debts = Object.entries(balances).filter(([, v]) => v < 0);

  for (const [debtor, debt] of debts) {
    for (const [creditor, credit] of credits) {
      if (credit > 0 && debt < 0) {
        const amount = Math.min(Math.abs(debt), credit);
        settlements.push({ from: debtor, to: creditor, amount });
      }
    }
  }

  return settlements;
}