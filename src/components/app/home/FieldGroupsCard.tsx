'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FieldGroupItem } from '@/components/app/FieldGroupItem';
import { Plus, Tag } from 'lucide-react';
import { useState } from 'react';
import { FieldGroup } from '@/app/page';

interface FieldGroupsCardProps {
  isAdmin: boolean;
  onAddGroup: (groupName: string) => void;
  fieldGroups: FieldGroup[];
  updateGroup: (groupId: string, newName: string) => boolean;
  deleteGroup: (groupId: string) => void;
  groupCounts: { [groupName: string]: number };
}

export function FieldGroupsCard({
  isAdmin,
  onAddGroup,
  fieldGroups,
  updateGroup,
  deleteGroup,
  groupCounts,
}: FieldGroupsCardProps) {
  const [newGroup, setNewGroup] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newGroup.trim();
    if (trimmedName) {
      onAddGroup(trimmedName);
      setNewGroup('');
    }
  };
  
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
        {isAdmin && (
          <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
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
        )}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {fieldGroups.length > 0 ? (
            fieldGroups.map((group) => (
              <FieldGroupItem
                key={group.id}
                group={group}
                updateGroup={updateGroup}
                deleteGroup={deleteGroup}
                count={groupCounts[group.name] || 0}
                isEditable={isAdmin}
              />
            ))
          ) : (
            <p className="text-sm text-center text-muted-foreground py-4">
              Nenhum grupo cadastrado.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
