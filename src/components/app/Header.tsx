'use client';

import { LogOut, BarChart, History, Users } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export function Header() {
  const auth = useAuth();
  const { user } = useUser();
  const pathname = usePathname();

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  const renderNavLinks = () => {
    if (!user) return null;

    if (pathname === '/') {
      return (
        <>
          <Button
            asChild
            variant="ghost"
            className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground"
            aria-label="Estatísticas"
          >
            <Link href="/stats">
              <BarChart className="h-5 w-5 md:mr-2" />
              <span className="hidden md:inline">Estatísticas</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground"
            aria-label="Histórico"
          >
            <Link href="/history">
              <History className="h-5 w-5 md:mr-2" />
              <span className="hidden md:inline">Histórico</span>
            </Link>
          </Button>
        </>
      );
    }

    if (pathname === '/stats') {
      return (
        <>
          <Button
            asChild
            variant="ghost"
            className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground"
            aria-label="Sua Lista"
          >
            <Link href="/">
              <Users className="h-5 w-5 md:mr-2" />
              <span className="hidden md:inline">Sua Lista</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground"
            aria-label="Histórico"
          >
            <Link href="/history">
              <History className="h-5 w-5 md:mr-2" />
              <span className="hidden md:inline">Histórico</span>
            </Link>
          </Button>
        </>
      );
    }

    if (pathname === '/history') {
      return (
        <>
          <Button
            asChild
            variant="ghost"
            className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground"
            aria-label="Sua Lista"
          >
            <Link href="/">
              <Users className="h-5 w-5 md:mr-2" />
              <span className="hidden md:inline">Sua Lista</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground"
            aria-label="Estatísticas"
          >
            <Link href="/stats">
              <BarChart className="h-5 w-5 md:mr-2" />
              <span className="hidden md:inline">Estatísticas</span>
            </Link>
          </Button>
        </>
      );
    }
    
    return null;
  };

  return (
    <header className="w-full bg-primary text-primary-foreground py-4 sm:py-6 shadow-md">
      <div className="container mx-auto flex items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-3 text-primary-foreground hover:text-primary-foreground/90 no-underline">
          <Image
            src="/icons/logo.png"
            alt="Pessoas para visitar logo"
            width={40}
            height={40}
            className="h-8 w-8 sm:h-10 sm:w-10"
          />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            Pessoas para visitar
          </h1>
        </Link>
        <div className="flex items-center gap-2">
            {renderNavLinks()}
            {user && (
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground"
                aria-label="Sair"
              >
                <LogOut className="h-5 w-5 md:mr-2" />
                <span className="hidden md:inline">Sair</span>
              </Button>
            )}
        </div>
      </div>
    </header>
  );
}
