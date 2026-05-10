import type { Page } from '@playwright/test';

export class HomePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  async clickNewGroup() {
    await this.page.getByRole('button', { name: 'Nouveau groupe' }).click();
  }

  async clickHome() {
    await this.page.getByRole('button', { name: 'Accueil' }).click();
  }

  async getGroupNames(): Promise<string[]> {
  await this.page.waitForSelector('[data-group-id]');
  const items = this.page.locator('[data-group-id]');
  const count = await items.count();
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    names.push(await items.nth(i).innerText());
  }
  return names;
}

async clickGroup(name: string) {
  await this.page.locator('[data-group-id]').filter({ hasText: name }).click();
}
}