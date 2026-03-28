import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

/**
 * GET /api/users/following
 * Returns a list of users that the authenticated user is following (their "friends").
 */
export async function GET(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const follows = await prisma.follow.findMany({
        where: { followerId: payload.userId },
        include: {
            following: {
                select: {
                    id: true,
                    name: true,
                    avatar: true,
                    bio: true,
                    xp: true,
                    _count: { select: { followers: true, books: true } },
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    const users = follows.map(f => ({
        id: f.following.id,
        name: f.following.name,
        avatar: f.following.avatar,
        bio: f.following.bio,
        xp: f.following.xp,
        level: Math.floor(f.following.xp / 100) + 1,
        followers: f.following._count.followers,
        books: f.following._count.books,
        isFollowed: true,
    }));

    return NextResponse.json({ users });
}
