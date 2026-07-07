// Shared serverless config for REMS API functions.
// ADMIN_EMAIL is used for operator-owned server workflows and admin-only
// diagnostics. Firestore admin access is role-document based.
const ADMIN_EMAIL = 'dealcenterx@gmail.com';

// Firebase public web API key. It is used only for Identity Toolkit token
// lookup and falls back to the checked-in public client key during rollout.
const FIREBASE_API_KEY =
  process.env.FIREBASE_API_KEY || 'AIzaSyCI2EX7aR0ZphG36_IlUQqt0nFozedj5pI';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dcirl3j3v';

module.exports = { ADMIN_EMAIL, CLOUDINARY_CLOUD_NAME, FIREBASE_API_KEY };
