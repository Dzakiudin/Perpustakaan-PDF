import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    try {
        const session = await getUserFromRequest(req);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { twoFactorEnabled: true, backupCodes: true }
        });

        if (!user || !user.twoFactorEnabled) {
            return NextResponse.json({ error: "2FA belum diaktifkan" }, { status: 400 });
        }

        // Generate new backup codes
        const codes = Array.from({ length: 8 }, () =>
            crypto.randomBytes(4).toString("hex").toUpperCase()
        );

        // Save to database
        await (prisma.user as any).update({
            where: { id: session.userId },
            data: {
                backupCodes: JSON.stringify(codes)
            }
        });

        // Log activity
        await prisma.activity.create({
            data: {
                userId: session.userId,
                type: "MANAGE_2FA",
                content: "Memperbarui kode cadangan 2FA",
            }
        });

        return NextResponse.json({ codes });
    } catch (error) {
        console.error("2FA Backup Codes Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
