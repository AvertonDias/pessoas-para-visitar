'use client';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { ListTodo } from 'lucide-react';
import { useFirebaseApp } from '@/firebase';

export function Login() {
  const app = useFirebaseApp();
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  const signIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      // Don't log an error if the user cancels the popup
      if (error.code !== 'auth/cancelled-popup-request') {
        console.error("Error signing in with Google", error);
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
            <ListTodo className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Bem-vindo ao ListaNomes
        </h1>
        <p className="text-muted-foreground">
          Faça login para acessar sua lista de nomes.
        </p>
        <Button onClick={signIn} className="w-full">
          Entrar com Google
        </Button>
      </div>
    </div>
  );
}
