'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Check, X } from 'lucide-react';
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

interface FieldGroupItemProps {
  group: string;
  updateGroup: (oldName: string, newName: string) => boolean;
  deleteGroup: (groupName: string) => void;
}

export function FieldGroupItem({ group, updateGroup, deleteGroup }: FieldGroupItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(group);

  const handleUpdate = () => {
    if (editText.trim() === group) {
        setIsEditing(false);
        setEditText(group);
        return;
    }

    if (editText.trim()) {
      const success = updateGroup(group, editText.trim());
      if (success) {
        setIsEditing(false);
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditText(group);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleUpdate();
  }

  if (isEditing) {
    return (
      <form onSubmit={handleFormSubmit} className="flex items-center justify-between gap-2 p-2 rounded-md bg-secondary/50">
        <Input 
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && handleCancel()}
          className="h-7 text-sm"
          autoFocus
        />
        <div className="flex items-center">
            <Button variant="ghost" size="icon" className="h-7 w-7" type="submit" aria-label={`Salvar grupo ${editText}`}>
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" type="button" onClick={handleCancel} aria-label="Cancelar edição">
              <X className="h-4 w-4 text-destructive/70" />
            </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-secondary/50">
      <span className="text-sm font-medium">{group}</span>
      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(true)} aria-label={`Editar grupo ${group}`}>
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Remover grupo ${group}`}>
              <Trash2 className="h-4 w-4 text-destructive/70" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o grupo "{group}"? Esta ação removerá o grupo de todos os nomes associados e não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteGroup(group)}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
