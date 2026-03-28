import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

/**
 * POST /api/chat/cleanup
 * Auto-cleanup: deletes messages and notifications older than 30 days.
 * Can be called via cron or manually by admin.
 */
export async function POST(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Delete old messages
    const deletedMessages = await prisma.message.deleteMany({
        where: { createdAt: { lt: thirtyDaysAgo } },
    });

    // Delete old notifications
    const deletedNotifications = await prisma.notification.deleteMany({
        where: { createdAt: { lt: thirtyDaysAgo } },
    });

    // Clean up empty conversations (no messages left)
    const emptyConversations = await prisma.conversation.findMany({
        where: { messages: { none: {} } },
        select: { id: true },
    });

    if (emptyConversations.length > 0) {
        const ids = emptyConversations.map(c => c.id);
        await prisma.conversationParticipant.deleteMany({
            where: { conversationId: { in: ids } },
        });
        await prisma.conversation.deleteMany({
            where: { id: { in: ids } },
        });
    }

    return NextResponse.json({
        success: true,
        deleted: {
            messages: deletedMessages.count,
            notifications: deletedNotifications.count,
            emptyConversations: emptyConversations.length,
        },
    });
}
