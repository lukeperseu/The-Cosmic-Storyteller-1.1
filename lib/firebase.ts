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

// Configuração do Firebase utilizando Variáveis de Ambiente do Vite (Seguro contra vazamentos no GitHub)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Inicializa o aplicativo Firebase evitando múltiplas instâncias (Singleton pattern)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Inicialização do Firestore (suporta banco de dados padrão ou customizado via variável opcional)
export const db = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID
  ? getFirestore(app, import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID)
  : getFirestore(app);

// Inicialização da Autenticação e Provedor Google
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configuração personalizada de escopos e parâmetros para o Auth do Google
googleProvider.addScope("profile");
googleProvider.addScope("email");
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Funções utilitárias para gerenciar o usuário atual
export function getCurrentUserId(): string | null {
  return auth.currentUser ? auth.currentUser.uid : null;
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

// Re-exportações dos métodos de autenticação para uso nos componentes
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