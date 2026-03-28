import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

/**
 * POST /api/users/online — Heartbeat: update lastActiveAt for current user
 */
export async function POST(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.user.update({
        where: { id: payload.userId },
        data: { lastActiveAt: new Date() },
    });

    return NextResponse.json({ ok: true });
}

/**
 * GET /api/users/online?ids=id1,id2,id3
 * Returns online status for given user IDs (active within 5 min)
 */
export async function GET(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const idsParam = req.nextUrl.searchParams.get("ids");
    if (!idsParam) return NextResponse.json({ statuses: {} });

    const ids = idsParam.split(",").filter(Boolean).slice(0, 50);
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

    const users = await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, lastActiveAt: true },
    });

    const statuses: Record<string, boolean> = {};
    users.forEach(u => {
        statuses[u.id] = !!(u.lastActiveAt && u.lastActiveAt > fiveMinAgo);
    });

    return NextResponse.json({ statuses });
}
