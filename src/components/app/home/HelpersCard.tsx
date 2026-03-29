'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, Trash2, Link as LinkIcon, Copy, Loader2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import * as services from '@/lib/firebase-services';
import type { Helper } from '@/app/page';
import { PerformingUser } from '@/lib/audit-log-services';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';

interface HelpersCardProps {
  ownerId: string;
  helpers: Helper[];
  performingUser: PerformingUser | null;
}

export function HelpersCard({ ownerId, helpers, performingUser }: HelpersCardProps) {
  const [inviteLink, setInviteLink] = useState('');
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const firestore = useFirestore();
  const { toast } = useToast();

  const handleGenerateLink = async () => {
    if (!firestore) return;
    setIsGenerating(true);
    try {
      const invitationId = await services.createInvitation(firestore, ownerId);
      const link = `${window.location.origin}/register?invite=${invitationId}`;
      setInviteLink(link);
      setIsLinkDialogOpen(true);
    } catch (error) {
      console.error('Failed to create invitation link:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar link',
        description: 'Não foi possível criar o link de convite. Tente novamente.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: 'Link Copiado!',
      description: 'O link de convite foi copiado para a área de transferência.',
    });
  };

  const handleRemoveHelper = (helper: Helper) => {
    if (!firestore || !performingUser) return;
    services.removeHelper(firestore, helper.id, performingUser);
    toast({
        title: 'Ajudante Removido',
        description: `${helper.name || helper.email} não tem mais acesso à sua lista.`,
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span>Gerenciar Ajudantes</span>
          </CardTitle>
          <CardDescription>Gere um link para convidar ajudantes para sua lista.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGenerateLink} disabled={isGenerating} className="w-full">
            {isGenerating ? (
              <Loader2 className="animate-spin" />
            ) : (
              <LinkIcon className="mr-2 h-4 w-4" />
            )}
            Gerar link de convite
          </Button>

          <div className="space-y-2 mt-4 max-h-60 overflow-y-auto pr-1">
            <h3 className="text-sm font-medium text-muted-foreground">Ajudantes Atuais</h3>
            {helpers.length > 0 ? (
              helpers.map((helper) => (
                <div key={helper.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-secondary/50">
                  <span className="text-sm font-medium truncate" title={helper.name || helper.email}>{helper.name || helper.email}</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Remover ajudante ${helper.name || helper.email}`}>
                        <Trash2 className="h-4 w-4 text-destructive/70" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover {helper.name || helper.email} como ajudante? O acesso será revogado imediatamente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRemoveHelper(helper)}>Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))
            ) : (
              <p className="text-sm text-center text-muted-foreground py-4">
                Nenhum ajudante convidado.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link de Convite Gerado</DialogTitle>
            <DialogDescription>
              Compartilhe este link com quem você deseja convidar. O link pode ser usado apenas uma vez.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="link" className="sr-only">
                Link
              </Label>
              <Input
                id="link"
                value={inviteLink}
                readOnly
              />
            </div>
            <Button type="button" size="sm" className="px-3" onClick={handleCopyLink}>
              <span className="sr-only">Copiar</span>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter className="sm:justify-start">
             <Button type="button" variant="secondary" onClick={() => setIsLinkDialogOpen(false)}>
                Fechar
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
