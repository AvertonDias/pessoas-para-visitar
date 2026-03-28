'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/app/Header';
import { useToast } from '@/hooks/use-toast';
import { ManageNamesCard } from '@/components/app/home/ManageNamesCard';
import { NameListCard } from '@/components/app/home/NameListCard';
import { FieldGroupsCard } from '@/components/app/home/FieldGroupsCard';
import { HelpersCard } from '@/components/app/home/HelpersCard';
import { ImportCard } from '@/components/app/home/ImportCard';
import { ImportConfirmationDialog } from '@/components/app/home/ImportConfirmationDialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';

import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, doc, where } from 'firebase/firestore';
import * as services from '@/lib/firebase-services';
import { getMostRecentVisitDate } from '@/lib/status-logic';

export type Visit = {
  id: string;
  date: string;
  visitors: string;
};

export type Name = {
  id: string;
  personId?: string;
  text: string;
  address?: string;
  phone?: string;
  status: 'regular' | 'irregular' | 'inativo' | 'removido';
  fieldGroup: string;
  visitHistory: Visit[];
};

export type FieldGroup = {
  id: string;
  name: string;
};

export type UserProfile = {
  id: string;
  name?: string;
  email: string;
  role: 'admin' | 'helper';
  adminId?: string;
};

export type Helper = {
  id: string;
  name?: string;
  email: string;
};

export type ImportedName = Partial<Omit<Name, 'id' | 'visitHistory'>>;

export type ImportUpdate = {
  existing: Name;
  newData: ImportedName;
  changes: string[];
};

