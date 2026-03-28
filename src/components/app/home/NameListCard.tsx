'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { NameItem } from '@/components/app/NameItem';
import { Users } from 'lucide-react';
import type { Name } from '@/app/page';

interface NameListCardProps {
  isClient: boolean;
  names: Name[];
  filteredNames: Name[];
  searchTerm: string;
  updateName: (id: number, newNameData: Partial<Omit<Name, 'id'>>) => void;
  deleteName: (id: number) => void;
  fieldGroups: string[];
}

export function NameListCard({
  isClient,
  names,
  filteredNames,
  searchTerm,
  updateName,
  deleteName,
  fieldGroups,
}: NameListCardProps) {
  return (
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
  );
}
