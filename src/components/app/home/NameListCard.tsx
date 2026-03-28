'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { NameItem } from '@/components/app/NameItem';
import { Users } from 'lucide-react';
import type { Name } from '@/app/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';

interface NameListCardProps {
  names: Name[];
  filteredNames: Name[];
  searchTerm: string;
  updateName: (id: string, newNameData: Partial<Omit<Name, 'id'>>) => void;
  deleteName: (id: string) => void;
  fieldGroups: string[];
  adminName?: string;
  selectedGroup: string;
  setSelectedGroup: (value: string) => void;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
}

export function NameListCard({
  names,
  filteredNames,
  searchTerm,
  updateName,
  deleteName,
  fieldGroups,
  adminName,
  selectedGroup,
  setSelectedGroup,
  selectedStatus,
  setSelectedStatus,
  sortBy,
  setSortBy,
}: NameListCardProps) {
  const description = adminName 
    ? `Você está vendo a lista de ${adminName}, com ${names.length} ${names.length === 1 ? 'nome' : 'nomes'}.`
    : `Você tem ${names.length} ${names.length === 1 ? 'nome' : 'nomes'} na sua lista.`;
    
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <span>{adminName ? `Lista de ${adminName}` : 'Sua Lista'}</span>
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por grupo..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os grupos</SelectItem>
              <Separator />
              {fieldGroups.map((group) => (
                <SelectItem key={group} value={group}>
                  {group}
                </SelectItem>
              ))}
              <SelectItem value="--none--">Sem grupo</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por status..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <Separator />
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="irregular">Irregular</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
              <SelectItem value="removido">Removido</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Ordenar por..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="visit-desc">Última Visita (Recentes)</SelectItem>
              <SelectItem value="visit-asc">Última Visita (Antigos)</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
                  <NameItem name={name} updateName={updateName} deleteName={deleteName} fieldGroups={fieldGroups} />
                </motion.div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">
                {searchTerm || selectedGroup !== 'all' || selectedStatus !== 'all' ? 'Nenhum nome encontrado.' : 'Sua lista está vazia. Adicione um nome acima!'}
              </p>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
