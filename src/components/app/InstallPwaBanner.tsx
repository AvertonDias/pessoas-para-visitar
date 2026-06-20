
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
import Image from 'next/image';

// Interface para o evento de instalação do navegador
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
    // Verifica se já estamos no modo instalado (standalone)
    const isInstalled = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;

    if (isInstalled) return;

    const handleBeforeInstallPrompt = (event: Event) => {
      // Impede que a barra padrão do navegador apareça imediatamente
      event.preventDefault();
      
      // Armazena o evento para disparar a instalação manualmente depois
      setInstallPrompt(event as BeforeInstallPromptEvent);
      
      // Verifica se o usuário já recusou a instalação nesta sessão
      const wasDismissed = sessionStorage.getItem('pwa-install-dismissed');
      
      if (!wasDismissed) {
        // Exibe o modal após um pequeno delay
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    // Mostra o prompt nativo do navegador
    await installPrompt.prompt();
    
    // Aguarda a escolha do usuário
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('Usuário aceitou a instalação do PWA');
    }
    
    // Limpa o evento e fecha o modal
    setInstallPrompt(null);
    setIsOpen(false);
  };

  const handleDismiss = () => {
    // Salva na sessão que o usuário fechou o modal para não mostrar de novo agora
    sessionStorage.setItem('pwa-install-dismissed', 'true');
    setIsOpen(false);
  };

  if (!installPrompt) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md border-primary/20">
        <DialogHeader>
          <div className="flex justify-center mb-4">
             <Image
                src="/icons/Icon.png"
                alt="Logotipo do aplicativo"
                width={64}
                height={64}
                style={{ width: 'auto', height: 'auto' }}
                priority
            />
          </div>
          <DialogTitle className="flex items-center justify-center gap-2 text-primary text-center">
            <Download className="h-6 w-6" />
            <span>Instalar Aplicativo</span>
          </DialogTitle>
          <DialogDescription className="text-base pt-2 text-center">
            Tenha uma experiência muito melhor instalando o <strong>Visitas</strong> no seu celular ou computador.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-secondary/30 p-4 rounded-lg space-y-2 text-sm text-muted-foreground">
          <p>• Acesso rápido pela tela inicial</p>
          <p>• Funciona melhor em conexões lentas</p>
          <p>• Interface limpa e sem barras do navegador</p>
        </div>

        <DialogFooter className="sm:justify-center gap-2 pt-2">
          <Button variant="ghost" onClick={handleDismiss} className="text-muted-foreground">
            Agora não
          </Button>
          <Button onClick={handleInstallClick} className="bg-primary hover:bg-primary/90">
            <Download className="h-4 w-4 mr-2" />
            Instalar Agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
