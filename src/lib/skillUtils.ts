// Path: src/lib/skillUtils.ts
// Plain utility — NOT a server action file, so it's safe to export sync
// functions from here and import them into "use server" action files.

export const normalizeSkillString = (skillName: string | undefined | null): string => {
  if (!skillName) return "";
  return skillName.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, "");
};