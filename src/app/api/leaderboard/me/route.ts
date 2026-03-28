import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const payload = await getUserFromRequest(req);
        if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { xp: true },
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Count how many users have MORE XP than current user → rank = count + 1
        const usersAbove = await prisma.user.count({
            where: { xp: { gt: user.xp } },
        });

        const rank = usersAbove + 1;
        const level = Math.floor(user.xp / 100) + 1;

        return NextResponse.json({ rank, xp: user.xp, level });
    } catch (error) {
        console.error("Failed to fetch user rank", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
