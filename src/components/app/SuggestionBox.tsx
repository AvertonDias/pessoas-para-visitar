'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getAiSuggestions } from '@/app/actions';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Wand2, Loader2, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AnimatePresence, motion } from 'framer-motion';

interface SuggestionBoxProps {
  onAddSuggestedName: (name: string) => void;
}

const formSchema = z.object({
  gender: z.string().optional().describe('Gênero (ex: masculino, feminino)'),
  origin: z.string().optional().describe('Origem (ex: brasileiro, italiano)'),
  theme: z.string().optional().describe('Tema (ex: natureza, mitologia)'),
});

export function SuggestionBox({ onAddSuggestedName }: SuggestionBoxProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { gender: '', origin: '', theme: '' },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setSuggestions([]);
    try {
      const result = await getAiSuggestions(values);
      if (result.names && result.names.length > 0) {
        setSuggestions(result.names);
      } else {
        toast({
          title: 'Sem sugestões',
          description: 'A IA não encontrou sugestões com esses critérios. Tente ser mais geral.',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro de comunicação',
        description: 'Não foi possível buscar sugestões. Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleAddAndNotify = (name: string) => {
    onAddSuggestedName(name);
    toast({
      title: 'Nome Adicionado!',
      description: `"${name}" foi adicionado à sua lista.`,
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Wand2 className="text-accent" />
          <h3 className="text-lg font-semibold">Sugestão Inteligente</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Peça à nossa IA para sugerir nomes com base em critérios.
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gênero</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: feminino, masculino, neutro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="origin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Origem</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: brasileiro, japonês, bíblico" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tema</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: natureza, forte, moderno" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full bg-accent hover:bg-accent/90">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Sugerir Nomes
            </Button>
          </form>
        </Form>
      </CardContent>
      {(isLoading || suggestions.length > 0) && (
        <CardFooter className="flex flex-col gap-2 pt-0 p-4">
          {isLoading && (
            <div className="w-full space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-2/3" />
            </div>
          )}
          <AnimatePresence>
            {suggestions.map(name => (
              <motion.div
                key={name}
                className="w-full"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between w-full p-2 rounded-md bg-secondary">
                  <span className="text-secondary-foreground">{name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleAddAndNotify(name)}
                    aria-label={`Adicionar ${name} à lista`}
                  >
                    <PlusCircle className="h-5 w-5 text-primary/80 hover:text-primary" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </CardFooter>
      )}
    </Card>
  );
}
