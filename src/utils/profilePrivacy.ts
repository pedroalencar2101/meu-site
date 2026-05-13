export type ProfilePrivacy = {
  showEmail?: boolean;
  showPhone?: boolean;
  showCity?: boolean;
  showWebsite?: boolean;
  showEducation?: boolean;
};

/** `undefined` ou `true` = visível no perfil público; `false` = oculto. */
export function privacyOn(
  source: { privacy?: ProfilePrivacy | null } | null | undefined,
  key: keyof ProfilePrivacy
): boolean {
  const v = source?.privacy?.[key];
  return v !== false;
}
