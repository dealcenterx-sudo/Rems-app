import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth, ensureUserExists } from '../firebase';

// Single source of truth for the signed-in Firebase user and their
// Firestore users/{uid} document (role, assignedProperties, companyId).
const UserContext = createContext({
  user: null,
  userDoc: null,
  loading: true,
  userDocLoading: true,
  refreshUserDoc: () => {}
});

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userDocLoading, setUserDocLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setUserDoc(null);
        setLoading(false);
        setUserDocLoading(false);
        return;
      }

      try {
        const ensured = await ensureUserExists(currentUser);
        setUserDoc(ensured);
      } catch (error) {
        console.error('Error loading user document:', error);
        setUserDoc(null);
      } finally {
        setLoading(false);
        setUserDocLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Re-read the user doc, e.g. after the admin changes a role or assignment.
  const refreshUserDoc = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      const snapshot = await getDoc(doc(db, 'users', currentUser.uid));
      setUserDoc(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    } catch (error) {
      console.error('Error refreshing user document:', error);
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, userDoc, loading, userDocLoading, refreshUserDoc }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

export default UserContext;
