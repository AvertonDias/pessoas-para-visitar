'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// The type for the BeforeInstallPromptEvent is not in the default DOM typings.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string
  }>;
  prompt(): Promise<void>;
}

export function InstallPwaBanner() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(event as BeforeInstallPromptEvent);
      // Show the banner if not already installed
      if (!window.matchMedia('(display-mode: standalone)').matches && !(window.navigator as any).standalone) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    // Show the prompt
    await installPrompt.prompt();
    
    // Wait for the user to respond to the prompt.
    // We don't need to do anything with the result, but this is how you can track it.
    await installPrompt.userChoice;
    
    // We've used the prompt, and can't use it again, so clear it
    setInstallPrompt(null);
    setIsVisible(false);
  };
  
  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-8 duration-500">
        <Card className="max-w-sm bg-background/95 backdrop-blur-sm shadow-2xl">
            <CardHeader className="p-4 pb-2 relative">
                 <CardTitle className="text-lg flex items-center gap-2">
                    <Download className="h-5 w-5 text-primary" />
                    <span>Instalar Aplicativo</span>
                 </CardTitle>
                 <CardDescription className="text-sm pt-1">
                    Adicione à sua tela inicial para acesso rápido e offline.
                 </CardDescription>
                 <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={handleDismiss} aria-label="Dispensar">
                    <X className="h-4 w-4" />
                 </Button>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                 <Button onClick={handleInstallClick} className="w-full">
                    Instalar
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
