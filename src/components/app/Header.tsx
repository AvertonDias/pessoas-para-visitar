'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { useUser } from '@/firebase';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export function Header() {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();

  const isAuthPage = pathname === '/login' || pathname === '/register';

  if (isAuthPage || !user || isUserLoading) {
      return null;
  }
  
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <SidebarTrigger className="md:hidden"/>
        <Link href="/" className="flex items-center gap-3 text-foreground hover:text-foreground/90 no-underline">
          <Image
            src="/icons/Logo.png"
            alt="Pessoas para visitar logo"
            width={40}
            height={40}
            className="h-8 w-8 sm:h-10 sm:w-10"
          />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Pessoas para visitar
          </h1>
        </Link>
    </header>
  );
}
