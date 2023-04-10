import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

export const firebaseApp = initializeApp(
  JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG)
);

export const firebaseAuth = getAuth(firebaseApp);
