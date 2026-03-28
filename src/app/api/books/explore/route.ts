import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const payload = await getUserFromRequest(req);

    const [trending, popular, topRated, newest, mostLiked] = await Promise.all([
        // Trending: high views + recent activity
        prisma.book.findMany({
            orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }, { reviewCount: "desc" }],
            take: 12,
            include: {
                uploader: { select: { name: true } },
                category: { select: { name: true, slug: true } },
            },
        }),
        // Popular: most read
        prisma.book.findMany({
            orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }],
            take: 12,
            include: {
                uploader: { select: { name: true } },
                category: { select: { name: true, slug: true } },
            },
        }),
        // Top rated
        prisma.book.findMany({
            where: { reviewCount: { gt: 0 } },
            orderBy: [{ avgRating: "desc" }, { reviewCount: "desc" }],
            take: 12,
            include: {
                uploader: { select: { name: true } },
                category: { select: { name: true, slug: true } },
            },
        }),
        // Newest
        prisma.book.findMany({
            orderBy: { createdAt: "desc" },
            take: 12,
            include: {
                uploader: { select: { name: true } },
                category: { select: { name: true, slug: true } },
            },
        }),
        // Most liked
        prisma.book.findMany({
            orderBy: { likeCount: "desc" },
            take: 12,
            include: {
                uploader: { select: { name: true } },
                category: { select: { name: true, slug: true } },
            },
        }),
    ]);

    // Genre-based recommendations for logged-in users
    let recommended: any[] = [];
    if (payload) {
        try {
            // Find user's most-read genres from read history
            const readHistory = await prisma.readHistory.findMany({
                where: { userId: payload.userId },
                include: { book: { select: { categoryId: true } } },
            });

            const genreCount: Record<string, number> = {};
            for (const h of readHistory) {
                if (h.book.categoryId) {
                    genreCount[h.book.categoryId] = (genreCount[h.book.categoryId] || 0) + 1;
                }
            }

            // Sort genres by frequency and grab the top 3
            const topGenres = Object.entries(genreCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([id]) => id);

            if (topGenres.length > 0) {
                // Get the IDs of books the user has already read
                const readBookIds = readHistory.map(h => h.bookId);

                recommended = await prisma.book.findMany({
                    where: {
                        categoryId: { in: topGenres },
                        id: { notIn: readBookIds },
                    },
                    orderBy: [{ avgRating: "desc" }, { viewCount: "desc" }],
                    take: 12,
                    include: {
                        uploader: { select: { name: true } },
                        category: { select: { name: true, slug: true } },
                    },
                });
            }
        } catch {
            // Silently fail recommendations
        }
    }

    return NextResponse.json({
        trending,
        popular,
        topRated,
        newest,
        mostLiked,
        recommended,
    });
}
