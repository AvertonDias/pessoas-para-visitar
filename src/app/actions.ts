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
        
        // Extrair ID do arquivo para Google Drive ou Google Sheets
        const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        const sheetsMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
        const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        const fileId = (driveMatch && driveMatch[1]) || (sheetsMatch && sheetsMatch[1]) || (idMatch && idMatch[1]);

        if (fileId) {
            // Tentar link de exportação do Sheets (mais confiável para planilhas)
            downloadUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`;
            
            // Adicionar GID se presente para selecionar a aba correta
            const gidMatch = url.match(/[?&#]gid=(\d+)/);
            if (gidMatch && gidMatch[1]) {
                downloadUrl += `&gid=${gidMatch[1]}`;
            }
        }
    } catch (e) {
        // Erro ao processar URL, continua com a original
    }
    
    try {
        const response = await fetch(downloadUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            redirect: 'follow',
            cache: 'no-store'
        });

        // Se falhar (ex: arquivo não é uma planilha), tentar link de download direto do Drive
        if (!response.ok && url.includes('drive.google.com')) {
             const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
             if (driveMatch && driveMatch[1]) {
                const ucUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
                const secondResponse = await fetch(ucUrl, { redirect: 'follow' });
                if (secondResponse.ok) return await processResponse(secondResponse);
             }
        }

        return await processResponse(response);

    } catch (error) {
        console.error('Error fetching CSV from URL:', error);
        return { success: false, error: 'Ocorreu um erro de rede. Verifique o link e se ele é público.' };
    }
}

async function processResponse(response: Response) {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
        const responseText = await response.text();
        
        if (responseText.includes('id="uc-download-link"') || responseText.includes('confirm=')) {
            return { success: false, error: 'O arquivo é muito grande ou requer confirmação. Tente usar "Arquivo > Compartilhar > Publicar na Web" no Google Sheets.' };
        }

        if (responseText.includes('ServiceLogin') || responseText.toLowerCase().includes('signin')) {
            return { success: false, error: 'Acesso negado. Certifique-se de que o compartilhamento está como "Qualquer pessoa com o link".' };
        }

        return { success: false, error: 'O link retornou uma página e não os dados. Verifique se você publicou a planilha corretamente.' };
    }

    if (!response.ok) {
        return { success: false, error: `Erro ao buscar o arquivo (Status: ${response.status}).` };
    }
    
    const buffer = await response.arrayBuffer();
    // Tenta decodificar como UTF-8
    const decoder = new TextDecoder('utf-8');
    const decodedText = decoder.decode(buffer);

    if (!decodedText.includes(',') && !decodedText.includes(';')) {
        return { success: false, error: 'O arquivo não parece ser um CSV válido.' };
    }

    return { success: true, data: decodedText };
}
