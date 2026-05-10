import type { Page } from '@playwright/test';

export class GroupPage {
  constructor(private page: Page) {}

  async clickAddExpense() {
    await this.page.getByRole('button', { name: 'Ajouter une dépense' }).click();
  }

  async fillExpenseDescription(description: string) {
    await this.page.getByLabel('Description').fill(description);
  }

  async fillExpenseAmount(amount: string) {
    await this.page.getByLabel('Montant').fill(amount);
  }

  async submitExpense() {
    await this.page.getByRole('dialog', { name: /dépense/ })
      .getByRole('button', { name: 'Ajouter' }).click();
  }

 async getExpenseDescriptions(): Promise<string[]> {
  await this.page.waitForSelector('[aria-label="Liste des dépenses"]');
  const table = this.page.getByRole('table', { name: /Liste des dépenses/i });
  const rows = table.getByRole('row');
  const count = await rows.count();
  const descriptions: string[] = [];
  for (let i = 1; i < count; i++) {
    const cells = rows.nth(i).getByRole('cell');
    descriptions.push(await cells.nth(0).innerText());
  }
  return descriptions;
}
  async getBalance(memberId: string): Promise<number> {
    const cell = this.page.getByTestId(`balance-${memberId}`);
    const text = await cell.innerText();
    return parseFloat(text.replace(',', '.'));
  }

  async clickSettle(index: number) {
    await this.page.getByTestId(`settlement-row-${index}`)
      .getByRole('button', { name: 'Régler' }).click();
  }

  async getSettlementRows() {
    return this.page.getByRole('row').filter({ hasText: 'Régler' });
  }
}