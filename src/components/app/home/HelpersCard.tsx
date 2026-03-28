'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Users, Trash2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import * as services from '@/lib/firebase-services';
import type { Helper } from '@/app/page';

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

interface HelpersCardProps {
  ownerId: string;
  helpers: Helper[];
}

export function HelpersCard({ ownerId, helpers }: HelpersCardProps) {
  const [newHelperEmail, setNewHelperEmail] = useState('');
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHelperEmail.trim() || !firestore) return;

    services.inviteHelper(firestore, ownerId, newHelperEmail.trim());

    toast({
      title: 'Convite Enviado',
      description: `Um convite foi registrado para ${newHelperEmail.trim()}. Eles se tornarão um ajudante assim que se cadastrarem.`,
    });
    setNewHelperEmail('');
  };

  const handleRemoveHelper = (helper: Helper) => {
    if (!firestore) return;
    services.removeHelper(firestore, helper.id);
    toast({
        title: 'Ajudante Removido',
        description: `${helper.email} não tem mais acesso à sua lista.`,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <span>Gerenciar Ajudantes</span>
        </CardTitle>
        <CardDescription>Convide e gerencie ajudantes para sua lista.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleInviteSubmit} className="flex gap-2 mb-4">
          <Input
            value={newHelperEmail}
            onChange={(e) => setNewHelperEmail(e.target.value)}
            type="email"
            placeholder="E-mail do ajudante"
            aria-label="E-mail do novo ajudante"
          />
          <Button type="submit" size="icon" aria-label="Convidar ajudante">
            <Plus className="h-4 w-4" />
          </Button>
        </form>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {helpers.length > 0 ? (
            helpers.map((helper) => (
              <div key={helper.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-secondary/50">
                <span className="text-sm font-medium truncate" title={helper.email}>{helper.email}</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Remover ajudante ${helper.email}`}>
                      <Trash2 className="h-4 w-4 text-destructive/70" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja remover {helper.email} como ajudante? O acesso será revogado imediatamente.
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
  );
}
