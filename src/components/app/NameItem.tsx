'use client';

import { useState } from 'react';
import type { Name } from '@/app/page';
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

interface NameItemProps {
  name: Name;
  updateName: (id: number, text: string) => void;
  deleteName: (id: number) => void;
}

export function NameItem({ name, updateName, deleteName }: NameItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(name.text);

  const handleUpdate = () => {
    if (editText.trim()) {
      updateName(name.id, editText.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditText(name.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleUpdate();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-card border hover:bg-secondary/50 transition-colors duration-200">
      {isEditing ? (
        <>
          <Input
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-grow"
            aria-label="Editar nome"
            autoFocus
          />
          <Button size="icon" variant="ghost" onClick={handleUpdate} aria-label="Salvar">
            <Check className="h-4 w-4 text-green-600" />
          </Button>
          <Button size="icon" variant="ghost" onClick={handleCancel} aria-label="Cancelar">
            <X className="h-4 w-4 text-red-600" />
          </Button>
        </>
      ) : (
        <>
          <span className="flex-grow text-foreground">{name.text}</span>
          <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)} aria-label={`Editar ${name.text}`}>
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" aria-label={`Remover ${name.text}`}>
                <Trash2 className="h-4 w-4 text-destructive/70 hover:text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Essa ação não pode ser desfeita. Isso excluirá permanentemente o nome "{name.text}" da sua lista.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteName(name.id)}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
