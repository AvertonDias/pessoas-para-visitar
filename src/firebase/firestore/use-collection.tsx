'use client';
import { useEffect, useState, useMemo } from 'react';
import type {
  FirestoreError,
  Query,
  DocumentData,
} from 'firebase/firestore';
import { onSnapshot } from 'firebase/firestore';

import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function useCollection<T extends DocumentData>(query: Query<T> | null) {
  const [data, setData] = useState<T[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | undefined>(undefined);

  const serializedQuery = useMemo(() => query?.toString(), [query]);

  useEffect(() => {
    if (!query) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        const newData = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as T)
        );
        setData(newData);
        setLoading(false);
        setError(undefined);
      },
      (err) => {
        console.error("onSnapshot error:", err);
        const permissionError = new FirestorePermissionError({
          path: 'path' in query ? query.path : 'unknown',
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [serializedQuery]);

  return { data, loading, error };
}
