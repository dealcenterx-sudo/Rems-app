import { useEffect, useRef } from 'react';
import { auth } from '../firebase';
import { useUser } from '../contexts/UserContext';
import { useToast } from './Toast';

// Consumes a ?invite=TOKEN URL parameter once the user is signed in:
// calls /api/accept-invite, which links their account to the deal.
const InviteAcceptor = ({ onAccepted }) => {
  const { user, refreshUserDoc } = useUser();
  const toast = useToast();
  const attempted = useRef(false);

  useEffect(() => {
    if (!user || attempted.current) return;
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite');
    if (!inviteToken) return;
    attempted.current = true;

    const accept = async () => {
      try {
        const token = await auth.currentUser.getIdToken();
        const response = await fetch('/api/accept-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ inviteToken })
        });
        const data = await response.json().catch(() => ({}));

        // Clear the param either way so a refresh doesn't retry a dead token.
        const url = new URL(window.location.href);
        url.searchParams.delete('invite');
        window.history.replaceState(null, '', url.toString());

        if (!response.ok) {
          toast.error(data.error || 'Could not accept the invite');
          return;
        }

        await refreshUserDoc();
        toast.success(
          data.propertyAddress
            ? `You've been added to "${data.propertyAddress}"`
            : "You've been added to the deal"
        );
        if (data.dealId) onAccepted?.(data.dealId);
      } catch (error) {
        console.error('Invite accept failed:', error);
        toast.error('Could not accept the invite — please try the link again');
      }
    };
    accept();
  }, [user, toast, refreshUserDoc, onAccepted]);

  return null;
};

export default InviteAcceptor;
