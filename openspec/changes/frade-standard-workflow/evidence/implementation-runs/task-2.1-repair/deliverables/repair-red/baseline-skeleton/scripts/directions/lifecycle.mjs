const missing = () => ({ ok: false, issues: [{ code: 'NOT_IMPLEMENTED', path: '$', detail: 'Behaviorless controlled baseline' }] });
export const evaluateTransition = async () => missing();
export const legacyClosureState = () => 'IN_PROGRESS';
