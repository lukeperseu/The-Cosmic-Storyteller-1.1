'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  User,
} from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (e: string, p: string) => Promise<void>;
  registerWithEmail: (e: string, p: string, name: string) => Promise<void>;
  loginAsGuest: (name?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: async () => {},
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  loginAsGuest: () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [guestUser, setGuestUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedGuest = localStorage.getItem('cosmic_guest_user');
      if (savedGuest) {
        try {
          const parsed = JSON.parse(savedGuest);
          queueMicrotask(() => setGuestUser(parsed));
        } catch (e) {
          localStorage.removeItem('cosmic_guest_user');
        }
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setGuestUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cosmic_guest_user');
        }
      } else {
        setUser(null);
      }
      setLoading(false);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('auth-changed', {
            detail: { user: currentUser },
          })
        );
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        console.warn('Pop-up do Google bloqueado. Tentando signInWithRedirect...');
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: any) {
          console.warn('Erro ao redirecionar para Google Login:', redirectErr);
          throw redirectErr;
        }
      }
      console.warn('Erro ao fazer login com Google:', error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      console.warn('Erro ao fazer login com e-mail:', error);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (res.user && name) {
        await updateProfile(res.user, { displayName: name });
      }
    } catch (error: any) {
      console.warn('Erro ao registrar com e-mail:', error);
      throw error;
    }
  };

  const loginAsGuest = (guestName?: string) => {
    const guest: any = {
      uid: 'guest_' + Date.now(),
      displayName: guestName || 'Aventureiro Convidado',
      email: 'convidado@cosmos.local',
      photoURL: null,
      isAnonymous: true,
    };
    setGuestUser(guest);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cosmic_guest_user', JSON.stringify(guest));
      window.dispatchEvent(
        new CustomEvent('auth-changed', {
          detail: { user: guest },
        })
      );
    }
  };

  const logout = async () => {
    try {
      setGuestUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cosmic_guest_user');
        window.dispatchEvent(
          new CustomEvent('auth-changed', {
            detail: { user: null },
          })
        );
      }
      await signOut(auth);
    } catch (error: any) {
      console.warn('Erro ao fazer logout:', error);
    }
  };

  const activeUser = user || guestUser;

  return (
    <AuthContext.Provider
      value={{
        user: activeUser,
        loading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        loginAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
