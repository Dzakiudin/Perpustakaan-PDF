import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

/**
 * DELETE /api/chat/conversations/[id]/messages/[messageId]
 * Deletes a single message (only if the sender is the current user).
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; messageId: string }> }
) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: conversationId, messageId } = await params;

    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
        where: {
            userId_conversationId: {
                userId: payload.userId,
                conversationId,
            },
        },
    });

    if (!participant) {
        return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    // Find the message and verify ownership
    const message = await prisma.message.findUnique({
        where: { id: messageId },
    });

    if (!message) {
        return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.senderId !== payload.userId) {
        return NextResponse.json({ error: "Can only delete your own messages" }, { status: 403 });
    }

    await prisma.message.delete({ where: { id: messageId } });

    return NextResponse.json({ success: true });
}
