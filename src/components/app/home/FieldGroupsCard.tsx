'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Check, X, Plus } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { FieldGroup } from '@/lib/types';

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
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newGroup.trim();
    if (trimmedName) {
      onAddGroup(trimmedName);
      setNewGroup('');
    }
  };
  
  const handleEdit = (group: FieldGroup) => {
    setEditingGroupId(group.id);
    setEditText(group.name);
  };

  const handleCancel = () => {
    setEditingGroupId(null);
    setEditText('');
  };

  const handleUpdate = (groupId: string) => {
    if (editText.trim()) {
      const success = updateGroup(groupId, editText.trim());
      if (success) {
        handleCancel();
      }
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground mb-4">Gerencie os grupos para organizar sua lista.</p>
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
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Grupo</TableHead>
                        <TableHead className="w-24 text-center">Nomes</TableHead>
                        {isAdmin && <TableHead className="w-28 text-right">Ações</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                {fieldGroups.length > 0 ? (
                    fieldGroups.map((group) => (
                    <TableRow key={group.id} className="h-14">
                        {editingGroupId === group.id ? (
                            <>
                                <TableCell>
                                    <Input 
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if(e.key === 'Escape') handleCancel();
                                            if(e.key === 'Enter') { e.preventDefault(); handleUpdate(group.id); }
                                        }}
                                        className="h-8 text-sm"
                                        autoFocus
                                    />
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="secondary">{groupCounts[group.name] || 0}</Badge>
                                </TableCell>
                                {isAdmin && (
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdate(group.id)}>
                                                <Check className="h-4 w-4 text-green-600" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancel}>
                                                <X className="h-4 w-4 text-destructive/70" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                )}
                            </>
                        ) : (
                            <>
                                <TableCell className="font-medium">{group.name}</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="secondary">{groupCounts[group.name] || 0}</Badge>
                                </TableCell>
                                {isAdmin && (
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(group)}>
                                            <Pencil className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Remover grupo ${group.name}`}>
                                                    <Trash2 className="h-4 w-4 text-destructive/70" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                Tem certeza que deseja excluir o grupo "{group.name}"? Esta ação removerá o grupo de todos os nomes associados e não pode ser desfeita.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => deleteGroup(group.id)}>Excluir</AlertDialogAction>
                                            </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        </div>
                                    </TableCell>
                                )}
                            </>
                        )}
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={isAdmin ? 3 : 2} className="h-24 text-center">
                            Nenhum grupo cadastrado.
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
