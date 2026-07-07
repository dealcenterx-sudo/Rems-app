// Client-side constants shared across REMS.
// ADMIN_EMAIL is used for UI defaults and operator-owned workflows.
export const ADMIN_EMAIL = 'dealcenterx@gmail.com';

export const ROLES = ['admin', 'agent', 'buyer', 'seller'];

// Roles a user may pick for themselves at signup. Admin is never
// self-service; Firestore rules also reject role: 'admin' on create.
export const SELF_SERVICE_ROLES = ['agent', 'buyer', 'seller'];
