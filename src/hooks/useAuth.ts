import { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';

// Extend the Firebase User type with our custom properties
export interface CustomUser extends FirebaseUser {
  leetcodeUsername?: string;
  hackerrankUsername?: string;
  codechefUsername?: string;
}

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user as CustomUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = () => {
    return firebaseSignOut(auth);
  };

  return {
    user: currentUser,
    loading,
    signOut
  };
}; 