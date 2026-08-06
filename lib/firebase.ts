// Importações necessárias do Firebase SDK
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Objeto de configuração utilizando Variáveis de Ambiente do Vite
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta os serviços que você utiliza no projeto
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

// Custom OAuth Scope & Parameters for Google Auth
googleProvider.addScope("profile");
googleProvider.addScope("email");
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export function getCurrentUserId(): string | null {
  return auth.currentUser ? auth.currentUser.uid : null;
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

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
