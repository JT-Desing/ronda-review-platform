const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createInvitationLink(origin, token) {
  if (!TOKEN_PATTERN.test(String(token || ''))) throw new TypeError('Invalid invitation token');
  const url = new URL('/', origin);
  if (!['http:', 'https:'].includes(url.protocol)) throw new TypeError('Invalid invitation origin');
  url.hash = `invite/${token}`;
  return url.href;
}
