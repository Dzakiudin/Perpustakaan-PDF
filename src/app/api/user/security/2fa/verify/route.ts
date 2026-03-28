import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { verify } from "otplib/functional";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    try {
        const session = await getUserFromRequest(req);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { code } = await req.json();

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { twoFactorSecret: true }
        });

        if (!user || !user.twoFactorSecret) {
            return NextResponse.json({ error: "2FA belum di-setup" }, { status: 400 });
        }

        // Verify the code
        const { valid: isValid } = await verify({
            token: code,
            secret: user.twoFactorSecret
        });

        if (!isValid) {
            return NextResponse.json({ error: "Kode verifikasi salah" }, { status: 400 });
        }

        // Generate initial backup codes
        const backupCodes = Array.from({ length: 8 }, () =>
            crypto.randomBytes(4).toString("hex").toUpperCase()
        );

        // Enable 2FA and save backup codes
        await (prisma.user as any).update({
            where: { id: session.userId },
            data: {
                twoFactorEnabled: true,
                backupCodes: JSON.stringify(backupCodes)
            }
        });

        // Log activity
        await prisma.activity.create({
            data: {
                userId: session.userId,
                type: "SETUP_2FA",
                content: "Mengaktifkan Autentikasi Dua Faktor (2FA)",
            }
        });

        return NextResponse.json({
            message: "2FA berhasil diaktifkan",
            backupCodes
        });
    } catch (error) {
        console.error("2FA Verify Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
