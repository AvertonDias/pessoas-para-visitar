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
import { ListTodo } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const app = useFirebaseApp();
  const auth = getAuth(app);
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useUser();

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
          description = "Este domínio não está autorizado para autenticação. Verifique as configurações do seu projeto Firebase.";
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


  if (loading || user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <p className="text-lg text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
           <div className="flex justify-center mb-4">
            <ListTodo className="h-12 w-12 text-primary" />
        </div>
          <CardTitle className="text-2xl">Bem-vindo de volta!</CardTitle>
          <CardDescription>Faça login para continuar no ListaNomes.</CardDescription>
        </CardHeader>
        <CardContent>
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
              {isSigningIn ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou continue com
              </span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isSigningIn}>
            Google
          </Button>

          <div className="mt-4 text-center text-sm">
            Não tem uma conta?{" "}
            <Link href="/register" className="underline">
              Cadastre-se
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
