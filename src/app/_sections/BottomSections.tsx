import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { translations, Language } from "@/lib/translations";
import { getPopularBooks, getTopRatedBooks, getRecentBooks, getMostLikedBooks, getBookmarkedIds } from "@/lib/queries";
import { BookGrid } from "@/components/BookCard";
import { EmptyState } from "@/components/EmptyState";

interface Props {
  lang: string;
  userId?: string;
}

export default async function BottomSections({ lang, userId }: Props) {
  const t = (key: keyof typeof translations.en) => translations[lang as Language][key] || key;

  // All cached queries run in parallel
  const [popularBooksRaw, topRatedBooksRaw, recentBooksRaw, mostLikedBooksRaw] = await Promise.all([
    getPopularBooks(),
    getTopRatedBooks(),
    getRecentBooks(),
    getMostLikedBooks(),
  ]);

  const bookmarkedIds = userId ? await getBookmarkedIds(userId) : [];
  const injectStatus = (books: any[]) => books.map(book => ({
    ...book,
    userBookmarked: bookmarkedIds.includes(book.id)
  }));

  const popularBooks = injectStatus(popularBooksRaw);
  const topRatedBooks = injectStatus(topRatedBooksRaw);
  const recentBooks = injectStatus(recentBooksRaw);
  const mostLikedBooks = injectStatus(mostLikedBooksRaw);

  // Recommended books (user-specific, not cached)
  let recommendedBooks: any[] = [];
  if (userId) {
    const readHistory = await prisma.readHistory.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { book: { select: { categoryId: true } } }
    });
    const genreCount: Record<string, number> = {};
    for (const h of readHistory) {
      if (h.book?.categoryId) genreCount[h.book.categoryId] = (genreCount[h.book.categoryId] || 0) + 1;
    }
    const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id);
    const readBookIds = readHistory.map(h => h.bookId);

    if (topGenres.length > 0) {
      const recBooks = await prisma.book.findMany({
        where: { categoryId: { in: topGenres }, id: { notIn: readBookIds } },
        orderBy: [{ avgRating: "desc" }, { viewCount: "desc" }],
        take: 6,
        include: { category: { select: { name: true } } },
      });
      recommendedBooks = injectStatus(recBooks);
    }
  }

  const sections = [
    {
      books: popularBooks,
      titleKey: "home_most_read" as const,
      descKey: "home_most_read_desc" as const,
      icon: "visibility",
      gradient: "from-blue-500 to-indigo-500",
      href: "/jelajahi/popular",
    },
    {
      books: topRatedBooks,
      titleKey: "home_top_rated" as const,
      descKey: "home_top_rated_desc" as const,
      icon: "star",
      gradient: "from-amber-400 to-orange-500",
      href: "/jelajahi/topRated",
    },
    {
      books: recentBooks,
      titleKey: "home_recently_uploaded" as const,
      descKey: "home_recently_uploaded_desc" as const,
      icon: "schedule",
      gradient: "from-emerald-500 to-teal-500",
      href: "/jelajahi/newest",
    },
    {
      books: mostLikedBooks,
      titleKey: "home_most_liked" as const,
      descKey: "home_most_liked_desc" as const,
      icon: "favorite",
      gradient: "from-rose-500 to-pink-500",
      href: "/jelajahi/mostLiked",
    },
  ];

  return (
    <div className="flex flex-col gap-16 md:gap-24 pb-20 md:pb-20">
      {sections.map((section) => (
        <section key={section.href}>
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-4">
              <div className={`size-11 rounded-2xl bg-gradient-to-br ${section.gradient} flex items-center justify-center text-white shadow-lg`}>
                <span className="material-symbols-outlined text-lg">{section.icon}</span>
              </div>
              <div className="flex flex-col">
                <h2 className="text-text-main text-2xl md:text-3xl font-black tracking-tight">{t(section.titleKey)}</h2>
                <p className="text-text-muted text-sm font-medium mt-0.5 opacity-60">{t(section.descKey)}</p>
              </div>
            </div>
            <Link href={section.href} className="group flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest">
              {t("home_view_all")} <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </Link>
          </div>
          {section.books.length > 0 ? <BookGrid books={section.books} /> : <EmptyState lang={lang} />}
        </section>
      ))}

      {/* Recommended - Only for logged in users */}
      {userId && recommendedBooks.length > 0 && (
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
          <BookGrid books={recommendedBooks} />
        </section>
      )}
    </div>
  );
}
