'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud } from 'lucide-react';

interface ImportCardProps {
  onImportClick: () => void;
}

export function ImportCard({ onImportClick }: ImportCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-primary" />
          <span>Importar Dados</span>
        </CardTitle>
        <CardDescription>Importe pessoas e grupos a partir de um arquivo CSV do NW.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onImportClick} className="w-full">
          <UploadCloud className="mr-2 h-4 w-4" />
          Importar CSV
        </Button>
      </CardContent>
    </Card>
  );
}
