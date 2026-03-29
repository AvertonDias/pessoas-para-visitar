'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Name, FieldGroup } from '@/lib/types';

interface AddNameDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onAddName: (name: { text: string, fieldGroup: string, status: Name['status'] }) => void;
    fieldGroups: FieldGroup[];
}

export function AddNameDialog({ isOpen, onOpenChange, onAddName, fieldGroups }: AddNameDialogProps) {
    const [draftName, setDraftName] = useState<{ text: string, fieldGroup: string, status: Name['status'] }>({
        text: '',
        fieldGroup: '',
        status: 'regular',
    });
    
    const handleSave = () => {
        onAddName(draftName);
        // Reset state for next time
        setDraftName({ text: '', fieldGroup: '', status: 'regular' });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                 setDraftName({ text: '', fieldGroup: '', status: 'regular' });
            }
            onOpenChange(open);
        }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Adicionar Novo Nome</DialogTitle>
                    <DialogDescription>
                        Insira os detalhes para o novo nome.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name-add" className="text-right">Nome</Label>
                        <Input
                            id="name-add"
                            value={draftName.text}
                            onChange={(e) => setDraftName(prev => ({ ...prev, text: e.target.value }))}
                            className="col-span-3"
                            autoFocus
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="fieldgroup-add" className="text-right">Grupo</Label>
                        <Select
                            value={draftName.fieldGroup}
                            onValueChange={(value) => setDraftName(prev => ({ ...prev, fieldGroup: value === '---' ? '' : value }))}
                        >
                            <SelectTrigger id="fieldgroup-add" className="col-span-3">
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
                        <Label htmlFor="status-add" className="text-right">Status</Label>
                        <Select
                            value={draftName.status}
                            onValueChange={(value: Name['status']) => setDraftName(prev => ({ ...prev, status: value }))}
                        >
                            <SelectTrigger id="status-add" className="col-span-3">
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
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>Salvar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
