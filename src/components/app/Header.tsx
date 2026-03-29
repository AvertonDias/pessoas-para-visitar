'use client';

import { HandHeart, LogOut, BarChart, History } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
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

  return (
    <header className="w-full bg-primary text-primary-foreground py-4 sm:py-6 shadow-md">
      <div className="container mx-auto flex items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-3">
          <HandHeart className="h-8 w-8 sm:h-10 sm:w-10" />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            Pessoas para visitar
          </h1>
        </div>
        <div className="flex items-center gap-2">
            {user && pathname === '/' && (
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
            )}
             {user && pathname === '/' && (
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
            )}
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
