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
  dataToImport: ImportedName[],
  existingGroups: FieldGroup[],
  existingNames: Name[]
) => {
  const batch = writeBatch(db);

  // 1. Create new groups if they don't exist
  const existingGroupNames = new Set(existingGroups.map(g => g.name.toLowerCase()));
  const newGroupsToCreate = new Set<string>();

  dataToImport.forEach(item => {
    if (item.fieldGroup && !existingGroupNames.has(item.fieldGroup.toLowerCase())) {
      newGroupsToCreate.add(item.fieldGroup);
    }
  });

  newGroupsToCreate.forEach(groupName => {
    const groupRef = doc(collection(db, 'users', userId, 'fieldGroups'));
    batch.set(groupRef, {
      name: groupName,
      createdAt: serverTimestamp()
    });
  });

  // 2. Prepare for name import/update
  const namesCollectionRef = collection(db, 'users', userId, 'names');
  const existingNamesByPersonId = new Map<string, Name>();
  existingNames.forEach(name => {
    if (name.personId && name.personId.trim() !== '') {
      existingNamesByPersonId.set(name.personId, name);
    }
  });
  const existingNamesByName = new Map<string, Name>();
    existingNames.forEach(name => {
    existingNamesByName.set(name.text.toLowerCase().trim(), name);
  });

  // 3. Process each item for import or update
  dataToImport.forEach(item => {
    if (!item.text) { // Ensure name text exists
      return;
    }
    
    const existingMatch = (item.personId ? existingNamesByPersonId.get(item.personId) : undefined) 
                          || existingNamesByName.get(item.text.toLowerCase().trim());
    
    if (existingMatch) {
      // UPDATE: Found existing name by personId
      const nameRef = doc(namesCollectionRef, existingMatch.id);
      const updatePayload: Partial<Omit<Name, 'id'>> = {
        text: item.text,
        address: item.address || '',
        phone: item.phone || '',
        fieldGroup: item.fieldGroup || '',
        status: item.status, // Prioritize status from the CSV file
      };
      
      let finalHistory = existingMatch.visitHistory || [];
      if (item.importedVisitDate) {
        const newVisitDate = new Date(item.importedVisitDate);
        const visitExists = finalHistory.some(visit => {
            const existingDate = new Date(visit.date);
            return existingDate.getUTCFullYear() === newVisitDate.getUTCFullYear() &&
                   existingDate.getUTCMonth() === newVisitDate.getUTCMonth() &&
                   existingDate.getUTCDate() === newVisitDate.getUTCDate();
        });

        if (!visitExists) {
            finalHistory = [
                ...finalHistory,
                {
                    id: doc(collection(db, 'temp-ids')).id,
                    date: item.importedVisitDate,
                    visitors: 'Importado'
                }
            ];
            updatePayload.visitHistory = finalHistory;
        }
      }

      batch.update(nameRef, updatePayload);

    } else {
      // CREATE: No match found, create a new name
      const nameRef = doc(namesCollectionRef);
      const visitHistory = item.importedVisitDate ? [{
        id: doc(collection(db, 'temp-ids')).id,
        date: item.importedVisitDate,
        visitors: 'Importado'
      }] : [];
      
      const status = item.status || 'regular'; // Prioritize status from the CSV file

      batch.set(nameRef, {
        personId: item.personId || '',
        text: item.text,
        status: status,
        fieldGroup: item.fieldGroup || '',
        address: item.address || '',
        phone: item.phone || '',
        createdAt: serverTimestamp(),
        visitHistory: visitHistory
      });
    }
  });


  // 4. Commit the batch
  try {
    await batch.commit();
  } catch (error) {
    // Re-throw the original error to be caught by the UI layer.
    // This provides more specific error information than creating a generic permission error.
    console.error("Firebase batch commit failed:", error); // Log the true error for debugging.
    throw error; // Rethrow it to the calling function in the UI.
  }
};

export const batchUpdateVisits = async (
  db: Firestore,
  userId: string,
  updates: ImportUpdate[]
) => {
  const batch = writeBatch(db);

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
  });

  try {
    await batch.commit();
  } catch (error) {
    console.error("Firebase batch update for visits failed:", error);
    throw error;
  }
};


export { where };
