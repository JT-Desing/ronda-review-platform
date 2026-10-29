// Bump when docs/legal changes in a way that needs a new authorization.
export const PRIVACY_POLICY_VERSION = '1.0';
const consentError = () => Object.assign(new Error('Para continuar, acepta la política de tratamiento de datos.'), { status: 400 });

export const acceptedPrivacy = input => input?.acceptPrivacy === true;
export function requirePrivacyAcceptance(input) {
  if (!acceptedPrivacy(input)) throw consentError();
}
// Public shape of an account: the stored version becomes a yes/no for the current policy.
export function withPrivacy(user) {
  if (!user) return user;
  const { privacy_version: version, ...rest } = user;
  return { ...rest, privacyAccepted: version === PRIVACY_POLICY_VERSION };
}
export async function recordPrivacyAcceptance(db, userId) {
  await db.query('UPDATE users SET privacy_version=$2,privacy_accepted_at=now() WHERE id=$1', [userId, PRIVACY_POLICY_VERSION]);
}
