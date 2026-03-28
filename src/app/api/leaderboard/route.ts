import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        const [topUsers, total] = await Promise.all([
            prisma.user.findMany({
                orderBy: { xp: "desc" },
                skip,
                take: Math.min(limit, 100), // Max 100 for safety per page
                select: {
                    id: true,
                    name: true,
                    avatar: true,
                    xp: true,
                    badges: true,
                }
            }),
            prisma.user.count()
        ]);

        const totalPages = Math.ceil(total / limit);

        // Add calculated levels based on XP
        const leaderboard = topUsers.map((user: any) => ({
            ...user,
            level: Math.floor(user.xp / 100) + 1,
            badges: user.badges ? user.badges.split(',') : []
        }));

        return NextResponse.json({ leaderboard, total, totalPages, currentPage: page });
    } catch (error) {
        console.error("Failed to fetch leaderboard", error);
        return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }
}
