import type { Balances, Settlement } from './types';

function findLargestCreditor(bal: Map<string, number>): [string, number] | null {
  let best: [string, number] | null = null;
  for (const [id, v] of bal) {
    if (v > 0.001 && (best === null || v > best[1])) best = [id, v];
  }
  return best;
}

function findLargestDebtor(bal: Map<string, number>): [string, number] | null {
  let best: [string, number] | null = null;
  for (const [id, v] of bal) {
    if (v < -0.001 && (best === null || v < best[1])) best = [id, v];
  }
  return best;
}

export function simplifyDebts(balances: Balances): Settlement[] {
  const settlements: Settlement[] = [];
  const bal = new Map<string, number>(Object.entries(balances));

  let creditor = findLargestCreditor(bal);
  let debtor = findLargestDebtor(bal);

  while (creditor && debtor) {
    const amount = Math.min(creditor[1], Math.abs(debtor[1]));
    const rounded = Math.round(amount * 100) / 100;

    settlements.push({ from: debtor[0], to: creditor[0], amount: rounded });

    bal.set(creditor[0], creditor[1] - amount);
    bal.set(debtor[0], debtor[1] + amount);

    creditor = findLargestCreditor(bal);
    debtor = findLargestDebtor(bal);
  }

  return settlements;
}