export const createArtifactReader = () => ({ read: async () => ({}) });
export const createEvidenceBoundary = () => ({ verify: async () => false });
export const isEvidenceBoundary = () => false;
export const verifyArtifactHash = async () => false;
export const verifyGate = async () => false;
