import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { translations, Language } from "@/lib/translations";
import RecentBooksList from "./RecentBooksList";
import { BookGrid } from "@/components/BookCard";
import { ActivityFeed } from "@/components/ActivityFeed";
import { LeaderboardWidget } from "@/components/LeaderboardWidget";

export default async function HomePage() {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("language")?.value || "id") as Language;
  const t = (key: keyof typeof translations.en) => translations[lang][key] || key;

  const token = cookieStore.get("token")?.value;
  const user = token ? await verifyToken(token) : null;

  // Fetch 12 trending books once → slice into trending (first 6) and popular (next 6, or same if < 12)
  const [allTrendingBooks, popularBooksRaw, topRatedBooks, recentBooks, categories, readHistory, activities, leaderboardData] = await Promise.all([
    prisma.book.findMany({
      orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }, { reviewCount: "desc" }],
      take: 6,
      include: { category: { select: { name: true } } },
    }),
    prisma.book.findMany({
      orderBy: [{ viewCount: "desc" }],
      take: 6,
      include: { category: { select: { name: true } } },
    }),
    prisma.book.findMany({
      where: { reviewCount: { gt: 0 } },
      orderBy: [{ avgRating: "desc" }, { reviewCount: "desc" }],
      take: 6,
      include: { category: { select: { name: true } } },
    }),
    prisma.book.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { category: { select: { name: true } } },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    user ? prisma.readHistory.findMany({
      where: { userId: user.userId },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { book: { include: { category: { select: { name: true } } } } }
    }) : Promise.resolve([]),
    prisma.activity.findMany({
      where: {
        type: { in: ["UPLOAD_BOOK", "REVIEW_BOOK", "FORUM_POST"] }
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        book: { select: { id: true, title: true, color: true } }
      }
    }),
    prisma.user.findMany({
      orderBy: { xp: "desc" },
      take: 3,
      select: { id: true, name: true, avatar: true, xp: true, badges: true }
    })
  ]);

  // Genre-based recommendations + bookmarks — run in parallel
  let recommendedBooks: typeof allTrendingBooks = [];
  let bookmarkedIds: string[] = [];

  if (user) {
    // Compute top genres from read history
    const genreCount: Record<string, number> = {};
    for (const h of readHistory as Array<{ book?: { categoryId?: string }; bookId: string }>) {
      if (h.book?.categoryId) genreCount[h.book.categoryId] = (genreCount[h.book.categoryId] || 0) + 1;
    }
    const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id);
    const readBookIds = (readHistory as Array<{ bookId: string }>).map(h => h.bookId);

    // Run both queries in parallel instead of sequentially
    const [recBooks, bookmarks] = await Promise.all([
      topGenres.length > 0
        ? prisma.book.findMany({
          where: { categoryId: { in: topGenres }, id: { notIn: readBookIds } },
          orderBy: [{ avgRating: "desc" }, { viewCount: "desc" }],
          take: 6,
          include: { category: { select: { name: true } } },
        })
        : Promise.resolve([]),
      prisma.bookmark.findMany({
        where: { userId: user.userId },
        select: { bookId: true },
      }),
    ]);

    recommendedBooks = recBooks;
    bookmarkedIds = bookmarks.map(b => b.bookId);
  }

  const injectStatus = (books: typeof allTrendingBooks) => books.map(book => ({
    ...book,
    userBookmarked: bookmarkedIds.includes(book.id)
  }));

  // Derive sections from single query
  const trendingBooks = injectStatus(allTrendingBooks.slice(0, 6));
  const popularBooks = injectStatus(popularBooksRaw);
  const mostLikedBooks = injectStatus([...allTrendingBooks, ...popularBooksRaw]
    .filter((b, i, arr) => arr.findIndex(x => x.id === b.id) === i)
    .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0)).slice(0, 6));

  const leaderboardUsers = leaderboardData.map(u => ({
    ...u,
    level: Math.floor(u.xp / 100) + 1,
    badges: u.badges ? u.badges.split(',') : []
  }));

  return (
    <main className="flex flex-col min-h-screen bg-transparent relative w-full pt-0 md:pt-24 z-10 transition-all duration-300">

      {/* Decorative Top Banner/Quote Style Header */}
      <section className="relative px-6 py-12 md:px-12 md:py-16 mb-16 rounded-none md:rounded-[32px] overflow-hidden bg-surface border-y md:border border-border shadow-sm group">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-[0.03] bg-[url('/textures/topographic.png')] pointer-events-none transition-opacity duration-700 group-hover:opacity-[0.08]"></div>

        <div className="relative z-10 flex flex-col items-start max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-[11px] uppercase tracking-widest mb-6 border border-primary/20">
            {t("home_quote_today")}
          </div>

          <h1 className="text-text-main text-3xl md:text-5xl lg:text-5xl font-medium tracking-tight leading-[1.3] mb-8 font-serif">
            "I have always imagined that <span className="text-primary italic">Paradise</span> will be a kind of library."
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

      {/* Main Content Wrapper - Ensure inner elements have proper padding on mobile */}
      <div className="flex flex-col w-full relative z-10 px-4 md:px-0">

        {/* Continue Reading - Improved */}
        {user && readHistory.length > 0 && (
          <section id="tour-continue-reading" className="mb-20 animate-fade-up [animation-delay:400ms]">
            <div className="flex items-center justify-between mb-8 px-2">
              <div className="flex flex-col">
                <h2 className="text-text-main text-3xl font-black tracking-tight">{t("home_continue_reading")}</h2>
                <p className="text-text-muted text-sm font-medium mt-1">{t("home_pick_up")}</p>
              </div>
              <Link href="/history" className="group flex items-center gap-2 text-primary font-bold text-sm">
                History <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {readHistory.map((item: any) => (
                <Link key={item.id} href={`/pdf/${item.book.id}/baca`} className="flex gap-4 p-5 rounded-[32px] bg-surface border border-black/5 dark:border-white/5 hover:border-primary/30 transition-all group overflow-hidden relative shadow-sm hover:shadow-xl">
                  <div className="relative size-20 rounded-2xl overflow-hidden shadow-md border border-black/5 bg-bg-dark shrink-0">
                    {item.book.thumbnailPath ? (
                      <Image src={item.book.thumbnailPath} alt={item.book.title} fill sizes="80px" className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                    ) : (
                      <div className={`w-full h-full bg-bg-dark border border-black/5 flex items-center justify-center p-2 text-primary font-black text-[6px] uppercase text-center`}>{item.book.title}</div>
                    )}
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-black/5 dark:bg-white/10 overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(8, (item.lastPage / (item.book.pageCount || 100)) * 100))}%` }}></div>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center min-w-0">
                    <h3 className="text-text-main text-[14px] font-black leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors uppercase">{item.book.title}</h3>
                    <p className="text-text-muted text-[9px] font-black uppercase tracking-widest opacity-60">Sequence {item.lastPage}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16 md:mb-24">
          {/* Main Content Side: Focus on Navigation and Trending */}
          <div className="lg:col-span-9 flex flex-col gap-16">

            {/* Explore Categories - Pro Max */}
            <section id="tour-categories">
              <div className="flex flex-col mb-10 text-center">
                <h2 className="text-text-main text-3xl font-black tracking-tight">{t("home_top_categories")}</h2>
                <div className="w-16 h-1 bg-primary mx-auto mt-3 rounded-full"></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
                {categories.slice(0, 8).map((cat: any) => {
                  let icon = "category";
                  let color = "text-primary bg-bg-dark";
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

          {/* Sidebar - Activity Feed & Leaderboard */}
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
        </div>

        {/* Following Sections: Full Width Expansion */}
        <div className="flex flex-col gap-16 md:gap-24 pb-20 md:pb-20">
          {/* Popular Books */}
          <section>
            <div className="flex items-center justify-between mb-8 px-2">
              <div className="flex items-center gap-4">
                <div className="size-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-lg">
                  <span className="material-symbols-outlined text-lg">visibility</span>
                </div>
                <div className="flex flex-col">
                  <h2 className="text-text-main text-2xl md:text-3xl font-black tracking-tight">{t("home_most_read")}</h2>
                  <p className="text-text-muted text-sm font-medium mt-0.5 opacity-60">{t("home_most_read_desc")}</p>
                </div>
              </div>
              <Link href="/jelajahi/popular" className="group flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest">
                {t("home_view_all")} <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
            </div>
            {popularBooks.length > 0 ? <BookGrid books={popularBooks} /> : <EmptyState lang={lang} />}
          </section>

          {/* Top Rated */}
          <section>
            <div className="flex items-center justify-between mb-8 px-2">
              <div className="flex items-center gap-4">
                <div className="size-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg">
                  <span className="material-symbols-outlined text-lg">star</span>
                </div>
                <div className="flex flex-col">
                  <h2 className="text-text-main text-2xl md:text-3xl font-black tracking-tight">{t("home_top_rated")}</h2>
                  <p className="text-text-muted text-sm font-medium mt-0.5 opacity-60">{t("home_top_rated_desc")}</p>
                </div>
              </div>
              <Link href="/jelajahi/topRated" className="group flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest">
                {t("home_view_all")} <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
            </div>
            {topRatedBooks.length > 0 ? <BookGrid books={injectStatus(topRatedBooks)} /> : <EmptyState lang={lang} />}
          </section>

          {/* Newest */}
          <section>
            <div className="flex items-center justify-between mb-8 px-2">
              <div className="flex items-center gap-4">
                <div className="size-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg">
                  <span className="material-symbols-outlined text-lg">schedule</span>
                </div>
                <div className="flex flex-col">
                  <h2 className="text-text-main text-2xl md:text-3xl font-black tracking-tight">{t("home_recently_uploaded")}</h2>
                  <p className="text-text-muted text-sm font-medium mt-0.5 opacity-60">{t("home_recently_uploaded_desc")}</p>
                </div>
              </div>
              <Link href="/jelajahi/newest" className="group flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest">
                {t("home_view_all")} <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
            </div>
            {recentBooks.length > 0 ? <BookGrid books={injectStatus(recentBooks)} /> : <EmptyState lang={lang} />}
          </section>

          {/* Most Liked */}
          <section>
            <div className="flex items-center justify-between mb-8 px-2">
              <div className="flex items-center gap-4">
                <div className="size-11 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-lg">
                  <span className="material-symbols-outlined text-lg">favorite</span>
                </div>
                <div className="flex flex-col">
                  <h2 className="text-text-main text-2xl md:text-3xl font-black tracking-tight">{t("home_most_liked")}</h2>
                  <p className="text-text-muted text-sm font-medium mt-0.5 opacity-60">{t("home_most_liked_desc")}</p>
                </div>
              </div>
              <Link href="/jelajahi/mostLiked" className="group flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest">
                {t("home_view_all")} <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
            </div>
            {mostLikedBooks.length > 0 ? <BookGrid books={mostLikedBooks} /> : <EmptyState lang={lang} />}
          </section>

          {/* Recommended - Only for logged in users */}
          {user && recommendedBooks.length > 0 && (
            <section className="pb-10">
              <div className="flex items-center justify-between mb-8 px-2">
                <div className="flex items-center gap-4">
                  <div className="size-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white shadow-lg">
                    <span className="material-symbols-outlined text-lg">recommend</span>
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-text-main text-2xl md:text-3xl font-black tracking-tight">{t("home_recommended_for_you")}</h2>
                    <p className="text-text-muted text-sm font-medium mt-0.5 opacity-60">{t("home_recommended_for_you_desc")}</p>
                  </div>
                </div>
                <Link href="/jelajahi/recommended" className="group flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest">
                  {t("home_view_all")} <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Link>
              </div>
              <BookGrid books={injectStatus(recommendedBooks)} />
            </section>
          )}
        </div>

      </div>
    </main >
  );
}

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
