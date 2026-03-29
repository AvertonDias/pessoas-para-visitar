'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import type { FieldGroup } from '@/lib/types';

interface GeneratePdfDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onGeneratePdf: (sortBy: string, selectedGroups: string[]) => void;
    fieldGroups: FieldGroup[];
}

export function GeneratePdfDialog({ isOpen, onOpenChange, onGeneratePdf, fieldGroups }: GeneratePdfDialogProps) {
    const [pdfSortBy, setPdfSortBy] = useState('visit-desc');
    const [pdfSelectedGroups, setPdfSelectedGroups] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            setPdfSelectedGroups(fieldGroups.map(g => g.id).concat('no-group'));
        }
    }, [isOpen, fieldGroups]);

    const handleGenerate = () => {
        onGeneratePdf(pdfSortBy, pdfSelectedGroups);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Gerar Relatório PDF da Lista</DialogTitle>
                    <DialogDescription>
                        Escolha os filtros e a ordem para o relatório em PDF.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="pdf-groups" className="text-right">
                            Grupos
                        </Label>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="col-span-3 justify-start text-left font-normal">
                                    {pdfSelectedGroups.length === fieldGroups.length + 1
                                        ? "Todos os grupos"
                                        : pdfSelectedGroups.length === 0
                                            ? "Nenhum selecionado"
                                            : `${pdfSelectedGroups.length} selecionados`
                                    }
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end">
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0">
                                    <Label htmlFor="select-all-groups" className="flex items-center gap-2 w-full cursor-pointer px-2 py-1.5 font-normal">
                                        <Checkbox
                                            id="select-all-groups"
                                            checked={pdfSelectedGroups.length === fieldGroups.length + 1}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setPdfSelectedGroups(fieldGroups.map(g => g.id).concat('no-group'));
                                                } else {
                                                    setPdfSelectedGroups([]);
                                                }
                                            }}
                                        />
                                        <span>Todos os grupos</span>
                                    </Label>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {fieldGroups.map(group => (
                                    <DropdownMenuCheckboxItem
                                        key={group.id}
                                        checked={pdfSelectedGroups.includes(group.id)}
                                        onCheckedChange={checked => {
                                            setPdfSelectedGroups(prev =>
                                                checked ? [...prev, group.id] : prev.filter(id => id !== group.id)
                                            )
                                        }}
                                    >
                                        {group.name}
                                    </DropdownMenuCheckboxItem>
                                ))}
                                <DropdownMenuCheckboxItem
                                    key="no-group"
                                    checked={pdfSelectedGroups.includes('no-group')}
                                    onCheckedChange={checked => {
                                        setPdfSelectedGroups(prev =>
                                            checked ? [...prev, 'no-group'] : prev.filter(id => id !== 'no-group')
                                        )
                                    }}
                                >
                                    Sem grupo
                                </DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="pdf-sort-by" className="text-right">
                            Ordenar por
                        </Label>
                        <Select value={pdfSortBy} onValueChange={(value) => setPdfSortBy(value)}>
                            <SelectTrigger id="pdf-sort-by" className="col-span-3">
                                <SelectValue placeholder="Ordenar por..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="visit-desc">Última Visita (Recentes)</SelectItem>
                                <SelectItem value="visit-asc">Última Visita (Antigos)</SelectItem>
                                <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleGenerate}>Gerar PDF</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
