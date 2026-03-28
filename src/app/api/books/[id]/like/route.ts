import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: bookId } = await params;
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await prisma.like.findUnique({
        where: { userId_bookId: { userId: payload.userId, bookId } },
    });

    if (existing) {
        // Unlike
        await prisma.like.delete({ where: { id: existing.id } });
        await prisma.book.update({ where: { id: bookId }, data: { likeCount: { decrement: 1 } } });
        return NextResponse.json({ liked: false });
    } else {
        // Like
        await prisma.like.create({ data: { userId: payload.userId, bookId } });
        await prisma.book.update({ where: { id: bookId }, data: { likeCount: { increment: 1 } } });
        return NextResponse.json({ liked: true });
    }
}
