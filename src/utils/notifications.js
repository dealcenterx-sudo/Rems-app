import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

/**
 * Send an in-app notification to each recipient UID. Fire-and-forget —
 * notifying must never block or break the action that triggered it.
 * The sender is skipped automatically.
 *
 * notifyUsers([uid1, uid2], { type: 'deal-message', title: 'New message', body: '...', dealId })
 */
export const notifyUsers = (recipientIds, { type, title, body = '', dealId = null }) => {
  const actor = auth.currentUser;
  if (!actor) return;

  const recipients = [...new Set(recipientIds)].filter(
    (uid) => uid && uid !== actor.uid
  );

  recipients.forEach((recipientId) => {
    addDoc(collection(db, 'notifications'), {
      recipientId,
      actorId: actor.uid,
      actorEmail: actor.email || '',
      type,
      title,
      body,
      dealId,
      read: false,
      createdAt: new Date().toISOString()
    }).catch((error) => {
      console.error('Failed to send notification:', error);
    });
  });
};

/** Recipients for a deal event: the owning agent plus assigned portal users. */
export const dealRecipients = (deal) => [
  deal?.userId,
  ...(Array.isArray(deal?.participantIds) ? deal.participantIds : [])
];
