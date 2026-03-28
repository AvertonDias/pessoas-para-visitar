'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FieldGroupItem } from '@/components/app/FieldGroupItem';
import { Plus, Tag } from 'lucide-react';

interface FieldGroupsCardProps {
  isClient: boolean;
  newGroup: string;
  setNewGroup: (value: string) => void;
  handleAddGroupSubmit: (e: React.FormEvent) => void;
  fieldGroups: string[];
  updateGroup: (oldName: string, newName: string) => boolean;
  deleteGroup: (groupToDelete: string) => void;
}

export function FieldGroupsCard({
  isClient,
  newGroup,
  setNewGroup,
  handleAddGroupSubmit,
  fieldGroups,
  updateGroup,
  deleteGroup,
}: FieldGroupsCardProps) {
  return (
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
  );
}
