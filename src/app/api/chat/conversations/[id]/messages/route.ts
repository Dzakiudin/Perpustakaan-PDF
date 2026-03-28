import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

/**
 * GET /api/chat/conversations/[id]/messages?cursor=xxx
 * Fetches paginated messages for a conversation.
 */
export async function GET(
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

    const cursor = req.nextUrl.searchParams.get("cursor");
    const take = 50;

    // Build where clause — filter out messages before user's clearedAt
    const whereClause: any = { conversationId };
    if (participant.clearedAt) {
        whereClause.createdAt = { gt: participant.clearedAt };
    }

    const messages = await prisma.message.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
            sender: {
                select: { id: true, name: true, avatar: true },
            },
            reactions: {
                select: { id: true, emoji: true, userId: true },
            },
            replyTo: {
                select: { id: true, content: true, sender: { select: { id: true, name: true } } },
            },
        },
    });

    return NextResponse.json({
        messages: messages.reverse(),
        nextCursor: messages.length === take ? messages[0]?.id : null,
    });
}

/**
 * POST /api/chat/conversations/[id]/messages
 * Sends a new message.
 * Body: { content: string }
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: conversationId } = await params;
    const { content, replyToId } = await req.json();

    if (!content || !content.trim()) {
        return NextResponse.json({ error: "Content is required" }, { status: 400 });
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

    // Create message and update conversation timestamp
    const [message] = await prisma.$transaction([
        prisma.message.create({
            data: {
                content: content.trim(),
                senderId: payload.userId,
                conversationId,
                ...(replyToId ? { replyToId } : {}),
            },
            include: {
                sender: {
                    select: { id: true, name: true, avatar: true },
                },
            },
        }),
        prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        }),
        // Mark as read for sender
        prisma.conversationParticipant.update({
            where: {
                userId_conversationId: {
                    userId: payload.userId,
                    conversationId,
                },
            },
            data: { lastReadAt: new Date() },
        }),
    ]);

    // Send notification to other participants (non-blocking)
    const otherParticipants = await prisma.conversationParticipant.findMany({
        where: { conversationId, userId: { not: payload.userId } },
        select: { userId: true },
    });

    const senderName = message.sender.name || "Someone";
    const preview = content.trim().length > 40 ? content.trim().substring(0, 40) + "…" : content.trim();

    await Promise.all(
        otherParticipants.map(p =>
            prisma.notification.create({
                data: {
                    userId: p.userId,
                    type: "info",
                    message: `💬 ${senderName}: "${preview}"`,
                    link: "/social",
                },
            }).catch(() => { }) // Don't fail the request if notification fails
        )
    );

    return NextResponse.json({ message });
}
