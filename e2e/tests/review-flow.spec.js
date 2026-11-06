import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { newAccount, register, login, waitForSaved, openComments } from '../helpers.js';

const PIECE = fileURLToPath(new URL('../fixtures/pieza.png', import.meta.url));
const COMMENT = 'Subir el contraste del título';

test('registro, subir pieza y comentar; todo sigue ahí al volver a entrar', async ({ page, browser }) => {
  const account = newAccount();
  await register(page, account);

  await page.getByRole('button', { name: 'Abrir proyecto Mi primera revisión' }).click();
  await expect(page.getByRole('heading', { name: 'Mi primera revisión', level: 1 })).toBeVisible();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Agregar varios archivos a la entrega' }).click();
  await (await chooser).setFiles(PIECE);
  const piece = page.getByRole('button', { name: /^pieza\.png 01 PNG/ });
  await expect(piece).toBeVisible();

  await piece.click();
  await expect(page.getByRole('img', { name: 'pieza.png' }).last()).toBeVisible();
  // The annotation tools must be reachable too (they were off-screen on mobile).
  await page.getByRole('button', { name: 'Rectángulo (3)' }).click();
  await expect(page.getByRole('button', { name: 'Rectángulo (3)' })).toHaveAttribute('aria-pressed', 'true');
  await openComments(page);
  await page.getByRole('textbox', { name: 'Escribir comentario' }).fill(COMMENT);
  await page.getByRole('button', { name: 'Publicar comentario' }).click();
  await expect(page.getByText('1 pendientes de 1').filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText(COMMENT).filter({ visible: true }).first()).toBeVisible();
  await waitForSaved(page);

  // A fresh browser context has no local state: what it sees came from the server.
  const other = await browser.newContext();
  const second = await other.newPage();
  await login(second, account);
  await second.getByRole('button', { name: 'Abrir proyecto Mi primera revisión' }).click();
  await second.getByRole('button', { name: /^pieza\.png 01 PNG/ }).click();
  await openComments(second);
  await expect(second.getByText(COMMENT).filter({ visible: true }).first()).toBeVisible();
  await other.close();
});

test('una contraseña incorrecta no deja entrar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Correo' }).fill(newAccount().email);
  await page.getByRole('textbox', { name: /^Contraseña/ }).fill('no-es-la-clave-123');
  await page.getByRole('button', { name: 'Entrar a Ronda' }).click();
  await expect(page.getByRole('button', { name: 'Entrar a Ronda' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Proyectos personales' })).toHaveCount(0);
});
