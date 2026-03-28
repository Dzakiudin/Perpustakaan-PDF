import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import path from "path";
import { writeFile, mkdir, unlink } from "fs/promises";

export async function POST(req: NextRequest) {
    try {
        const session = await getUserFromRequest(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
        }

        // Validate file type
        if (!file.type.startsWith("image/")) {
            return NextResponse.json({ error: "Hanya file gambar yang diterima" }, { status: 400 });
        }

        // Validate file size (2MB limit)
        if (file.size > 2 * 1024 * 1024) {
            return NextResponse.json({ error: "Ukuran file terlalu besar (maks 2MB)" }, { status: 400 });
        }

        const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
        await mkdir(uploadDir, { recursive: true });

        const uniqueName = `${session.userId}-${Date.now()}${path.extname(file.name)}`;
        const fullPath = path.join(uploadDir, uniqueName);
        const avatarUrl = `/uploads/avatars/${uniqueName}`;

        const bytes = await file.arrayBuffer();
        await writeFile(fullPath, Buffer.from(bytes));

        // Delete old avatar if exists
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { avatar: true }
        });

        if (user?.avatar && user.avatar.startsWith("/uploads/avatars/")) {
            const oldPath = path.join(process.cwd(), "public", user.avatar);
            try {
                await unlink(oldPath);
            } catch (err) {
                console.error("Failed to delete old avatar:", err);
            }
        }

        // Update database
        await prisma.user.update({
            where: { id: session.userId },
            data: { avatar: avatarUrl }
        });

        // Log activity
        await prisma.activity.create({
            data: {
                userId: session.userId,
                type: "UPDATE_PROFILE",
                content: "Memperbarui foto profil",
            }
        });

        return NextResponse.json({ avatarUrl });
    } catch (error: any) {
        console.error("Avatar Upload Error:", error);
        return NextResponse.json({
            error: "Internal Server Error"
        }, { status: 500 });
    }
}
