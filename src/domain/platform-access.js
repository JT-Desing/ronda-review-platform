// Platform privileges come from the authenticated session, never workspace data.
export const canAccessCompanyDemo = user => user?.platformRole === 'superadmin';
export const canAccessStudioView=(user,view)=>!['team','settings','branding'].includes(view)||canAccessCompanyDemo(user);
