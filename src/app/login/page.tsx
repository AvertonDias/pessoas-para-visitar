'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { useFirebaseApp, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const app = useFirebaseApp();
  const auth = getAuth(app);
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request') {
        console.error("Error signing in with Google", error);
        let description = "Não foi possível entrar com o Google.";
        if (error.code === 'auth/unauthorized-domain') {
          description = "Este domínio não está autorizado. Por favor, verifique as configurações de domínio autorizado no seu Console do Firebase.";
        }
        toast({
          variant: "destructive",
          title: "Erro no login",
          description: description,
        });
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Error signing in with email", error);
      let description = "Ocorreu um erro. Verifique seu e-mail e senha.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = "E-mail ou senha inválidos.";
      }
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: description,
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);


  if (isUserLoading || user) {
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
           <div className="flex justify-center mb-4">
            <Image
                src="/icons/Icon.png"
                alt="Logotipo do aplicativo"
                width={48}
                height={48}
                priority
            />
        </div>
          <CardTitle className="text-2xl">Bem-vindo de volta!</CardTitle>
          <CardDescription>Faça login para cadastrar as Visitas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isSigningIn}>
            <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.27 1.44-1.14 2.73-2.43 3.57v2.78h3.57c2.18-2 3.44-5.02 3.44-8.63 0-.82-.07-1.62-.2-2.42H12.48z" fill="#4285F4"/><path d="M12.48 24c3.24 0 5.94-1.08 7.92-2.92l-3.57-2.78c-1.08.72-2.46 1.16-4.35 1.16-3.12 0-5.78-2.1-6.73-4.96H2.2v2.86A11.974 11.974 0 0 0 12.48 24z" fill="#34A853"/><path d="M5.75 14.08c-.22-.66-.35-1.36-.35-2.08s.13-1.42.35-2.08V7.06H2.2C1.43 8.52 1 10.2 1 12c0 1.8.43 3.48 1.2 4.94l3.55-2.86z" fill="#FBBC05"/><path d="M12.48 5.4c1.77 0 3.24.67 4.4 1.8l3.15-3.15C18.42 2.18 15.72 1 12.48 1 8.04 1 4.12 3.66 2.2 7.5l3.55 2.86c.94-2.86 3.6-4.96 6.73-4.96z" fill="#EA4335"/></svg>
            <span>
              Continuar com&nbsp;
              <span className="font-medium">
                <span className="text-[#4285F4]">G</span><span className="text-[#EA4335]">o</span><span className="text-[#FBBC05]">o</span><span className="text-[#4285F4]">g</span><span className="text-[#34A853]">l</span><span className="text-[#EA4335]">e</span>
              </span>
            </span>
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Ou com e-mail
              </span>
            </div>
          </div>
          
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSigningIn}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSigningIn}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSigningIn}>
              {isSigningIn ? 'Entrando...' : 'Entrar com E-mail'}
            </Button>
          </form>
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Não tem uma conta?
              </span>
            </div>
          </div>
           <Button variant="secondary" className="w-full" asChild>
              <Link href="/register">Criar conta</Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
