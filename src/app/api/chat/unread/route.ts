import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

/**
 * GET /api/chat/unread
 * Returns total unread message count across all conversations.
 */
export async function GET(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const participations = await prisma.conversationParticipant.findMany({
        where: { userId: payload.userId },
        select: { conversationId: true, lastReadAt: true },
    });

    let totalUnread = 0;
    for (const p of participations) {
        const count = await prisma.message.count({
            where: {
                conversationId: p.conversationId,
                createdAt: { gt: p.lastReadAt },
                senderId: { not: payload.userId },
            },
        });
        totalUnread += count;
    }

    return NextResponse.json({ unread: totalUnread });
}
