'use client';

import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, orderBy } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { History, User, FileText, Tag, Trash2, Edit, Import, Link as LinkIcon, ExternalLink, Calendar, Clock, Info } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { useToast } from '@/hooks/use-toast';
import * as services from '@/lib/firebase-services';
import Image from 'next/image';
import { motion } from 'framer-motion';

type AuditLog = {
    id: string;
    userId: string;
    userName: string;
    action: 'create' | 'update' | 'delete' | 'import';
    entityType: 'name' | 'group' | 'visit' | 'helper' | 'sync-url';
    entityId: string;
    entityName: string;
    details: string;
    timestamp: {
        seconds: number;
        nanoseconds: number;
    };
}

const actionIcons: { [key in AuditLog['action']]: React.ElementType } = {
    create: FileText,
    update: Edit,
    delete: Trash2,
    import: Import,
};

const entityTypeIcons: { [key in AuditLog['entityType']]: React.ElementType } = {
    name: User,
    group: Tag,
    visit: History,
    helper: User,
    'sync-url': LinkIcon,
};

const actionLabels: { [key in AuditLog['action']]: string } = {
    create: 'Criação',
    update: 'Atualização',
    delete: 'Exclusão',
    import: 'Importação',
};

const entityLabels: { [key in AuditLog['entityType']]: string } = {
    name: 'Pessoa',
    group: 'Grupo',
    visit: 'Visita',
    helper: 'Ajudante',
    'sync-url': 'URL de Sincronização',
};

