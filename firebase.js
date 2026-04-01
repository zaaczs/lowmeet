import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

// ✅ Configuração vinda do console do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDn9ft69vsIpoAuPSnOqi6Ibvg3mnFi1pM",
  authDomain: "lowmeet-3027c.firebaseapp.com",
  projectId: "lowmeet-3027c",
  storageBucket: "lowmeet-3027c.appspot.com",
  messagingSenderId: "912377270301",
  appId: "1:912377270301:web:86cf0a2e4df5d108beb6f4",
};

// Inicialização do Firebase App
const app = initializeApp(firebaseConfig);

// Exports para uso no projeto
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const storage = getStorage(app);
