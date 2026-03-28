import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get("q")?.trim() || "";
    const sort = req.nextUrl.searchParams.get("sort") || "newest";
    const categoryId = req.nextUrl.searchParams.get("categoryId") || "";
    const minRating = parseFloat(req.nextUrl.searchParams.get("minRating") || "0");
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    let orderBy: any = { createdAt: "desc" };
    if (sort === "popular") orderBy = [{ viewCount: "desc" }, { likeCount: "desc" }];
    if (sort === "likes") orderBy = { likeCount: "desc" };
    if (sort === "trending") orderBy = [{ viewCount: "desc" }, { reviewCount: "desc" }, { likeCount: "desc" }];
    if (sort === "top_rated") orderBy = [{ avgRating: "desc" }, { reviewCount: "desc" }];

    const where: any = {
        AND: [
            categoryId ? { categoryId } : {},
            minRating > 0 ? { avgRating: { gte: minRating } } : {},
            q ? {
                OR: [
                    { title: { contains: q } },
                    { author: { contains: q } },
                    { tags: { contains: q } },
                ]
            } : {}
        ]
    };

    const [results, total] = await Promise.all([
        prisma.book.findMany({
            where,
            select: {
                id: true,
                title: true,
                author: true,
                thumbnailPath: true,
                color: true,
                pageCount: true,
                viewCount: true,
                likeCount: true,
                avgRating: true,
                reviewCount: true,
                category: { select: { name: true } }
            },
            orderBy,
            skip,
            take: limit,
        }),
        prisma.book.count({ where })
    ]);

    // Check if current user saved these books
    const payload = await getUserFromRequest(req);
    let bookmarkedIds: string[] = [];
    if (payload) {
        const bookmarks = await prisma.bookmark.findMany({
            where: { userId: payload.userId, bookId: { in: results.map(b => b.id) } },
            select: { bookId: true }
        });
        bookmarkedIds = bookmarks.map(b => b.bookId);
    }

    const resultsWithStatus = results.map(book => ({
        ...book,
        userBookmarked: bookmarkedIds.includes(book.id)
    }));

    return NextResponse.json({
        results: resultsWithStatus,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    });
}
