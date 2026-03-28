import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const payload = await getUserFromRequest(req);

    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const reply = await prisma.forumReply.findUnique({ where: { id } });
    if (!reply) return NextResponse.json({ error: "Reply tidak ditemukan" }, { status: 404 });

    // Check permissions: owner or admin
    if (reply.userId !== payload.userId && payload.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden: Not your reply" }, { status: 403 });
    }

    try {
        await prisma.forumReply.delete({ where: { id } });
        return NextResponse.json({ success: true, message: "Reply deleted" });
    } catch (error) {
        console.error("Delete reply error:", error);
        return NextResponse.json({ error: "Gagal menghapus balasan" }, { status: 500 });
    }
}
