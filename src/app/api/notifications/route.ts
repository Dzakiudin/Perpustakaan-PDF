import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

/**
 * GET /api/notifications — Get user's notifications (latest 50)
 */
export async function GET(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const notifications = await prisma.notification.findMany({
        where: { userId: payload.userId },
        orderBy: { createdAt: "desc" },
        take: 50,
    });

    const unreadCount = await prisma.notification.count({
        where: { userId: payload.userId, read: false },
    });

    return NextResponse.json({ notifications, unreadCount });
}

/**
 * POST /api/notifications/read — Mark notifications as read
 * Body: { ids?: string[] } — if no ids, mark all as read
 */
export async function POST(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { ids } = await req.json().catch(() => ({ ids: undefined }));

    if (ids && Array.isArray(ids)) {
        await prisma.notification.updateMany({
            where: { id: { in: ids }, userId: payload.userId },
            data: { read: true },
        });
    } else {
        await prisma.notification.updateMany({
            where: { userId: payload.userId, read: false },
            data: { read: true },
        });
    }

    return NextResponse.json({ success: true });
}
