import type { Balances, Settlement } from './types';

export function simplifyDebts(balances: Balances): Settlement[] {
  const settlements: Settlement[] = [];

  // Copie mutable des balances en Map
  const bal = new Map<string, number>(Object.entries(balances));

  const getCreditors = () =>
    [...bal.entries()].filter(([, v]) => v > 0.001).sort((a, b) => b[1] - a[1]);

  const getDebtors = () =>
    [...bal.entries()].filter(([, v]) => v < -0.001).sort((a, b) => a[1] - b[1]);

  let creditors = getCreditors();
  let debtors = getDebtors();

  while (creditors.length > 0 && debtors.length > 0) {
    const [creditor, credit] = creditors[0];
    const [debtor, debt] = debtors[0];

    const amount = Math.min(credit, Math.abs(debt));
    const rounded = Math.round(amount * 100) / 100;

    settlements.push({ from: debtor, to: creditor, amount: rounded });

    bal.set(creditor, credit - amount);
    bal.set(debtor, debt + amount);

    creditors = getCreditors();
    debtors = getDebtors();
  }

  return settlements;
}