'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ManageNamesCard } from '@/components/app/home/ManageNamesCard';
import { NameListCard } from '@/components/app/home/NameListCard';
import { AddNameDialog } from '@/components/app/home/AddNameDialog';
import { GeneratePdfDialog } from '@/components/app/home/GeneratePdfDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import * as services from '@/lib/firebase-services';
import { getMostRecentVisitDate } from '@/lib/status-logic';
import { InstallPwaBanner } from '@/components/app/InstallPwaBanner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { PerformingUser } from '@/lib/audit-log-services';
import type { Name, FieldGroup, UserProfile } from '@/lib/types';
import Image from 'next/image';
import { motion } from 'framer-motion';

declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

export default function Home() {
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const dataOwnerId = useMemo(() => {
    if (!user) return null;
    // A helper must have an adminId to access data. Otherwise, they see their own data.
    if (userProfile?.role === 'helper' && userProfile.adminId) {
      return userProfile.adminId;
    }
    // Default to own UID for admins or helpers in an inconsistent state
    return user.uid;
  }, [user, userProfile]);

  const performingUser: PerformingUser | null = useMemo(() => {
    if (!user || !userProfile) return null;
    return {
      uid: user.uid,
      name: userProfile.name || user.email || 'Usuário Anônimo',
    };
  }, [user, userProfile]);
  
  // Fetch admin profile if current user is a helper
  const adminProfileRef = useMemoFirebase(() => {
    if (!firestore || !dataOwnerId || !user || dataOwnerId === user.uid) return null;
    return doc(firestore, 'users', dataOwnerId);
  }, [firestore, dataOwnerId, user]);
  const { data: adminProfile, isLoading: adminProfileLoading } = useDoc<UserProfile>(adminProfileRef);
  
  const isAdmin = userProfile?.role !== 'helper';

  // Data fetching from Firestore
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
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('visit-desc');
  
  // State for PDF dialog
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);


  // Load filters from localStorage on initial client render
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const savedGroup = localStorage.getItem('list-filter-group');
        if (savedGroup) setSelectedGroup(savedGroup);
        
        const savedStatus = localStorage.getItem('list-filter-status');
        if (savedStatus) setSelectedStatus(savedStatus);
        
        const savedSort = localStorage.getItem('list-filter-sort');
        if (savedSort) setSortBy(savedSort);
    }
  }, []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('list-filter-group', selectedGroup);
      localStorage.setItem('list-filter-status', selectedStatus);
      localStorage.setItem('list-filter-sort', sortBy);
    }
  }, [selectedGroup, selectedStatus, sortBy, isClient]);

  const addName = (draftName: { text: string, fieldGroup: string, status: Name['status'] }) => {
    if (!dataOwnerId || !firestore || !performingUser) return;
    if (draftName.text.trim() === '') {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar nome",
        description: "O nome não pode estar em branco.",
      });
      return;
    };
    const newNameToAdd = {
      text: draftName.text.trim(),
      status: draftName.status,
      fieldGroup: draftName.fieldGroup,
      address: '',
      phone: '',
    };
    services.addName(firestore, dataOwnerId, newNameToAdd, performingUser);
    toast({
      title: "Nome adicionado",
      description: `${draftName.text.trim()} foi adicionado à lista.`,
    });
    setIsAddDialogOpen(false);
  };

  const updateName = (id: string, newNameData: Partial<Omit<Name, 'id'>>) => {
    if (!dataOwnerId || !firestore || !performingUser) return;
    services.updateName(firestore, dataOwnerId, id, newNameData, performingUser, fieldGroups);
  };

  const deleteName = (id: string) => {
    if (!dataOwnerId || !firestore || !performingUser) return;
    services.deleteName(firestore, dataOwnerId, id, performingUser);
    toast({
        title: "Nome removido",
        description: `O nome foi removido da lista.`,
    });
  };

  const filteredNames = useMemo(() => {
    const filtered = names.filter(name => {
      const matchesSearch = name.text.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesGroup = selectedGroup === 'all' 
        || name.fieldGroup === selectedGroup 
        || (selectedGroup === 'no-group' && (!name.fieldGroup || name.fieldGroup === ''));
        
      const matchesStatus = selectedStatus === 'all' || name.status === selectedStatus;
      return matchesSearch && matchesGroup && matchesStatus;
    });

    // Then, sort the filtered names
    filtered.sort((a, b) => {
      if (sortBy === 'name-asc') {
        return a.text.localeCompare(b.text);
      }

      const dateA = getMostRecentVisitDate(a.visitHistory).getTime();
      const dateB = getMostRecentVisitDate(b.visitHistory).getTime();
      
      let dateComparison = 0;
      if (sortBy === 'visit-asc') {
        dateComparison = dateA - dateB;
      } else { // 'visit-desc' is the default
        dateComparison = dateB - dateA;
      }

      // If dates are the same, sort by name alphabetically
      if (dateComparison === 0) {
        return a.text.localeCompare(b.text);
      }
      
      return dateComparison;
    });

    return filtered;
  }, [names, searchTerm, selectedGroup, selectedStatus, sortBy]);

  const isLoading = isUserLoading || profileLoading || namesLoading || groupsLoading || adminProfileLoading;
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [isUserLoading, user, router]);

  const generateNamesPdf = (pdfSortBy: string, pdfSelectedGroups: string[]) => {
    const filteredForPdf = names.filter(name => {
      if (pdfSelectedGroups.length === 0) {
        return false;
      }
      const hasNoGroup = !name.fieldGroup || name.fieldGroup === '';
      if (hasNoGroup) {
        return pdfSelectedGroups.includes('no-group');
      }
      return pdfSelectedGroups.includes(name.fieldGroup);
    });

    if (!filteredForPdf || filteredForPdf.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Lista Vazia',
        description: 'Não há nomes para gerar o PDF nos grupos selecionados.',
      });
      return;
    }

    const doc = new jsPDF();
    const groupMap = new Map(fieldGroups.map(g => [g.id, g.name]));

    const sortedNames = [...filteredForPdf].sort((a, b) => {
      if (pdfSortBy === 'name-asc') {
        return a.text.localeCompare(b.text);
      }
      const dateA = getMostRecentVisitDate(a.visitHistory).getTime();
      const dateB = getMostRecentVisitDate(b.visitHistory).getTime();
      
      if (pdfSortBy === 'visit-asc') {
        return dateA - dateB;
      }
      // 'visit-desc'
      return dateB - dateA;
    });

    const body = sortedNames.map(name => {
      const mostRecentVisit = getMostRecentVisitDate(name.visitHistory);
      const visitDate = mostRecentVisit.getTime() === 0
        ? 'Nunca'
        : format(mostRecentVisit, "dd/MM/yyyy", { locale: ptBR });

      return [
        name.text,
        groupMap.get(name.fieldGroup) || 'Sem grupo',
        name.status,
        visitDate
      ];
    });

    const title = `Relatório da Lista de Nomes`;
    const subtitle = `Total de ${filteredForPdf.length} nomes. Ordenado por: ${
      {
        'visit-desc': 'Última Visita (Recentes)',
        'visit-asc': 'Última Visita (Antigos)',
        'name-asc': 'Nome (A-Z)'
      }[pdfSortBy]
    }`;

    doc.setFontSize(22);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(subtitle, doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });

    (doc as any).autoTable({
      head: [['Nome', 'Grupo', 'Status', 'Última Visita']],
      body: body,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [34, 99, 219] },
      didDrawPage: function (data: any) {
        // Footer
        const pageCount = doc.internal.pages.length;
        doc.setFontSize(10);
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.text("Página " + String(pageCount), data.settings.margin.left, pageHeight - 10);
      }
    });

    const dateStr = format(new Date(), 'yyyy-MM-dd');
    doc.save(`relatorio-nomes-${dateStr}.pdf`);
    
    setIsPdfDialogOpen(false);
  };


  if (isLoading || !isClient) {
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
                    width={128}
                    height={128}
                    priority
                />
            </motion.div>
            <p className="text-lg text-muted-foreground mt-4">Carregando...</p>
        </div>
      )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        <div className="lg:col-span-1 space-y-8 lg:sticky lg:top-24 self-start">
          <ManageNamesCard
            onAddNameClick={() => setIsAddDialogOpen(true)}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onGeneratePdfClick={() => setIsPdfDialogOpen(true)}
          />
        </div>
        <div className="lg:col-span-2">
          <NameListCard
            names={names}
            filteredNames={filteredNames}
            searchTerm={searchTerm}
            updateName={updateName}
            deleteName={deleteName}
            fieldGroups={fieldGroups}
            adminName={adminProfile?.name}
            selectedGroup={selectedGroup}
            setSelectedGroup={setSelectedGroup}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />
        </div>
      </div>

        <AddNameDialog 
          isOpen={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onAddName={addName}
          fieldGroups={fieldGroups}
        />
        
         <GeneratePdfDialog 
          isOpen={isPdfDialogOpen}
          onOpenChange={setIsPdfDialogOpen}
          onGeneratePdf={generateNamesPdf}
          fieldGroups={fieldGroups}
         />

        <InstallPwaBanner />
    </div>
  );
}
