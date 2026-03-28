'use client';

import { useState } from 'react';
import type { Name } from '@/app/page';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, History, Calendar } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface NameItemProps {
  name: Name;
  updateName: (id: number, data: Partial<Omit<Name, 'id'>>) => void;
  deleteName: (id: number) => void;
}

export function NameItem({ name, updateName, deleteName }: NameItemProps) {
  const [editText, setEditText] = useState(name.text);
  const [editFieldGroup, setEditFieldGroup] = useState(name.fieldGroup);
  const [editStatus, setEditStatus] = useState(name.status);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleUpdate = () => {
    if (editText.trim()) {
      updateName(name.id, { 
          text: editText.trim(),
          fieldGroup: editFieldGroup,
          status: editStatus
      });
      setIsEditDialogOpen(false);
    }
  };
  
  const handleAddVisit = () => {
      const newHistory = [...(name.visitHistory || []), new Date().toISOString()];
      updateName(name.id, { visitHistory: newHistory });
  }

  const getStatusVariant = (status: Name['status']): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'regular':
        return 'default';
      case 'irregular':
        return 'secondary';
      case 'inativo':
        return 'outline';
      case 'removido':
        return 'destructive';
      default:
        return 'default';
    }
  }
  
  const onOpenChange = (open: boolean) => {
    if (!open) {
      setEditText(name.text);
      setEditFieldGroup(name.fieldGroup);
      setEditStatus(name.status);
    }
    setIsEditDialogOpen(open);
  }

  return (
    <div className="flex items-center gap-2 p-3 rounded-md bg-card border hover:bg-secondary/50 transition-colors duration-200">
        <span className="flex-grow text-foreground">{name.text}</span>
        <Badge variant={getStatusVariant(name.status)} className="capitalize">{name.status}</Badge>
        
        <Dialog open={isEditDialogOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button size="icon" variant="ghost" aria-label={`Editar ${name.text}`}>
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Detalhes</DialogTitle>
                    <DialogDescription>
                        Atualize as informações de "{name.text}".
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name-edit" className="text-right">Nome</Label>
                        <Input id="name-edit" value={editText} onChange={(e) => setEditText(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="fieldgroup-edit" className="text-right">Grupo</Label>
                        <Input id="fieldgroup-edit" value={editFieldGroup} onChange={(e) => setEditFieldGroup(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status-edit" className="text-right">Status</Label>
                         <Select value={editStatus} onValueChange={(value: Name['status']) => setEditStatus(value)}>
                            <SelectTrigger id="status-edit" className="col-span-3">
                                <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="regular">Regular</SelectItem>
                                <SelectItem value="irregular">Irregular</SelectItem>
                                <SelectItem value="inativo">Inativo</SelectItem>
                                <SelectItem value="removido">Removido</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <Label>Histórico de Visitas</Label>
                        <div className="max-h-24 overflow-y-auto space-y-1 pr-2 rounded-md border p-2">
                        {name.visitHistory && name.visitHistory.length > 0 ? (
                            name.visitHistory.slice().reverse().map((visit, index) => (
                            <div key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                                <Calendar className="h-4 w-4" /> 
                                {new Date(visit).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">Nenhuma visita registrada.</p>
                        )}
                        </div>
                        <Button variant="outline" size="sm" onClick={handleAddVisit}>
                            <History className="h-4 w-4 mr-2"/>
                            Adicionar Visita de Hoje
                        </Button>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handleUpdate}>Salvar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" aria-label={`Remover ${name.text}`}>
                    <Trash2 className="h-4 w-4 text-destructive/70 hover:text-destructive" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar para excluir</AlertDialogTitle>
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
    </div>
  );
}
