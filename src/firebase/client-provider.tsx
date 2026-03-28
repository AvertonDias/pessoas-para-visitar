'use client';

import { initializeFirebase } from '.';
import { FirebaseProvider } from './provider';
import { firebaseConfig } from './config';

// This provider is responsible for initializing Firebase on the client side.
// It should be used as a wrapper around the root layout of the application.
// It ensures that Firebase is initialized only once.
export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(firebaseConfig as any)?.projectId) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
        <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-8 text-center shadow-lg">
          <h1 className="text-2xl font-bold text-destructive">
            Erro de Configuração do Firebase
          </h1>
          <p className="text-muted-foreground">
            O projeto Firebase não está configurado corretamente. O `projectId`
            está faltando no objeto de configuração.
          </p>
          <p className="text-sm text-muted-foreground">
            Verifique o arquivo `src/firebase/config.ts`.
          </p>
        </div>
      </div>
    );
  }

  const { firebaseApp, firestore, auth } = initializeFirebase();
  return (
    <FirebaseProvider
      firebaseApp={firebaseApp}
      firestore={firestore}
      auth={auth}
    >
      {children}
    </FirebaseProvider>
  );
}
