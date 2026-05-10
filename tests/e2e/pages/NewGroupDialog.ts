import type { Page } from '@playwright/test';

export class NewGroupDialog {
  constructor(private page: Page) {}

  async fillName(name: string) {
    await this.page.getByLabel('Nom du groupe').fill(name);
  }

  async fillMembers(members: string) {
    await this.page.getByLabel(/Membres/).fill(members);
  }

  async submit() {
    await this.page.getByRole('dialog', { name: /groupe/ })
      .getByRole('button', { name: 'Créer' }).click();
  }

  async cancel() {
    await this.page.getByRole('button', { name: 'Annuler' }).click();
  }
}