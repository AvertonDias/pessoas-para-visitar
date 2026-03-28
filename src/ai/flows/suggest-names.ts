'use server';
/**
 * @fileOverview Um agente de IA que sugere nomes com base em critérios fornecidos pelo usuário.
 *
 * - suggestNames - Uma função que lida com o processo de sugestão de nomes.
 * - SuggestNamesInput - O tipo de entrada para a função suggestNames.
 * - SuggestNamesOutput - O tipo de retorno para a função suggestNames.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestNamesInputSchema = z.object({
  gender: z
    .string()
    .optional()
    .describe('O gênero preferido para os nomes (ex: "masculino", "feminino", "neutro").'),
  origin: z
    .string()
    .optional()
    .describe('A origem cultural ou geográfica preferida para os nomes (ex: "brasileiro", "japonês", "grego").'),
  theme: z
    .string()
    .optional()
    .describe('Um tema ou estilo para os nomes (ex: "natureza", "mitologia", "moderno").'),
});
export type SuggestNamesInput = z.infer<typeof SuggestNamesInputSchema>;

const SuggestNamesOutputSchema = z.object({
  names: z.array(z.string()).describe('Uma lista de nomes sugeridos pela inteligência artificial.'),
});
export type SuggestNamesOutput = z.infer<typeof SuggestNamesOutputSchema>;

export async function suggestNames(input: SuggestNamesInput): Promise<SuggestNamesOutput> {
  return suggestNamesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestNamesPrompt',
  input: {schema: SuggestNamesInputSchema},
  output: {schema: SuggestNamesOutputSchema},
  prompt: `Você é um assistente criativo de nomes. Sugira nomes com base nos critérios fornecidos.

Sempre responda apenas com um JSON contendo uma array de strings no campo 'names'.

Critérios:
{{#if gender}} - Gênero: {{{gender}}}
{{/if}}{{#if origin}} - Origem: {{{origin}}}
{{/if}}{{#if theme}} - Tema: {{{theme}}}
{{/if}}

Se nenhum critério for fornecido, sugira nomes populares e variados.

Por favor, forneça 5 nomes que se encaixem nos critérios.`,
});

const suggestNamesFlow = ai.defineFlow(
  {
    name: 'suggestNamesFlow',
    inputSchema: SuggestNamesInputSchema,
    outputSchema: SuggestNamesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
