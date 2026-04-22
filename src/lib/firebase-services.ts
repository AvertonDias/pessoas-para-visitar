import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  deleteField,
  type Firestore,
} from 'firebase/firestore';
import type { Name, UserProfile, FieldGroup, ImportedName, ImportUpdate, Visit } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { User } from 'firebase/auth';
import { calculateStatusFromHistory } from './status-logic';
import { logChange, type PerformingUser } from './audit-log-services';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';


const formatChanges = (oldData: any, newData: any, groupMap: Map<string, string>): string[] => {
    const changes: string[] = [];
    if (newData.text !== undefined && newData.text !== oldData.text) {
        changes.push(`Nome alterado para "${newData.text}"`);
    }
    if (newData.address !== undefined && newData.address !== (oldData.address || '')) {
        changes.push(`Endereço alterado para "${newData.address}"`);
    }
    if (newData.phone !== undefined && newData.phone !== (oldData.phone || '')) {
        changes.push(`Telefone alterado para "${newData.phone}"`);
    }
    if (newData.status !== undefined && newData.status !== oldData.status) {
        changes.push(`Status alterado para "${newData.status}"`);
    }
    if (newData.fieldGroup !== undefined && newData.fieldGroup !== (oldData.fieldGroup || '')) {
        const oldGroupName = groupMap.get(oldData.fieldGroup) || 'Sem grupo';
        const newGroupName = groupMap.get(newData.fieldGroup) || 'Sem grupo';
        changes.push(`Grupo alterado para "${newGroupName}"`);
    }
    if (newData.visitHistory) {
        if (newData.visitHistory.length > oldData.visitHistory.length) {
            const newVisit = newData.visitHistory[newData.visitHistory.length - 1];
            let details = `Visita adicionada em ${format(new Date(newVisit.date), "PPP", { locale: ptBR })}`;
            if (newVisit.observations) details += ` com observação.`;
            changes.push(details);
        } else if (newData.visitHistory.length < oldData.visitHistory.length) {
            changes.push(`Uma visita foi removida.`);
        } else if (JSON.stringify(newData.visitHistory) !== JSON.stringify(oldData.visitHistory)) {
             // Find changed visit
            const changedVisit = newData.visitHistory.find((newVisit: Visit) => {
                const oldVisit = oldData.visitHistory.find((ov: Visit) => ov.id === newVisit.id);
                return !oldVisit || JSON.stringify(newVisit) !== JSON.stringify(oldVisit);
            });
            if(changedVisit) {
                changes.push(`Visita de ${format(new Date(changedVisit.date), "PPP", { locale: ptBR })} foi atualizada.`);
            } else {
                 changes.push(`Uma visita foi atualizada.`);
            }
        }
    }

    return changes;
}


// User Profile and Registration
export const processRegistration = async (db: Firestore, user: User, inviteToken?: string | null, registrationName?: string | null) => {
  const userProfileRef = doc(db, 'users', user.uid);
  const displayName = registrationName || user.displayName;

  // Scenario 1: User is acting on an invitation token.
  if (inviteToken) {
    const inviteRef = doc(db, 'invitations', inviteToken);
    
    // Use a transaction or batch to ensure atomicity
    const batch = writeBatch(db);

    const inviteSnap = await getDoc(inviteRef);
    if (!inviteSnap.exists() || inviteSnap.data().claimed === true) {
      throw new Error("Convite inválido ou já utilizado.");
    }

    const adminId = inviteSnap.data().adminId;
    if (!adminId) {
        throw new Error("O convite é inválido e não contém um administrador associado.");
    }
    
    // The profile to set or update
    const newProfileData: Partial<UserProfile> = {
      role: 'helper',
      adminId: adminId,
    };
    
    // Add display name and email if it's a new profile
    const userProfileSnap = await getDoc(userProfileRef);
    if (!userProfileSnap.exists()) {
        newProfileData.name = displayName ?? undefined;
        newProfileData.email = user.email!;
    }
    
    // Use set with merge to create or update the user profile
    batch.set(userProfileRef, newProfileData, { merge: true });

    // Mark invitation as claimed
    batch.update(inviteRef, {
      claimed: true,
      claimedBy: user.uid,
      claimedAt: serverTimestamp(),
    });
    
    try {
        await batch.commit();
        // Log this action to the admin's audit log
        const adminProfileSnap = await getDoc(doc(db, 'users', adminId));
        const adminProfile = adminProfileSnap.data();

        logChange(db, adminId, {uid: user.uid, name: 'Sistema'}, 'create', 'helper', user.uid, displayName || user.email || 'Novo Ajudante', 'Aceitou o convite.');

        return; // Success
    } catch(commitError) {
        console.error("Batch commit failed during invitation claim:", commitError);
        // This is a critical failure, but we can't easily roll back the auth user creation here.
        // The user will exist but their profile will be incorrect. They can try again.
        throw new Error("Não foi possível processar o convite. Tente novamente.");
    }
  }

  // Scenario 2: User is registering without an invitation.
  const userProfileSnap = await getDoc(userProfileRef);
  if (!userProfileSnap.exists()) {
      // Only create a new admin profile if one doesn't exist.
      // This prevents an existing helper from overwriting their role by re-registering.
      const profile: Omit<UserProfile, 'id' | 'importUrl'> = {
        email: user.email!,
        name: displayName ?? undefined,
        role: 'admin',
      };
      await setDoc(userProfileRef, profile);
  }
};

