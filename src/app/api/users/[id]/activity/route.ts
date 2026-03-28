import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

        const startDate = new Date(year, 0, 1); // Jan 1
        const endDate = new Date(year + 1, 0, 1); // Jan 1 next year

        const activities = await prisma.activity.findMany({
            where: {
                userId: id,
                createdAt: { gte: startDate, lt: endDate },
                type: { in: ["READ_BOOK", "UPLOAD_BOOK", "REVIEW_BOOK"] }
            },
            select: { createdAt: true },
        });

        // Build daily count map
        const dailyCounts: Record<string, number> = {};
        let totalSessions = 0;
        for (const a of activities) {
            const key = a.createdAt.toISOString().split("T")[0];
            dailyCounts[key] = (dailyCounts[key] || 0) + 1;
            totalSessions++;
        }

        return NextResponse.json({ dailyCounts, totalSessions, year });
    } catch (error) {
        console.error("Failed to fetch user activity", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
