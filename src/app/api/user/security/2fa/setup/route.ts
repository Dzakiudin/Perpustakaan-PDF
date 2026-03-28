import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { generateSecret, generateURI } from "otplib/functional";
import QRCode from "qrcode";

export async function POST(req: NextRequest) {
    try {
        const session = await getUserFromRequest(req);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { email: true, name: true }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Generate a new secret
        const secret = generateSecret();

        // Create otpauth URL
        const otpauth = generateURI({
            issuer: "Book-In",
            label: user.email,
            secret: secret
        });

        // Generate QR Code data URL
        const qrCodeUrl = await QRCode.toDataURL(otpauth);

        // Save temporary secret (we'll only enable 2FA after verification)
        await (prisma.user as any).update({
            where: { id: session.userId },
            data: { twoFactorSecret: secret }
        });

        return NextResponse.json({
            secret,
            qrCodeUrl
        });
    } catch (error) {
        console.error("2FA Setup Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
