import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';

/**
 * Loads the Firestore users/{uid} document for the signed-in user.
 * Returns { userDoc, userDocLoading }. userDoc is null while loading,
 * signed out, or if the document does not exist yet.
 * Will be superseded by UserContext once it lands.
 */
const useUserDoc = () => {
  const [userDoc, setUserDoc] = useState(null);
  const [userDocLoading, setUserDocLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUserDoc(null);
        setUserDocLoading(false);
        return;
      }
      try {
        const snapshot = await getDoc(doc(db, 'users', currentUser.uid));
        setUserDoc(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
      } catch (error) {
        console.error('Error loading user document:', error);
        setUserDoc(null);
      } finally {
        setUserDocLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { userDoc, userDocLoading };
};

export default useUserDoc;
