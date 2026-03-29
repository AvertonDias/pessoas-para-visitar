'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/app/Header';
import { useToast } from '@/hooks/use-toast';
import { ManageNamesCard } from '@/components/app/home/ManageNamesCard';
import { NameListCard } from '@/components/app/home/NameListCard';
import { FieldGroupsCard } from '@/components/app/home/FieldGroupsCard';
import { HelpersCard } from '@/components/app/home/HelpersCard';
import { ImportCard } from '@/components/app/home/ImportCard';
import { ImportConfirmationDialog } from '@/components/app/home/ImportConfirmationDialog';
import { AddNameDialog } from '@/components/app/home/AddNameDialog';
import { GeneratePdfDialog } from '@/components/app/home/GeneratePdfDialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, doc, where } from 'firebase/firestore';
import * as services from '@/lib/firebase-services';
import { getMostRecentVisitDate } from '@/lib/status-logic';
import { InstallPwaBanner } from '@/components/app/InstallPwaBanner';
import { fetchCsvFromUrl } from '@/app/actions';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { PerformingUser } from '@/lib/audit-log-services';
import type { Name, FieldGroup, UserProfile, Helper, ImportedName, ImportUpdate, ImportPreview } from '@/lib/types';

declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

export default function Home() {
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<'pessoas' | 'grupos' | 'ajudantes'>('pessoas');
  const [isClient, setIsClient] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const visitsFileInputRef = useRef<HTMLInputElement>(null);
  const autoSyncAttempted = useRef(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const dataOwnerId = useMemo(() => {
    if (!user) return null;
    // A helper must have an adminId to access data. Otherwise, they see their own data.
    if (userProfile?.role === 'helper' && userProfile.adminId) {
      return userProfile.adminId;
    }
    // Default to own UID for admins or helpers in an inconsistent state
    return user.uid;
  }, [user, userProfile]);

  const performingUser: PerformingUser | null = useMemo(() => {
    if (!user || !userProfile) return null;
    return {
      uid: user.uid,
      name: userProfile.name || user.email || 'Usuário Anônimo',
    };
  }, [user, userProfile]);
  
  // Fetch admin profile if current user is a helper
  const adminProfileRef = useMemoFirebase(() => {
    if (!firestore || !dataOwnerId || !user || dataOwnerId === user.uid) return null;
    return doc(firestore, 'users', dataOwnerId);
  }, [firestore, dataOwnerId, user]);
  const { data: adminProfile, loading: adminProfileLoading } = useDoc<UserProfile>(adminProfileRef);
  
  const isAdmin = userProfile?.role !== 'helper';
  const dataOwnerProfile = isAdmin ? userProfile : adminProfile;

  // Data fetching from Firestore
  const namesQuery = useMemoFirebase(() => {
    if (!dataOwnerId || !firestore) return null;
    return query(collection(firestore, 'users', dataOwnerId, 'names'));
  }, [dataOwnerId, firestore]);
  const { data: namesData, loading: namesLoading } = useCollection<Name>(namesQuery);
  const names = namesData || [];

  const groupsQuery = useMemoFirebase(() => {
    if (!dataOwnerId || !firestore) return null;
    return query(collection(firestore, 'users', dataOwnerId, 'fieldGroups'));
  }, [dataOwnerId, firestore]);
  const { data: fieldGroupsData, loading: groupsLoading } = useCollection<FieldGroup>(groupsQuery);
  const fieldGroups = fieldGroupsData || [];

  const helpersQuery = useMemoFirebase(() => {
    if (!user || !firestore || userProfile?.role === 'helper') return null;
    return query(collection(firestore, 'users'), where('adminId', '==', user.uid));
  }, [user, firestore, userProfile]);
  const { data: helpersData, loading: helpersLoading } = useCollection<Helper>(helpersQuery);
  const helpers = helpersData || [];

  const groupCounts = useMemo(() => {
    return names.reduce((acc, name) => {
      const group = fieldGroups.find(g => g.id === name.fieldGroup);
      if (group) {
        acc[group.name] = (acc[group.name] || 0) + 1;
      }
      return acc;
    }, {} as { [key: string]: number });
  }, [names, fieldGroups]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('visit-desc');
  
  // State for import functionality
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview>(null);
  const [importUrl, setImportUrl] = useState('');
  const [isImportingFromUrl, setIsImportingFromUrl] = useState(false);
  const [importMode, setImportMode] = useState<'full' | 'visits'>('full');
  const [stagedVisitsUpdates, setStagedVisitsUpdates] = useState<ImportUpdate[]>([]);

  // State for PDF dialog
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);


  // Load filters from localStorage on initial client render
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const savedGroup = localStorage.getItem('list-filter-group');
        if (savedGroup) setSelectedGroup(savedGroup);
        
        const savedStatus = localStorage.getItem('list-filter-status');
        if (savedStatus) setSelectedStatus(savedStatus);
        
        const savedSort = localStorage.getItem('list-filter-sort');
        if (savedSort) setSortBy(savedSort);
    }
  }, []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('list-filter-group', selectedGroup);
      localStorage.setItem('list-filter-status', selectedStatus);
      localStorage.setItem('list-filter-sort', sortBy);
    }
  }, [selectedGroup, selectedStatus, sortBy, isClient]);
  

  useEffect(() => {
    if (dataOwnerProfile && dataOwnerProfile.importUrl) {
      setImportUrl(dataOwnerProfile.importUrl);
    }
  }, [dataOwnerProfile]);

  const addName = (draftName: { text: string, fieldGroup: string, status: Name['status'] }) => {
    if (!dataOwnerId || !firestore || !performingUser) return;
    if (draftName.text.trim() === '') {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar nome",
        description: "O nome não pode estar em branco.",
      });
      return;
    };
    const newNameToAdd = {
      text: draftName.text.trim(),
      status: draftName.status,
      fieldGroup: draftName.fieldGroup,
      address: '',
      phone: '',
    };
    services.addName(firestore, dataOwnerId, newNameToAdd, performingUser);
    toast({
      title: "Nome adicionado",
      description: `${draftName.text.trim()} foi adicionado à lista.`,
    });
    setIsAddDialogOpen(false);
  };

  const addGroup = (groupName: string) => {
    if (!dataOwnerId || !firestore || !performingUser) return;

    const newGroupName = groupName.trim();
    if (newGroupName && !fieldGroups.some(g => g.name === newGroupName)) {
      services.addFieldGroup(firestore, dataOwnerId, newGroupName, performingUser);
      toast({
        title: "Grupo adicionado",
        description: `O grupo "${newGroupName}" foi criado.`,
      });
    } else if (newGroupName) {
       toast({
        variant: "destructive",
        title: "Erro",
        description: `O grupo "${newGroupName}" já existe.`,
      });
    }
  };
  
  const deleteGroup = (groupId: string) => {
    if (!dataOwnerId || !firestore || !performingUser) return;
    
    services.deleteFieldGroup(firestore, dataOwnerId, groupId, performingUser);

    // Remove the group from any names that have it assigned.
    names.forEach(name => {
      if (name.fieldGroup === groupId) {
        updateName(name.id, { ...name, fieldGroup: '' });
      }
    });

    const groupName = fieldGroups.find(g => g.id === groupId)?.name;
    toast({
        title: "Grupo removido",
        description: `O grupo "${groupName}" foi removido.`,
    });
  };

  const updateGroup = (groupId: string, newName: string): boolean => {
    if (!dataOwnerId || !firestore || !performingUser) return false;
    const oldGroup = fieldGroups.find(g => g.id === groupId);
    if (!oldGroup) return false;

    const trimmedNewName = newName.trim();
    if (trimmedNewName === '' || oldGroup.name === trimmedNewName) {
      return true;
    }

    if (fieldGroups.some(g => g.name === trimmedNewName)) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar grupo",
        description: `O grupo "${trimmedNewName}" já existe.`,
      });
      return false;
    }
    
    services.updateFieldGroup(firestore, dataOwnerId, groupId, trimmedNewName, performingUser);

    toast({
        title: "Grupo atualizado",
        description: `O grupo "${oldGroup.name}" foi renomeado para "${trimmedNewName}".`,
    });
    return true;
  };

  const updateName = (id: string, newNameData: Partial<Omit<Name, 'id'>>) => {
    if (!dataOwnerId || !firestore || !performingUser) return;
    services.updateName(firestore, dataOwnerId, id, newNameData, performingUser, fieldGroups);
  };

  const deleteName = (id: string) => {
    if (!dataOwnerId || !firestore || !performingUser) return;
    services.deleteName(firestore, dataOwnerId, id, performingUser);
    toast({
        title: "Nome removido",
        description: `O nome foi removido da lista.`,
    });
  };

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
    const finalUrl = urlToUse || (dataOwnerProfile?.importUrl || '');

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
      if (isAdmin && finalUrl !== (dataOwnerProfile?.importUrl || '')) {
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
    if (isAdmin && dataOwnerProfile?.importUrl && !autoSyncAttempted.current && names.length > 0) {
      autoSyncAttempted.current = true;
      handleImportFromUrl(dataOwnerProfile.importUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, dataOwnerProfile, names.length]);

  const filteredNames = useMemo(() => {
    const filtered = names.filter(name => {
      const matchesSearch = name.text.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesGroup = selectedGroup === 'all' 
        || name.fieldGroup === selectedGroup 
        || (selectedGroup === 'no-group' && (!name.fieldGroup || name.fieldGroup === ''));
        
      const matchesStatus = selectedStatus === 'all' || name.status === selectedStatus;
      return matchesSearch && matchesGroup && matchesStatus;
    });

    // Then, sort the filtered names
    filtered.sort((a, b) => {
      if (sortBy === 'name-asc') {
        return a.text.localeCompare(b.text);
      }

      const dateA = getMostRecentVisitDate(a.visitHistory).getTime();
      const dateB = getMostRecentVisitDate(b.visitHistory).getTime();
      
      let dateComparison = 0;
      if (sortBy === 'visit-asc') {
        dateComparison = dateA - dateB;
      } else { // 'visit-desc' is the default
        dateComparison = dateB - dateA;
      }

      // If dates are the same, sort by name alphabetically
      if (dateComparison === 0) {
        return a.text.localeCompare(b.text);
      }
      
      return dateComparison;
    });

    return filtered;
  }, [names, searchTerm, selectedGroup, selectedStatus, sortBy]);

  const isLoading = userLoading || profileLoading || namesLoading || groupsLoading || helpersLoading || adminProfileLoading;
  
  useEffect(() => {
    if (!userLoading && !user) {
      router.replace('/login');
    }
  }, [userLoading, user, router]);

  const generateNamesPdf = (pdfSortBy: string, pdfSelectedGroups: string[]) => {
    const filteredForPdf = names.filter(name => {
      if (pdfSelectedGroups.length === 0) {
        return false;
      }
      const hasNoGroup = !name.fieldGroup || name.fieldGroup === '';
      if (hasNoGroup) {
        return pdfSelectedGroups.includes('no-group');
      }
      return pdfSelectedGroups.includes(name.fieldGroup);
    });

    if (!filteredForPdf || filteredForPdf.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Lista Vazia',
        description: 'Não há nomes para gerar o PDF nos grupos selecionados.',
      });
      return;
    }

    const doc = new jsPDF();
    const groupMap = new Map(fieldGroups.map(g => [g.id, g.name]));

    const sortedNames = [...filteredForPdf].sort((a, b) => {
      if (pdfSortBy === 'name-asc') {
        return a.text.localeCompare(b.text);
      }
      const dateA = getMostRecentVisitDate(a.visitHistory).getTime();
      const dateB = getMostRecentVisitDate(b.visitHistory).getTime();
      
      if (pdfSortBy === 'visit-asc') {
        return dateA - dateB;
      }
      // 'visit-desc'
      return dateB - dateA;
    });

    const body = sortedNames.map(name => {
      const mostRecentVisit = getMostRecentVisitDate(name.visitHistory);
      const visitDate = mostRecentVisit.getTime() === 0
        ? 'Nunca'
        : format(mostRecentVisit, "dd/MM/yyyy", { locale: ptBR });

      return [
        name.text,
        groupMap.get(name.fieldGroup) || 'Sem grupo',
        name.status,
        visitDate
      ];
    });

    const title = `Relatório da Lista de Nomes`;
    const subtitle = `Total de ${filteredForPdf.length} nomes. Ordenado por: ${
      {
        'visit-desc': 'Última Visita (Recentes)',
        'visit-asc': 'Última Visita (Antigos)',
        'name-asc': 'Nome (A-Z)'
      }[pdfSortBy]
    }`;

    doc.setFontSize(22);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(subtitle, doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });

    (doc as any).autoTable({
      head: [['Nome', 'Grupo', 'Status', 'Última Visita']],
      body: body,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [34, 99, 219] },
      didDrawPage: function (data: any) {
        // Footer
        const pageCount = doc.internal.pages.length;
        doc.setFontSize(10);
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.text("Página " + String(pageCount), data.settings.margin.left, pageHeight - 10);
      }
    });

    doc.save(`lista-nomes-${new Date().toISOString().split('T')[0]}.pdf`);
    setIsPdfDialogOpen(false);
  };


  if (isLoading || !isClient) {
      return (
        <div className="flex min-h-screen flex-col bg-background items-center justify-center">
            <p className="text-lg text-muted-foreground">Carregando...</p>
        </div>
      )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
        {isMobile ? (
          <div className="space-y-4">
            <Tabs value={mobileView} onValueChange={(value) => setMobileView(value as any)} className="w-full">
              <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'} rounded-xl bg-muted p-1`}>
                <TabsTrigger value="pessoas" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md">Pessoas</TabsTrigger>
                <TabsTrigger value="grupos" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md">Grupos</TabsTrigger>
                {isAdmin && <TabsTrigger value="ajudantes" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md">Ajudantes</TabsTrigger>}
              </TabsList>
            </Tabs>
            
            {mobileView === 'pessoas' && (
              <div className="space-y-8 mt-4">
                <ManageNamesCard
                  onAddNameClick={() => setIsAddDialogOpen(true)}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  onGeneratePdfClick={() => setIsPdfDialogOpen(true)}
                />
                <NameListCard
                  names={names}
                  filteredNames={filteredNames}
                  searchTerm={searchTerm}
                  updateName={updateName}
                  deleteName={deleteName}
                  fieldGroups={fieldGroups}
                  adminName={adminProfile?.name}
                  selectedGroup={selectedGroup}
                  setSelectedGroup={setSelectedGroup}
                  selectedStatus={selectedStatus}
                  setSelectedStatus={setSelectedStatus}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                />
              </div>
            )}

            {mobileView === 'grupos' && (
              <div className="space-y-8 mt-4">
                 <FieldGroupsCard
                    isAdmin={isAdmin}
                    onAddGroup={addGroup}
                    fieldGroups={fieldGroups}
                    updateGroup={updateGroup}
                    deleteGroup={deleteGroup}
                    groupCounts={groupCounts}
                  />
              </div>
            )}

             {isAdmin && user && mobileView === 'ajudantes' && (
              <div className="space-y-8 mt-4">
                 <HelpersCard ownerId={user.uid} helpers={helpers} performingUser={performingUser} />
                 <ImportCard
                    onImportClick={() => fileInputRef.current?.click()}
                    onImportVisitsClick={() => visitsFileInputRef.current?.click()}
                    onImportFromUrl={() => handleImportFromUrl()}
                    isImportingFromUrl={isImportingFromUrl}
                    importUrl={importUrl}
                    setImportUrl={setImportUrl}
                  />
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            <div className="lg:col-span-2 space-y-8">
              <ManageNamesCard
                onAddNameClick={() => setIsAddDialogOpen(true)}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onGeneratePdfClick={() => setIsPdfDialogOpen(true)}
              />
              <NameListCard
                names={names}
                filteredNames={filteredNames}
                searchTerm={searchTerm}
                updateName={updateName}
                deleteName={deleteName}
                fieldGroups={fieldGroups}
                adminName={adminProfile?.name}
                selectedGroup={selectedGroup}
                setSelectedGroup={setSelectedGroup}
                selectedStatus={selectedStatus}
                setSelectedStatus={setSelectedStatus}
                sortBy={sortBy}
                setSortBy={setSortBy}
              />
            </div>
            
            <div className="lg:col-span-1 space-y-8">
              <FieldGroupsCard
                isAdmin={isAdmin}
                onAddGroup={addGroup}
                fieldGroups={fieldGroups}
                updateGroup={updateGroup}
                deleteGroup={deleteGroup}
                groupCounts={groupCounts}
              />
              {isAdmin && user && (
                <>
                  <HelpersCard ownerId={user.uid} helpers={helpers} performingUser={performingUser} />
                  <ImportCard
                    onImportClick={() => fileInputRef.current?.click()}
                    onImportVisitsClick={() => visitsFileInputRef.current?.click()}
                    onImportFromUrl={() => handleImportFromUrl()}
                    isImportingFromUrl={isImportingFromUrl}
                    importUrl={importUrl}
                    setImportUrl={setImportUrl}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </main>
      
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

      <AddNameDialog 
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddName={addName}
        fieldGroups={fieldGroups}
      />
      
       <ImportConfirmationDialog
        isOpen={isImportConfirmOpen}
        onOpenChange={setIsImportConfirmOpen}
        preview={importPreview}
        onConfirm={importMode === 'full' ? () => handleConfirmImport(importPreview) : handleConfirmVisitsImport}
      />

       <GeneratePdfDialog 
        isOpen={isPdfDialogOpen}
        onOpenChange={setIsPdfDialogOpen}
        onGeneratePdf={generateNamesPdf}
        fieldGroups={fieldGroups}
       />

      <InstallPwaBanner />
    </div>
  );
}
