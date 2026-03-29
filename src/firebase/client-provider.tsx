'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

function MissingApiKeyMessage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '1rem',
      backgroundColor: '#FEF2F2', // Red 50
      color: '#7F1D1D', // Red 900
      fontFamily: 'sans-serif',
      textAlign: 'center'
    }}>
      <div style={{
        maxWidth: '650px',
        border: '1px solid #FECACA', // Red 300
        borderRadius: '0.5rem',
        padding: '2rem',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#B91C1C' /* Red 700 */ }}>
          Configuração do Firebase Incompleta
        </h1>
        <p style={{ marginTop: '1rem', textAlign: 'left' }}>
          A chave de API (API Key) do seu projeto Firebase não foi encontrada. Isso geralmente acontece porque o arquivo de configuração de ambiente (<code>.env.local</code>) está ausente ou incorreto.
        </p>
        <p style={{ marginTop: '1rem', fontWeight: 'bold', textAlign: 'left' }}>
          Para corrigir o problema, siga estes passos:
        </p>
        <ol style={{ marginTop: '0.5rem', listStyle: 'decimal', paddingLeft: '1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <li>
            Na pasta principal do seu projeto, crie um novo arquivo chamado <strong><code>.env.local</code></strong>.
          </li>
          <li>
            Abra o arquivo <strong><code>.env.example</code></strong> que está no seu projeto, copie todo o seu conteúdo.
          </li>
          <li>
            Cole o conteúdo copiado no seu novo arquivo <strong><code>.env.local</code></strong>.
          </li>
          <li>
            Substitua o valor de <code>NEXT_PUBLIC_FIREBASE_API_KEY</code> pela sua chave de API real do Firebase. É altamente recomendado que você <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'underline', color: '#1D4ED8'}}>regenere a chave</a> que foi exposta publicamente.
          </li>
          <li>
            <strong>Reinicie o seu servidor de desenvolvimento.</strong> (Pare-o com <code>Ctrl+C</code> e inicie-o novamente com <code>npm run dev</code>).
          </li>
        </ol>
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
      backgroundColor: '#FEF2F2',
      color: '#7F1D1D',
      fontFamily: 'sans-serif',
      textAlign: 'center'
    }}>
      <div style={{
        maxWidth: '650px',
        border: '1px solid #FECACA',
        borderRadius: '0.5rem',
        padding: '2rem',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#B91C1C' }}>
          Chave de API do Firebase Inválida
        </h1>
        <p style={{ marginTop: '1rem', textAlign: 'left' }}>
          Ocorreu o erro <strong>(auth/invalid-api-key)</strong>. Isso significa que a chave de API que você forneceu no seu arquivo <code>.env.local</code> não é válida.
        </p>
        <p style={{ marginTop: '1rem', fontWeight: 'bold', textAlign: 'left' }}>
          Para corrigir, por favor verifique o seguinte:
        </p>
        <ol style={{ marginTop: '0.5rem', listStyle: 'decimal', paddingLeft: '1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <li>
            Abra seu arquivo <strong><code>.env.local</code></strong>.
          </li>
          <li>
            Confira se o valor de <code>NEXT_PUBLIC_FIREBASE_API_KEY</code> está copiado <strong>exatamente</strong> como aparece no seu painel do Firebase, sem caracteres extras ou faltando.
          </li>
          <li>
            Certifique-se de que você está usando a chave de API <strong>nova</strong> que você <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'underline', color: '#1D4ED8'}}>regenerou</a> após o alerta de segurança.
          </li>
          <li>
            Após corrigir o arquivo, <strong>reinicie o seu servidor de desenvolvimento</strong> (Pare-o com <code>Ctrl+C</code> e inicie-o novamente com <code>npm run dev</code>).
          </li>
        </ol>
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
    // This ensures Firebase is initialized only on the client side, after hydration.
    setFirebaseServices(initializeFirebase());
  }, []);

  // During server-side rendering and initial client-side render before useEffect runs,
  // we can show a loading state.
  if (!firebaseServices) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: '#EBF3F8',
            color: '#333',
            fontFamily: 'sans-serif'
        }}>
            <p style={{fontSize: '1.2rem'}}>Carregando...</p>
        </div>
    );
  }

  if (firebaseServices.error === 'API_KEY_MISSING') {
    return <MissingApiKeyMessage />;
  }

  if (firebaseServices.error === 'API_KEY_INVALID') {
    return <InvalidApiKeyMessage />;
  }

  // The type assertion is safe because if error is not 'API_KEY_MISSING', the services will exist.
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
