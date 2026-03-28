'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/app/Header';
import useLocalStorage from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { ManageNamesCard } from '@/components/app/home/ManageNamesCard';
import { NameListCard } from '@/components/app/home/NameListCard';
import { FieldGroupsCard } from '@/components/app/home/FieldGroupsCard';

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
  const [names, setNames] = useLocalStorage<Name[]>('names', [
    { id: 1, text: 'Sofia', status: 'regular', fieldGroup: 'Pioneiros', visitHistory: [{id: '1', date: new Date().toISOString(), visitors: "João e Maria"}] },
    { id: 2, text: 'Miguel', status: 'irregular', fieldGroup: 'Publicadores', visitHistory: [] },
    { id: 3, text: 'Alice', status: 'inativo', fieldGroup: 'Estudantes', visitHistory: [] },
    { id: 4, text: 'Arthur', status: 'regular', fieldGroup: 'Pioneiros', visitHistory: [] },
  ]);

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
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('');

  const addName = (nameText: string) => {
    if (nameText.trim() === '') return;
    const newNameToAdd: Name = {
      id: Date.now(),
      text: nameText.trim(),
      status: 'regular',
      fieldGroup: '',
      visitHistory: [],
    };
    setNames(prevNames => [newNameToAdd, ...prevNames]);
  };

  const handleAddNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addName(newName);
    setNewName('');
  };

  const handleAddGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGroup.trim() && !fieldGroups.includes(newGroup.trim())) {
      setFieldGroups(prevGroups => [...prevGroups, newGroup.trim()].sort());
      setNewGroup('');
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          <div className="lg:col-span-2 space-y-8">
            <ManageNamesCard
              newName={newName}
              setNewName={setNewName}
              handleAddNameSubmit={handleAddNameSubmit}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
            <NameListCard
              isClient={isClient}
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
              isClient={isClient}
              newGroup={newGroup}
              setNewGroup={setNewGroup}
              handleAddGroupSubmit={handleAddGroupSubmit}
              fieldGroups={fieldGroups}
              updateGroup={updateGroup}
              deleteGroup={deleteGroup}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
