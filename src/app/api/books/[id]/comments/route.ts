import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: bookId } = await params;

    const comments = await prisma.comment.findMany({
        where: { bookId },
        include: { user: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
    });

    return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: bookId } = await params;
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { content } = await req.json();
    if (!content?.trim()) {
        return NextResponse.json({ error: "Komentar tidak boleh kosong" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
        data: { content: content.trim(), userId: payload.userId, bookId },
        include: { user: { select: { id: true, name: true, avatar: true } }, book: { select: { title: true } } },
    });

    // Add activity log
    await prisma.activity.create({
        data: {
            userId: payload.userId,
            type: "COMMENT_BOOK",
            bookId: bookId,
            content: comment.content.length > 100 ? comment.content.substring(0, 97) + "..." : comment.content,
        }
    });

    return NextResponse.json({ comment }, { status: 201 });
}
