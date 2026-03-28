import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const user = await prisma.user.findUnique({
        where: { id },
        include: {
            books: {
                orderBy: { createdAt: "desc" },
                include: { category: true }
            },
            readHistory: true,
            _count: {
                select: { forumThreads: true, forumReplies: true, comments: true }
            }
        }
    });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
}
