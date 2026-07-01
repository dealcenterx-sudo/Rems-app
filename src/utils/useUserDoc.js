import { useUser } from '../contexts/UserContext';

/**
 * Returns { userDoc, userDocLoading } for the signed-in user.
 * Thin wrapper over UserContext, kept for existing call sites.
 */
const useUserDoc = () => {
  const { userDoc, userDocLoading } = useUser();
  return { userDoc, userDocLoading };
};

export default useUserDoc;
