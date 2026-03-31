'use client';

import { useState, useEffect } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useUser } from '@/firebase';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Header() {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();

  const [hidden, setHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        // Hide header if scrolling down past a threshold
        if (window.scrollY > lastScrollY && window.scrollY > 80) {
          setHidden(true);
        } else { // Show header if scrolling up
          setHidden(false);
        }
        setLastScrollY(window.scrollY);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', controlNavbar);
      return () => {
        window.removeEventListener('scroll', controlNavbar);
      };
    }
  }, [lastScrollY]);

  const isAuthPage = pathname === '/login' || pathname === '/register';

  if (isAuthPage || !user || isUserLoading) {
      return null;
  }
  
  return (
    <header className={cn(
        "sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6 transition-transform duration-300",
        hidden ? "-translate-y-full" : "translate-y-0"
    )}>
        <SidebarTrigger className="md:hidden" aria-label="Menu retrátil" />
        <Link href="/" className="flex items-center gap-3 text-foreground hover:text-foreground/90 no-underline">
          <Image
            src="/icons/Logo.png"
            alt="Pessoas para visitar logo"
            width={40}
            height={40}
            className="h-8 w-8 sm:h-10 sm:w-10"
            unoptimized
          />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Pessoas para visitar
          </h1>
        </Link>
    </header>
  );
}
