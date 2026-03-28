import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

// In-memory typing status (lightweight, no DB needed)
const typingMap = new Map<string, { userId: string; timestamp: number }>();

/**
 * POST /api/chat/conversations/[id]/typing
 * Signal that the user is typing. Expires after 3 seconds.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: conversationId } = await params;
    const key = `${conversationId}:${payload.userId}`;
    typingMap.set(key, { userId: payload.userId, timestamp: Date.now() });

    // Cleanup old entries
    for (const [k, v] of typingMap) {
        if (Date.now() - v.timestamp > 5000) typingMap.delete(k);
    }

    return NextResponse.json({ ok: true });
}

/**
 * GET /api/chat/conversations/[id]/typing
 * Check who is typing in this conversation.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: conversationId } = await params;
    const now = Date.now();
    const typingUsers: string[] = [];

    for (const [k, v] of typingMap) {
        if (k.startsWith(`${conversationId}:`) && v.userId !== payload.userId && now - v.timestamp < 3000) {
            typingUsers.push(v.userId);
        }
    }

    return NextResponse.json({ typing: typingUsers.length > 0 });
}
