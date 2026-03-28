'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword } from 'firebase/auth';
import { useFirebaseApp, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListTodo } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function RegisterPage() {
  const app = useFirebaseApp();
  const auth = getAuth(app);
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  
  const handleGoogleSignIn = async () => {
    setIsRegistering(true);
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
          title: "Erro no cadastro",
          description: description,
        });
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Error signing up with email", error);
       let description = "Ocorreu um erro ao criar sua conta.";
      if (error.code === 'auth/email-already-in-use') {
        description = "Este e-mail já está em uso por outra conta.";
      } else if (error.code === 'auth/weak-password') {
        description = "Sua senha é muito fraca. Use pelo menos 6 caracteres.";
      }
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description,
      });
    } finally {
      setIsRegistering(false);
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
          <CardTitle className="text-2xl">Crie sua conta</CardTitle>
          <CardDescription>Insira seus dados para se cadastrar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isRegistering}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isRegistering}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isRegistering}>
              {isRegistering ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
          </form>
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou cadastre-se com
              </span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isRegistering}>
            Google
          </Button>

          <div className="mt-4 text-center text-sm">
            Já tem uma conta?{" "}
            <Link href="/login" className="underline">
              Faça login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
