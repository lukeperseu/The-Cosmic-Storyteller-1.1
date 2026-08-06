// Importações essenciais do Firebase SDK
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  User,
} from "firebase/auth";

// Configuração do Firebase utilizando Variáveis de Ambiente do Next.js
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Inicializa o aplicativo Firebase evitando múltiplas instâncias duplicadas (Padrão Singleton)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Inicialização segura do Firestore
export const db = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID
  ? getFirestore(app, process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID)
  : getFirestore(app);

// Inicialização da Autenticação e Provedor do Google
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configurações personalizadas para o login com Google
googleProvider.addScope("profile");
googleProvider.addScope("email");
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Funções utilitárias auxiliares para manipulação de sessão
export function getCurrentUserId(): string | null {
  return auth.currentUser ? auth.currentUser.uid : null;
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

// Re-exportações dos métodos de autenticação para uso nos componentes do app
export {
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
};
export type { User };