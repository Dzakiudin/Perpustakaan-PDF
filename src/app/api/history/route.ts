import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

const PER_PAGE = 20;

export async function GET(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));

    const [history, total] = await Promise.all([
        prisma.readHistory.findMany({
            where: { userId: payload.userId },
            orderBy: { updatedAt: "desc" },
            include: {
                book: {
                    select: { id: true, title: true, author: true, thumbnailPath: true, color: true, pageCount: true }
                }
            },
            skip: (page - 1) * PER_PAGE,
            take: PER_PAGE,
        }),
        prisma.readHistory.count({ where: { userId: payload.userId } }),
    ]);

    return NextResponse.json({ history, totalPages: Math.ceil(total / PER_PAGE), total });
}

export async function POST(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { bookId, lastPage } = body;

    if (!bookId || typeof lastPage !== 'number') {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const previousHistory = await prisma.readHistory.findUnique({
        where: { userId_bookId: { userId: payload.userId, bookId } }
    });

    const isPagesForward = !previousHistory || lastPage > previousHistory.lastPage;

    const history = await prisma.readHistory.upsert({
        where: { userId_bookId: { userId: payload.userId, bookId } },
        update: { lastPage },
        create: { userId: payload.userId, bookId, lastPage },
    });

    // Gamification XP (+1 XP for reading a new furthest page)
    if (isPagesForward) {
        await prisma.user.update({
            where: { id: payload.userId },
            data: { xp: { increment: 1 } }
        });

        // Log reading activity for the heatmap
        await prisma.activity.create({
            data: {
                userId: payload.userId,
                type: "READ_BOOK",
                bookId,
                content: JSON.stringify({ page: lastPage })
            }
        });
    }

    return NextResponse.json({ history });
}
