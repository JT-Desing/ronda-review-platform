import { expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

export const PASSWORD = 'Temporal-E2E-2026!solo-pruebas';

// Every test uses its own account, so tests stay independent and parallel.
export function newAccount(name = 'Persona E2E') {
  return { name, email: `e2e-${randomUUID()}@example.invalid`, password: PASSWORD };
}

export async function register(page, account) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).first().click();
  await page.getByRole('textbox', { name: 'Nombre' }).fill(account.name);
  await page.getByRole('textbox', { name: 'Correo' }).fill(account.email);
  await page.getByRole('textbox', { name: /^Contraseña/ }).fill(account.password);
  await page.getByRole('checkbox', { name: /Acepto la política/ }).check();
  await page.locator('form').getByRole('button', { name: 'Crear cuenta' }).click();
  await skipTour(page);
}

export async function login(page, account) {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Correo' }).fill(account.email);
  await page.getByRole('textbox', { name: /^Contraseña/ }).fill(account.password);
  await page.getByRole('button', { name: 'Entrar a Ronda' }).click();
  await skipTour(page);
}

async function skipTour(page) {
  const skip = page.getByRole('button', { name: 'Saltar guía' });
  await expect(page.getByRole('heading', { name: 'Proyectos personales' })).toBeVisible();
  if (await skip.isVisible()) await skip.click();
}

// The profile button says when the account snapshot reached the server.
export async function waitForSaved(page) {
  await expect(page.getByRole('button', { name: /Guardado en el servidor/ }).first()).toBeVisible();
}

// On narrow screens the comment panel is a sheet behind a "N comentarios" button.
export async function openComments(page) {
  const sheet = page.getByRole('button', { name: /^\d+ comentarios \d+ abiertos$/ });
  if (await sheet.isVisible()) await sheet.click();
  await expect(page.getByRole('textbox', { name: 'Escribir comentario' })).toBeVisible();
}
