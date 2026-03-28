'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/app/Header';
import { useToast } from '@/hooks/use-toast';
import { ManageNamesCard } from '@/components/app/home/ManageNamesCard';
import { NameListCard } from '@/components/app/home/NameListCard';
import { FieldGroupsCard } from '@/components/app/home/FieldGroupsCard';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import * as services from '@/lib/firebase-services';

export type Visit = {
  id: string;
  date: string;
  visitors: string;
};

export type Name = {
  id: string;
  text: string;
  status: 'regular' | 'irregular' | 'inativo' | 'removido';
  fieldGroup: string;
  visitHistory: Visit[];
};

export type FieldGroup = {
  id: string;
  name: string;
};

export default function Home() {
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<'pessoas' | 'grupos'>('pessoas');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Data fetching from Firestore
  const namesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'names'));
  }, [user, firestore]);
  const { data: namesData, loading: namesLoading } = useCollection<Name>(namesQuery);
  const names = namesData || [];

  const groupsQuery = useMemoFirebase(() => {
      if (!user || !firestore) return null;
      return query(collection(firestore, 'users', user.uid, 'fieldGroups'));
  }, [user, firestore]);
  const { data: fieldGroupsData, loading: groupsLoading } = useCollection<FieldGroup>(groupsQuery);
  const fieldGroups = fieldGroupsData || [];

  const groupCounts = useMemo(() => {
    return names.reduce((acc, name) => {
      if (name.fieldGroup) {
        acc[name.fieldGroup] = (acc[name.fieldGroup] || 0) + 1;
      }
      return acc;
    }, {} as { [key: string]: number });
  }, [names]);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [draftName, setDraftName] = useState<{text: string, fieldGroup: string, status: Name['status']}>({
    text: '',
    fieldGroup: '',
    status: 'regular',
  });

  const addName = () => {
    if (!user || !firestore) return;
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
    };
    services.addName(firestore, user.uid, newNameToAdd);
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

  const handleAddGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore) return;

    const newGroupInput = e.currentTarget.querySelector('input');
    if (!newGroupInput) return;

    const newGroupName = newGroupInput.value.trim();
    if (newGroupName && !fieldGroups.some(g => g.name === newGroupName)) {
      services.addFieldGroup(firestore, user.uid, newGroupName);
      toast({
        title: "Grupo adicionado",
        description: `O grupo "${newGroupName}" foi criado.`,
      });
      newGroupInput.value = '';
    } else if (newGroupName) {
       toast({
        variant: "destructive",
        title: "Erro",
        description: `O grupo "${newGroupName}" já existe.`,
      });
    }
  };
  
  const deleteGroup = (groupId: string) => {
    if (!user || !firestore) return;
    const groupToDelete = fieldGroups.find(g => g.id === groupId);
    if (!groupToDelete) return;

    services.deleteFieldGroup(firestore, user.uid, groupId);

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
    if (!user || !firestore) return false;
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
    
    services.updateFieldGroup(firestore, user.uid, groupId, trimmedNewName);

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
    if (!user || !firestore) return;
    services.updateName(firestore, user.uid, id, newNameData);
  };

  const deleteName = (id: string) => {
    if (!user || !firestore) return;
    services.deleteName(firestore, user.uid, id);
    toast({
        title: "Nome removido",
        description: `O nome foi removido da lista.`,
    });
  };

  const filteredNames = names.filter(name => name.text.toLowerCase().includes(searchTerm.toLowerCase()));

  const isLoading = userLoading || namesLoading || groupsLoading;
  
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);


  if (isLoading || !user || !isClient) {
      return (
        <div className="flex min-h-screen flex-col bg-background items-center justify-center">
            <p className="text-lg text-muted-foreground">Carregando...</p>
        </div>
      )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
        {isMobile ? (
          <div className="space-y-4">
            <Tabs value={mobileView} onValueChange={(value) => setMobileView(value as 'pessoas' | 'grupos')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted p-1">
                <TabsTrigger value="pessoas" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md">Pessoas</TabsTrigger>
                <TabsTrigger value="grupos" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md">Grupos</TabsTrigger>
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
                />
              </div>
            )}

            {mobileView === 'grupos' && (
              <div className="space-y-8 mt-4">
                 <FieldGroupsCard
                    handleAddGroupSubmit={handleAddGroupSubmit}
                    fieldGroups={fieldGroups}
                    updateGroup={updateGroup}
                    deleteGroup={deleteGroup}
                    groupCounts={groupCounts}
                  />
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
              />
            </div>
            
            <div className="lg:col-span-1 space-y-8">
              <FieldGroupsCard
                handleAddGroupSubmit={handleAddGroupSubmit}
                fieldGroups={fieldGroups}
                updateGroup={updateGroup}
                deleteGroup={deleteGroup}
                groupCounts={groupCounts}
              />
            </div>
          </div>
        )}
      </main>

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
    </div>
  );
}
