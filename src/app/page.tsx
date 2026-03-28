'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/app/Header';
import useLocalStorage from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { ManageNamesCard } from '@/components/app/home/ManageNamesCard';
import { NameListCard } from '@/components/app/home/NameListCard';
import { FieldGroupsCard } from '@/components/app/home/FieldGroupsCard';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type Visit = {
  id: string;
  date: string;
  visitors: string;
};

export type Name = {
  id: number;
  text: string;
  status: 'regular' | 'irregular' | 'inativo' | 'removido';
  fieldGroup: string;
  visitHistory: Visit[];
};

export default function Home() {
  const { toast } = useToast();
  const [names, setNames] = useLocalStorage<Name[]>('names', []);

  const [fieldGroups, setFieldGroups] = useLocalStorage<string[]>('fieldGroups', [
    'Pioneiros',
    'Publicadores',
    'Estudantes',
  ]);
  
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [draftName, setDraftName] = useState<{text: string, fieldGroup: string, status: Name['status']}>({
    text: '',
    fieldGroup: '',
    status: 'regular',
  });

  const addName = () => {
    if (draftName.text.trim() === '') {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar nome",
        description: "O nome não pode estar em branco.",
      });
      return;
    };
    const newNameToAdd: Name = {
      id: Date.now(),
      text: draftName.text.trim(),
      status: draftName.status,
      fieldGroup: draftName.fieldGroup,
      visitHistory: [],
    };
    setNames(prevNames => [newNameToAdd, ...prevNames]);
    setIsAddDialogOpen(false);
  };
  
  const handleOpenAddDialog = () => {
    setDraftName({ text: '', fieldGroup: '', status: 'regular' });
    setIsAddDialogOpen(true);
  }

  const handleAddGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newGroup = (e.currentTarget.querySelector('input') as HTMLInputElement).value;
    if (newGroup.trim() && !fieldGroups.includes(newGroup.trim())) {
      setFieldGroups(prevGroups => [...prevGroups, newGroup.trim()].sort());
      (e.currentTarget.querySelector('input') as HTMLInputElement).value = '';
    }
  };
  
  const deleteGroup = (groupToDelete: string) => {
    setFieldGroups(fieldGroups.filter(g => g !== groupToDelete));
    // Optional: Also remove the group from any names that have it assigned.
    setNames(names.map(n => (n.fieldGroup === groupToDelete ? { ...n, fieldGroup: '' } : n)));
     toast({
        title: "Grupo removido",
        description: `O grupo "${groupToDelete}" foi removido.`,
      });
  };

  const updateGroup = (oldName: string, newName: string): boolean => {
    const trimmedNewName = newName.trim();
    if (trimmedNewName === '' || oldName === trimmedNewName) {
      return true; // No change or empty, consider it a success to exit editing.
    }

    if (fieldGroups.includes(trimmedNewName)) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar grupo",
        description: `O grupo "${trimmedNewName}" já existe.`,
      });
      return false; // Indicate failure
    }

    setFieldGroups(prevGroups => 
        prevGroups.map(g => (g === oldName ? trimmedNewName : g)).sort()
    );

    setNames(prevNames =>
        prevNames.map(name => 
            name.fieldGroup === oldName ? { ...name, fieldGroup: trimmedNewName } : name
        )
    );
    toast({
        title: "Grupo atualizado",
        description: `O grupo "${oldName}" foi renomeado para "${trimmedNewName}".`,
    });
    return true; // Indicate success
  };

  const updateName = (id: number, newNameData: Partial<Omit<Name, 'id'>>) => {
    setNames(prevNames =>
      prevNames.map(name =>
        name.id === id ? { ...name, ...newNameData } : name
      )
    );
  };

  const deleteName = (id: number) => {
    setNames(prevNames => prevNames.filter(name => name.id !== id));
  };

  const filteredNames = isClient ? names.filter(name => name.text.toLowerCase().includes(searchTerm.toLowerCase())) : [];

  if (!isClient) {
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
              fieldGroups={fieldGroups}
            />
          </div>
          
          <div className="lg:col-span-1 space-y-8">
            <FieldGroupsCard
              newGroup=""
              setNewGroup={() => {}}
              handleAddGroupSubmit={handleAddGroupSubmit}
              fieldGroups={fieldGroups}
              updateGroup={updateGroup}
              deleteGroup={deleteGroup}
            />
          </div>
        </div>
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
                onValueChange={(value) => setDraftName(prev => ({ ...prev, fieldGroup: value }))}
              >
                <SelectTrigger id="fieldgroup-add" className="col-span-3">
                  <SelectValue placeholder="Selecione um grupo" />
                </SelectTrigger>
                <SelectContent>
                  {fieldGroups.map((group) => (
                    <SelectItem key={group} value={group}>{group}</SelectItem>
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
