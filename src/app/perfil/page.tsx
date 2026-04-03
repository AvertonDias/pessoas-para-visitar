'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User as UserIcon, Loader2 } from 'lucide-react';
import * as services from '@/lib/firebase-services';
import { PerformingUser } from '@/lib/audit-log-services';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function PerfilPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [name, setName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const userProfileRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const performingUser: PerformingUser | null = useMemo(() => {
        if (!user || !userProfile) return null;
        return {
            uid: user.uid,
            name: userProfile.name || user.email || 'Usuário Anônimo',
        };
    }, [user, userProfile]);

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.replace('/login');
        }
    }, [isUserLoading, user, router]);

    useEffect(() => {
        if (userProfile?.name) {
            setName(userProfile.name);
        }
    }, [userProfile]);

    const handleSave = async () => {
        if (!user || !firestore || !performingUser) return;
        if (name.trim() === '') {
            toast({
                variant: 'destructive',
                title: 'Nome inválido',
                description: 'O nome não pode ficar em branco.',
            });
            return;
        }

        if (name.trim() === userProfile?.name) {
             toast({
                title: 'Nenhuma alteração',
                description: 'Seu nome não foi alterado.',
            });
            return;
        }

        setIsSaving(true);
        try {
            await services.updateUserProfile(firestore, user.uid, { name: name.trim() }, performingUser);
            toast({
                title: 'Perfil atualizado',
                description: 'Seu nome foi alterado com sucesso.',
            });
        } catch (error) {
            console.error('Failed to update profile:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao salvar',
                description: 'Não foi possível atualizar seu nome. Tente novamente.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const isLoading = isUserLoading || profileLoading;

    if (isLoading) {
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
        )
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <UserIcon className="h-8 w-8 text-primary" />
                    Editar Perfil
                </h1>
            </div>
            <div className="max-w-md mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Suas Informações</CardTitle>
                        <CardDescription>Atualize seu nome de exibição.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome de Exibição</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isSaving}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                value={user?.email || ''}
                                disabled
                                readOnly
                            />
                        </div>
                         <Button onClick={handleSave} disabled={isSaving} className="w-full">
                            {isSaving ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
