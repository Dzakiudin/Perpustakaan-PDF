import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

/**
 * POST /api/chat/conversations/[id]/messages/[messageId]/react
 * Toggle an emoji reaction on a message.
 * Body: { emoji: string }  — e.g. "❤️", "👍", "😂", "😮", "😢"
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; messageId: string }> }
) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: conversationId, messageId } = await params;
    const { emoji } = await req.json();

    const ALLOWED_EMOJIS = ["❤️", "👍", "😂", "😮", "😢"];
    if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
        return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
    }

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

    // Toggle: if reaction exists, delete it; otherwise create it
    const existing = await prisma.messageReaction.findUnique({
        where: {
            userId_messageId_emoji: {
                userId: payload.userId,
                messageId,
                emoji,
            },
        },
    });

    if (existing) {
        await prisma.messageReaction.delete({ where: { id: existing.id } });
        return NextResponse.json({ action: "removed", emoji });
    }

    await prisma.messageReaction.create({
        data: {
            emoji,
            userId: payload.userId,
            messageId,
        },
    });

    return NextResponse.json({ action: "added", emoji });
}
