/** Campo para pesquisa por prefixo no Firestore (orderBy + startAt/endAt). */
export function buildDisplaySearch(fullName: string | undefined, email: string | undefined): string {
  const n = (fullName || '').trim().toLowerCase();
  if (n.length > 0) return n.slice(0, 120);
  const e = (email || '').trim().toLowerCase();
  const at = e.indexOf('@');
  const local = at > 0 ? e.slice(0, at) : e;
  return (local || 'utilizador').slice(0, 120);
}
