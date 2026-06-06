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

    let downloadUrl = url;
    try {
        const urlObj = new URL(url);
        // Handle Google Drive file URLs
        if (urlObj.hostname === 'drive.google.com') {
            const match = url.match(/file\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
                downloadUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
            }
        }
        // Handle Google Sheets URLs (that are not already published CSVs)
        else if (urlObj.hostname === 'docs.google.com' && url.includes('/spreadsheets/d/')) {
            const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1] && !url.includes('/pub?')) {
                 downloadUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
                 // Match gid in query string or hash
                 const gidMatch = url.match(/[?&#]gid=(\d+)/);
                 if (gidMatch && gidMatch[1]) {
                    downloadUrl += `&gid=${gidMatch[1]}`;
                 }
            }
        }
    } catch (e) {
        // Not a valid URL object, might be a direct link. Proceed.
    }
    
    try {
        const response = await fetch(downloadUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            redirect: 'follow',
            cache: 'no-store' // Fetch latest version always
        });
        
        const contentType = response.headers.get('content-type') || '';

        // First, check if the content is HTML. This usually indicates an interstitial page (login, permission error, large file warning).
        if (contentType.includes('text/html')) {
             const responseText = await response.text();
            
            // Check for Google Drive's large file warning page
            if (responseText.includes('id="uc-download-link"') || responseText.includes('confirm=')) {
                return { success: false, error: 'O arquivo é muito grande ou requer confirmação manual no Google Drive. Tente baixar o arquivo e importá-lo manualmente.' };
            }

            // Check if it's a Google Login page (indicating a private file)
            if (responseText.includes('ServiceLogin') || responseTypeIncludes(responseText, ['login', 'signin', 'accounts.google.com'])) {
                return { success: false, error: 'Acesso negado. O arquivo parece ser privado. Certifique-se de que o compartilhamento está definido como "Qualquer pessoa com o link" ou use um link de "Publicar na Web".' };
            }

            // For any other HTML page, assume it's a generic link issue.
            return { success: false, error: 'O link aponta para uma página da web e não para um arquivo CSV. Verifique se você copiou o link direto ou se publicou a planilha corretamente.' };
        }

        if (!response.ok) {
            return { success: false, error: `Falha ao buscar o arquivo (Status: ${response.status}). Verifique se o link é público e direto para o arquivo CSV.` };
        }
        
        // For non-HTML responses, decode using the correct encoding.
        // Files from URLs (like Google Sheets) are typically UTF-8.
        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        const decodedText = decoder.decode(buffer);

        // Basic check to see if the content looks like CSV (contains at least one comma or semicolon)
        if (!decodedText.includes(',') && !decodedText.includes(';')) {
            return { success: false, error: 'O conteúdo retornado não parece ser um CSV válido. Verifique o arquivo de origem.' };
        }

        return { success: true, data: decodedText };

    } catch (error) {
        console.error('Error fetching CSV from URL:', error);
        return { success: false, error: 'Ocorreu um erro de rede ao tentar buscar o arquivo. Verifique sua conexão e o link.' };
    }
}

// Helper to check for multiple substrings in a string
function responseTypeIncludes(text: string, keywords: string[]): boolean {
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}
