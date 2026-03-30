import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { translations, Language } from "@/lib/translations";
import ContinueReadingSection from "./_sections/ContinueReadingSection";
import MainGridSection from "./_sections/MainGridSection";
import BottomSections from "./_sections/BottomSections";
import { ContinueReadingSkeleton, MainGridSkeleton, BottomSectionsSkeleton } from "./_sections/Skeletons";

export default async function HomePage() {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("language")?.value || "id") as Language;
  const t = (key: keyof typeof translations.en) => translations[lang][key] || key;

  const token = cookieStore.get("token")?.value;
  const user = token ? await verifyToken(token) : null;

  return (
    <main className="flex flex-col min-h-screen bg-transparent relative w-full pt-0 md:pt-24 z-10 transition-all duration-300">

      {/* Hero Section - Static, renders instantly (no data fetching) */}
      <section className="relative px-6 py-12 md:px-12 md:py-16 mb-16 rounded-none md:rounded-[32px] overflow-hidden bg-surface border-y md:border border-border shadow-sm group">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-[0.03] bg-[url('/textures/topographic.png')] pointer-events-none transition-opacity duration-700 group-hover:opacity-[0.08]"></div>

        <div className="relative z-10 flex flex-col items-start max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-[11px] uppercase tracking-widest mb-6 border border-primary/20">
            {t("home_quote_today")}
          </div>

          <h1 className="text-text-main text-3xl md:text-5xl lg:text-5xl font-medium tracking-tight leading-[1.3] mb-8 font-serif">
            &quot;I have always imagined that <span className="text-primary italic">Paradise</span> will be a kind of library.&quot;
          </h1>

          <div className="flex items-center gap-4 text-text-muted font-medium text-sm mb-10">
            <div className="w-8 h-px bg-text-muted/30"></div>
            Jorge Luis Borges
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link href="/search" className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-[0_15px_30px_-5px_rgba(255,90,95,0.3)] hover:shadow-[0_20px_40px_-5px_rgba(255,90,95,0.5)] hover:-translate-y-1 active:scale-95 transition-all">
              <span className="material-symbols-outlined text-xl">explore</span>
              {t("home_explore_library")}
            </Link>
            <Link href="/upload" className="flex items-center gap-3 px-8 py-4 bg-surface-hover text-text-main border border-border rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-surface hover:-translate-y-1 active:scale-95 transition-all">
              <span className="material-symbols-outlined text-xl">upload_file</span>
              {t("home_share_pdf")}
            </Link>
          </div>
        </div>
      </section>

      {/* Streamed Content */}
      <div className="flex flex-col w-full relative z-10 px-4 md:px-0">

        {/* Continue Reading - Streams independently */}
        {user && (
          <Suspense fallback={<ContinueReadingSkeleton />}>
            <ContinueReadingSection userId={user.userId} lang={lang} />
          </Suspense>
        )}

        {/* Main Grid: Categories + Trending + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16 md:mb-24">
          <Suspense fallback={<MainGridSkeleton />}>
            <MainGridSection lang={lang} userId={user?.userId} />
          </Suspense>
        </div>

        {/* Bottom Book Sections - Streams independently */}
        <Suspense fallback={<BottomSectionsSkeleton />}>
          <BottomSections lang={lang} userId={user?.userId} />
        </Suspense>

      </div>
    </main>
  );
}
