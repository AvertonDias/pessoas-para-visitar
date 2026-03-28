'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ImportedName, Name } from "@/app/page";

interface ImportConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: ImportedName[];
  newGroupsCount: number;
  onConfirm: () => void;
}

const getStatusVariant = (status?: Name['status']): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (!status) return 'default';
    switch (status) {
      case 'regular': return 'default';
      case 'irregular': return 'secondary';
      case 'inativo': return 'outline';
      case 'removido': return 'destructive';
      default: return 'default';
    }
}

export function ImportConfirmationDialog({
  isOpen,
  onOpenChange,
  data,
  newGroupsCount,
  onConfirm,
}: ImportConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Confirmar Importação</DialogTitle>
          <DialogDescription>
            Revise os dados abaixo. Você está prestes a importar {data.length} pessoas
            {newGroupsCount > 0 && ` e criar ${newGroupsCount} novos grupos`}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.text}</TableCell>
                  <TableCell>{item.fieldGroup || 'N/A'}</TableCell>
                  <TableCell>{item.address || 'N/A'}</TableCell>
                  <TableCell>{item.phone || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(item.status)} className="capitalize">
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onConfirm}>Confirmar e Importar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
