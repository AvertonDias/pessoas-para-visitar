import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import type { Name, FieldGroup } from '@/app/page';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
