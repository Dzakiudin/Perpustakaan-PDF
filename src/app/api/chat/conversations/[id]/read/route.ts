import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

/**
 * POST /api/chat/conversations/[id]/read
 * Marks a conversation as read by updating lastReadAt.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: conversationId } = await params;

    await prisma.conversationParticipant.update({
        where: {
            userId_conversationId: {
                userId: payload.userId,
                conversationId,
            },
        },
        data: { lastReadAt: new Date() },
    });

    return NextResponse.json({ success: true });
}
