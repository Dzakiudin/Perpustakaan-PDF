import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
        return NextResponse.json({ users: [] });
    }

    const payload = await getUserFromRequest(req);

    const users = await prisma.user.findMany({
        where: {
            OR: [
                { name: { contains: q } },
                { email: { contains: q } },
            ],
            ...(payload ? { id: { not: payload.userId } } : {}),
        },
        select: {
            id: true,
            name: true,
            avatar: true,
            bio: true,
            xp: true,
            _count: { select: { followers: true, books: true } },
        },
        take: 20,
        orderBy: { xp: "desc" },
    });

    // If logged in, check which users the current user already follows
    let followedIds: string[] = [];
    if (payload) {
        const follows = await prisma.follow.findMany({
            where: { followerId: payload.userId, followingId: { in: users.map(u => u.id) } },
            select: { followingId: true },
        });
        followedIds = follows.map(f => f.followingId);
    }

    return NextResponse.json({
        users: users.map(u => ({
            id: u.id,
            name: u.name,
            avatar: u.avatar,
            bio: u.bio,
            xp: u.xp,
            level: Math.floor(u.xp / 100) + 1,
            followers: u._count.followers,
            books: u._count.books,
            isFollowed: followedIds.includes(u.id),
        })),
    });
}
