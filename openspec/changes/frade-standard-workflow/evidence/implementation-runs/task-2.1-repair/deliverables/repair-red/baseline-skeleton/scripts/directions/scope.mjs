const missing = () => ({ ok: false, issues: [{ code: 'NOT_IMPLEMENTED', path: '$', detail: 'Behaviorless controlled baseline' }] });
export const checkScope = missing;
export const planClosure = async () => ({ ...missing(), operations: [], originMap: [] });
export const executeClosure = async () => missing();
export const isClosureReceipt = () => false;
