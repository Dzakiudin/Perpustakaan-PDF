import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ section: string }> }) {
    const { section } = await params;
    const payload = await getUserFromRequest(req);

    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = 18;
    const search = req.nextUrl.searchParams.get("q") || "";

    const where: any = {};
    if (search.trim()) {
        where.OR = [
            { title: { contains: search.trim() } },
            { author: { contains: search.trim() } },
        ];
    }

    let orderBy: any;

    switch (section) {
        case "trending":
            orderBy = [{ viewCount: "desc" }, { likeCount: "desc" }, { reviewCount: "desc" }];
            break;
        case "popular":
            orderBy = [{ viewCount: "desc" }, { likeCount: "desc" }];
            break;
        case "topRated":
            where.reviewCount = { gt: 0 };
            orderBy = [{ avgRating: "desc" }, { reviewCount: "desc" }];
            break;
        case "newest":
            orderBy = { createdAt: "desc" };
            break;
        case "mostLiked":
            orderBy = { likeCount: "desc" };
            break;
        case "recommended": {
            if (!payload) {
                return NextResponse.json({ books: [], total: 0, page: 1, totalPages: 0 });
            }

            const readHistory = await prisma.readHistory.findMany({
                where: { userId: payload.userId },
                include: { book: { select: { categoryId: true, id: true } } },
            });

            const genreCount: Record<string, number> = {};
            for (const h of readHistory) {
                if (h.book.categoryId) {
                    genreCount[h.book.categoryId] = (genreCount[h.book.categoryId] || 0) + 1;
                }
            }

            const topGenres = Object.entries(genreCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([id]) => id);

            if (topGenres.length === 0) {
                return NextResponse.json({ books: [], total: 0, page: 1, totalPages: 0 });
            }

            const readBookIds = readHistory.map(h => h.bookId);
            where.categoryId = { in: topGenres };
            if (readBookIds.length > 0) {
                where.id = { notIn: readBookIds };
            }
            orderBy = [{ avgRating: "desc" }, { viewCount: "desc" }];
            break;
        }
        default:
            return NextResponse.json({ error: "Section tidak valid" }, { status: 400 });
    }

    const [books, total] = await Promise.all([
        prisma.book.findMany({
            where,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
            include: {
                uploader: { select: { name: true } },
                category: { select: { name: true, slug: true } },
            },
        }),
        prisma.book.count({ where }),
    ]);

    return NextResponse.json({
        books,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    });
}
