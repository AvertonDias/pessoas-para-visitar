export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  private context: SecurityRuleContext;
  
  constructor(context: SecurityRuleContext) {
    const message = `Firestore Permission Denied: Cannot ${context.operation} at ${context.path}`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;
  }

  public debug() {
    return {
      message: this.message,
      context: this.context
    }
  }
}
