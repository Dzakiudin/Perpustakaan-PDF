import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

/**
 * DELETE /api/chat/conversations/[id]/clear
 * "Clears" the conversation for the current user only.
 * Sets clearedAt = now, so the messages GET API will only return
 * messages created AFTER this timestamp. The other user still sees everything.
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: conversationId } = await params;

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

    // Soft-clear: set clearedAt so messages before this timestamp are hidden for this user
    await prisma.conversationParticipant.update({
        where: {
            userId_conversationId: {
                userId: payload.userId,
                conversationId,
            },
        },
        data: { clearedAt: new Date() },
    });

    return NextResponse.json({ success: true });
}
