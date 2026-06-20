'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { motion } from 'framer-motion';
import Image from 'next/image';

function MissingApiKeyMessage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '1rem',
      backgroundColor: 'hsl(38 92% 95%)',
      color: 'hsl(38 92% 30%)',
      fontFamily: 'sans-serif',
      textAlign: 'center'
    }}>
      <div style={{
        maxWidth: '700px',
        border: '1px solid hsl(38 92% 80%)',
        borderRadius: '0.5rem',
        padding: '2rem',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'hsl(38 92% 40%)' }}>
          Configuração do Firebase Incompleta
        </h1>
        <p style={{ marginTop: '1rem', textAlign: 'left', lineHeight: '1.5' }}>
          As chaves de configuração do seu projeto Firebase não foram encontradas.
        </p>
      </div>
    </div>
  );
}

function InvalidApiKeyMessage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '1rem',
      backgroundColor: 'hsl(0 84% 97%)',
      color: 'hsl(0 72% 30%)',
      fontFamily: 'sans-serif',
      textAlign: 'center'
    }}>
      <div style={{
        maxWidth: '700px',
        border: '1px solid hsl(0 84% 85%)',
        borderRadius: '0.5rem',
        padding: '2rem',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'hsl(0 72% 50%)' }}>
          Chave de API do Firebase Inválida
        </h1>
        <p style={{ marginTop: '1rem', textAlign: 'left', lineHeight: '1.5' }}>
          Ocorreu o erro <strong>(auth/invalid-api-key)</strong>.
        </p>
      </div>
    </div>
  );
}

interface FirebaseClientProviderProps {
  children: ReactNode;
}

type FirebaseServices = {
  firebaseApp?: any;
  auth?: any;
  firestore?: any;
  error?: 'API_KEY_MISSING' | 'API_KEY_INVALID' | null;
};

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [firebaseServices, setFirebaseServices] = useState<FirebaseServices | null>(null);

  useEffect(() => {
    setFirebaseServices(initializeFirebase());
  }, []);

  if (!firebaseServices) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background">
            <motion.div
                initial={{ scale: 0.95, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                    duration: 1,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    ease: 'easeInOut',
                }}
            >
                <Image
                    src="/icons/Icon.png"
                    alt="Logotipo do aplicativo"
                    width={250}
                    height={250}
                    style={{ width: 'auto', height: 'auto' }}
                    priority
                />
            </motion.div>
            <p className="text-lg text-muted-foreground mt-8">Carregando...</p>
        </div>
    );
  }

  if (firebaseServices.error === 'API_KEY_MISSING') {
    return <MissingApiKeyMessage />;
  }

  if (firebaseServices.error === 'API_KEY_INVALID') {
    return <InvalidApiKeyMessage />;
  }

  const { firebaseApp, auth, firestore } = firebaseServices;

  return (
    <FirebaseProvider
      firebaseApp={firebaseApp}
      auth={auth}
      firestore={firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
