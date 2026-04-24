'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, UserCredential } from 'firebase/auth';
import { useFirebaseApp, useUser, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { processRegistration } from '@/lib/firebase-services';
import Image from 'next/image';
import { motion } from 'framer-motion';

function RegisterForm() {
  const app = useFirebaseApp();
  const firestore = useFirestore();
  const auth = getAuth(app);
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSuccessfulRegistration = async (credential: UserCredential, registrationName?: string | null) => {
    if (!firestore) {
      // This is a critical failure. Clean up the user and throw.
      await credential.user.delete().catch(e => console.error("Failed to clean up user after Firestore init failure", e));
      throw new Error("Ocorreu um erro inesperado: a conexão com o banco de dados falhou.");
    }
    try {
      await processRegistration(firestore, credential.user, inviteToken, registrationName);
    } catch (error) {
        // If profile creation fails (e.g., invalid invite), delete the auth user
        await credential.user.delete().catch(e => console.error("Failed to clean up user after registration failure", e));
        // Re-throw the original, more specific error to be displayed in the UI.
        throw error;
    }
  };
  
  const handleGoogleSignIn = async () => {
    setIsRegistering(true);
    const provider = new GoogleAuthProvider();
    try {
      const credential = await signInWithPopup(auth, provider);
      await handleSuccessfulRegistration(credential);
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        console.error("Error signing in with Google", error);
        let description = error.message || "Não foi possível entrar com o Google.";
        if (error.code === 'auth/unauthorized-domain') {
          description = "Este domínio não está autorizado. Por favor, verifique as configurações de domínio autorizado no seu Console do Firebase.";
        }
        toast({
          variant: "destructive",
          title: "Erro ao criar acesso",
          description: description,
        });
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() === '') {
      toast({
        variant: "destructive",
        title: "Nome obrigatório",
        description: "Por favor, preencha seu nome.",
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "As senhas não conferem",
        description: "Por favor, verifique se as senhas digitadas são iguais.",
      });
      return;
    }
    setIsRegistering(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await handleSuccessfulRegistration(credential, name);
    } catch (error: any) {
      console.error("Error signing up with email", error);
       let description = error.message || "Ocorreu um erro ao criar sua conta.";
      if (error.code === 'auth/email-already-in-use') {
        description = "Este e-mail já está em uso por outra conta.";
      } else if (error.code === 'auth/weak-password') {
        description = "Sua senha é muito fraca. Use pelo menos 6 caracteres.";
      }
      toast({
        variant: "destructive",
        title: "Erro ao criar acesso",
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
        <CardTitle className="text-2xl">Crie seu Acesso</CardTitle>
        <CardDescription>
          {inviteToken 
            ? 'Crie uma conta para aceitar o convite.' 
            : 'Salve seus dados criando uma conta com e-mail e senha ou usando o Google.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmailSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              type="text"
              placeholder="Seu nome completo"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isRegistering}
              autoComplete="name"
            />
          </div>
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
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isRegistering}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar Senha</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Repita a senha"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isRegistering}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isRegistering}>
            {isRegistering ? 'Criando...' : 'Criar Conta com E-mail'}
          </Button>
        </form>
        
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Ou crie com
            </span>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isRegistering}>
            <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.27 1.44-1.14 2.73-2.43 3.57v2.78h3.57c2.18-2 3.44-5.02 3.44-8.63 0-.82-.07-1.62-.2-2.42H12.48z" fill="#4285F4"/><path d="M12.48 24c3.24 0 5.94-1.08 7.92-2.92l-3.57-2.78c-1.08.72-2.46 1.16-4.35 1.16-3.12 0-5.78-2.1-6.73-4.96H2.2v2.86A11.974 11.974 0 0 0 12.48 24z" fill="#34A853"/><path d="M5.75 14.08c-.22-.66-.35-1.36-.35-2.08s.13-1.42.35-2.08V7.06H2.2C1.43 8.52 1 10.2 1 12c0 1.8.43 3.48 1.2 4.94l3.55-2.86z" fill="#FBBC05"/><path d="M12.48 5.4c1.77 0 3.24.67 4.4 1.8l3.15-3.15C18.42 2.18 15.72 1 12.48 1 8.04 1 4.12 3.66 2.2 7.5l3.55 2.86c.94-2.86 3.6-4.96 6.73-4.96z" fill="#EA4335"/></svg>
            <span>
              Criar com 
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
                Já tem uma conta?
              </span>
            </div>
          </div>
           <Button variant="secondary" className="w-full" asChild>
              <Link href="/login">Faça login</Link>
            </Button>
      </CardContent>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <Suspense fallback={
        <Card className="w-full max-w-sm">
          <CardHeader>
            <div className="flex justify-center mb-4">
                <Image
                    src="/icons/Icon.png"
                    alt="Logotipo do aplicativo"
                    width={48}
                    height={48}
                    priority
                />
            </div>
            <CardTitle className="text-2xl">Carregando...</CardTitle>
          </CardHeader>
        </Card>
      }>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
