
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app/AppSidebar';
import { Header } from '@/components/app/Header';
import { AppFooter } from '@/components/app/AppFooter';
import { InstallPwaBanner } from '@/components/app/InstallPwaBanner';


export const metadata: Metadata = {
  title: 'Pessoas para visitar',
  description: 'Um PWA para criar e gerenciar listas de pessoas para visitar.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#2263DB" />
        <link rel="apple-touch-icon" href="/icons/Icon.png" />
        <link rel="icon" href="/icons/Icon.png" type="image/png" />
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
      </head>
      <body className="font-body antialiased bg-background">
        <FirebaseClientProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <Header />
              <main className="flex flex-1 flex-col">
                {children}
              </main>
              <AppFooter />
            </SidebarInset>
          </SidebarProvider>
          <Toaster />
          <InstallPwaBanner />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
