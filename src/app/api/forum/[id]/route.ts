import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const thread = await prisma.forumThread.findUnique({
        where: { id },
        include: {
            user: { select: { id: true, name: true, avatar: true } },
            replies: {
                include: {
                    user: { select: { id: true, name: true, avatar: true } },
                },
                orderBy: { createdAt: "asc" },
            },
        },
    });

    if (!thread) return NextResponse.json({ error: "Thread tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ thread });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: threadId } = await params;
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { content, parentId } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: "Reply tidak boleh kosong" }, { status: 400 });

    const reply = await prisma.forumReply.create({
        data: {
            content: content.trim(),
            userId: payload.userId,
            threadId,
            parentId: parentId || null,
        },
        include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    // Update thread updatedAt & get owner info
    const thread = await prisma.forumThread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
        include: { user: { select: { id: true, name: true, email: true } } }
    });

    // Send email notification to thread owner asynchronously
    if (thread.user.id !== payload.userId && thread.user.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #137fec;">Halo ${thread.user.name},</h2>
                <p>Ada balasan baru di diskusi Anda: "<strong>${thread.title}</strong>".</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #137fec; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; font-style: italic;">"${reply.content}"</p>
                    <p style="margin: 10px 0 0 0; font-size: 12px; color: #777;">Oleh: ${reply.user.name}</p>
                </div>
                <p>Klik tombol di bawah ini untuk melihat balasan selengkapnya:</p>
                <a href="${appUrl}/forum/${threadId}" style="display: inline-block; padding: 12px 24px; background-color: #137fec; color: white; text-decoration: none; font-weight: bold; border-radius: 8px; margin-top: 10px;">Lihat Diskusi</a>
                <p style="margin-top: 30px; font-size: 12px; color: #999;">Email ini dikirim secara otomatis. Mohon tidak membalas email ini.</p>
            </div>
        `;

        sendEmail(
            thread.user.email,
            `Balasan Baru di Diskusi: ${thread.title}`,
            emailHtml
        ).catch(console.error);
    }

    // Add activity log
    await prisma.activity.create({
        data: {
            userId: payload.userId,
            type: "CREATE_REPLY",
            content: thread.title, // Store thread title so activity feed knows which thread was replied to
        }
    });

    return NextResponse.json({ reply }, { status: 201 });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const payload = await getUserFromRequest(req);

    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const thread = await prisma.forumThread.findUnique({ where: { id } });
    if (!thread) return NextResponse.json({ error: "Thread tidak ditemukan" }, { status: 404 });

    // Cek permissions (pembuat thread atau admin)
    if (thread.userId !== payload.userId && payload.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden: Not your thread" }, { status: 403 });
    }

    const { title, content } = await req.json();
    if (!title?.trim() || !content?.trim()) {
        return NextResponse.json({ error: "Judul dan konten tidak boleh kosong" }, { status: 400 });
    }

    const updatedThread = await prisma.forumThread.update({
        where: { id },
        data: {
            title: title.trim(),
            content: content.trim(),
            updatedAt: new Date(),
        }
    });

    return NextResponse.json({ thread: updatedThread });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const payload = await getUserFromRequest(req);

    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const thread = await prisma.forumThread.findUnique({ where: { id } });
    if (!thread) return NextResponse.json({ error: "Thread tidak ditemukan" }, { status: 404 });

    // Cek permissions (pembuat thread atau admin)
    if (thread.userId !== payload.userId && payload.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden: Not your thread" }, { status: 403 });
    }

    await prisma.forumThread.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Thread deleted" });
}
