import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import type { Name, UserProfile } from '@/app/page';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { User } from 'firebase/auth';

// User Profile and Registration
export const processRegistration = async (db: Firestore, user: User) => {
  const userProfileRef = doc(db, 'users', user.uid);
  
  // Check for invitations
  const invitationsQuery = query(collectionGroup(db, 'invitations'), where('email', '==', user.email));
  const invitationSnapshot = await getDocs(invitationsQuery);

  if (!invitationSnapshot.empty) {
    // User was invited, create helper profile
    const invitation = invitationSnapshot.docs[0];
    const adminId = invitation.ref.parent.parent?.id;

    if (adminId) {
      const profile: Omit<UserProfile, 'id'> = {
        email: user.email!,
        name: user.displayName,
        role: 'helper',
        adminId: adminId,
      };
      await setDoc(userProfileRef, profile);
      // Delete the invitation so it can't be reused
      await deleteDoc(invitation.ref);
    }
  } else {
    // No invitation, create admin profile
    const profile: Omit<UserProfile, 'id'> = {
      email: user.email!,
      name: user.displayName,
      role: 'admin',
    };
    await setDoc(userProfileRef, profile);
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
        requestResourceData: data
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

export const inviteHelper = (db: Firestore, ownerId: string, email: string) => {
  const invitationsCollection = collection(db, 'users', ownerId, 'invitations');
  addDoc(invitationsCollection, { email })
    .catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: invitationsCollection.path,
        operation: 'create',
        requestResourceData: { email },
      });
      errorEmitter.emit('permission-error', permissionError);
    });
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

export { where };
