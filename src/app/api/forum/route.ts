import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const topic = req.nextUrl.searchParams.get("topic");
    const query = req.nextUrl.searchParams.get("q");
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = 20;

    const where: any = {};
    if (topic) where.topicTag = topic;
    if (query) {
        where.title = {
            contains: query,
            mode: 'insensitive'
        };
    }

    const [threads, total] = await Promise.all([
        prisma.forumThread.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                user: { select: { id: true, name: true, avatar: true } },
                _count: { select: { replies: true } },
            },
        }),
        prisma.forumThread.count({ where }),
    ]);

    return NextResponse.json({ threads, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { title, content, topicTag } = await req.json();
    if (!title?.trim() || !content?.trim()) {
        return NextResponse.json({ error: "Judul dan konten wajib diisi" }, { status: 400 });
    }

    const thread = await prisma.forumThread.create({
        data: {
            title: title.trim(),
            content: content.trim(),
            topicTag: topicTag || "umum",
            userId: payload.userId,
        },
        include: {
            user: { select: { id: true, name: true, avatar: true } },
        },
    });

    // Add activity log
    await prisma.activity.create({
        data: {
            userId: payload.userId,
            type: "CREATE_THREAD",
            content: thread.title, // Store thread title for easy display
        }
    });

    return NextResponse.json({ thread }, { status: 201 });
}
