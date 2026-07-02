import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

/**
 * Append an entry to the activity_log audit trail. Fire-and-forget:
 * logging must never block or break the action being logged.
 *
 * logActivity('status_changed', 'deal', dealId, 'Deal marked Closed', { oldValue: 'active', newValue: 'closed' })
 */
export const logActivity = (action, entity, entityId, description, changes = null) => {
  const user = auth.currentUser;
  if (!user) return;

  addDoc(collection(db, 'activity_log'), {
    userId: user.uid,
    userEmail: user.email || '',
    action,
    entity,
    entityId: entityId || null,
    description: description || '',
    changes,
    createdAt: new Date().toISOString()
  }).catch((error) => {
    console.error('Failed to write activity log entry:', error);
  });
};
