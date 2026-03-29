'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, UserPlus, X } from 'lucide-react';

interface ManageNamesCardProps {
  onAddNameClick: () => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}

export function ManageNamesCard({
  onAddNameClick,
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
      <CardContent className="space-y-4">
        <Button onClick={onAddNameClick} className="w-full">
          <UserPlus className="h-4 w-4 mr-2" />
          Adicionar Novo Nome
        </Button>
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar na lista..."
            className="pl-9 pr-8"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            aria-label="Buscar nome"
          />
          {searchTerm && (
             <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 h-7 w-7 rounded-full"
              onClick={() => setSearchTerm('')}
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
