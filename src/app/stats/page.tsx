'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { Name, UserProfile } from '@/app/page';
import { Header } from '@/components/app/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, UserCheck, UserX, AlertTriangle, Trash2, Calendar, HelpCircle } from 'lucide-react';
import { subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function StatsPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();

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

  const namesQuery = useMemoFirebase(() => {
    if (!dataOwnerId || !firestore) return null;
    return query(collection(firestore, 'users', dataOwnerId, 'names'));
  }, [dataOwnerId, firestore]);
  const { data: namesData, loading: namesLoading } = useCollection<Name>(namesQuery);
  const names = namesData || [];

  const stats = useMemo(() => {
    if (!names) {
      return {
        statusCounts: {
          regular: 0,
          irregular: 0,
          inativo: 0,
          removido: 0,
        },
        visitCounts: {
          thisMonth: 0,
          lastMonth: 0,
          last6Months: 0,
          last12Months: 0,
        },
        neverVisited: 0,
      };
    }

    const statusCounts = names.reduce(
      (acc, name) => {
        acc[name.status] = (acc[name.status] || 0) + 1;
        return acc;
      },
      { regular: 0, irregular: 0, inativo: 0, removido: 0 }
    );

    const neverVisited = names.filter(name => !name.visitHistory || name.visitHistory.length === 0).length;

    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const sixMonthsAgo = subMonths(now, 6);
    const twelveMonthsAgo = subMonths(now, 12);

    let thisMonth = 0;
    let lastMonth = 0;
    let last6Months = 0;
    let last12Months = 0;

    names.forEach(name => {
      (name.visitHistory || []).forEach(visit => {
        const visitDate = new Date(visit.date);

        if (isWithinInterval(visitDate, { start: thisMonthStart, end: now })) {
          thisMonth++;
        }
        if (isWithinInterval(visitDate, { start: lastMonthStart, end: lastMonthEnd })) {
          lastMonth++;
        }
        if (isWithinInterval(visitDate, { start: sixMonthsAgo, end: now })) {
          last6Months++;
        }
        if (isWithinInterval(visitDate, { start: twelveMonthsAgo, end: now })) {
          last12Months++;
        }
      });
    });

    return {
      statusCounts,
      visitCounts: {
        thisMonth,
        lastMonth,
        last6Months,
        last12Months,
      },
      neverVisited,
    };
  }, [names]);

  const isLoading = userLoading || profileLoading || namesLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background items-center justify-center">
        <p className="text-lg text-muted-foreground">Carregando estatísticas...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
                <BarChart className="h-8 w-8 text-primary" />
                Estatísticas
            </h1>
            <Button asChild variant="outline">
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para a Lista
                </Link>
            </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Regulares</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.statusCounts.regular}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Irregulares</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.statusCounts.irregular}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Inativos</CardTitle>
                    <UserX className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.statusCounts.inativo}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Removidos</CardTitle>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.statusCounts.removido}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Nunca Visitados</CardTitle>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.neverVisited}</div>
                </CardContent>
            </Card>
        </div>

        <div className="mt-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        <span>Atividade de Visitas</span>
                    </CardTitle>
                    <CardDescription>Total de visitas realizadas em diferentes períodos.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                    <div className="p-4 rounded-lg bg-secondary/50">
                        <p className="text-sm font-medium text-muted-foreground">Este Mês</p>
                        <p className="text-3xl font-bold">{stats.visitCounts.thisMonth}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50">
                        <p className="text-sm font-medium text-muted-foreground">Mês Passado</p>
                        <p className="text-3xl font-bold">{stats.visitCounts.lastMonth}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50">
                        <p className="text-sm font-medium text-muted-foreground">Últimos 6 Meses</p>
                        <p className="text-3xl font-bold">{stats.visitCounts.last6Months}</p>
                    </div>
                     <div className="p-4 rounded-lg bg-secondary/50">
                        <p className="text-sm font-medium text-muted-foreground">Últimos 12 Meses</p>
                        <p className="text-3xl font-bold">{stats.visitCounts.last12Months}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
