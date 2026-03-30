import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

const bookInclude = { category: { select: { name: true } } } as const;

// Per-request deduplication for user bookmarks
export const getBookmarkedIds = cache(async (userId: string): Promise<string[]> => {
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    select: { bookId: true },
  });
  return bookmarks.map(b => b.bookId);
});

// Cross-request cached queries (shared data)
export const getTrendingBooks = unstable_cache(
  async () => prisma.book.findMany({
    orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }, { reviewCount: "desc" }],
    take: 6,
    include: bookInclude,
  }),
  ["trending-books"],
  { revalidate: 60 }
);

export const getPopularBooks = unstable_cache(
  async () => prisma.book.findMany({
    orderBy: [{ viewCount: "desc" }],
    take: 6,
    include: bookInclude,
  }),
  ["popular-books"],
  { revalidate: 60 }
);

export const getTopRatedBooks = unstable_cache(
  async () => prisma.book.findMany({
    where: { reviewCount: { gt: 0 } },
    orderBy: [{ avgRating: "desc" }, { reviewCount: "desc" }],
    take: 6,
    include: bookInclude,
  }),
  ["top-rated-books"],
  { revalidate: 60 }
);

export const getRecentBooks = unstable_cache(
  async () => prisma.book.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    include: bookInclude,
  }),
  ["recent-books"],
  { revalidate: 60 }
);

export const getMostLikedBooks = unstable_cache(
  async () => prisma.book.findMany({
    orderBy: [{ likeCount: "desc" }],
    take: 6,
    include: bookInclude,
  }),
  ["most-liked-books"],
  { revalidate: 60 }
);

export const getCategories = unstable_cache(
  async () => prisma.category.findMany({ orderBy: { name: "asc" } }),
  ["categories"],
  { revalidate: 300 }
);

export const getLeaderboardData = unstable_cache(
  async () => prisma.user.findMany({
    orderBy: { xp: "desc" },
    take: 3,
    select: { id: true, name: true, avatar: true, xp: true, badges: true }
  }),
  ["leaderboard"],
  { revalidate: 120 }
);

export const getRecentActivities = unstable_cache(
  async () => prisma.activity.findMany({
    where: { type: { in: ["UPLOAD_BOOK", "REVIEW_BOOK", "FORUM_POST"] } },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      book: { select: { id: true, title: true, color: true } }
    }
  }),
  ["recent-activities"],
  { revalidate: 60 }
);
