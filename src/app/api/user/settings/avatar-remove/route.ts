import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
    try {
        const session = await getUserFromRequest(req);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { avatar: true }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Delete file if it exists and is local
        if (user.avatar && user.avatar.startsWith("/uploads/avatars/")) {
            const filePath = path.join(process.cwd(), "public", user.avatar);
            try {
                await fs.unlink(filePath);
            } catch (err) {
                console.error("Failed to delete avatar file:", err);
            }
        }

        await prisma.user.update({
            where: { id: session.userId },
            data: { avatar: null }
        });

        return NextResponse.json({ message: "Foto profil dihapus" });
    } catch (error) {
        console.error("Avatar Remove Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
