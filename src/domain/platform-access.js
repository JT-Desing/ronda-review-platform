// Platform privileges come from the authenticated session, never workspace data.
export const canAccessCompanyDemo = user => user?.platformRole === 'superadmin';
export const canAccessStudioView=(user,view)=>!['settings','branding','platform'].includes(view)||canAccessCompanyDemo(user);
