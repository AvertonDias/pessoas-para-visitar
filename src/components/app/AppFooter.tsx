'use client';

import { ExternalLink, MessageCircle } from 'lucide-react';

export function AppFooter() {
    const whatsappUrl = `https://wa.me/5535991210466?text=${encodeURIComponent("Preciso de ajuda com o aplicativo Visitas")}`;

    return (
        <footer className="p-4 mt-auto">
            <div className="flex flex-col items-center justify-center gap-4">
                <a href="https://aplicativos-ton.vercel.app/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ExternalLink className="h-4 w-4" />
                    <span>Conheça meus aplicativos</span>
                </a>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    <span>Suporte</span>
                </a>
            </div>
        </footer>
    );
}