export const updateUserProfile = async (db: Firestore, userId: string, profileData: Partial<Omit<UserProfile, 'id'>>) => {
  const userProfileRef = doc(db, 'users', userId);
  try {
    await updateDoc(userProfileRef, profileData);
  } catch (serverError: any) {
    const permissionError = new FirestorePermissionError({
      path: userProfileRef.path,
      operation: 'update',
      requestResourceData: profileData
    });
    errorEmitter.emit('permission-error', permissionError);
    throw serverError;
  }
};


// Names

export const addName = (db: Firestore, userId: string, nameData: Omit<Name, 'id' | 'visitHistory'>, performingUser: PerformingUser) => {
  const namesCollection = collection(db, 'users', userId, 'names');
  const data = {
    ...nameData,
    createdAt: serverTimestamp(),
    visitHistory: [],
  };
  addDoc(namesCollection, data)
    .then((docRef) => {
        logChange(db, userId, performingUser, 'create', 'name', docRef.id, nameData.text, `Adicionado ao grupo "${nameData.fieldGroup || 'Sem grupo'}" com status "${nameData.status}".`);
    })
    .catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: namesCollection.path,
        operation: 'create',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
};

export const updateName = async (db: Firestore, userId: string, nameId: string, nameData: Partial<Omit<Name, 'id'>>, performingUser: PerformingUser, fieldGroups: FieldGroup[]) => {
  const nameRef = doc(db, 'users', userId, 'names', nameId);
  try {
    const oldDocSnap = await getDoc(nameRef);
    if (!oldDocSnap.exists()) {
      console.error("Attempted to update a non-existent name.");
      return;
    }
    const oldData = { ...oldDocSnap.data(), id: oldDocSnap.id } as Name;

    await updateDoc(nameRef, nameData);

    const groupMap = new Map(fieldGroups.map(g => [g.id, g.name]));
    const changeDetails = formatChanges(oldData, nameData, groupMap);
    if (changeDetails.length > 0) {
      logChange(db, userId, performingUser, 'update', 'name', nameId, nameData.text || oldData.text, changeDetails.join('; '));
    }
  } catch (serverError) {
    const permissionError = new FirestorePermissionError({
      path: nameRef.path,
      operation: 'update',
      requestResourceData: nameData
    });
    errorEmitter.emit('permission-error', permissionError);
  }
};

