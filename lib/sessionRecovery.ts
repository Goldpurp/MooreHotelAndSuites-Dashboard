export async function recoverStaffSession<T extends {role: string}>(
  readProfile: () => Promise<T | null>,
  credentials: {getToken: () => string | null; removeToken: () => void},
): Promise<{kind:'ready'; user:T} | {kind:'retry'; message:string} | {kind:'signedOut' | 'stale'}> {
  const token = credentials.getToken();
  if (!token) return {kind:'signedOut'};
  try {
    const user = await readProfile();
    if (credentials.getToken() !== token) return {kind:'stale'};
    if (!user) throw new Error('The staff profile could not be loaded.');
    if (user.role.toLowerCase() === 'client') { credentials.removeToken(); return {kind:'signedOut'}; }
    return {kind:'ready', user};
  } catch (error) {
    const currentToken = credentials.getToken();
    if (!currentToken) return {kind:'signedOut'};
    if (currentToken !== token) return {kind:'stale'};
    return {kind:'retry',message:error instanceof Error ? error.message : 'The hotel service could not be reached.'};
  }
}
