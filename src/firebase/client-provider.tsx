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
      backgroundColor: 'hsl(38 92% 95%)', // Muted yellow
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
          As chaves de configuração do seu projeto Firebase não foram encontradas. Isso geralmente acontece por um dos seguintes motivos:
        </p>

        <div style={{ marginTop: '1.5rem', textAlign: 'left', borderTop: '1px solid #E5E7EB', paddingTop: '1.5rem' }}>
            <h2 style={{fontSize: '1.2rem', fontWeight: 'bold' }}>Cenário 1: Ambiente de Produção (Vercel, Netlify, etc.)</h2>
            <p style={{marginTop: '0.5rem'}}>
                Se você está vendo este erro após publicar seu site, é porque as <strong>variáveis de ambiente</strong> do Firebase não foram configuradas no seu serviço de hospedagem.
            </p>
             <ol style={{ marginTop: '0.75rem', listStyle: 'decimal', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li>Abra o painel de controle do seu projeto no serviço de hospedagem (ex: Vercel).</li>
                <li>Vá para as configurações do projeto e encontre a seção "Environment Variables" (Variáveis de Ambiente).</li>
                <li>
                    Adicione todas as variáveis que começam com <code>NEXT_PUBLIC_FIREBASE_</code> do seu arquivo local <code>.env.local</code>. Certifique-se de copiar os nomes e os valores exatamente.
                </li>
                 <li>Após adicionar as variáveis, acione um "Redeploy" (republicar) da sua aplicação para que as alterações tenham efeito.</li>
            </ol>
        </div>
        
        <div style={{ marginTop: '1.5rem', textAlign: 'left', borderTop: '1px solid #E5E7EB', paddingTop: '1.5rem' }}>
            <h2 style={{fontSize: '1.2rem', fontWeight: 'bold' }}>Cenário 2: Ambiente de Desenvolvimento Local</h2>
            <p style={{marginTop: '0.5rem'}}>
                Se você está vendo este erro no seu computador local (<code>localhost</code>), provavelmente o arquivo de configuração <code>.env.local</code> está ausente ou incompleto.
            </p>
            <ol style={{ marginTop: '0.5rem', listStyle: 'decimal', paddingLeft: '1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li>
                Na pasta principal do seu projeto, crie um novo arquivo chamado <strong><code>.env.local</code></strong> se ele não existir.
              </li>
              <li>
                Se houver um arquivo <strong><code>.env.example</code></strong>, copie seu conteúdo para o novo arquivo <strong><code>.env.local</code></strong>.
              </li>
              <li>
                Preencha todas as variáveis (como <code>NEXT_PUBLIC_FIREBASE_API_KEY</code>) com suas chaves reais do Firebase.
              </li>
              <li>
                <strong>Reinicie o seu servidor de desenvolvimento</strong> (Pare-o com <code>Ctrl+C</code> e inicie-o novamente com <code>npm run dev</code>).
              </li>
            </ol>
        </div>
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
      backgroundColor: 'hsl(0 84% 97%)', // Muted red
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
          Ocorreu o erro <strong>(auth/invalid-api-key)</strong>. Isso significa que a chave de API (<code>NEXT_PUBLIC_FIREBASE_API_KEY</code>) usada para conectar ao Firebase não é válida.
        </p>

        <div style={{ marginTop: '1.5rem', textAlign: 'left', borderTop: '1px solid #E5E7EB', paddingTop: '1.5rem' }}>
            <h2 style={{fontSize: '1.2rem', fontWeight: 'bold' }}>Cenário 1: Ambiente de Produção (Vercel, Netlify, etc.)</h2>
            <p style={{marginTop: '0.5rem'}}>
                Se você está vendo este erro após publicar seu site, é porque a <strong>variável de ambiente</strong> não foi configurada corretamente no seu serviço de hospedagem.
            </p>
             <ol style={{ marginTop: '0.75rem', listStyle: 'decimal', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li>Abra o painel de controle do seu projeto no serviço de hospedagem (ex: Vercel).</li>
                <li>Vá para as configurações do projeto e encontre a seção "Environment Variables" (Variáveis de Ambiente).</li>
                <li>
                    Verifique se a variável <code>NEXT_PUBLIC_FIREBASE_API_KEY</code> existe e se seu valor está <strong>exatamente</strong> igual ao do seu painel do Firebase.
                </li>
                 <li>Após corrigir a variável, acione um "Redeploy" (republicar) da sua aplicação para que as alterações tenham efeito.</li>
            </ol>
        </div>
        
        <div style={{ marginTop: '1.5rem', textAlign: 'left', borderTop: '1px solid #E5E7EB', paddingTop: '1.5rem' }}>
            <h2 style={{fontSize: '1.2rem', fontWeight: 'bold' }}>Cenário 2: Ambiente de Desenvolvimento Local</h2>
            <p style={{marginTop: '0.5rem'}}>
                Se você está vendo este erro no seu computador local (<code>localhost</code>), verifique seu arquivo <code>.env.local</code>.
            </p>
            <ol style={{ marginTop: '0.5rem', listStyle: 'decimal', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li>
                Confira se o valor de <code>NEXT_PUBLIC_FIREBASE_API_KEY</code> está copiado <strong>exatamente</strong> como aparece no seu painel do Firebase, sem espaços ou caracteres extras.
              </li>
              <li>
                Se você expôs sua chave publicamente, <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'underline', color: '#1D4ED8'}}>regenere-a</a> e atualize o valor.
              </li>
              <li>
                Após corrigir o arquivo, <strong>reinicie o seu servidor de desenvolvimento</strong> (Pare-o com <code>Ctrl+C</code> e inicie-o novamente com <code>npm run dev</code>).
              </li>
            </ol>
        </div>

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
