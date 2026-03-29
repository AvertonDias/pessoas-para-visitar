'use client';

import { useState } from 'react';
import type { Name, Visit, FieldGroup } from '@/app/page';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, History, Calendar as CalendarIcon } from 'lucide-react';
import { format, isAfter } from 'date-fns';
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface NameItemProps {
  name: Name;
  updateName: (id: string, data: Partial<Omit<Name, 'id'>>) => void;
  deleteName: (id: string) => void;
  fieldGroups: FieldGroup[];
}

export function NameItem({ name, updateName, deleteName, fieldGroups }: NameItemProps) {
  const [editText, setEditText] = useState(name.text);
  const [editAddress, setEditAddress] = useState(name.address || '');
  const [editPhone, setEditPhone] = useState(name.phone || '');
  const [editFieldGroup, setEditFieldGroup] = useState(name.fieldGroup || '');
  const [editStatus, setEditStatus] = useState(name.status);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [isVisitDialogOpen, setIsVisitDialogOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [visitorInput, setVisitorInput] = useState('');
  const [dateInput, setDateInput] = useState<Date | undefined>(new Date());

  const mostRecentVisit = (name.visitHistory || []).reduce<Visit | null>((latest, visit) => {
    if (!latest) return visit;
    const latestDate = new Date(latest.date);
    const visitDate = new Date(visit.date);
    return isAfter(visitDate, latest) ? visit : latest;
  }, null);

  const handleUpdate = () => {
    if (editText.trim()) {
      updateName(name.id, { 
          text: editText.trim(),
          address: editAddress.trim(),
          phone: editPhone.trim(),
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
    if (open) {
      // When opening, ensure all state is fresh and correct
      setEditText(name.text);
      setEditAddress(name.address || '');
      setEditPhone(name.phone || '');
      setEditStatus(name.status);
      // This is the fix: find the group ID, even if name.fieldGroup stores a name (old data)
      const currentGroupId = fieldGroups.find(g => g.id === name.fieldGroup || g.name === name.fieldGroup)?.id || '';
      setEditFieldGroup(currentGroupId);
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
  
  const groupForDisplay = fieldGroups.find(g => g.id === name.fieldGroup);


  return (
    <>
      <Collapsible className="rounded-md bg-card border data-[state=open]:bg-secondary/20 transition-colors duration-200">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 p-3">
            <CollapsibleTrigger className="flex-grow text-left">
              <p className="font-medium text-foreground">{name.text}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <CalendarIcon className="h-3 w-3" />
                {mostRecentVisit ? (
                  <span>{format(new Date(mostRecentVisit.date), "PPP", { locale: ptBR })}</span>
                ) : (
                  <span>Nenhuma visita</span>
                )}
              </div>
            </CollapsibleTrigger>
            
            <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-2">
                <div className="flex items-center gap-2">
                    {groupForDisplay && <Badge variant="outline" className="font-normal">{groupForDisplay.name}</Badge>}
                    <Badge variant={getStatusVariant(name.status)} className="capitalize font-normal">{name.status}</Badge>
                </div>
                <div className="flex flex-shrink-0">
                    <Dialog open={isEditDialogOpen} onOpenChange={onOpenChange}>
                        <DialogTrigger asChild>
                            <Button size="icon" variant="ghost" aria-label={`Editar ${name.text}`}>
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
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
                                    <Label htmlFor="address-edit" className="text-right">Endereço</Label>
                                    <Input id="address-edit" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="phone-edit" className="text-right">Telefone</Label>
                                    <Input id="phone-edit" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="col-span-3" />
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
                                                <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
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
            </div>
          </div>
          <CollapsibleContent>
            <div className="p-3 pt-0">
                <Separator className="mb-3"/>
                <div className="space-y-2">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-semibold">Histórico de Visitas</h4>
                        <Button variant="outline" size="sm" onClick={handleOpenAddVisitDialog}>
                            <History className="h-4 w-4 mr-2"/>
                            Adicionar Visita
                        </Button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-2 rounded-md">
                      {(name.visitHistory || []).length > 0 ? (
                        (name.visitHistory || []).slice().reverse().map((visit) => {
                            return (
                                <div key={visit.id} className="text-sm text-muted-foreground flex items-center justify-between gap-2 p-2 bg-secondary/50 rounded-md">
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
                        })
                      ) : (
                          <p className="text-sm text-muted-foreground text-center py-2">Nenhuma visita registrada.</p>
                      )}
                    </div>
                </div>
            </div>
          </CollapsibleContent>
      </Collapsible>

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
                      <Label htmlFor="visit-date" className="text-right">Data</Label>
                      <Input
                        id="visit-date"
                        type="date"
                        className="col-span-3"
                        value={dateInput ? format(dateInput, 'yyyy-MM-dd') : ''}
                        onChange={(e) => setDateInput(e.target.value ? new Date(e.target.value.replace(/-/g, '/')) : undefined)}
                      />
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
