// Platform privileges come from the authenticated session, never workspace data.
export const canAccessCompanyDemo = user => user?.platformRole === 'superadmin';
