import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sessions = await prisma.session.findMany({
        where: { userId: payload.userId },
        orderBy: { lastUsed: "desc" },
        select: {
            id: true,
            device: true,
            browser: true,
            os: true,
            ip: true,
            lastUsed: true,
            createdAt: true,
            token: true, // Needed to identify "Current Session"
        }
    });

    // Get current token from request to mark it
    let currentToken = "";
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
        currentToken = authHeader.substring(7);
    } else {
        currentToken = req.cookies.get("token")?.value || "";
    }

    const sessionsWithCurrent = sessions.map(s => ({
        ...s,
        isCurrent: s.token === currentToken,
        token: undefined, // Don't expose tokens to the client
    }));

    return NextResponse.json({ sessions: sessionsWithCurrent });
}

export async function DELETE(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { sessionId, revokeAll } = await req.json();

        if (revokeAll) {
            // Get current token to NOT revoke itself (optional, but usually users want to keep current)
            let currentToken = "";
            const authHeader = req.headers.get("authorization");
            if (authHeader?.startsWith("Bearer ")) {
                currentToken = authHeader.substring(7);
            } else {
                currentToken = req.cookies.get("token")?.value || "";
            }

            await prisma.session.deleteMany({
                where: {
                    userId: payload.userId,
                    NOT: { token: currentToken }
                }
            });
            return NextResponse.json({ message: "All other sessions revoked" });
        }

        if (sessionId) {
            const session = await prisma.session.findUnique({ where: { id: sessionId } });
            if (!session || session.userId !== payload.userId) {
                return NextResponse.json({ error: "Session not found" }, { status: 404 });
            }

            await prisma.session.delete({ where: { id: sessionId } });
            return NextResponse.json({ message: "Session revoked successfully" });
        }

        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
