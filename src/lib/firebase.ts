// Firebase singleton — config is sourced from APP_DATA_0 (single source of truth).
// Web API keys are safe to ship in client code (they're domain-restricted).
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { APP_DATA_0 } from "@/lib/fabrixa/APP_DATA_0";

const firebaseConfig = APP_DATA_0.db.firebase;

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

function getApp(): FirebaseApp {
  if (app) return app;
  app = getApps()[0] ?? initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth(): Auth {
  if (typeof window === "undefined") throw new Error("Firebase auth is browser-only");
  if (!authInstance) authInstance = getAuth(getApp());
  return authInstance;
}

export function getDb(): Firestore {
  if (typeof window === "undefined") throw new Error("Firestore is browser-only");
  if (!dbInstance) dbInstance = getFirestore(getApp());
  return dbInstance;
}

export const googleProvider = new GoogleAuthProvider();
