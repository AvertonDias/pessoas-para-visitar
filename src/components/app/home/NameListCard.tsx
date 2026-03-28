'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { NameItem } from '@/components/app/NameItem';
import { Users } from 'lucide-react';
import type { Name } from '@/app/page';

interface NameListCardProps {
  names: Name[];
  filteredNames: Name[];
  searchTerm: string;
  updateName: (id: string, newNameData: Partial<Omit<Name, 'id'>>) => void;
  deleteName: (id: string) => void;
  fieldGroups: string[];
  adminName?: string;
}

export function NameListCard({
  names,
  filteredNames,
  searchTerm,
  updateName,
  deleteName,
  fieldGroups,
  adminName,
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
                {searchTerm ? 'Nenhum nome encontrado.' : 'Sua lista está vazia. Adicione um nome acima!'}
              </p>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
