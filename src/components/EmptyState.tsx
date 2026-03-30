import Link from "next/link";
import { translations, Language } from "@/lib/translations";

export function EmptyState({ lang = "id" }: { lang?: string }) {
  const t = (key: keyof typeof translations.en) => translations[lang as Language][key] || key;
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 rounded-2xl bg-surface border border-dashed border-border text-center">
      <span className="material-symbols-outlined text-5xl text-text-muted mb-4">library_books</span>
      <h3 className="text-lg font-bold text-text-main mb-2">{t("home_empty_state_title")}</h3>
      <p className="text-sm text-text-muted mb-6">{t("home_empty_state_desc")}</p>
      <Link href="/upload" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm transition-colors">
        <span className="material-symbols-outlined text-lg">upload_file</span>
        {t("home_empty_state_button")}
      </Link>
    </div>
  );
}
