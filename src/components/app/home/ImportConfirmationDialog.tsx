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
import type { ImportedName, Name, ImportUpdate } from "@/app/page";

interface ImportConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  preview: {
    toCreate: ImportedName[];
    toUpdate: ImportUpdate[];
    newGroups: string[];
  } | null;
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
  preview,
  onConfirm,
}: ImportConfirmationDialogProps) {
    if (!preview) return null;

    const totalChanges = preview.toCreate.length + preview.toUpdate.length + preview.newGroups.length;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
            <DialogTitle>Confirmar Importação</DialogTitle>
            <DialogDescription>
                Revise as alterações propostas abaixo antes de confirmar.
            </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
                {preview.newGroups.length > 0 && (
                <div>
                    <h4 className="text-base font-semibold text-foreground">
                    Novos Grupos a Serem Criados ({preview.newGroups.length})
                    </h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                    {preview.newGroups.map((group, index) => (
                        <Badge key={index} variant="secondary">{group}</Badge>
                    ))}
                    </div>
                </div>
                )}
                
                {preview.toUpdate.length > 0 && (
                <div>
                    <h4 className="text-base font-semibold text-foreground">
                    Nomes a Serem Atualizados ({preview.toUpdate.length})
                    </h4>
                    <div className="space-y-2 mt-2 rounded-md border p-3">
                    {preview.toUpdate.map(({ existing, changes }) => (
                        <div key={existing.id} className="text-sm">
                        <p className="font-medium">{existing.text}</p>
                        <ul className="list-disc pl-5 mt-1 space-y-0.5 text-muted-foreground">
                            {changes.map((change, i) => <li key={i}>{change}</li>)}
                        </ul>
                        </div>
                    ))}
                    </div>
                </div>
                )}
                
                {preview.toCreate.length > 0 && (
                <div>
                    <h4 className="text-base font-semibold text-foreground">
                    Novos Nomes a Serem Adicionados ({preview.toCreate.length})
                    </h4>
                    <div className="rounded-md border mt-2">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Nome Completo</TableHead>
                                <TableHead>Grupo</TableHead>
                                <TableHead>Endereço</TableHead>
                                <TableHead>Telefone</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {preview.toCreate.map((item, index) => (
                                <TableRow key={index}>
                                <TableCell className="font-medium">{item.text}</TableCell>
                                <TableCell>{item.fieldGroup || <span className="text-muted-foreground/60">N/A</span>}</TableCell>
                                <TableCell>{item.address || <span className="text-muted-foreground/60">N/A</span>}</TableCell>
                                <TableCell>{item.phone || <span className="text-muted-foreground/60">N/A</span>}</TableCell>
                                <TableCell>
                                    <Badge variant={getStatusVariant(item.status)} className="capitalize">
                                    {item.status}
                                    </Badge>
                                </TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
                )}
            </div>
            </ScrollArea>
            
            <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={onConfirm} disabled={totalChanges === 0}>
                {totalChanges > 0 ? `Confirmar e Importar ${totalChanges} Alterações` : 'Nenhuma alteração para importar'}
            </Button>
            </DialogFooter>
        </DialogContent>
        </Dialog>
    );
}
