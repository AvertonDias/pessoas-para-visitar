'use client';

import { useState } from 'react';
import { Header } from '@/components/app/Header';
import useLocalStorage from '@/hooks/use-local-storage';
import { NameItem } from '@/components/app/NameItem';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search, Users, UserPlus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export type Name = {
  id: number;
  text: string;
};

export default function Home() {
  const [names, setNames] = useLocalStorage<Name[]>('names', [
    { id: 1, text: 'Sofia' },
    { id: 2, text: 'Miguel' },
    { id: 3, text: 'Alice' },
    { id: 4, text: 'Arthur' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [newName, setNewName] = useState('');

  const addName = (nameText: string) => {
    if (nameText.trim() === '') return;
    const newNameToAdd: Name = {
      id: Date.now(),
      text: nameText.trim(),
    };
    setNames(prevNames => [newNameToAdd, ...prevNames]);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addName(newName);
    setNewName('');
  };

  const updateName = (id: number, newText: string) => {
    setNames(prevNames => prevNames.map(name => (name.id === id ? { ...name, text: newText.trim() } : name)));
  };

  const deleteName = (id: number) => {
    setNames(prevNames => prevNames.filter(name => name.id !== id));
  };

  const filteredNames = names.filter(name => name.text.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-6 w-6 text-primary" />
                  <span>Gerenciar Nomes</span>
                </CardTitle>
                <CardDescription>Adicione um novo nome ou procure na sua lista.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddSubmit} className="flex flex-col sm:flex-row gap-2 mb-4">
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
                  Você tem {names.length} {names.length === 1 ? 'nome' : 'nomes'} na sua lista.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <AnimatePresence>
                    {filteredNames.length > 0 ? (
                      filteredNames.map(name => (
                        <motion.div
                          key={name.id}
                          layout
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -50 }}
                          transition={{ duration: 0.2 }}
                        >
                          <NameItem name={name} updateName={updateName} deleteName={deleteName} />
                        </motion.div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        {searchTerm ? 'Nenhum nome encontrado.' : 'Sua lista está vazia. Adicione um nome acima!'}
                      </p>
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
