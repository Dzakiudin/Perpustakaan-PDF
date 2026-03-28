import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const bookmarks = await prisma.bookmark.findMany({
        where: { userId: payload.userId },
        include: { book: { include: { category: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ bookmarks });
}

export async function POST(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { bookId } = await req.json();

    const existing = await prisma.bookmark.findUnique({
        where: { userId_bookId: { userId: payload.userId, bookId } },
    });

    if (existing) {
        await prisma.bookmark.delete({ where: { id: existing.id } });
        return NextResponse.json({ bookmarked: false });
    } else {
        await prisma.bookmark.create({ data: { userId: payload.userId, bookId } });
        return NextResponse.json({ bookmarked: true });
    }
}
