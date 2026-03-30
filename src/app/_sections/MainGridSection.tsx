import Link from "next/link";
import { translations, Language } from "@/lib/translations";
import { getCategories, getTrendingBooks, getLeaderboardData, getRecentActivities, getBookmarkedIds } from "@/lib/queries";
import { BookGrid } from "@/components/BookCard";
import { EmptyState } from "@/components/EmptyState";
import { ActivityFeed } from "@/components/ActivityFeed";
import { LeaderboardWidget } from "@/components/LeaderboardWidget";

interface Props {
  lang: string;
  userId?: string;
}

export default async function MainGridSection({ lang, userId }: Props) {
  const t = (key: keyof typeof translations.en) => translations[lang as Language][key] || key;

  const [categories, trendingBooksRaw, leaderboardData, activities] = await Promise.all([
    getCategories(),
    getTrendingBooks(),
    getLeaderboardData(),
    getRecentActivities(),
  ]);

  const bookmarkedIds = userId ? await getBookmarkedIds(userId) : [];
  const trendingBooks = trendingBooksRaw.map(book => ({
    ...book,
    userBookmarked: bookmarkedIds.includes(book.id)
  }));

  const leaderboardUsers = leaderboardData.map(u => ({
    ...u,
    level: Math.floor(u.xp / 100) + 1,
    badges: u.badges ? u.badges.split(',') : []
  }));

  return (
    <>
      {/* Left Column */}
      <div className="lg:col-span-9 flex flex-col gap-16">
        {/* Categories */}
        <section id="tour-categories">
          <div className="flex flex-col mb-10 text-center">
            <h2 className="text-text-main text-3xl font-black tracking-tight">{t("home_top_categories")}</h2>
            <div className="w-16 h-1 bg-primary mx-auto mt-3 rounded-full"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {categories.slice(0, 8).map((cat: any) => {
              let icon = "category";
              if (cat.slug.includes("tech") || cat.slug.includes("komputer")) { icon = "terminal"; }
              else if (cat.slug.includes("akademi") || cat.slug.includes("pendidikan")) { icon = "architecture"; }
              else if (cat.slug.includes("fiksi") || cat.slug.includes("sastra")) { icon = "auto_stories"; }
              else if (cat.slug.includes("bisnis") || cat.slug.includes("motivasi")) { icon = "analytics"; }

              return (
                <Link key={cat.id} href={`/kategori/${cat.slug}`} className="relative h-28 flex items-center justify-center rounded-[32px] overflow-hidden group bg-surface border border-black/5 dark:border-white/5 transition-all duration-500 hover:border-primary/40 hover:shadow-2xl active:scale-[0.98]">
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-3xl text-primary opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500">{icon}</span>
                    <span className="font-black text-text-main text-[10px] uppercase tracking-[0.2em]">{cat.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Trending */}
        <section id="tour-trending">
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-[18px] bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-xl">trending_up</span>
              </div>
              <div className="flex flex-col">
                <h2 className="text-text-main text-3xl font-black tracking-tight uppercase leading-none">{t("home_trending").split(' ')[0]} <span className="text-primary italic">{t("home_trending").split(' ')[1]}</span></h2>
                <p className="text-text-muted text-sm font-medium mt-1.5 uppercase tracking-widest leading-none opacity-60">{t("home_live_updates")}</p>
              </div>
            </div>
            <Link href="/jelajahi/trending" className="group flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.2em] bg-surface px-5 py-2.5 rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-all">
              {t("home_view_all")} <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </Link>
          </div>
          {trendingBooks.length > 0 ? <BookGrid books={trendingBooks} /> : <EmptyState lang={lang} />}
        </section>
      </div>

      {/* Right Column - Sidebar */}
      <div className="lg:col-span-3">
        <section className="sticky top-24 flex flex-col gap-12">
          {/* Leaderboard */}
          <div id="tour-leaderboard">
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="size-11 rounded-2xl bg-bg-dark flex items-center justify-center text-amber-500 border border-black/5 shadow-sm">
                <span className="material-symbols-outlined text-[20px] fill-icon">social_leaderboard</span>
              </div>
              <div>
                <h2 className="text-text-main text-xl font-black tracking-tight uppercase leading-none">{t("leaderboard_title")}</h2>
                <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mt-1.5 opacity-60">{t("home_elite_readers")}</p>
              </div>
            </div>
            <LeaderboardWidget users={leaderboardUsers} />
            <Link href="/leaderboard" className="mt-6 flex items-center justify-center gap-2 py-4 rounded-2xl bg-surface border border-black/5 text-text-muted hover:text-primary transition-all text-[10px] font-black uppercase tracking-widest shadow-sm">
              {t("home_view_all")} <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          {/* Activity Feed */}
          <div id="tour-activity">
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="size-11 rounded-2xl bg-bg-dark flex items-center justify-center text-primary border border-black/5 shadow-sm">
                <span className="material-symbols-outlined text-[20px] fill-icon">notifications_active</span>
              </div>
              <div className="flex flex-col">
                <h2 className="text-text-main text-xl font-black tracking-tight uppercase leading-none">{t("home_active_notifications")}</h2>
                <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mt-1.5 opacity-60">{t("home_live_updates")}</p>
              </div>
            </div>
            <ActivityFeed activities={activities} />
            <Link href="/aktivitas" className="mt-6 flex items-center justify-center gap-2 py-4 rounded-2xl bg-surface border border-black/5 text-text-muted hover:text-primary transition-all text-[10px] font-black uppercase tracking-widest shadow-sm">
              {t("home_view_all")} <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
