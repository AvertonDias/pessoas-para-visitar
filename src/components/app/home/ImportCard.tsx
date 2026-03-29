'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UploadCloud, Link as LinkIcon, Loader2, CalendarPlus } from 'lucide-react';

interface ImportCardProps {
  onImportClick: () => void;
  onImportVisitsClick: () => void;
  onImportFromUrl: () => void;
  isImportingFromUrl: boolean;
  importUrl: string;
  setImportUrl: (url: string) => void;
}

export function ImportCard({
  onImportClick,
  onImportVisitsClick,
  onImportFromUrl,
  isImportingFromUrl,
  importUrl,
  setImportUrl,
}: ImportCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-primary" />
          <span>Importar / Sincronizar</span>
        </CardTitle>
        <CardDescription>Importe de um arquivo CSV ou sincronize a partir de um link público.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
            <Button onClick={onImportClick} className="w-full">
              <UploadCloud className="mr-2 h-4 w-4" />
              Importação Completa (CSV)
            </Button>
            
            <Button onClick={onImportVisitsClick} variant="outline" className="w-full">
              <CalendarPlus className="mr-2 h-4 w-4" />
              Importar Apenas Datas de Visita
            </Button>

            <div className="relative pt-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Ou Sincronizar de um Link
                  </span>
                </div>
            </div>
            
            <div className="space-y-2 pt-2">
                <Input
                  placeholder="Cole o link do CSV aqui"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  disabled={isImportingFromUrl}
                  aria-label="Link para o arquivo CSV"
                />
                <Button onClick={onImportFromUrl} disabled={isImportingFromUrl || !importUrl} className="w-full">
                  {isImportingFromUrl ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LinkIcon className="mr-2 h-4 w-4" />
                  )}
                  Sincronizar do Link
                </Button>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
