// Barrel export — re-exports from per-language files
// This keeps backward compatibility while enabling future tree-shaking
import { en } from "./en";
import { id } from "./id";

export type Language = "en" | "id";

export const translations = { en, id };

export type TranslationKey = keyof typeof en;
