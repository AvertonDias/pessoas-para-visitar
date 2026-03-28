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
  type Firestore,
} from 'firebase/firestore';
import type { Name, UserProfile, FieldGroup, ImportedName } from '@/app/page';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { User } from 'firebase/auth';

// User Profile and Registration
export const processRegistration = async (db: Firestore, user: User, inviteToken?: string | null) => {
  const userProfileRef = doc(db, 'users', user.uid);

  // Check for invite token first
  if (inviteToken) {
    const inviteRef = doc(db, 'invitations', inviteToken);
    try {
      const inviteSnap = await getDoc(inviteRef);

      if (inviteSnap.exists() && inviteSnap.data().claimed === false) {
        // User was invited, create helper profile
        const adminId = inviteSnap.data().adminId;

        if (adminId) {
          const profile: Omit<UserProfile, 'id'> = {
            email: user.email!,
            name: user.displayName,
            role: 'helper',
            adminId: adminId,
          };
          await setDoc(userProfileRef, profile);

          // Mark the invitation as claimed
          await updateDoc(inviteRef, {
            claimed: true,
            claimedBy: user.uid,
            claimedAt: serverTimestamp(),
          });
          return; // Stop execution
        }
      }
    } catch (error) {
        console.error("Error processing invitation:", error);
    }
    // If token is invalid, claimed, or an error occurs, fall through to default behavior
  }
  
  // Default behavior: No valid invitation, create admin profile
  const profile: Omit<UserProfile, 'id'> = {
    email: user.email!,
    name: user.displayName,
    role: 'admin',
  };
  await setDoc(userProfileRef, profile);
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
  const data = { role: 'admin', adminId: null };
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
  existingGroups: FieldGroup[]
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

  // 2. Add new names
  const namesCollectionRef = collection(db, 'users', userId, 'names');
  dataToImport.forEach(item => {
    if (item.text) { // Ensure name text exists
      const nameRef = doc(namesCollectionRef);
      batch.set(nameRef, {
        text: item.text,
        status: item.status || 'regular',
        fieldGroup: item.fieldGroup || '',
        address: item.address || '',
        phone: item.phone || '',
        createdAt: serverTimestamp(),
        visitHistory: []
      });
    }
  });

  // 3. Commit the batch
  try {
    await batch.commit();
  } catch (serverError) {
    const permissionError = new FirestorePermissionError({
      path: `users/${userId}/names`,
      operation: 'write',
    });
    errorEmitter.emit('permission-error', permissionError);
    throw permissionError;
  }
};


export { where };
