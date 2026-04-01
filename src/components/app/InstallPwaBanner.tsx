'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(event as BeforeInstallPromptEvent);
      
      const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      if (!isInStandaloneMode) {
        // Use a timeout to delay the prompt slightly, making it less intrusive
        setTimeout(() => {
            setIsOpen(true);
        }, 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    // Show the browser's installation prompt
    await installPrompt.prompt();
    
    // Wait for the user to respond to the prompt.
    await installPrompt.userChoice;
    
    // We've used the prompt, and can't use it again, so clear it.
    setInstallPrompt(null);
    setIsOpen(false);
  };

  const handleDismiss = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            <span>Instalar Aplicativo</span>
          </DialogTitle>
          <DialogDescription>
            Para uma melhor experiência, instale o aplicativo em seu dispositivo. Tenha acesso rápido e funcionalidades offline.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-end gap-2">
          <Button variant="outline" onClick={handleDismiss}>
            Agora não
          </Button>
          <Button onClick={handleInstallClick}>
            Instalar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
