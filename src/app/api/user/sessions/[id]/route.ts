import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const payload = await getUserFromRequest(req);
        if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id: sessionId } = await params;

        const session = await prisma.session.findUnique({
            where: { id: sessionId }
        });

        if (!session || session.userId !== payload.userId) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        // Check if user is trying to delete their current session
        const currentToken = req.cookies.get("token")?.value || req.headers.get("authorization")?.replace("Bearer ", "");
        if (session.token === currentToken) {
            return NextResponse.json({ error: "Tidak bisa menghapus sesi yang sedang digunakan" }, { status: 400 });
        }

        await prisma.session.delete({
            where: { id: sessionId }
        });

        return NextResponse.json({ message: "Session revoked successfully" });
    } catch (error) {
        console.error("Session Revoke Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
