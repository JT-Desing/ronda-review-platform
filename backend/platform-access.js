// Opt-in deployment setting. No signup or workspace role can grant this role.
export function withPlatformRole(user, configuredIds=process.env.RONDA_SUPERADMIN_IDS || '') {
  if (!user) return null;
  const ids=new Set(configuredIds.split(',').map(value=>value.trim()).filter(Boolean));
  return {...user,platformRole:ids.has(user.id)?'superadmin':'user'};
}
