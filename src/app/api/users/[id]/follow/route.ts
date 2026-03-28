import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: followingId } = await params;
    if (payload.userId === followingId) {
        return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
    }

    try {
        const payloadUser = await prisma.user.findUnique({ where: { id: payload.userId }, select: { name: true } });

        const follow = await prisma.follow.create({
            data: {
                followerId: payload.userId,
                followingId,
            }
        });

        // Add activity
        await prisma.activity.create({
            data: {
                userId: payload.userId,
                type: "FOLLOW_USER",
                content: JSON.stringify({ followingId }),
            }
        });

        // Add Notification
        await prisma.notification.create({
            data: {
                userId: followingId,
                type: "info",
                message: `${payloadUser?.name || "Seseorang"} mulai mengikuti Anda.`,
                link: `/profil/${payload.userId}`,
            }
        });

        return NextResponse.json({ success: true, follow });
    } catch (err: any) {
        // Handle unique constraint violation
        if (err.code === 'P2002') {
            return NextResponse.json({ success: true, message: "Already following" });
        }
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: followingId } = await params;

    try {
        await prisma.follow.deleteMany({
            where: {
                followerId: payload.userId,
                followingId,
            }
        });
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
