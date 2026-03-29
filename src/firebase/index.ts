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
  
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  try {
    // getAuth() can throw if the API key is invalid on initialization.
    return { ...getSdks(app), error: null };
  } catch (e: any) {
    if (e.code === 'auth/invalid-api-key') {
      return { error: 'API_KEY_INVALID' };
    }
    // Re-throw other unexpected errors so they are not silently swallowed.
    throw e;
  }
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