export default function HistoryPage() {
  const { user, isUserLoading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const dataOwnerId = useMemo(() => {
    if (!user) return null;
    if (userProfile?.role === 'helper' && userProfile.adminId) {
      return userProfile.adminId;
    }
    return user.uid;
  }, [user, userProfile]);
  
  const isAdmin = useMemo(() => userProfile?.role !== 'helper', [userProfile]);

  useEffect(() => {
    if (!userLoading && !profileLoading) {
        if (!user) {
            router.replace('/login');
        } else if (!isAdmin) {
            toast({
                variant: 'destructive',
                title: 'Acesso negado',
                description: 'Você não tem permissão para acessar esta página.',
            });
            router.replace('/');
        }
    }
  }, [userLoading, profileLoading, user, isAdmin, router, toast]);

  const auditLogsQuery = useMemoFirebase(() => {
    if (!dataOwnerId || !firestore) return null;
    return query(collection(firestore, 'users', dataOwnerId, 'auditLogs'), orderBy('timestamp', 'desc'));
  }, [dataOwnerId, firestore]);
  const { data: logs, isLoading: logsLoading } = useCollection<AuditLog>(auditLogsQuery);

  const isLoading = userLoading || profileLoading || logsLoading;
  
  const handleDeleteLog = (logId: string) => {
    if (!dataOwnerId || !firestore) return;
    services.deleteAuditLog(firestore, dataOwnerId, logId);
    toast({
        title: 'Registro excluído',
        description: 'O registro do histórico foi removido.',
    });
    if (selectedLog?.id === logId) setSelectedLog(null);
  };
  
  const handleNavigateToEntity = (log: AuditLog) => {
    if (log.action === 'delete') {
      toast({
        title: "Item Excluído",
        description: "Não é possível navegar para um item que foi excluído.",
      });
      return;
    }

    switch (log.entityType) {
        case 'name':
        case 'visit':
            if (log.action !== 'import') {
                router.push('/');
            } else {
                router.push('/importar');
            }
            break;
        case 'group':
            router.push('/grupos');
            break;
        case 'helper':
            router.push('/ajudantes');
            break;
        case 'sync-url':
            router.push('/importar');
            break;
        default:
            break;
    }
    setSelectedLog(null);
};

  if (isLoading || !isAdmin) {
      return (
          <div className="flex min-h-screen flex-col bg-background items-center justify-center">
              <motion.div
                  initial={{ scale: 0.95, opacity: 0.8 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                      duration: 1,
                      repeat: Infinity,
                      repeatType: 'reverse',
                      ease: 'easeInOut',
                  }}
              >
                  <Image
                      src="/icons/Icon.png"
                      alt="Logotipo do aplicativo"
                      width={250}
                      height={250}
                      priority
                  />
              </motion.div>
              <p className="text-lg text-muted-foreground mt-8">Carregando...</p>
          </div>
      );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <h1 className="text-3xl font-bold flex items-center gap-3">
                <History className="h-8 w-8 text-primary" />
                Histórico de Alterações
            </h1>
        </div>

        {logs && logs.length > 0 ? (
            <div className="space-y-3">
                {logs.map(log => {
                    const ActionIcon = actionIcons[log.action] || Edit;
                    const EntityIcon = entityTypeIcons[log.entityType] || FileText;
                    return (
                        <Card key={log.id} className="p-4 transition-all hover:bg-secondary/20 cursor-pointer" onClick={() => setSelectedLog(log)}>
                            <div className="flex items-start gap-4">
                                <div className={`p-2 rounded-full ${log.action === 'delete' ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                                    <ActionIcon className={`h-5 w-5 ${log.action === 'delete' ? 'text-destructive' : 'text-primary'}`} />
                                </div>
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                        <span className="font-semibold text-foreground">{log.userName}</span>
                                        <span>&bull;</span>
                                        <span>{formatDistanceToNow(new Date(log.timestamp.seconds * 1000), { addSuffix: true, locale: ptBR })}</span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-medium text-sm sm:text-base truncate">
                                            {actionLabels[log.action]} de {entityLabels[log.entityType]}: <span className="text-primary">{log.entityName}</span>
                                        </p>
                                    </div>
                                    {log.details && (
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{log.details.split('\n')[0]}</p>
                                    )}
                                </div>
                                <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                                {isAdmin && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Remover registro do histórico">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Tem certeza que deseja excluir este registro do histórico? Esta ação não pode ser desfeita.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteLog(log.id)}>Excluir</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        ) : (
            <div className="text-center py-20">
                <p className="text-lg text-muted-foreground">Nenhuma alteração registrada ainda.</p>
            </div>
        )}

        <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-primary" />
                        Detalhes da Alteração
                    </DialogTitle>
                    <DialogDescription>
                        Informações detalhadas sobre a ação realizada no sistema.
                    </DialogDescription>
                </DialogHeader>

                {selectedLog && (
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                    <User className="h-3 w-3" /> Realizado por
                                </Label>
                                <p className="text-sm font-medium">{selectedLog.userName}</p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> Quando
                                </Label>
                                <p className="text-sm font-medium">
                                    {format(new Date(selectedLog.timestamp.seconds * 1000), "Pp", { locale: ptBR })}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <Tag className="h-3 w-3" /> Item Afetado
                            </Label>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-normal capitalize">
                                    {entityLabels[selectedLog.entityType]}
                                </Badge>
                                <span className="text-sm font-semibold">{selectedLog.entityName}</span>
                            </div>
                        </div>

                        <div className="p-3 bg-secondary/30 rounded-lg border">
                            <Label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wider font-bold">O que mudou:</Label>
                            <div className="space-y-3">
                                {selectedLog.details ? (
                                    selectedLog.details.split('\n').map((line, i) => {
                                        if (line.startsWith('Visitado por:')) {
                                            return (
                                                <div key={i} className="mt-1 border-t pt-2">
                                                    <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground block mb-0.5">Visitado por</span>
                                                    <p className="text-sm font-medium">{line.replace('Visitado por: ', '')}</p>
                                                </div>
                                            );
                                        }
                                        if (line.startsWith('Observações:')) {
                                            return (
                                                <div key={i} className="mt-1 border-t pt-2">
                                                    <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground block mb-0.5">Observações</span>
                                                    <p className="text-sm italic text-muted-foreground">"{line.replace('Observações: ', '')}"</p>
                                                </div>
                                            );
                                        }
                                        return <p key={i} className="text-sm leading-relaxed">{line}</p>;
                                    })
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">Nenhum detalhe adicional fornecido.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    {selectedLog && selectedLog.action !== 'delete' && (
                        <Button onClick={() => handleNavigateToEntity(selectedLog)} className="flex-1 sm:flex-none">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Ver Item
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => setSelectedLog(null)}>
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
