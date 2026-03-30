'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Users, BarChart, History, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';


export function AppSidebar() {
    const pathname = usePathname();
    const auth = useAuth();
    const { user, isUserLoading } = useUser();

    const handleSignOut = async () => {
        if (auth) {
            await signOut(auth);
        }
    };

    const getInitials = (name: string | null | undefined) => {
        if (!name) return '?';
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    if (isUserLoading) {
        return null;
    }
    
    const isAuthPage = pathname === '/login' || pathname === '/register';
    if(isAuthPage || !user) {
        return null;
    }


    return (
        <Sidebar>
            <SidebarHeader>
                 <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarFallback>{getInitials(user?.displayName || user?.email)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-semibold text-sidebar-foreground truncate">
                            {user?.displayName || 'Usuário'}
                        </span>
                        <span className="text-xs text-sidebar-foreground/70 truncate">
                            {user?.email}
                        </span>
                    </div>
                 </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            isActive={pathname === '/'}
                            tooltip="Sua Lista"
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
                            isActive={pathname === '/history'}
                            tooltip="Histórico"
                        >
                            <Link href="/history">
                                <History />
                                <span>Histórico</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
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
    );
}