export const deleteName = async (db: Firestore, userId: string, nameId: string, performingUser: PerformingUser) => {
  const nameRef = doc(db, 'users', userId, 'names', nameId);
  try {
    const docSnap = await getDoc(nameRef);
    if (docSnap.exists()) {
        const nameText = docSnap.data().text;
        await deleteDoc(nameRef);
        logChange(db, userId, performingUser, 'delete', 'name', nameId, nameText);
    }
  } catch (serverError) {
    const permissionError = new FirestorePermissionError({
      path: nameRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  }
};


// Field Groups

export const addFieldGroup = (db: Firestore, userId: string, groupName: string, performingUser: PerformingUser) => {
  const groupsCollection = collection(db, 'users', userId, 'fieldGroups');
  const data = {
    name: groupName,
    createdAt: serverTimestamp(),
  };
  addDoc(groupsCollection, data)
    .then((docRef) => {
        logChange(db, userId, performingUser, 'create', 'group', docRef.id, groupName);
    })
    .catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: groupsCollection.path,
        operation: 'create',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
};

export const updateFieldGroup = async (db: Firestore, userId: string, groupId: string, newName: string, performingUser: PerformingUser) => {
  const groupRef = doc(db, 'users', userId, 'fieldGroups', groupId);
  const data = { name: newName };
  try {
    const oldDocSnap = await getDoc(groupRef);
    if (oldDocSnap.exists()) {
        const oldName = oldDocSnap.data().name;
        if (oldName !== newName) {
            await updateDoc(groupRef, data);
            logChange(db, userId, performingUser, 'update', 'group', groupId, newName, `Nome alterado de "${oldName}" para "${newName}".`);
        }
    }
  } catch (serverError) {
    const permissionError = new FirestorePermissionError({
      path: groupRef.path,
      operation: 'update',
      requestResourceData: data
    });
    errorEmitter.emit('permission-error', permissionError);
  }
};

export const deleteFieldGroup = async (db: Firestore, userId: string, groupId: string, performingUser: PerformingUser) => {
  const groupRef = doc(db, 'users', userId, 'fieldGroups', groupId);
  try {
    const docSnap = await getDoc(groupRef);
    if (docSnap.exists()) {
        const groupName = docSnap.data().name;
        await deleteDoc(groupRef);
        logChange(db, userId, performingUser, 'delete', 'group', groupId, groupName);
    }
  } catch (serverError) {
    const permissionError = new FirestorePermissionError({
      path: groupRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  }
};

// Audit Logs
export const deleteAuditLog = async (db: Firestore, ownerId: string, logId: string) => {
  const logRef = doc(db, 'users', ownerId, 'auditLogs', logId);
  try {
    await deleteDoc(logRef);
  } catch (serverError) {
    const permissionError = new FirestorePermissionError({
      path: logRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
    console.error("Failed to delete audit log:", serverError);
  }
};


// Helpers & Invitations

export const createInvitation = async (db: Firestore, adminId: string): Promise<string> => {
  const invitationsCollection = collection(db, 'invitations');
  const data = {
    adminId,
    createdAt: serverTimestamp(),
    claimed: false,
    claimedBy: null,
    claimedAt: null,
  };
  try {
    const docRef = await addDoc(invitationsCollection, data);
    return docRef.id;
  } catch (serverError) {
    const permissionError = new FirestorePermissionError({
      path: invitationsCollection.path,
      operation: 'create',
      requestResourceData: data,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw permissionError;
  }
};

export const removeHelper = (db: Firestore, helperId: string, performingUser: PerformingUser) => {
  const userProfileRef = doc(db, 'users', helperId);
  // This removes their adminId, reverting them to a standard 'admin' of their own (likely empty) data.
  const data = { role: 'admin', adminId: deleteField() };
  updateDoc(userProfileRef, data)
     .then(() => {
        logChange(db, performingUser.uid, performingUser, 'delete', 'helper', helperId, `Acesso de ${helperId}`, `Acesso removido para o usuário ${helperId}.`);
     })
     .catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: userProfileRef.path,
        operation: 'update',
        requestResourceData: data
      });
      errorEmitter.emit('permission-error', permissionError);
    });
};

// Import

export const batchImportData = async (
  db: Firestore,
  userId: string,
  toCreate: ImportedName[],
  toUpdate: ImportUpdate[],
  newGroups: string[],
  fieldGroups: FieldGroup[],
  performingUser: PerformingUser,
) => {
  const BATCH_LIMIT = 490; // Keep it safely under 500
  let batch = writeBatch(db);
  let operationCount = 0;
  const batches: ReturnType<typeof writeBatch>[] = [batch];

  const maybeCommitBatch = () => {
    operationCount++;
    if (operationCount >= BATCH_LIMIT) {
      batch = writeBatch(db);
      batches.push(batch);
      operationCount = 0;
    }
  };
  
  // 1. Build a map of existing group names to their IDs
  const groupNameToIdMap = new Map<string, string>();
  fieldGroups.forEach(group => {
      groupNameToIdMap.set(group.name.toLowerCase(), group.id);
  });

  const namesCollectionRef = collection(db, 'users', userId, 'names');

  // 2. Create new groups and add them to the map
  newGroups.forEach(groupName => {
    const groupRef = doc(collection(db, 'users', userId, 'fieldGroups'));
    batch.set(groupRef, {
      name: groupName,
      createdAt: serverTimestamp()
    });
    // Add the new group to our map for immediate use
    groupNameToIdMap.set(groupName.toLowerCase(), groupRef.id);
    maybeCommitBatch();
  });

  // 3. Process new names to create
  toCreate.forEach(item => {
    if (!item.text) return;

    const nameRef = doc(namesCollectionRef);
    
    const visitHistory = item.importedVisitDate ? [{
      id: doc(collection(db, 'temp-ids')).id,
      date: item.importedVisitDate,
      visitors: 'Importado'
    }] : [];
    
    const groupId = item.fieldGroup ? groupNameToIdMap.get(item.fieldGroup.toLowerCase()) || '' : '';

    batch.set(nameRef, {
      personId: item.personId || '',
      text: item.text,
      status: item.status || 'regular',
      fieldGroup: groupId,
      address: item.address || '',
      phone: item.phone || '',
      createdAt: serverTimestamp(),
      visitHistory: visitHistory
    });
    maybeCommitBatch();
  });

  // 4. Process existing names to update
  toUpdate.forEach(({ existing, newData }) => {
    const nameRef = doc(namesCollectionRef, existing.id);
    const updatePayload: { [key: string]: any } = { ...newData };

    if (typeof updatePayload.fieldGroup === 'string') {
        const groupName = updatePayload.fieldGroup;
        updatePayload.fieldGroup = groupName ? (groupNameToIdMap.get(groupName.toLowerCase()) || '') : '';
    }

    let finalHistory = existing.visitHistory || [];
    let historyChanged = false;
    
    if (updatePayload.importedVisitDate) {
      const newVisitDateStr = updatePayload.importedVisitDate;
      delete updatePayload.importedVisitDate; // Not a real Firestore field

      finalHistory = [
        ...finalHistory,
        {
          id: doc(collection(db, 'temp-ids')).id,
          date: newVisitDateStr,
          visitors: 'Importado'
        }
      ];
      updatePayload.visitHistory = finalHistory;
      historyChanged = true;
    }
    
    if (historyChanged && updatePayload.status === undefined && existing.status !== 'removido') {
      const newStatus = calculateStatusFromHistory(finalHistory);
      if (newStatus !== existing.status) {
        updatePayload.status = newStatus;
      }
    }
    
    if (Object.keys(updatePayload).length > 0) {
      batch.update(nameRef, updatePayload);
      maybeCommitBatch();
    }
  });

  // 5. Commit all batches in parallel
  try {
    await Promise.all(batches.map(b => b.commit()));
    const summary = `${toCreate.length} criados, ${toUpdate.length} atualizados, ${newGroups.length} novos grupos.`;
    logChange(db, userId, performingUser, 'import', 'name', 'batch-import', `Importação de ${toCreate.length + toUpdate.length} nomes`, summary);
  } catch (error) {
    console.error("Firebase batch commit failed:", error);
    throw error;
  }
};

export const batchUpdateVisits = async (
  db: Firestore,
  userId: string,
  updates: ImportUpdate[],
  performingUser: PerformingUser,
) => {
  const BATCH_LIMIT = 490; // Keep it safely under 500
  let batch = writeBatch(db);
  let operationCount = 0;
  const batches: ReturnType<typeof writeBatch>[] = [batch];

  const maybeCommitBatch = () => {
    operationCount++;
    if (operationCount >= BATCH_LIMIT) {
      batch = writeBatch(db);
      batches.push(batch);
      operationCount = 0;
    }
  };

  updates.forEach(({ existing, newData }) => {
    if (!newData.importedVisitDate) return;

    const nameRef = doc(db, 'users', userId, 'names', existing.id);
    
    let finalHistory = existing.visitHistory || [];
    const newVisitDate = new Date(newData.importedVisitDate);
    
    const visitExists = finalHistory.some(visit => {
        const existingDate = new Date(visit.date);
        return existingDate.getUTCFullYear() === newVisitDate.getUTCFullYear() &&
               existingDate.getUTCMonth() === newVisitDate.getUTCMonth() &&
               existingDate.getUTCDate() === newVisitDate.getUTCDate();
    });

    if (visitExists) return;

    finalHistory = [
      ...finalHistory,
      {
        id: doc(collection(db, 'temp-ids')).id, // Generate a unique ID for the visit
        date: newData.importedVisitDate,
        visitors: 'Importado'
      }
    ];

    const newStatus = calculateStatusFromHistory(finalHistory);

    const updatePayload = {
      visitHistory: finalHistory,
      status: newStatus
    };

    batch.update(nameRef, updatePayload);
    maybeCommitBatch();
  });

  try {
    await Promise.all(batches.map(b => b.commit()));
    logChange(db, userId, performingUser, 'import', 'visit', 'batch-import', `Importação de ${updates.length} visitas`);
  } catch (error) {
    console.error("Firebase batch update for visits failed:", error);
    throw error;
  }
};


export { where };
