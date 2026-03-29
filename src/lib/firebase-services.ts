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
import type { Name, UserProfile, FieldGroup, ImportedName, ImportUpdate } from '@/app/page';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { User } from 'firebase/auth';
import { calculateStatusFromHistory } from './status-logic';

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

export const addName = (db: Firestore, userId: string, nameData: Omit<Name, 'id' | 'visitHistory'>) => {
  const namesCollection = collection(db, 'users', userId, 'names');
  const data = {
    ...nameData,
    createdAt: serverTimestamp(),
    visitHistory: [],
  };
  addDoc(namesCollection, data)
    .catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: namesCollection.path,
        operation: 'create',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
};

export const updateName = (db: Firestore, userId: string, nameId: string, nameData: Partial<Omit<Name, 'id'>>) => {
  const nameRef = doc(db, 'users', userId, 'names', nameId);
  updateDoc(nameRef, nameData)
    .catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: nameRef.path,
        operation: 'update',
        requestResourceData: nameData
      });
      errorEmitter.emit('permission-error', permissionError);
    });
};

export const deleteName = (db: Firestore, userId: string, nameId: string) => {
  const nameRef = doc(db, 'users', userId, 'names', nameId);
  deleteDoc(nameRef)
    .catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: nameRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    });
};


// Field Groups

export const addFieldGroup = (db: Firestore, userId: string, groupName: string) => {
  const groupsCollection = collection(db, 'users', userId, 'fieldGroups');
  const data = {
    name: groupName,
    createdAt: serverTimestamp(),
  };
  addDoc(groupsCollection, data)
    .catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: groupsCollection.path,
        operation: 'create',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
};

export const updateFieldGroup = (db: Firestore, userId: string, groupId: string, newName: string) => {
  const groupRef = doc(db, 'users', userId, 'fieldGroups', groupId);
  const data = { name: newName };
  updateDoc(groupRef, data)
    .catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: groupRef.path,
        operation: 'update',
        requestResourceData: data
      });
      errorEmitter.emit('permission-error', permissionError);
    });
};

export const deleteFieldGroup = (db: Firestore, userId: string, groupId: string) => {
  const groupRef = doc(db, 'users', userId, 'fieldGroups', groupId);
  deleteDoc(groupRef)
    .catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: groupRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    });
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

export const removeHelper = (db: Firestore, helperId: string) => {
  const userProfileRef = doc(db, 'users', helperId);
  // This removes their adminId, reverting them to a standard 'admin' of their own (likely empty) data.
  const data = { role: 'admin', adminId: deleteField() };
  updateDoc(userProfileRef, data)
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
  newGroups: string[]
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

  const namesCollectionRef = collection(db, 'users', userId, 'names');

  // 1. Create new groups
  newGroups.forEach(groupName => {
    const groupRef = doc(collection(db, 'users', userId, 'fieldGroups'));
    batch.set(groupRef, {
      name: groupName,
      createdAt: serverTimestamp()
    });
    maybeCommitBatch();
  });

  // 2. Process new names to create
  toCreate.forEach(item => {
    if (!item.text) return;

    const nameRef = doc(namesCollectionRef);
    
    const visitHistory = item.importedVisitDate ? [{
      id: doc(collection(db, 'temp-ids')).id,
      date: item.importedVisitDate,
      visitors: 'Importado'
    }] : [];
    
    batch.set(nameRef, {
      personId: item.personId || '',
      text: item.text,
      status: item.status || 'regular',
      fieldGroup: item.fieldGroup || '',
      address: item.address || '',
      phone: item.phone || '',
      createdAt: serverTimestamp(),
      visitHistory: visitHistory
    });
    maybeCommitBatch();
  });

  // 3. Process existing names to update
  toUpdate.forEach(({ existing, newData }) => {
    const nameRef = doc(namesCollectionRef, existing.id);
    const updatePayload: { [key: string]: any } = { ...newData };

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

  // 4. Commit all batches in parallel
  try {
    await Promise.all(batches.map(b => b.commit()));
  } catch (error) {
    console.error("Firebase batch commit failed:", error);
    throw error;
  }
};

export const batchUpdateVisits = async (
  db: Firestore,
  userId: string,
  updates: ImportUpdate[]
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
  } catch (error) {
    console.error("Firebase batch update for visits failed:", error);
    throw error;
  }
};


export { where };
