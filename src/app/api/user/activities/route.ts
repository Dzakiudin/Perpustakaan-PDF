import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const activities = await prisma.activity.findMany({
        where: { userId: payload.userId },
        orderBy: { createdAt: "desc" },
        take: 30, // Limit to recent 30 activities
        include: {
            book: {
                select: { id: true, title: true }
            }
        }
    });

    return NextResponse.json({ activities });
}
