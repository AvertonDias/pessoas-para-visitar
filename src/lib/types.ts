export type Visit = {
  id: string;
  date: string;
  visitors: string;
  observations?: string;
};

export type Name = {
  id: string;
  personId?: string;
  text: string;
  address?: string;
  phone?: string;
  status: 'regular' | 'irregular' | 'inativo' | 'removido';
  fieldGroup: string;
  visitHistory: Visit[];
};

export type FieldGroup = {
  id: string;
  name: string;
};

export type UserProfile = {
  id: string;
  name?: string;
  email: string;
  role: 'admin' | 'helper';
  adminId?: string;
  importUrl?: string;
};

export type Helper = {
  id: string;
  name?: string;
  email: string;
};

export type ImportedName = Partial<Omit<Name, 'id' | 'visitHistory' | 'fieldGroup'>> & {
    fieldGroup?: string;
    importedVisitDate?: string;
};

export type ImportUpdate = {
  existing: Name;
  newData: ImportedName;
  changes: string[];
};

export type ImportPreview = {
    toCreate: ImportedName[];
    toUpdate: ImportUpdate[];
    newGroups: string[];
    unmatchedNames: string[];
} | null;
