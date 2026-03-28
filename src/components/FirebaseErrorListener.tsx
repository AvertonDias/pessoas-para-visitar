"use client"

import { useEffect } from "react"
import { errorEmitter } from "@/firebase/error-emitter"
import { useToast } from "@/hooks/use-toast"
import { FirestorePermissionError } from "@/firebase/errors"

// This is a client component that will listen for Firebase errors
// and display them in a toast.
// This is useful for debugging security rules.
// It is only active in development.
export default function FirebaseErrorListener() {
  const { toast } = useToast()

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return

    const handlePermissionError = (error: FirestorePermissionError) => {
      console.error("Firestore Permission Error:", error.debug())
      toast({
        variant: "destructive",
        title: "Erro de Permissão do Firestore",
        description: (
          <pre className="mt-2 w-full rounded-md bg-slate-950 p-4">
            <code className="text-white">{JSON.stringify(error.debug(), null, 2)}</code>
          </pre>
        ),
        duration: 30000,
      })
    }

    errorEmitter.on("permission-error", handlePermissionError)

    return () => {
      errorEmitter.off("permission-error", handlePermissionError)
    }
  }, [toast])

  return null
}
