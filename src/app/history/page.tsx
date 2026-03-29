'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, orderBy } from 'firebase/firestore';
import type { UserProfile } from '@/app/page';
import { Header } from '@/components/app/Header';
import { Card } from '@/components/ui/card';
import { History, User, FileText, Tag, Trash2, Edit, Import, Link as LinkIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import * as services from '@/lib/firebase-services';

type AuditLog = {
    id: string;
    userId: string;
    userName: string;
    action: 'create' | 'update' | 'delete' | 'import';
    entityType: 'name' | 'group' | 'visit' | 'helper' | 'sync-url';
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


export default function HistoryPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const dataOwnerId = useMemo(() => {
    if (!user) return null;
    if (userProfile?.role === 'helper' && userProfile.adminId) {
      return userProfile.adminId;
    }
    return user.uid;
  }, [user, userProfile]);
  
  const isAdmin = userProfile?.role === 'admin';

  const auditLogsQuery = useMemoFirebase(() => {
    if (!dataOwnerId || !firestore) return null;
    return query(collection(firestore, 'users', dataOwnerId, 'auditLogs'), orderBy('timestamp', 'desc'));
  }, [dataOwnerId, firestore]);
  const { data: logs, loading: logsLoading } = useCollection<AuditLog>(auditLogsQuery);

  const isLoading = userLoading || profileLoading || logsLoading;
  
  const handleDeleteLog = (logId: string) => {
    if (!dataOwnerId || !firestore) return;
    services.deleteAuditLog(firestore, dataOwnerId, logId);
    toast({
        title: 'Registro excluído',
        description: 'O registro do histórico foi removido.',
    });
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <h1 className="text-3xl font-bold flex items-center gap-3">
                <History className="h-8 w-8 text-primary" />
                Histórico de Alterações
            </h1>
        </div>

        {isLoading ? (
            <div className="flex items-center justify-center py-20">
                <p className="text-lg text-muted-foreground">Carregando histórico...</p>
            </div>
        ) : logs && logs.length > 0 ? (
            <div className="space-y-4">
                {logs.map(log => {
                    const ActionIcon = actionIcons[log.action] || Edit;
                    const EntityIcon = entityTypeIcons[log.entityType] || FileText;
                    return (
                        <Card key={log.id} className="p-4">
                            <div className="flex items-start gap-4">
                                <Avatar>
                                    <AvatarFallback>{getInitials(log.userName)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-grow">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                        <span className="font-semibold text-foreground">{log.userName}</span>
                                        <span>&bull;</span>
                                        <span>{formatDistanceToNow(new Date(log.timestamp.seconds * 1000), { addSuffix: true, locale: ptBR })}</span>
                                    </div>
                                    <p className="font-medium">
                                        <Badge variant="secondary" className="mr-2 capitalize font-normal">
                                            <ActionIcon className="h-3 w-3 mr-1.5" />
                                            {log.action === 'create' ? 'criação' : log.action === 'update' ? 'atualização' : log.action === 'delete' ? 'exclusão' : 'importação'}
                                        </Badge>
                                        <Badge variant="outline" className="mr-2 font-normal">
                                            <EntityIcon className="h-3 w-3 mr-1.5" />
                                            {log.entityName}
                                        </Badge>
                                    </p>
                                    {log.details && (
                                        <p className="text-sm text-muted-foreground mt-2 pl-1">{log.details}</p>
                                    )}
                                </div>
                                {isAdmin && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 -mt-1 -mr-1" aria-label="Remover registro do histórico">
                                                <Trash2 className="h-4 w-4 text-destructive/70" />
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
                        </Card>
                    );
                })}
            </div>
        ) : (
            <div className="text-center py-20">
                <p className="text-lg text-muted-foreground">Nenhuma alteração registrada ainda.</p>
            </div>
        )}
      </main>
    </div>
  );
}
