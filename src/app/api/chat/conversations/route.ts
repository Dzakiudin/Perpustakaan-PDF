import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

/**
 * GET /api/chat/conversations
 * Lists all conversations for the authenticated user with last message & unread count.
 */
export async function GET(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const participations = await prisma.conversationParticipant.findMany({
        where: { userId: payload.userId },
        include: {
            conversation: {
                include: {
                    participants: {
                        include: {
                            user: { select: { id: true, name: true, avatar: true } },
                        },
                    },
                    messages: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                    },
                },
            },
        },
        orderBy: { conversation: { updatedAt: "desc" } },
    });

    const conversations = participations
        .map((p) => {
            const otherParticipant = p.conversation.participants.find(
                (pp) => pp.userId !== payload.userId
            );
            const rawLastMessage = p.conversation.messages[0] || null;

            // If user cleared the chat, only show messages after clearedAt
            const clearedAt = (p as any).clearedAt as Date | null;
            const lastMessage =
                rawLastMessage && clearedAt && rawLastMessage.createdAt <= clearedAt
                    ? null
                    : rawLastMessage;

            return {
                id: p.conversation.id,
                friend: otherParticipant?.user || null,
                lastMessage: lastMessage
                    ? {
                        content: lastMessage.content,
                        senderId: lastMessage.senderId,
                        createdAt: lastMessage.createdAt,
                    }
                    : null,
                lastReadAt: p.lastReadAt,
                updatedAt: p.conversation.updatedAt,
                clearedAt,
            };
        })
        // Hide conversations that have been cleared and have no new messages
        .filter((c) => {
            if (!c.clearedAt) return true;
            return c.lastMessage !== null;
        });

    // Fetch unread counts in bulk
    const convosWithUnread = await Promise.all(
        conversations.map(async (c) => {
            const whereClause: any = {
                conversationId: c.id,
                createdAt: { gt: c.lastReadAt },
                senderId: { not: payload.userId },
            };
            // If cleared, only count unread after clearedAt
            if (c.clearedAt && c.clearedAt > c.lastReadAt) {
                whereClause.createdAt = { gt: c.clearedAt };
            }
            const unread = await prisma.message.count({ where: whereClause });
            return { ...c, unread };
        })
    );

    return NextResponse.json({ conversations: convosWithUnread });
}

/**
 * POST /api/chat/conversations
 * Create or find existing 1-on-1 conversation with another user.
 * Body: { friendId: string }
 */
export async function POST(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { friendId } = await req.json();
    if (!friendId) return NextResponse.json({ error: "friendId is required" }, { status: 400 });

    if (friendId === payload.userId) {
        return NextResponse.json({ error: "Cannot chat with yourself" }, { status: 400 });
    }

    // Check if a conversation already exists between these two users
    const existingParticipation = await prisma.conversationParticipant.findFirst({
        where: { userId: payload.userId },
        include: {
            conversation: {
                include: {
                    participants: true,
                },
            },
        },
    });

    // Check all conversations for a 1-on-1 with this friend
    const allParticipations = await prisma.conversationParticipant.findMany({
        where: { userId: payload.userId },
        include: {
            conversation: {
                include: { participants: true },
            },
        },
    });

    const existingConvo = allParticipations.find((p) =>
        p.conversation.participants.length === 2 &&
        p.conversation.participants.some((pp) => pp.userId === friendId)
    );

    if (existingConvo) {
        // Reset clearedAt so the conversation reappears if it was cleared
        if ((existingConvo as any).clearedAt) {
            await prisma.conversationParticipant.update({
                where: {
                    userId_conversationId: {
                        userId: payload.userId,
                        conversationId: existingConvo.conversationId,
                    },
                },
                data: { clearedAt: null },
            });
        }
        return NextResponse.json({ conversationId: existingConvo.conversationId });
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
        data: {
            participants: {
                create: [
                    { userId: payload.userId },
                    { userId: friendId },
                ],
            },
        },
    });

    return NextResponse.json({ conversationId: conversation.id });
}
