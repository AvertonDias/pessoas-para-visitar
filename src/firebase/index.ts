'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  // Check for API key first in dev mode
  if (process.env.NODE_ENV !== 'production' && !firebaseConfig.apiKey) {
      // This is a special return case to be handled by the provider.
      return { error: 'API_KEY_MISSING' };
  }
  
  if (getApps().length) {
    const app = getApp();
    return { ...getSdks(app), error: null };
  }
  
  // In a deployed Firebase App Hosting environment, initializeApp() will automatically
  // use the correct configuration. In a local environment, it will fallback to
  // using the firebaseConfig object.
  let firebaseApp;
  try {
    // Attempt to initialize via Firebase App Hosting environment variables
    firebaseApp = initializeApp();
  } catch (e) {
    // This will use the config from src/firebase/config.ts, which reads from .env.local
    firebaseApp = initializeApp(firebaseConfig);
  }

  return { ...getSdks(firebaseApp), error: null };
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
