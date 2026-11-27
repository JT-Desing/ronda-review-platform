import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { newAccount, register, login, waitForSaved, openComments } from '../helpers.js';

const PIECE = fileURLToPath(new URL('../fixtures/pieza.png', import.meta.url));
const COMMENT = 'Subir el contraste del título';
function silentVoiceNote() {
  const samples = 4000;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVE', 8);
  wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
  wav.writeUInt32LE(samples * 2, 40);
  return wav;
}

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

  const modeButtons = page.locator('.delivery-grid.storyboard .storyboard-modes button');
  const modeMetrics = () => modeButtons.evaluateAll(buttons => buttons.map(button => {
    const rect = button.getBoundingClientRect();
    return { width: rect.width, height: rect.height, weight: getComputedStyle(button).fontWeight };
  }));
  const card = page.locator('.delivery-grid.storyboard li').first();
  const cardBounds = async () => {
    const { width, height } = await card.boundingBox();
    return { width, height };
  };
  const reviewMetrics = await modeMetrics();
  const reviewCard = await cardBounds();
  await page.getByRole('button', { name: 'Organizar', exact: true }).click();
  const organizeMetrics = await modeMetrics();
  const organizeCard = await cardBounds();
  await page.getByRole('button', { name: 'Revisar', exact: true }).click();
  expect(organizeMetrics.map(item => item.width)).toEqual([68, 68]);
  expect(organizeMetrics.map(item => item.height)).toEqual([32, 32]);
  expect(reviewMetrics.map(item => item.width)).toEqual([68, 68]);
  expect(reviewMetrics.map(item => item.height)).toEqual([32, 32]);
  expect(organizeMetrics.map(item => item.weight)).toEqual(reviewMetrics.map(item => item.weight));
  expect(organizeCard).toEqual(reviewCard);

  await piece.click();
  await expect(page.locator('.original-media-stage')).toBeVisible();
  await expect(page.getByRole('img', { name: 'pieza.png' }).last()).toBeVisible();
  // The annotation tools must be reachable too (they were off-screen on mobile).
  const rectangle = page.getByRole('button', { name: 'Rectángulo (3)' });
  await expect(rectangle).toBeVisible();
  await rectangle.click();
  await expect(page.getByRole('button', { name: 'Rectángulo (3)' })).toHaveAttribute('aria-pressed', 'true');
  await openComments(page);
  await page.getByRole('textbox', { name: 'Escribir comentario' }).fill(COMMENT);
  await page.getByRole('button', { name: 'Publicar comentario' }).click();
  await expect(page.getByText('1 pendientes de 1').filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText(COMMENT).filter({ visible: true }).first()).toBeVisible();

  await page.getByLabel('Adjuntar MP3 u otro audio').last().setInputFiles({ name: 'nota.wav', mimeType: 'audio/wav', buffer: silentVoiceNote() });
  await expect(page.locator('.audio-draft .audio-message-player')).toBeVisible();
  await page.getByRole('button', { name: 'Publicar comentario' }).click();
  const audioMessage = page.locator('.comment-attachments .audio-message-player').last();
  await expect(audioMessage).toBeVisible();
  const visiblePanel = page.locator('.comments-panel:visible').last();
  const panelBounds = await visiblePanel.boundingBox();
  const audioBounds = await audioMessage.boundingBox();
  expect(audioBounds.x + audioBounds.width).toBeLessThanOrEqual(panelBounds.x + panelBounds.width + 1);
  expect(await visiblePanel.evaluate(panel => panel.scrollWidth <= panel.clientWidth)).toBe(true);
  await waitForSaved(page);

  // A fresh browser context has no local state: what it sees came from the server.
  const other = await browser.newContext();
  const second = await other.newPage();
  await login(second, account);
  await second.getByRole('button', { name: 'Abrir proyecto Mi primera revisión' }).click();
  await second.getByRole('button', { name: /^pieza\.png 01 PNG/ }).click();
  await openComments(second);
  await expect(second.getByText(COMMENT).filter({ visible: true }).first()).toBeVisible();
  await expect(second.locator('.comment-attachments .audio-message-player').last()).toBeVisible();
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
