import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('login exposes a recovery path and reset links bypass the ordinary session check', () => {
  const access = readFileSync(new URL('./AccountAccess.jsx', import.meta.url), 'utf8');
  const recovery = readFileSync(new URL('./PasswordRecovery.jsx', import.meta.url), 'utf8');
  assert.match(access, /¿Olvidaste tu contraseña\?/);
  assert.match(access, /passwordResetTokenFromUrl\(location\)/);
  assert.match(access, /capturePasswordResetLink\(\)/);
  assert.match(access, /clearPasswordResetLink\(\)/);
  assert.match(access, /readPasswordResetToken\(\)/);
  assert.match(access, /if\(resetToken\)return;api\('\/api\/health'/);
  assert.match(access, /if\(resetToken\|\|recoveryMode\|\|invalidResetLink\)return <PasswordRecovery/);
  assert.match(recovery, /password-reset\/request/);
  assert.match(recovery, /password-reset\/complete/);
  assert.match(recovery, /El enlace no es válido/);
  assert.match(recovery, /Solicitar un enlace nuevo/);
  assert.match(access, /hasInvalidPasswordResetToken\(location\)/);
  assert.match(recovery, /Las contraseñas no coinciden/);
  assert.match(recovery, /Si el correo corresponde a una cuenta/);
  assert.match(recovery, /role="status"/);
  assert.match(recovery, /role="alert"/);
});

test('password recovery explains its dependency on a configured server mail transport', () => {
  const access = readFileSync(new URL('./AccountAccess.jsx', import.meta.url), 'utf8');
  const recovery = readFileSync(new URL('./PasswordRecovery.jsx', import.meta.url), 'utf8');
  assert.match(access, /La recuperación de cuenta depende de que el correo esté configurado en el servidor/);
  assert.match(recovery, /cuando el servicio de correo esté disponible/);
});