export default function Home() {
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<'pessoas' | 'grupos' | 'ajudantes'>('pessoas');
  const [isClient, setIsClient] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const dataOwnerId = useMemo(() => {
    if (!user) return null;
    // A helper must have an adminId to access data. Otherwise, they see their own data.
    if (userProfile?.role === 'helper' && userProfile.adminId) {
      return userProfile.adminId;
    }
    // Default to own UID for admins or helpers in an inconsistent state
    return user.uid;
  }, [user, userProfile]);
  
  // Fetch admin profile if current user is a helper
  const adminProfileRef = useMemoFirebase(() => {
    if (!firestore || !dataOwnerId || !user || dataOwnerId === user.uid) return null;
    return doc(firestore, 'users', dataOwnerId);
  }, [firestore, dataOwnerId, user]);
  const { data: adminProfile, loading: adminProfileLoading } = useDoc<UserProfile>(adminProfileRef);

  // Data fetching from Firestore
  const namesQuery = useMemoFirebase(() => {
    if (!dataOwnerId || !firestore) return null;
    return query(collection(firestore, 'users', dataOwnerId, 'names'));
  }, [dataOwnerId, firestore]);
  const { data: namesData, loading: namesLoading } = useCollection<Name>(namesQuery);
  const names = namesData || [];

  const groupsQuery = useMemoFirebase(() => {
    if (!dataOwnerId || !firestore) return null;
    return query(collection(firestore, 'users', dataOwnerId, 'fieldGroups'));
  }, [dataOwnerId, firestore]);
  const { data: fieldGroupsData, loading: groupsLoading } = useCollection<FieldGroup>(groupsQuery);
  const fieldGroups = fieldGroupsData || [];

  const helpersQuery = useMemoFirebase(() => {
    if (!user || !firestore || userProfile?.role === 'helper') return null;
    return query(collection(firestore, 'users'), where('adminId', '==', user.uid));
  }, [user, firestore, userProfile]);
  const { data: helpersData, loading: helpersLoading } = useCollection<Helper>(helpersQuery);
  const helpers = helpersData || [];

  const groupCounts = useMemo(() => {
    return names.reduce((acc, name) => {
      if (name.fieldGroup) {
        acc[name.fieldGroup] = (acc[name.fieldGroup] || 0) + 1;
      }
      return acc;
    }, {} as { [key: string]: number });
  }, [names]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('visit-desc');
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [draftName, setDraftName] = useState<{text: string, fieldGroup: string, status: Name['status']}>({
    text: '',
    fieldGroup: '',
    status: 'regular',
  });
  
  // State for import functionality
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    toCreate: ImportedName[];
    toUpdate: ImportUpdate[];
    newGroups: string[];
  } | null>(null);


  const addName = () => {
    if (!dataOwnerId || !firestore) return;
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
    services.addName(firestore, dataOwnerId, newNameToAdd);
    toast({
      title: "Nome adicionado",
      description: `${draftName.text.trim()} foi adicionado à lista.`,
    });
    setIsAddDialogOpen(false);
  };
  
  const handleOpenAddDialog = () => {
    setDraftName({ text: '', fieldGroup: '', status: 'regular' });
    setIsAddDialogOpen(true);
  }

  const addGroup = (groupName: string) => {
    if (!dataOwnerId || !firestore) return;

    const newGroupName = groupName.trim();
    if (newGroupName && !fieldGroups.some(g => g.name === newGroupName)) {
      services.addFieldGroup(firestore, dataOwnerId, newGroupName);
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
    if (!dataOwnerId || !firestore) return;
    const groupToDelete = fieldGroups.find(g => g.id === groupId);
    if (!groupToDelete) return;

    services.deleteFieldGroup(firestore, dataOwnerId, groupId);

    // Remove the group from any names that have it assigned.
    names.forEach(name => {
      if (name.fieldGroup === groupToDelete.name) {
        updateName(name.id, { ...name, fieldGroup: '' });
      }
    });

    toast({
        title: "Grupo removido",
        description: `O grupo "${groupToDelete.name}" foi removido.`,
    });
  };

  const updateGroup = (groupId: string, newName: string): boolean => {
    if (!dataOwnerId || !firestore) return false;
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
    
    services.updateFieldGroup(firestore, dataOwnerId, groupId, trimmedNewName);

    // Update names associated with the old group name
    names.forEach(name => {
      if (name.fieldGroup === oldGroup.name) {
        updateName(name.id, { fieldGroup: trimmedNewName });
      }
    });
    
    toast({
        title: "Grupo atualizado",
        description: `O grupo "${oldGroup.name}" foi renomeado para "${trimmedNewName}".`,
    });
    return true;
  };

  const updateName = (id: string, newNameData: Partial<Omit<Name, 'id'>>) => {
    if (!dataOwnerId || !firestore) return;
    services.updateName(firestore, dataOwnerId, id, newNameData);
  };

  const deleteName = (id: string) => {
    if (!dataOwnerId || !firestore) return;
    services.deleteName(firestore, dataOwnerId, id);
    toast({
        title: "Nome removido",
        description: `O nome foi removido da lista.`,
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const rows = text.split('\n').map(row => row.trim()).filter(row => row);
        if (rows.length < 2) {
          toast({ variant: "destructive", title: "Arquivo CSV inválido", description: "O arquivo precisa ter um cabeçalho e pelo menos uma linha de dados." });
          return;
        }

        const header = rows[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
        const dataRows = rows.slice(1);
        
        const nameKeys = {
          displayName: ['displayname', 'nome', 'nome completo'],
          firstName: ['firstname'],
          middleName: ['middlename'],
          lastName: ['lastname'],
          group: ['groupname', 'grupo'],
          address: ['address', 'endereço'],
          phoneMobile: ['phonemobile', 'telefone'],
          phoneHome: ['phonehome'],
          personId: ['personid'],
          moved: ['moved'],
          active: ['active'],
          regular: ['regular'],
          dateOfRemoved: ['dateofremoved'],
        };
        
        const getIndex = (keys: string[]) => keys.map(key => header.indexOf(key)).find(index => index !== -1) ?? -1;

        const displayNameIndex = getIndex(nameKeys.displayName);
        const firstNameIndex = getIndex(nameKeys.firstName);
        const middleNameIndex = getIndex(nameKeys.middleName);
        const lastNameIndex = getIndex(nameKeys.lastName);
        const groupIndex = getIndex(nameKeys.group);
        const addressIndex = getIndex(nameKeys.address);
        const phoneMobileIndex = getIndex(nameKeys.phoneMobile);
        const phoneHomeIndex = getIndex(nameKeys.phoneHome);
        const personIdIndex = getIndex(nameKeys.personId);
        const movedIndex = getIndex(nameKeys.moved);
        const activeIndex = getIndex(nameKeys.active);
        const regularIndex = getIndex(nameKeys.regular);
        const dateOfRemovedIndex = getIndex(nameKeys.dateOfRemoved);

        if (displayNameIndex === -1 && (firstNameIndex === -1 || lastNameIndex === -1)) {
            toast({ variant: "destructive", title: "Coluna de nome não encontrada", description: "O arquivo CSV precisa ter 'DisplayName' ou 'FirstName' e 'LastName'." });
            return;
        }

        const importedResult: ImportedName[] = dataRows.map(row => {
          const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
          
          let text = '';
          const fullName = [values[firstNameIndex], values[middleNameIndex], values[lastNameIndex]].filter(Boolean).join(' ');

          if (fullName.trim()) {
            text = fullName.trim();
          } else if (displayNameIndex !== -1 && values[displayNameIndex]) {
            text = values[displayNameIndex];
          }

          let status: Name['status'] = 'regular';
          const isMoved = movedIndex !== -1 && values[movedIndex]?.toLowerCase() === 'true';
          const hasDateOfRemoved = dateOfRemovedIndex !== -1 && values[dateOfRemovedIndex]?.trim() !== '';
          
          if (isMoved || hasDateOfRemoved) {
            status = 'removido';
          } else {
            const isActive = activeIndex !== -1 && values[activeIndex]?.toLowerCase() === 'true';
            const isRegular = regularIndex !== -1 && values[regularIndex]?.toLowerCase() === 'true';

            if (activeIndex !== -1 && !isActive) {
              status = 'inativo';
            } else if (regularIndex !== -1 && !isRegular) {
              status = 'irregular';
            }
          }

          const phone = (phoneMobileIndex !== -1 ? values[phoneMobileIndex] : '') || (phoneHomeIndex !== -1 ? values[phoneHomeIndex] : '');

          return {
            personId: personIdIndex !== -1 ? values[personIdIndex] : '',
            text: text,
            fieldGroup: groupIndex !== -1 ? values[groupIndex] : '',
            address: addressIndex !== -1 ? values[addressIndex] : '',
            phone: phone,
            status: status,
          };
        }).filter(item => item.text);

        // Analyze changes for preview
        const existingNamesMap = new Map<string, Name>();
        names.forEach(name => {
            if (name.personId) {
                existingNamesMap.set(name.personId, name);
            }
        });

        const toCreate: ImportedName[] = [];
        const toUpdate: ImportUpdate[] = [];
        const formatChange = (label: string, from: any, to: any) => {
            const fromStr = from || 'vazio';
            const toStr = to || 'vazio';
            return `${label}: de "${fromStr}" para "${toStr}"`;
        };

        for (const item of importedResult) {
            const existing = item.personId ? existingNamesMap.get(item.personId) : undefined;
            if (existing) {
                const changes: string[] = [];
                if (item.text !== existing.text) changes.push(formatChange('Nome', existing.text, item.text));
                if ((item.address || '') !== (existing.address || '')) changes.push(formatChange('Endereço', existing.address, item.address));
                if ((item.phone || '') !== (existing.phone || '')) changes.push(formatChange('Telefone', existing.phone, item.phone));
                if ((item.fieldGroup || '') !== (existing.fieldGroup || '')) changes.push(formatChange('Grupo', existing.fieldGroup, item.fieldGroup));
                if (item.status !== existing.status) changes.push(formatChange('Status', existing.status, item.status));
                
                if (changes.length > 0) {
                    toUpdate.push({ existing, newData: item, changes });
                }
            } else {
                toCreate.push(item);
            }
        }

        const existingGroupNames = new Set(fieldGroups.map(g => g.name.toLowerCase()));
        const importedGroupNames = new Set(importedResult.map(item => item.fieldGroup).filter(Boolean) as string[]);
        const newGroups = [...importedGroupNames].filter(g => !existingGroupNames.has(g.toLowerCase()));

        if (toCreate.length === 0 && toUpdate.length === 0 && newGroups.length === 0) {
            toast({
                title: "Nenhuma alteração detectada",
                description: "Os dados no arquivo CSV são idênticos aos dados existentes.",
            });
            return;
        }

        setImportPreview({ toCreate, toUpdate, newGroups });
        setIsImportConfirmOpen(true);

      } catch (error) {
        console.error("Error parsing CSV:", error);
        toast({ variant: "destructive", title: "Erro ao ler arquivo", description: "Não foi possível processar o arquivo CSV. Verifique o formato." });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };
  
  const handleConfirmImport = async () => {
    if (!dataOwnerId || !firestore || !importPreview) return;
    
    const dataToImport = [
      ...importPreview.toCreate,
      ...importPreview.toUpdate.map(u => u.newData)
    ];

    if (dataToImport.length === 0 && importPreview.newGroups.length === 0) {
      toast({ title: "Nenhuma alteração para importar." });
      setIsImportConfirmOpen(false);
      setImportPreview(null);
      return;
    }

    try {
        await services.batchImportData(firestore, dataOwnerId, dataToImport, fieldGroups, names);
        toast({
            title: "Importação concluída!",
            description: `${dataToImport.length} pessoas foram importadas e/ou atualizadas com sucesso.`,
        });
    } catch (error: any) {
        console.error("Error during batch import:", error);
        toast({
            variant: "destructive",
            title: "Erro na importação",
            description: error.message || "Ocorreu um erro inesperado ao salvar os dados. Tente novamente.",
        });
    } finally {
        setIsImportConfirmOpen(false);
        setImportPreview(null);
    }
  };


  const filteredNames = useMemo(() => {
    let sortedNames = names.slice().sort((a, b) => {
      switch (sortBy) {
        case 'visit-desc': {
          const aDate = getMostRecentVisitDate(a.visitHistory);
          const bDate = getMostRecentVisitDate(b.visitHistory);
          return bDate.getTime() - aDate.getTime();
        }
        case 'visit-asc': {
          const aDate = getMostRecentVisitDate(a.visitHistory);
          const bDate = getMostRecentVisitDate(b.visitHistory);
          return aDate.getTime() - bDate.getTime();
        }
        case 'text-desc':
          return b.text.localeCompare(a.text);
        case 'text-asc':
        default:
          return a.text.localeCompare(b.text);
      }
    });

    return sortedNames.filter(name => {
      const matchesSearch = name.text.toLowerCase().includes(searchTerm.toLowerCase());

      const group = name.fieldGroup || '';

      let matchesGroup;
      if (selectedGroup === 'all') {
        matchesGroup = true;
      } else if (selectedGroup === '--none--') {
        matchesGroup = group === '';
      } else {
        matchesGroup = group === selectedGroup;
      }

      const matchesStatus = selectedStatus === 'all' || name.status === selectedStatus;
      return matchesSearch && matchesGroup && matchesStatus;
    });
  }, [names, searchTerm, selectedGroup, selectedStatus, sortBy]);

  const isLoading = userLoading || profileLoading || namesLoading || groupsLoading || helpersLoading || adminProfileLoading;
  
  useEffect(() => {
    if (!userLoading && !user) {
      router.replace('/login');
    }
  }, [userLoading, user, router]);


  if (isLoading || !user || !isClient) {
      return (
        <div className="flex min-h-screen flex-col bg-background items-center justify-center">
            <p className="text-lg text-muted-foreground">Carregando...</p>
        </div>
      )
  }
  
  const isAdmin = userProfile?.role !== 'helper';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
        {isMobile ? (
          <div className="space-y-4">
            <Tabs value={mobileView} onValueChange={(value) => setMobileView(value as any)} className="w-full">
              <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'} rounded-xl bg-muted p-1`}>
                <TabsTrigger value="pessoas" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md">Pessoas</TabsTrigger>
                <TabsTrigger value="grupos" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md">Grupos</TabsTrigger>
                {isAdmin && <TabsTrigger value="ajudantes" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md">Ajudantes</TabsTrigger>}
              </TabsList>
            </Tabs>
            
            {mobileView === 'pessoas' && (
              <div className="space-y-8 mt-4">
                <ManageNamesCard
                  onAddNameClick={handleOpenAddDialog}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                />
                <NameListCard
                  names={names}
                  filteredNames={filteredNames}
                  searchTerm={searchTerm}
                  updateName={updateName}
                  deleteName={deleteName}
                  fieldGroups={fieldGroups.map(fg => fg.name)}
                  adminName={adminProfile?.name}
                  selectedGroup={selectedGroup}
                  setSelectedGroup={setSelectedGroup}
                  selectedStatus={selectedStatus}
                  setSelectedStatus={setSelectedStatus}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                />
              </div>
            )}

            {mobileView === 'grupos' && (
              <div className="space-y-8 mt-4">
                 <FieldGroupsCard
                    isAdmin={isAdmin}
                    onAddGroup={addGroup}
                    fieldGroups={fieldGroups}
                    updateGroup={updateGroup}
                    deleteGroup={deleteGroup}
                    groupCounts={groupCounts}
                  />
              </div>
            )}

             {isAdmin && mobileView === 'ajudantes' && (
              <div className="space-y-8 mt-4">
                 <HelpersCard ownerId={user.uid} helpers={helpers} />
                 <ImportCard onImportClick={() => fileInputRef.current?.click()}/>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            <div className="lg:col-span-2 space-y-8">
              <ManageNamesCard
                onAddNameClick={handleOpenAddDialog}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
              />
              <NameListCard
                names={names}
                filteredNames={filteredNames}
                searchTerm={searchTerm}
                updateName={updateName}
                deleteName={deleteName}
                fieldGroups={fieldGroups.map(fg => fg.name)}
                adminName={adminProfile?.name}
                selectedGroup={selectedGroup}
                setSelectedGroup={setSelectedGroup}
                selectedStatus={selectedStatus}
                setSelectedStatus={setSelectedStatus}
                sortBy={sortBy}
                setSortBy={setSortBy}
              />
            </div>
            
            <div className="lg:col-span-1 space-y-8">
              <FieldGroupsCard
                isAdmin={isAdmin}
                onAddGroup={addGroup}
                fieldGroups={fieldGroups}
                updateGroup={updateGroup}
                deleteGroup={deleteGroup}
                groupCounts={groupCounts}
              />
              {isAdmin && (
                <>
                  <HelpersCard ownerId={user.uid} helpers={helpers} />
                  <ImportCard onImportClick={() => fileInputRef.current?.click()}/>
                </>
              )}
            </div>
          </div>
        )}
      </main>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".csv"
      />

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Nome</DialogTitle>
            <DialogDescription>
              Insira os detalhes para o novo nome.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name-add" className="text-right">Nome</Label>
              <Input
                id="name-add"
                value={draftName.text}
                onChange={(e) => setDraftName(prev => ({ ...prev, text: e.target.value }))}
                className="col-span-3"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fieldgroup-add" className="text-right">Grupo</Label>
              <Select
                value={draftName.fieldGroup}
                onValueChange={(value) => setDraftName(prev => ({ ...prev, fieldGroup: value === '---' ? '' : value }))}
              >
                <SelectTrigger id="fieldgroup-add" className="col-span-3">
                  <SelectValue placeholder="Não designado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="---">Não designado</SelectItem>
                  {fieldGroups.map((group) => (
                    <SelectItem key={group.id} value={group.name}>{group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status-add" className="text-right">Status</Label>
              <Select
                value={draftName.status}
                onValueChange={(value: Name['status']) => setDraftName(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger id="status-add" className="col-span-3">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="irregular">Irregular</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="removido">Removido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
            <Button onClick={addName}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <ImportConfirmationDialog
        isOpen={isImportConfirmOpen}
        onOpenChange={setIsImportConfirmOpen}
        preview={importPreview}
        onConfirm={handleConfirmImport}
      />
    </div>
  );
}
