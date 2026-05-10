import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { NewGroupDialog } from './pages/NewGroupDialog';
import { GroupPage } from './pages/GroupPage';

// ─── Reset avant chaque test ────────────────────────────────────────
test.beforeEach(async ({ request }) => {
  await request.post('/_test/reset');
});

// ─── SCÉNARIO 1 : Créer un groupe avec 3 membres ────────────────────
test('créer un groupe avec 3 membres', async ({ page }) => {
  const home = new HomePage(page);
  const dialog = new NewGroupDialog(page);

  await home.goto();
  await home.clickNewGroup();

  await dialog.fillName('Vacances Été');
  await dialog.fillMembers(
    'Alice <alice@test.com>\nBob <bob@test.com>\nCharlie <charlie@test.com>',
  );
  await dialog.submit();

  // Vérifie que le groupe apparaît dans la liste
  const names = await home.getGroupNames();
  expect(names.some(n => n.includes('Vacances Été'))).toBe(true);
});

// ─── SCÉNARIO 2 : Ajouter une dépense ───────────────────────────────
test('ajouter une dépense dans un groupe', async ({ page }) => {
  const home = new HomePage(page);
  const dialog = new NewGroupDialog(page);
  const group = new GroupPage(page);

  await home.goto();
  await home.clickNewGroup();
  await dialog.fillName('Coloc');
  await dialog.fillMembers('Alice <alice@test.com>\nBob <bob@test.com>');
  await dialog.submit();

  await home.clickGroup('Coloc');
  await group.clickAddExpense();
  await group.fillExpenseDescription('Courses');
  await group.fillExpenseAmount('50');
  await group.submitExpense();

  // Vérifie que la dépense apparaît dans la liste
  const descriptions = await group.getExpenseDescriptions();
  expect(descriptions).toContain('Courses');
});

// ─── SCÉNARIO 3 : Vérifier les soldes ───────────────────────────────
test('soldes corrects après dépense de 30€ pour 3 personnes', async ({ page }) => {
  const home = new HomePage(page);
  const dialog = new NewGroupDialog(page);
  const group = new GroupPage(page);

  await home.goto();
  await home.clickNewGroup();
  await dialog.fillName('Trip');
  await dialog.fillMembers(
    'Alice <alice@test.com>\nBob <bob@test.com>\nCharlie <charlie@test.com>',
  );
  await dialog.submit();

  await home.clickGroup('Trip');

  // Récupère l'ID d'Alice depuis l'URL ou le DOM
  // On vérifie via data-testid="balance-{memberId}"
  await group.clickAddExpense();
  await group.fillExpenseDescription('Dîner');
  await group.fillExpenseAmount('30');
  await group.submitExpense();

  // Vérifie les soldes dans le tableau
  const balancesTable = page.getByRole('table', { name: /soldes/i });
  const rows = balancesTable.getByRole('row');

  // Alice a payé 30€ pour 3 → solde +20
  const aliceRow = rows.filter({ hasText: 'Alice' });
  await expect(aliceRow).toContainText('20.00');

  // Bob doit 10€ → solde -10
  const bobRow = rows.filter({ hasText: 'Bob' });
  await expect(bobRow).toContainText('-10.00');

  // Charlie doit 10€ → solde -10
  const charlieRow = rows.filter({ hasText: 'Charlie' });
  await expect(charlieRow).toContainText('-10.00');
});

// ─── SCÉNARIO 4 : Marquer un règlement comme réglé ──────────────────
test('marquer un règlement comme réglé', async ({ page }) => {
  const home = new HomePage(page);
  const dialog = new NewGroupDialog(page);
  const group = new GroupPage(page);

  await home.goto();
  await home.clickNewGroup();
  await dialog.fillName('Appart');
  await dialog.fillMembers('Alice <alice@test.com>\nBob <bob@test.com>');
  await dialog.submit();

  await home.clickGroup('Appart');
  await group.clickAddExpense();
  await group.fillExpenseDescription('Loyer');
  await group.fillExpenseAmount('100');
  await group.submitExpense();

  // Vérifie qu'il y a au moins un settlement
  const settlementsTable = page.getByRole('table', { name: /règlements/i });
  await expect(settlementsTable).toBeVisible();

  // Clique sur Régler
  await group.clickSettle(0);

  // Vérifie que la ligne a disparu
  await expect(page.getByTestId('settlement-row-0')).not.toBeVisible();
});