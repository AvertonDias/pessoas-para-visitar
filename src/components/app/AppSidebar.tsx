'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { UserProfile, PerformingUser } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { useState, useMemo, useEffect } from 'react';
import * as services from '@/lib/firebase-services';
import { useToast } from '@/hooks/use-toast';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, BarChart, History, LogOut, UploadCloud, Tag, Loader2 } from 'lucide-react';


export function AppSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const auth = useAuth();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { setOpenMobile } = useSidebar();
    const { toast } = useToast();

    // Profile Dialog State
    const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
    const [name, setName] = useState('');
    const [isSaving, setIsSaving] = useState(false);


    const userProfileRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);
    const isAdmin = userProfile?.role !== 'helper';
    
    const performingUser: PerformingUser | null = useMemo(() => {
        if (!user || !userProfile) return null;
        return {
          uid: user.uid,
          name: userProfile.name || user.email || 'Usuário Anônimo',
        };
    }, [user, userProfile]);

    useEffect(() => {
        if (isProfileDialogOpen) {
            setName(userProfile?.name || user?.displayName || '');
        }
    }, [isProfileDialogOpen, userProfile, user]);

    const handleSaveProfile = async () => {
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
            setIsProfileDialogOpen(false);
            return;
        }

        setIsSaving(true);
        try {
            await services.updateUserProfile(firestore, user.uid, { name: name.trim() });
            toast({
                title: 'Perfil atualizado',
                description: 'Seu nome foi alterado com sucesso.',
            });
            setIsProfileDialogOpen(false);
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


    const handleSignOut = async () => {
        if (auth) {
            await signOut(auth);
            setOpenMobile(false);
            router.push('/login');
        }
    };

    const handleNavigation = () => {
        setOpenMobile(false);
    };

    if (isUserLoading || profileLoading) {
        return null;
    }
    
    const isAuthPage = pathname === '/login' || pathname === '/register';
    if(isAuthPage || !user) {
        return null;
    }


    return (
        <>
            <Sidebar>
                <SidebarHeader>
                    <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
                        <DialogTrigger asChild>
                            <button className="-m-2 block w-full rounded-lg p-2 text-left outline-none ring-sidebar-ring transition-colors focus-visible:ring-2 hover:bg-sidebar-accent">
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm font-semibold text-sidebar-foreground truncate">
                                        {userProfile?.name || user?.displayName || 'Usuário'}
                                    </span>
                                    <span className="text-xs text-sidebar-foreground/70 truncate">
                                        {user?.email}
                                    </span>
                                </div>
                            </button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Editar Perfil</DialogTitle>
                                <DialogDescription>Atualize seu nome de exibição.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
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
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsProfileDialogOpen(false)} disabled={isSaving}>Cancelar</Button>
                                <Button onClick={handleSaveProfile} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname === '/'}
                                tooltip="Sua Lista"
                                onClick={handleNavigation}
                            >
                                <Link href="/">
                                    <Users />
                                    <span>Sua Lista</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname === '/stats'}
                                tooltip="Estatísticas"
                                onClick={handleNavigation}
                            >
                                <Link href="/stats">
                                    <BarChart />
                                    <span>Estatísticas</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname === '/grupos'}
                                tooltip="Grupos"
                                onClick={handleNavigation}
                            >
                                <Link href="/grupos">
                                    <Tag />
                                    <span>Grupos</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        {isAdmin && (
                            <>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === '/history'}
                                        tooltip="Histórico"
                                        onClick={handleNavigation}
                                    >
                                        <Link href="/history">
                                            <History />
                                            <span>Histórico</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === '/ajudantes'}
                                        tooltip="Ajudantes"
                                        onClick={handleNavigation}
                                    >
                                        <Link href="/ajudantes">
                                            <Users />
                                            <span>Ajudantes</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                 <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === '/importar'}
                                        tooltip="Importar"
                                        onClick={handleNavigation}
                                    >
                                        <Link href="/importar">
                                            <UploadCloud />
                                            <span>Importar</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </>
                        )}
                    </SidebarMenu>
                </SidebarContent>
                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={handleSignOut}>
                                <LogOut />
                                <span>Sair</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>
        </>
    );
}
