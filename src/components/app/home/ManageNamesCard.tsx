'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search, UserPlus } from 'lucide-react';

interface ManageNamesCardProps {
  newName: string;
  setNewName: (value: string) => void;
  handleAddNameSubmit: (e: React.FormEvent) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}

export function ManageNamesCard({
  newName,
  setNewName,
  handleAddNameSubmit,
  searchTerm,
  setSearchTerm,
}: ManageNamesCardProps) {
  return (
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
  );
}
