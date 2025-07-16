import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth as firebaseAuth, isFirebaseConfigured } from '../services/firebase';
import { FirebaseUser } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  loading: boolean;
  signup: (email: string, pass: string) => Promise<any>;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => Promise<void>;
  isFirebaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const unconfiguredError = () => Promise.reject(new Error("Firebase is not configured. Please add your project credentials in 'services/firebase.ts'."));

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !firebaseAuth) {
      setLoading(false);
      return;
    }
    
    // Set a timeout to prevent the app from hanging if Firebase connection fails.
    const authTimeout = setTimeout(() => {
        console.warn("Firebase auth state check timed out after 15 seconds. Assuming no user is logged in.");
        setLoading(false);
    }, 15000); // 15-second timeout

    const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
      clearTimeout(authTimeout); // Clear timeout if auth resolves
      setCurrentUser(user);
      setLoading(false);
    });

    return () => {
        unsubscribe();
        clearTimeout(authTimeout);
    };
  }, []);

  const signup = (email: string, pass: string) => {
    if (!isFirebaseConfigured || !firebaseAuth) return unconfiguredError();
    return firebaseAuth.createUserWithEmailAndPassword(email, pass);
  };

  const login = (email: string, pass: string) => {
    if (!isFirebaseConfigured || !firebaseAuth) return unconfiguredError();
    return firebaseAuth.signInWithEmailAndPassword(email, pass);
  };
  
  const logout = () => {
    if (!isFirebaseConfigured || !firebaseAuth) return unconfiguredError() as Promise<void>;
    return firebaseAuth.signOut();
  };

  const value = {
    currentUser,
    loading,
    signup,
    login,
    logout,
    isFirebaseConfigured,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};