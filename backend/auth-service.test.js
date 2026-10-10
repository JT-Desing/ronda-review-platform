import test from 'node:test';
import assert from 'node:assert/strict';
import { authService } from './auth-service.js';
import { hashPassword } from './security.js';
test('auth service hashes registration passwords before persistence', async () => {
  let saved;
  const service = authService({ async createWithWorkspace(input) { saved = input; return { id: 'fixture', name: input.name }; } });
  await service.register({ email: 'qa@example.invalid', name: ' QA ', password: 'fixture-password-123' });
  assert.equal(saved.name, 'QA');
  assert.notEqual(saved.passwordHash, 'fixture-password-123');
  await assert.rejects(service.register({ name: '' }), { status: 400 });
});
test('auth service returns safe identity and indistinguishable login errors', async () => {
  const password_hash = await hashPassword('fixture-password-123');
  const service = authService({ async findByEmail(email) { return email === 'known' ? { id: 'fixture', password_hash } : undefined; } });
  assert.deepEqual(await service.login({ email: 'known', password: 'fixture-password-123' }), { id: 'fixture' });
  for (const email of ['known', 'unknown']) await assert.rejects(service.login({ email, password: 'incorrect' }), { status: 401, message: 'Correo o contraseña incorrectos.' });
});
