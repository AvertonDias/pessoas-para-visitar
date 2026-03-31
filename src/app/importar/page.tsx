'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ImportCard } from '@/components/app/home/ImportCard';
import { ImportConfirmationDialog } from '@/components/app/home/ImportConfirmationDialog';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import * as services from '@/lib/firebase-services';
import { fetchCsvFromUrl } from '@/app/actions';
import { PerformingUser } from '@/lib/audit-log-services';
import type { Name, FieldGroup, UserProfile, ImportedName, ImportUpdate, ImportPreview } from '@/lib/types';
import { UploadCloud } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function ImportarPage() {
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const visitsFileInputRef = useRef<HTMLInputElement>(null);
    const autoSyncAttempted = useRef(false);

    // Profile and admin checks
    const userProfileRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const isAdmin = useMemo(() => userProfile?.role !== 'helper', [userProfile]);
    const dataOwnerId = useMemo(() => {
        if (!user) return null;
        return user.uid;
    }, [user]);

    const performingUser: PerformingUser | null = useMemo(() => {
        if (!user || !userProfile) return null;
        return {
            uid: user.uid,
            name: userProfile.name || user.email || 'Usuário Anônimo',
        };
    }, [user, userProfile]);

    // Redirect if not admin or loading
    useEffect(() => {
        if (!isUserLoading && !profileLoading) {
            if (!user) {
                router.replace('/login');
            } else if (!isAdmin) {
                toast({
                    variant: 'destructive',
                    title: 'Acesso negado',
                    description: 'Você não tem permissão para acessar esta página.',
                });
                router.replace('/');
            }
        }
    }, [isUserLoading, profileLoading, user, isAdmin, router, toast]);

    // Data fetching (names, groups - needed for import logic)
    const namesQuery = useMemoFirebase(() => {
        if (!dataOwnerId || !firestore) return null;
        return query(collection(firestore, 'users', dataOwnerId, 'names'));
    }, [dataOwnerId, firestore]);
    const { data: namesData, isLoading: namesLoading } = useCollection<Name>(namesQuery);
    const names = namesData || [];

    const groupsQuery = useMemoFirebase(() => {
        if (!dataOwnerId || !firestore) return null;
        return query(collection(firestore, 'users', dataOwnerId, 'fieldGroups'));
    }, [dataOwnerId, firestore]);
    const { data: fieldGroupsData, isLoading: groupsLoading } = useCollection<FieldGroup>(groupsQuery);
    const fieldGroups = fieldGroupsData || [];
    
    // State for import functionality
    const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
    const [importPreview, setImportPreview] = useState<ImportPreview>(null);
    const [importUrl, setImportUrl] = useState(userProfile?.importUrl || '');
    const [isImportingFromUrl, setIsImportingFromUrl] = useState(false);
    const [importMode, setImportMode] = useState<'full' | 'visits'>('full');
    const [stagedVisitsUpdates, setStagedVisitsUpdates] = useState<ImportUpdate[]>([]);

    useEffect(() => {
        if (userProfile?.importUrl) {
            setImportUrl(userProfile.importUrl);
        }
    }, [userProfile]);

    // Helper for cleaning up names for comparison
    const normalizeName = (name: string) => {
        if (!name) return '';
        return name
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/\s+/g, ' '); // Collapse multiple spaces
    }

    const handleConfirmImport = async (preview: ImportPreview | null) => {
        if (!dataOwnerId || !firestore || !preview || !performingUser) return;
        
        try {
            if (preview.toCreate.length === 0 && preview.toUpdate.length === 0 && preview.newGroups.length === 0) {
              toast({ title: "Nenhuma alteração para importar." });
            } else {
              await services.batchImportData(firestore, dataOwnerId, preview.toCreate, preview.toUpdate, preview.newGroups, fieldGroups, performingUser);
              toast({
                  title: "Importação concluída!",
                  description: `${preview.toCreate.length + preview.toUpdate.length} pessoas e ${preview.newGroups.length} grupos foram importados e/ou atualizados com sucesso.`,
              });
            }
        } catch (error: any) {
            console.error("Error during batch import:", error);
            toast({
                variant: "destructive",
                title: "Erro na importação",
                description: error.message || "Ocorreu um erro inesperado ao salvar os dados. Tente novamente.",
            });
        } finally {
            setIsImportConfirmOpen(false);
            setImportPreview(null);
        }
    };

    const handleConfirmVisitsImport = async () => {
        if (!dataOwnerId || !firestore || stagedVisitsUpdates.length === 0 || !performingUser) return;
        
        try {
            await services.batchUpdateVisits(firestore, dataOwnerId, stagedVisitsUpdates, performingUser);
            toast({
                title: "Importação de visitas concluída!",
                description: `${stagedVisitsUpdates.length} visitas foram adicionadas com sucesso.`,
            });
        } catch (error: any) {
            console.error("Error during batch visits import:", error);
            toast({
                variant: "destructive",
                title: "Erro na importação de visitas",
                description: error.message || "Ocorreu um erro inesperado ao salvar as visitas. Tente novamente.",
            });
        } finally {
            setIsImportConfirmOpen(false);
            setImportPreview(null);
            setStagedVisitsUpdates([]);
        }
    };

    const processVisitsCsv = (text: string) => {
        try {
          const rows = text.split('\n').map(row => row.trim()).filter(row => row);
          if (rows.length < 2) {
            toast({ variant: "destructive", title: "Arquivo CSV inválido", description: "O arquivo precisa ter um cabeçalho e pelo menos uma linha de dados." });
            return;
          }
    
          const headerLine = rows[0].replace(/^\uFEFF/, '');
          const separator = headerLine.includes(';') ? ';' : ',';
          const header = headerLine.split(separator).map(h => h.trim().replace(/"/g, '').toLowerCase());
    
          const nameIndex = ['nome', 'name'].map(key => header.indexOf(key)).find(index => index !== -1) ?? -1;
          const dateIndex = ['data', 'date'].map(key => header.indexOf(key)).find(index => index !== -1) ?? -1;
    
          if (nameIndex === -1 || dateIndex === -1) {
              toast({ variant: "destructive", title: "Colunas não encontradas", description: "O arquivo CSV precisa ter as colunas 'nome' e 'data'." });
              return;
          }
    
          const existingNamesByName = new Map<string, Name>();
          names.forEach(name => {
            existingNamesByName.set(normalizeName(name.text), name);
          });
    
          const updatesForService: ImportUpdate[] = [];
          const unmatchedNames: string[] = [];
    
          for (const row of rows.slice(1)) {
            const values = row.split(separator).map(v => v.trim().replace(/"/g, ''));
            const nameFromCsv = values[nameIndex];
            const dateFromCsv = values[dateIndex];
    
            if (!nameFromCsv || !dateFromCsv) continue;
    
            const normalizedName = normalizeName(nameFromCsv);
            const existing = existingNamesByName.get(normalizedName);
    
            if (existing) {
              const parts = dateFromCsv.split('/');
              let parsedDate: Date;
              if (parts.length === 3) {
                  const day = parseInt(parts[0], 10);
                  const month = parseInt(parts[1], 10) - 1;
                  let year = parseInt(parts[2], 10);
                  if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                      if (year < 100) year += 2000;
                      parsedDate = new Date(Date.UTC(year, month, day, 12));
                  } else {
                      parsedDate = new Date(dateFromCsv);
                  }
              } else {
                  parsedDate = new Date(dateFromCsv);
              }
    
              if (!isNaN(parsedDate.getTime())) {
                const newVisitDateStr = parsedDate.toISOString();
                
                const visitExists = (existing.visitHistory || []).some(visit => {
                    const existingDate = new Date(visit.date);
                    return existingDate.getUTCFullYear() === parsedDate.getUTCFullYear() &&
                            existingDate.getUTCMonth() === parsedDate.getUTCMonth() &&
                            existingDate.getUTCDate() === parsedDate.getUTCDate();
                });
    
                if (!visitExists) {
                    updatesForService.push({
                        existing,
                        newData: { importedVisitDate: newVisitDateStr },
                        changes: [`Adicionar visita em: ${format(parsedDate, "PPP", { locale: ptBR })}`]
                    });
                }
              }
            } else {
              unmatchedNames.push(nameFromCsv);
            }
          }
    
          const groupedUpdatesForDialog: ImportUpdate[] = [];
          const updatesByPersonId = new Map<string, {existing: Name; changes: string[]}>();
          updatesForService.forEach(update => {
              if (!updatesByPersonId.has(update.existing.id)) {
                  updatesByPersonId.set(update.existing.id, { existing: update.existing, changes: [] });
              }
              updatesByPersonId.get(update.existing.id)!.changes.push(...update.changes);
          });
    
          updatesByPersonId.forEach((value) => {
              groupedUpdatesForDialog.push({
                  existing: value.existing,
                  newData: { },
                  changes: value.changes
              });
          });
    
          if (updatesForService.length === 0) {
              toast({
                  title: "Nenhuma nova visita encontrada",
                  description: unmatchedNames.length > 0 
                    ? `Nomes não encontrados: ${unmatchedNames.join(', ')}`
                    : "Nenhuma visita nova para importar.",
              });
              return;
          }
          
          setStagedVisitsUpdates(updatesForService);
          
          const previewData: ImportPreview = { toCreate: [], toUpdate: groupedUpdatesForDialog, newGroups: [], unmatchedNames };
          setImportPreview(previewData);
          setIsImportConfirmOpen(true);
    
        } catch (error) {
          console.error("Error parsing visits CSV:", error);
          toast({ variant: "destructive", title: "Erro ao ler arquivo de visitas", description: "Não foi possível processar o arquivo CSV. Verifique o formato." });
        }
    };
    
    const processFullCsv = (text: string) => {
        try {
          const rows = text.split('\n').map(row => row.trim()).filter(row => row);
          if (rows.length < 2) {
            toast({ variant: "destructive", title: "Arquivo CSV inválido", description: "O arquivo precisa ter um cabeçalho e pelo menos uma linha de dados." });
            return;
          }
          
          const headerLine = rows[0].replace(/^\uFEFF/, '');
          const separator = headerLine.includes(';') ? ';' : ',';
          const header = headerLine.split(separator).map(h => h.trim().replace(/"/g, '').toLowerCase());
          
          const nameKeys = {
            displayName: ['displayname', 'nome de exibição'],
            firstName: ['firstname', 'primeiro nome'],
            middleName: ['middlename', 'nome do meio'],
            lastName: ['lastname', 'sobrenome'],
            group: ['groupname', 'grupo'],
            address: ['address', 'endereço'],
            phoneMobile: ['phonemobile', 'telefone celular'],
            phoneHome: ['phonehome', 'telefone residencial'],
            personId: ['personid'],
            removed: ['removed'],
            moved: ['moved', 'mudou-se'],
            active: ['active', 'ativo'],
            regular: ['regular'],
            lastVisit: ['lastvisit', 'última visita'],
          };
          
          const getIndex = (keys: string[]) => keys.map(key => header.indexOf(key)).find(index => index !== -1) ?? -1;
    
          const displayNameIndex = getIndex(nameKeys.displayName);
          const firstNameIndex = getIndex(nameKeys.firstName);
          const middleNameIndex = getIndex(nameKeys.middleName);
          const lastNameIndex = getIndex(nameKeys.lastName);
          const groupIndex = getIndex(nameKeys.group);
          const addressIndex = getIndex(nameKeys.address);
          const phoneMobileIndex = getIndex(nameKeys.phoneMobile);
          const phoneHomeIndex = getIndex(nameKeys.phoneHome);
          const personIdIndex = getIndex(nameKeys.personId);
          const removedIndex = getIndex(nameKeys.removed);
          const movedIndex = getIndex(nameKeys.moved);
          const activeIndex = getIndex(nameKeys.active);
          const regularIndex = getIndex(nameKeys.regular);
          const lastVisitIndex = getIndex(nameKeys.lastVisit);
          
          if (firstNameIndex === -1 && lastNameIndex === -1 && displayNameIndex === -1) {
              toast({ variant: "destructive", title: "Colunas não encontradas", description: "O arquivo CSV precisa ter colunas de nome (ex: 'FirstName'/'LastName' ou 'DisplayName')." });
              return;
          }
    
          const importedResult: ImportedName[] = rows.slice(1).map(row => {
            const values = row.split(separator).map(v => v.trim().replace(/"/g, ''));
            const item: ImportedName = {};
            
            const firstName = values[firstNameIndex];
            const middleName = values[middleNameIndex];
            const lastName = values[lastNameIndex];
            const combinedName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
            const displayName = values[displayNameIndex];
            
            const text = combinedName || displayName;
            if(text) item.text = text;
    
            if (personIdIndex !== -1 && values[personIdIndex]) item.personId = values[personIdIndex];
            if (groupIndex !== -1 && values[groupIndex]) item.fieldGroup = values[groupIndex];
            if (addressIndex !== -1 && values[addressIndex]) item.address = values[addressIndex];
            
            const phone = (phoneMobileIndex !== -1 ? values[phoneMobileIndex] : '') || (phoneHomeIndex !== -1 ? values[phoneHomeIndex] : '');
            if (phone) item.phone = phone;
    
            let isConsideredRemoved = false;
            
            const removedColIndex = removedIndex !== -1 ? removedIndex : movedIndex;
    
            if (removedColIndex !== -1) {
                const removedValue = values[removedColIndex]?.toLowerCase();
                if (removedValue === 'true' || removedValue === 'verdadeiro') {
                    isConsideredRemoved = true;
                }
            }
    
            if (isConsideredRemoved) {
                item.status = 'removido';
            } else {
                const activeValue = activeIndex !== -1 ? values[activeIndex]?.toLowerCase() : undefined;
                const regularValue = regularIndex !== -1 ? values[regularIndex]?.toLowerCase() : undefined;
    
                if (activeValue === 'false' || activeValue === 'falso') {
                    item.status = 'inativo';
                } else if (regularValue === 'false' || regularValue === 'falso') {
                    item.status = 'irregular';
                } else {
                     item.status = 'regular';
                }
            }
    
    
            const lastVisitValue = lastVisitIndex !== -1 ? values[lastVisitIndex] : undefined;
            if (lastVisitValue) {
                const parts = lastVisitValue.split('/');
                let parsedDate: Date;
                if (parts.length === 3) {
                    const day = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1;
                    let year = parseInt(parts[2], 10);
                    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                        if (year < 100) year += 2000;
                        parsedDate = new Date(Date.UTC(year, month, day, 12)); // Set to midday UTC
                    } else {
                        parsedDate = new Date(lastVisitValue);
                    }
                } else {
                    parsedDate = new Date(lastVisitValue);
                }
    
                if (!isNaN(parsedDate.getTime())) {
                    item.importedVisitDate = parsedDate.toISOString();
                }
            }
    
            return item;
          }).filter(item => (item.text || item.personId));
    
          const existingNamesByPersonId = new Map<string, Name>();
          names.forEach(name => {
              if (name.personId && name.personId.trim() !== '') {
                  existingNamesByPersonId.set(name.personId, name);
              }
          });
          const existingNamesByName = new Map<string, Name>();
          names.forEach(name => {
            existingNamesByName.set(normalizeName(name.text), name);
          });
    
          const toCreate: ImportedName[] = [];
          const toUpdate: ImportUpdate[] = [];
          const formatChange = (label: string, from: any, to: any) => {
              const fromStr = from === undefined || from === null || from === '' ? 'vazio' : from;
              const toStr = to === undefined || to === null || to === '' ? 'vazio' : to;
              return `${label}: de "${fromStr}" para "${toStr}"`;
          };
    
          for (const item of importedResult) {
              let existing = item.personId ? existingNamesByPersonId.get(item.personId) : undefined;
              if (!existing && item.text) {
                  existing = existingNamesByName.get(normalizeName(item.text));
              }
                              
              if (existing) {
                  const changes: string[] = [];
                  const updatePayload: ImportedName = {};
                  
                  if (item.text && normalizeName(item.text) !== normalizeName(existing.text)) {
                      changes.push(formatChange('Nome', existing.text, item.text));
                      updatePayload.text = item.text;
                  }
                  if (item.address !== undefined && item.address !== (existing.address || '')) {
                      changes.push(formatChange('Endereço', existing.address, item.address));
                      updatePayload.address = item.address;
                  }
                  if (item.phone !== undefined && item.phone !== (existing.phone || '')) {
                      changes.push(formatChange('Telefone', existing.phone, item.phone));
                      updatePayload.phone = item.phone;
                  }
                  const importedGroupName = item.fieldGroup;
                  const existingGroupName = fieldGroups.find(g => g.id === existing.fieldGroup)?.name;
    
                  if (importedGroupName !== undefined && importedGroupName !== (existingGroupName || '')) {
                      changes.push(formatChange('Grupo', existingGroupName, importedGroupName));
                      updatePayload.fieldGroup = importedGroupName;
                  }
                  if (item.status && item.status !== existing.status) {
                      changes.push(formatChange('Status', existing.status, item.status));
                      updatePayload.status = item.status;
                  }
                  
                  if (item.importedVisitDate) {
                    const newVisitDate = new Date(item.importedVisitDate);
                    const visitExists = (existing.visitHistory || []).some(visit => {
                        const existingDate = new Date(visit.date);
                        return existingDate.getUTCFullYear() === newVisitDate.getUTCFullYear() &&
                               existingDate.getUTCMonth() === newVisitDate.getUTCMonth() &&
                               existingDate.getUTCDate() === newVisitDate.getUTCDate();
                    });
                    if (!visitExists) {
                        changes.push(`Adicionar visita em: ${format(newVisitDate, "PPP", { locale: ptBR })}`);
                        updatePayload.importedVisitDate = item.importedVisitDate;
                    }
                  }
    
                  if (changes.length > 0) {
                      toUpdate.push({ existing, newData: updatePayload, changes });
                  }
              } else if (item.text) {
                  toCreate.push(item);
              }
          }
    
          const existingGroupNames = new Set(fieldGroups.map(g => g.name.toLowerCase()));
          const importedGroupNames = new Set(importedResult.map(item => item.fieldGroup).filter(Boolean) as string[]);
          const newGroups = [...importedGroupNames].filter(g => !existingGroupNames.has(g.toLowerCase()));
    
          if (toCreate.length === 0 && toUpdate.length === 0 && newGroups.length === 0) {
              toast({
                  title: "Nenhuma alteração detectada",
                  description: "Os dados no arquivo são idênticos aos dados existentes.",
              });
              return;
          }
          
          const previewData: ImportPreview = { toCreate, toUpdate, newGroups, unmatchedNames: [] };
          setImportPreview(previewData);
          setIsImportConfirmOpen(true);
    
        } catch (error) {
          console.error("Error parsing CSV:", error);
          toast({ variant: "destructive", title: "Erro ao ler arquivo", description: "Não foi possível processar o arquivo CSV. Verifique o formato." });
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, mode: 'full' | 'visits') => {
        setImportMode(mode);
        const file = event.target.files?.[0];
        if (!file) return;
    
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          if (mode === 'visits') {
            processVisitsCsv(text);
          } else {
            processFullCsv(text);
          }
        };
        reader.readAsText(file, 'latin1');
        event.target.value = '';
    };

    const handleImportFromUrl = async (urlToUse?: string) => {
        const finalUrl = urlToUse || (userProfile?.importUrl || '');
    
        if (isImportingFromUrl) return;
        if (!finalUrl) {
          toast({
            variant: 'destructive',
            title: 'URL é necessária',
            description: 'Por favor, insira uma URL para sincronizar.',
          });
          return;
        }
        if (!dataOwnerId || !firestore || !performingUser) return;
        setIsImportingFromUrl(true);
        setImportMode('full');
    
        try {
          if (isAdmin && finalUrl !== (userProfile?.importUrl || '')) {
            await services.updateUserProfile(firestore, dataOwnerId, { importUrl: finalUrl }, performingUser);
            toast({
              title: "URL de sincronização salva",
              description: "Esta URL será usada para futuras sincronizações.",
            });
          }
          const result = await fetchCsvFromUrl(finalUrl);
          if (result.success && result.data) {
            processFullCsv(result.data);
          } else {
            toast({
              variant: 'destructive',
              title: 'Erro ao buscar da URL',
              description: result.error || 'Ocorreu um erro desconhecido.',
            });
          }
        } catch (error) {
          console.error('Failed to save URL or import from URL', error);
          toast({
            variant: 'destructive',
            title: 'Erro na Sincronização',
            description: 'Não foi possível salvar a URL ou importar os dados. Verifique o link e suas permissões de acesso.',
          });
        } finally {
          setIsImportingFromUrl(false);
        }
    };
    
    useEffect(() => {
        if (isAdmin && userProfile?.importUrl && !autoSyncAttempted.current && names.length > 0) {
          autoSyncAttempted.current = true;
          handleImportFromUrl(userProfile.importUrl);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, userProfile, names.length]);

    const isLoading = isUserLoading || profileLoading || namesLoading || groupsLoading;

    if (isLoading || !isAdmin) {
        return (
            <div className="flex min-h-screen flex-col bg-background items-center justify-center">
                <motion.div
                    initial={{ scale: 0.95, opacity: 0.8 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        repeatType: 'reverse',
                        ease: 'easeInOut',
                    }}
                >
                    <Image
                        src="/icons/Logo.png"
                        alt="Carregando..."
                        width={96}
                        height={96}
                        priority
                    />
                </motion.div>
                <p className="text-lg text-muted-foreground mt-4">Carregando...</p>
            </div>
        );
    }
  
    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <UploadCloud className="h-8 w-8 text-primary" />
                    Importar / Sincronizar
                </h1>
            </div>
            <div className="max-w-md mx-auto">
                <ImportCard
                    onImportClick={() => fileInputRef.current?.click()}
                    onImportVisitsClick={() => visitsFileInputRef.current?.click()}
                    onImportFromUrl={() => handleImportFromUrl()}
                    isImportingFromUrl={isImportingFromUrl}
                    importUrl={importUrl}
                    setImportUrl={setImportUrl}
                />
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileChange(e, 'full')}
                className="hidden"
                accept=".csv"
            />
            <input
                type="file"
                ref={visitsFileInputRef}
                onChange={(e) => handleFileChange(e, 'visits')}
                className="hidden"
                accept=".csv"
            />

            <ImportConfirmationDialog
                isOpen={isImportConfirmOpen}
                onOpenChange={setIsImportConfirmOpen}
                preview={importPreview}
                onConfirm={importMode === 'full' ? () => handleConfirmImport(importPreview) : handleConfirmVisitsImport}
            />
        </div>
    );
}
