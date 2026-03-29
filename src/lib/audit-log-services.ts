import {
  addDoc,
  collection,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';

export type AuditLogAction = 'create' | 'update' | 'delete' | 'import';
export type AuditLogEntityType = 'name' | 'group' | 'visit' | 'helper' | 'sync-url';

export type PerformingUser = {
    uid: string;
    name: string;
};

export const logChange = (
    db: Firestore,
    ownerId: string,
    performingUser: PerformingUser,
    action: AuditLogAction,
    entityType: AuditLogEntityType,
    entityName: string,
    details?: string
) => {
    const logCollection = collection(db, 'users', ownerId, 'auditLogs');
    const logData = {
        userId: performingUser.uid,
        userName: performingUser.name,
        action,
        entityType,
        entityName,
        details: details || '',
        timestamp: serverTimestamp(),
    };
    // This is a fire-and-forget operation, we don't want to block UI for logging
    addDoc(logCollection, logData).catch(error => {
        console.error("Failed to write audit log:", error);
    });
};
