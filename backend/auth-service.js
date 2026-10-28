import { hashPassword, verifyPassword } from './security.js';
const invalid = (message, status) => Object.assign(new Error(message), { status });
export function authService(users) {
  return {
    async register({ email, password, name }) {
      if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) throw invalid('Indica tu nombre (máximo 100 caracteres).', 400);
      try { return await users.createWithWorkspace({ email, name: name.trim(), passwordHash: await hashPassword(password) }); }
      catch (error) {
        if (error.code === '23505') throw invalid('No se pudo crear la cuenta. Intenta iniciar sesión.', 409);
        throw error;
      }
    },
    async login({ email, password }) {
      const user = await users.findByEmail(email);
      const dummy = '00000000000000000000000000000000:' + '00'.repeat(64);
      const valid = await verifyPassword(password, user?.password_hash ?? dummy);
      if (!valid || !user) throw invalid('Correo o contraseña incorrectos.', 401);
      const { password_hash, ...safe } = user;
      return safe;
    },
  };
}
