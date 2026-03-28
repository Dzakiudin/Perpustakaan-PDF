import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "50");
        const page = parseInt(searchParams.get("page") || "1");
        const feed = searchParams.get("feed") || "global";
        const skip = (page - 1) * limit;

        let whereClause: any = {
            type: { in: ["UPLOAD_BOOK", "REVIEW_BOOK", "FORUM_POST", "CREATE_THREAD", "CREATE_REPLY", "COMMENT_BOOK"] }
        };

        if (feed === "following") {
            const user = await getUserFromRequest(request);
            if (!user) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            const following = await prisma.follow.findMany({
                where: { followerId: user.userId },
                select: { followingId: true }
            });
            const followingIds = following.map(f => f.followingId);

            if (followingIds.length === 0) {
                return NextResponse.json({ activities: [], total: 0, totalPages: 0, currentPage: page });
            }

            whereClause = {
                userId: { in: followingIds },
                type: { in: ["UPLOAD_BOOK", "REVIEW_BOOK", "FORUM_POST", "FOLLOW_USER", "LIKE_BOOK", "CREATE_THREAD", "CREATE_REPLY", "COMMENT_BOOK"] }
            };
        }

        const [activities, total] = await Promise.all([
            prisma.activity.findMany({
                where: whereClause,
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: skip,
                include: {
                    user: { select: { id: true, name: true, avatar: true } },
                    book: { select: { id: true, title: true, color: true } }
                }
            }),
            prisma.activity.count({
                where: whereClause
            })
        ]);

        return NextResponse.json({
            activities,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        console.error("Failed to fetch activities", error);
        return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
    }
}
