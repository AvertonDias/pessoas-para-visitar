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
    unmatchedNames: string[];
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
    const hasUnmatched = preview.unmatchedNames.length > 0;

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
                {hasUnmatched && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                    <h4 className="text-lg font-semibold text-destructive-foreground flex items-center gap-2">
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.49991 0.877045C3.84222 0.877045 0.877045 3.84222 0.877045 7.49991C0.877045 11.1576 3.84222 14.1228 7.49991 14.1228C11.1576 14.1228 14.1228 11.1576 14.1228 7.49991C14.1228 3.84222 11.1576 0.877045 7.49991 0.877045ZM1.82704 7.49991C1.82704 4.36671 4.36671 1.82704 7.49991 1.82704C10.6331 1.82704 13.1728 4.36671 13.1728 7.49991C13.1728 10.6331 10.6331 13.1728 7.49991 13.1728C4.36671 13.1728 1.82704 10.6331 1.82704 7.49991ZM7.50003 4C7.22389 4 7.00003 4.22386 7.00003 4.5V8C7.00003 8.27614 7.22389 8.5 7.50003 8.5C7.77617 8.5 8.00003 8.27614 8.00003 8V4.5C8.00003 4.22386 7.77617 4 7.50003 4ZM7.5 11C7.77614 11 8 10.7761 8 10.5C8 10.2239 7.77614 10 7.5 10C7.22386 10 7 10.2239 7 10.5C7 10.7761 7.22386 11 7.5 11Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                      Nomes Não Encontrados ({preview.unmatchedNames.length})
                    </h4>
                    <p className="text-sm text-destructive-foreground/80 mt-1">
                        As visitas para estes nomes não serão importadas. Verifique se o nome na planilha corresponde exatamente ao nome no aplicativo (erros de digitação, nomes do meio, etc.).
                    </p>
                    <div className="mt-3 max-h-28 overflow-y-auto rounded bg-background/20 p-2">
                      <ul className="list-disc pl-5 space-y-1">
                      {preview.unmatchedNames.map((name, index) => (
                          <li key={index} className="text-sm text-destructive-foreground font-mono">{name}</li>
                      ))}
                      </ul>
                    </div>
                </div>
                )}
                
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
                                <TableHead>Última Visita</TableHead>
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
                                <TableCell>
                                    {item.importedVisitDate ? (
                                        new Date(item.importedVisitDate).toLocaleDateString('pt-BR')
                                    ) : (
                                        <span className="text-muted-foreground/60">N/A</span>
                                    )}
                                </TableCell>
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
