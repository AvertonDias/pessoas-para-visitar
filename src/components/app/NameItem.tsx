'use client';

import { useState } from 'react';
import type { Name, Visit } from '@/app/page';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, History, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface NameItemProps {
  name: Name;
  updateName: (id: string, data: Partial<Omit<Name, 'id'>>) => void;
  deleteName: (id: string) => void;
  fieldGroups: string[];
}

export function NameItem({ name, updateName, deleteName, fieldGroups }: NameItemProps) {
  const [editText, setEditText] = useState(name.text);
  const [editFieldGroup, setEditFieldGroup] = useState(name.fieldGroup || '');
  const [editStatus, setEditStatus] = useState(name.status);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [isVisitDialogOpen, setIsVisitDialogOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [visitorInput, setVisitorInput] = useState('');
  const [dateInput, setDateInput] = useState<Date | undefined>(new Date());

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
      // Reset state if dialog is closed without saving
      setEditText(name.text);
      setEditFieldGroup(name.fieldGroup || '');
      setEditStatus(name.status);
    }
    setIsEditDialogOpen(open);
  }

  const handleOpenAddVisitDialog = () => {
    setEditingVisit(null);
    setVisitorInput('');
    setDateInput(new Date());
    setIsVisitDialogOpen(true);
  };

  const handleOpenEditVisitDialog = (visit: Visit) => {
    setEditingVisit(visit);
    setVisitorInput(visit.visitors);
    setDateInput(new Date(visit.date));
    setIsVisitDialogOpen(true);
  };

  const handleSaveVisit = () => {
    if (!dateInput) return;

    let newHistory: Visit[];
    if (editingVisit) {
        newHistory = (name.visitHistory || []).map(v =>
            v.id === editingVisit.id
                ? { ...v, date: dateInput.toISOString(), visitors: visitorInput }
                : v
        );
    } else {
        const newVisit: Visit = {
            id: Date.now().toString(),
            date: dateInput.toISOString(),
            visitors: visitorInput
        };
        newHistory = [...(name.visitHistory || []), newVisit];
    }

    updateName(name.id, { visitHistory: newHistory });
    setIsVisitDialogOpen(false);
  };

  const handleDeleteVisit = (visitId: string) => {
    const newHistory = (name.visitHistory || []).filter(v => v.id !== visitId);
    updateName(name.id, { visitHistory: newHistory });
  };


  return (
    <>
      <div className="flex items-center gap-2 p-3 rounded-md bg-card border hover:bg-secondary/50 transition-colors duration-200">
          <span className="flex-grow text-foreground">{name.text}</span>
          {name.fieldGroup && <Badge variant="outline" className="hidden sm:inline-flex">{name.fieldGroup}</Badge>}
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
                          <Select value={editFieldGroup} onValueChange={(value) => setEditFieldGroup(value === '---' ? '' : value)}>
                              <SelectTrigger id="fieldgroup-edit" className="col-span-3">
                                  <SelectValue placeholder="Não designado" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="---">Não designado</SelectItem>
                                  {fieldGroups.map((group) => (
                                      <SelectItem key={group} value={group}>{group}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
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
                          <div className="max-h-32 overflow-y-auto space-y-1 pr-2 rounded-md border p-2">
                            {(name.visitHistory || []).slice().reverse().map((visit) => {
                                return (
                                    <div key={visit.id} className="text-sm text-muted-foreground flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon className="h-4 w-4" />
                                            <span className="truncate">
                                                {format(new Date(visit.date), "PPP", { locale: ptBR })}
                                                {visit.visitors && <span className="text-foreground/80"> - {visit.visitors}</span>}
                                            </span>
                                        </div>
                                        <div className="flex items-center">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenEditVisitDialog(visit as Visit)} aria-label="Editar visita">
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Remover visita">
                                                        <Trash2 className="h-3 w-3 text-destructive/70" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Tem certeza que deseja excluir esta visita? Esta ação não pode ser desfeita.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteVisit(visit.id)}>Excluir</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                );
                            })}
                            {(name.visitHistory || []).length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-2">Nenhuma visita registrada.</p>
                            )}
                            </div>
                          <Button variant="outline" size="sm" onClick={handleOpenAddVisitDialog}>
                              <History className="h-4 w-4 mr-2"/>
                              Adicionar Visita
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

      <Dialog open={isVisitDialogOpen} onOpenChange={setIsVisitDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                  <DialogTitle>{editingVisit ? 'Editar Visita' : 'Adicionar Nova Visita'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="visitors" className="text-right">Visitado por:</Label>
                      <Input id="visitors" value={visitorInput} onChange={(e) => setVisitorInput(e.target.value)} className="col-span-3" placeholder="Ex: João e Maria"/>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Data</Label>
                      <Popover>
                          <PopoverTrigger asChild>
                              <Button variant={"outline"} className={cn("col-span-3 justify-start text-left font-normal", !dateInput && "text-muted-foreground")}>
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {dateInput ? format(dateInput, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                              <Calendar mode="single" selected={dateInput} onSelect={setDateInput} initialFocus />
                          </PopoverContent>
                      </Popover>
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsVisitDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSaveVisit}>Salvar Visita</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
