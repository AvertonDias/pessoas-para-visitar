'use server';

import { suggestNames, type SuggestNamesInput, type SuggestNamesOutput } from '@/ai/flows/suggest-names';

export async function getAiSuggestions(input: SuggestNamesInput): Promise<SuggestNamesOutput> {
  try {
    const result = await suggestNames(input);
    return result;
  } catch (error) {
    console.error('Error getting AI suggestions:', error);
    return { names: [] };
  }
}
