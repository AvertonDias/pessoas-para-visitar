'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/app/Header';
import useLocalStorage from '@/hooks/use-local-storage';
import { NameItem } from '@/components/app/NameItem';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search, Users, UserPlus, Tag } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { FieldGroupItem } from '@/components/app/FieldGroupItem';
import { useToast } from '@/hooks/use-toast';

export type Name = {
  id: number;
  text: string;
  status: 'regular' | 'irregular' | 'inativo' | 'removido';
  fieldGroup: string;
  visitHistory: string[];
};

export default function Home() {
  const { toast } = useToast();
  const [names, setNames] = useLocalStorage<Name[]>('names', [
    { id: 1, text: 'Sofia', status: 'regular', fieldGroup: 'Pioneiros', visitHistory: [new Date().toISOString()] },
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
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-6 w-6 text-primary" />
                  <span>Gerenciar Nomes</span>
                </CardTitle>
                <CardDescription>Adicione um novo nome ou procure na sua lista.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddNameSubmit} className="flex flex-col sm:flex-row gap-2 mb-4">
                  <Input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Digite um nome..."
                    aria-label="Novo nome"
                  />
                  <Button type="submit" className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Adicionar</span>
                    <span className="sm:hidden">Adicionar Nome</span>
                  </Button>
                </form>
                <div className="relative">
                  <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar na lista..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    aria-label="Buscar nome"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  <span>Sua Lista</span>
                </CardTitle>
                <CardDescription>
                  {isClient ? `Você tem ${names.length} ${names.length === 1 ? 'nome' : 'nomes'} na sua lista.` : 'Carregando...'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <AnimatePresence>
                    {isClient ? (
                      filteredNames.length > 0 ? (
                        filteredNames.map(name => (
                          <motion.div
                            key={name.id}
                            layout
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.2 }}
                          >
                            <NameItem name={name} updateName={updateName} deleteName={deleteName} fieldGroups={fieldGroups} />
                          </motion.div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-4">
                          {searchTerm ? 'Nenhum nome encontrado.' : 'Sua lista está vazia. Adicione um nome acima!'}
                        </p>
                      )
                    ) : (
                      [...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-2 p-3 rounded-md bg-card border">
                          <div className="h-4 bg-muted rounded w-1/3 animate-pulse"></div>
                          <div className="flex-grow"></div>
                          <div className="h-6 w-20 bg-muted rounded-full animate-pulse"></div>
                          <div className="h-8 w-8 bg-muted rounded-md animate-pulse"></div>
                          <div className="h-8 w-8 bg-muted rounded-md animate-pulse"></div>
                        </div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-1 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  <span>Grupos de Campo</span>
                </CardTitle>
                <CardDescription>Gerencie os grupos para organizar sua lista.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddGroupSubmit} className="flex gap-2 mb-4">
                  <Input
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value)}
                    placeholder="Nome do novo grupo"
                    aria-label="Novo grupo"
                  />
                  <Button type="submit" size="icon" aria-label="Adicionar grupo">
                    <Plus className="h-4 w-4" />
                  </Button>
                </form>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {isClient ? (
                    fieldGroups.length > 0 ? (
                      fieldGroups.map((group) => (
                        <FieldGroupItem
                          key={group}
                          group={group}
                          updateGroup={updateGroup}
                          deleteGroup={deleteGroup}
                        />
                      ))
                    ) : (
                      <p className="text-sm text-center text-muted-foreground py-4">
                        Nenhum grupo cadastrado.
                      </p>
                    )
                  ) : (
                     <p className="text-sm text-center text-muted-foreground py-4">
                        Carregando grupos...
                      </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
