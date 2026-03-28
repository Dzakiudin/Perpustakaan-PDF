import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const [threads, replies, users, books] = await Promise.all([
        prisma.forumThread.count(),
        prisma.forumReply.count(),
        prisma.user.count(),
        prisma.book.count(),
    ]);

    return NextResponse.json({ threads, replies, users, books });
}
