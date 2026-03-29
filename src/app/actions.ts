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

export async function fetchCsvFromUrl(url: string): Promise<{ success: boolean; data?: string; error?: string }> {
    if (!url) {
        return { success: false, error: 'URL não fornecida.' };
    }

    let fileId = '';
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'drive.google.com') {
            const match = url.match(/file\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
                fileId = match[1];
            }
        }
    } catch (e) {
        // Not a valid URL object, might be a direct link. Proceed.
    }

    const downloadUrl = fileId 
        ? `https://drive.google.com/uc?export=download&id=${fileId}`
        : url;

    try {
        const response = await fetch(downloadUrl, {
            redirect: 'follow',
        });

        if (!response.ok) {
            const text = await response.text();
            if (text.includes('id="uc-download-link"')) {
                 return { success: false, error: 'O arquivo é muito grande ou requer confirmação para download no Google Drive. Por favor, faça o download manual e importe o arquivo.' };
            }
            return { success: false, error: `Falha ao buscar o arquivo (Status: ${response.status}). Verifique se o link é público e direto para o arquivo CSV.` };
        }
        
        const contentType = response.headers.get('content-type') || '';
        const csvText = await response.text();

        // Check if the response is likely an HTML error page, even with a 200 OK status
        if (contentType.includes('text/html') && csvText.trim().toLowerCase().startsWith('<!doctype html')) {
             return { success: false, error: 'O link não retornou um arquivo CSV. Verifique se o link de compartilhamento está como "Qualquer pessoa com o link".' };
        }

        return { success: true, data: csvText };
    } catch (error) {
        console.error('Error fetching CSV from URL:', error);
        return { success: false, error: 'Ocorreu um erro de rede ao tentar buscar o arquivo. Verifique sua conexão e o link.' };
    }
}
