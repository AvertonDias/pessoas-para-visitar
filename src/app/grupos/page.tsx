'use client';

import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { FieldGroupsCard } from '@/components/app/home/FieldGroupsCard';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import * as services from '@/lib/firebase-services';
import { PerformingUser } from '@/lib/audit-log-services';
import type { Name, FieldGroup, UserProfile } from '@/lib/types';
import { Tag } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function GruposPage() {
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
    const dataOwnerId = useMemo(() => {
        if (!user) return null;
        if (userProfile?.role === 'helper' && userProfile.adminId) {
            return userProfile.adminId;
        }
        return user.uid;
    }, [user, userProfile]);

    const performingUser: PerformingUser | null = useMemo(() => {
        if (!user || !userProfile) return null;
        return {
            uid: user.uid,
            name: userProfile.name || user.email || 'Usuário Anônimo',
        };
    }, [user, userProfile]);

    // Redirect if not logged in
    useEffect(() => {
        if (!isUserLoading && !profileLoading) {
            if (!user) {
                router.replace('/login');
            }
        }
    }, [isUserLoading, profileLoading, user, router]);

    // Data fetching
    const namesQuery = useMemoFirebase(() => {
        if (!dataOwnerId || !firestore) return null;
        return query(collection(firestore, 'users', dataOwnerId, 'names'));
    }, [dataOwnerId, firestore]);
    const { data: namesData, isLoading: namesLoading } = useCollection<Name>(namesQuery);
    const names = namesData || [];

    const groupsQuery = useMemoFirebase(() => {
        if (!dataOwnerId || !firestore) return null;
        return query(collection(firestore, 'users', dataOwnerId, 'fieldGroups'));
    }, [dataOwnerId, firestore]);
    const { data: fieldGroupsData, isLoading: groupsLoading } = useCollection<FieldGroup>(groupsQuery);
    const fieldGroups = fieldGroupsData || [];

    const groupCounts = useMemo(() => {
        return names.reduce((acc, name) => {
          const group = fieldGroups.find(g => g.id === name.fieldGroup);
          if (group) {
            acc[group.name] = (acc[group.name] || 0) + 1;
          }
          return acc;
        }, {} as { [key: string]: number });
    }, [names, fieldGroups]);

    // Logic functions
    const addGroup = (groupName: string) => {
        if (!dataOwnerId || !firestore || !performingUser) return;

        const newGroupName = groupName.trim();
        if (newGroupName && !fieldGroups.some(g => g.name === newGroupName)) {
          services.addFieldGroup(firestore, dataOwnerId, newGroupName, performingUser);
          toast({
            title: "Grupo adicionado",
            description: `O grupo "${newGroupName}" foi criado.`,
          });
        } else if (newGroupName) {
           toast({
            variant: "destructive",
            title: "Erro",
            description: `O grupo "${newGroupName}" já existe.`,
          });
        }
    };
  
    const deleteGroup = (groupId: string) => {
        if (!dataOwnerId || !firestore || !performingUser) return;
        
        services.deleteFieldGroup(firestore, dataOwnerId, groupId, performingUser);

        // Remove the group from any names that have it assigned.
        names.forEach(name => {
          if (name.fieldGroup === groupId) {
            services.updateName(firestore, dataOwnerId, name.id, { fieldGroup: '' }, performingUser, fieldGroups);
          }
        });

        const groupName = fieldGroups.find(g => g.id === groupId)?.name;
        toast({
            title: "Grupo removido",
            description: `O grupo "${groupName}" foi removido.`,
        });
    };

    const updateGroup = (groupId: string, newName: string): boolean => {
        if (!dataOwnerId || !firestore || !performingUser) return false;
        const oldGroup = fieldGroups.find(g => g.id === groupId);
        if (!oldGroup) return false;

        const trimmedNewName = newName.trim();
        if (trimmedNewName === '' || oldGroup.name === trimmedNewName) {
          return true;
        }

        if (fieldGroups.some(g => g.name === trimmedNewName)) {
          toast({
            variant: "destructive",
            title: "Erro ao atualizar grupo",
            description: `O grupo "${trimmedNewName}" já existe.`,
          });
          return false;
        }
        
        services.updateFieldGroup(firestore, dataOwnerId, groupId, trimmedNewName, performingUser);

        toast({
            title: "Grupo atualizado",
            description: `O grupo "${oldGroup.name}" foi renomeado para "${trimmedNewName}".`,
        });
        return true;
    };

    const isLoading = isUserLoading || profileLoading || namesLoading || groupsLoading;

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
                    className="bg-card p-6 rounded-2xl shadow-lg"
                >
                    <Image
                        src="/icons/Logo.png"
                        alt="Carregando..."
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
                    <Tag className="h-8 w-8 text-primary" />
                    Grupos de Campo
                </h1>
            </div>
            <div className="max-w-md mx-auto">
                <FieldGroupsCard
                    isAdmin={isAdmin}
                    onAddGroup={addGroup}
                    fieldGroups={fieldGroups}
                    updateGroup={updateGroup}
                    deleteGroup={deleteGroup}
                    groupCounts={groupCounts}
                />
            </div>
        </div>
    );
}
