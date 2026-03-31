'use client';

import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { HelpersCard } from '@/components/app/home/HelpersCard';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, doc, where } from 'firebase/firestore';
import { PerformingUser } from '@/lib/audit-log-services';
import type { Helper, UserProfile } from '@/lib/types';
import { Users } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function AjudantesPage() {
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    // Profile and admin checks
    const userProfileRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const isAdmin = useMemo(() => userProfile?.role !== 'helper', [userProfile]);

    const performingUser: PerformingUser | null = useMemo(() => {
        if (!user || !userProfile) return null;
        return {
            uid: user.uid,
            name: userProfile.name || user.email || 'Usuário Anônimo',
        };
    }, [user, userProfile]);

    // Redirect if not admin or loading
    useEffect(() => {
        if (!isUserLoading && !profileLoading) {
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
    }, [isUserLoading, profileLoading, user, isAdmin, router, toast]);

    // Data fetching for helpers
    const helpersQuery = useMemoFirebase(() => {
        if (!user || !firestore || !isAdmin) return null;
        return query(collection(firestore, 'users'), where('adminId', '==', user.uid));
    }, [user, firestore, isAdmin]);
    const { data: helpersData, isLoading: helpersLoading } = useCollection<Helper>(helpersQuery);
    const helpers = helpersData || [];

    const isLoading = isUserLoading || profileLoading || helpersLoading;

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
                        src="/icons/Logo.png"
                        alt="Carregando..."
                        width={250}
                        height={250}
                        priority
                    />
                </motion.div>
                <p className="text-lg text-muted-foreground mt-4">Carregando...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Users className="h-8 w-8 text-primary" />
                    Gerenciar Ajudantes
                </h1>
            </div>
            <div className="max-w-md mx-auto">
                <HelpersCard ownerId={user.uid} helpers={helpers} performingUser={performingUser} />
            </div>
        </div>
    );
}
