"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, signOut, type Auth } from "firebase/auth";

/** Public Firebase web config. These values are loaded from environment variables. */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "arcion-ecommerce-8b2.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "arcion-ecommerce-8b2",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "arcion-ecommerce-8b2.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "634571621217",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:634571621217:web:65ecc4c00bbf2c496f7b20",
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey);
}

export function firebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function firebaseAuth(): Auth {
  return getAuth(firebaseApp());
}

export async function signOutFirebase(): Promise<void> {
  try {
    if (!firebaseConfig.apiKey) return;
    await signOut(firebaseAuth());
  } catch {
    /* no Google session is fine */
  }
}

export async function leaveShop(): Promise<void> {
  await fetch("/api/auth/signout", { method: "POST" });
  await signOutFirebase();
}
