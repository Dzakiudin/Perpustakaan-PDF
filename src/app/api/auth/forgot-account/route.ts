import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const forgotSchema = z.object({
    identifier: z.string().min(3),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { identifier } = forgotSchema.parse(body);

        // Search user by email, username, or phone
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { username: identifier },
                    { phoneNumber: identifier },
                ]
            },
            select: {
                id: true,
                email: true,
                name: true,
                username: true,
                avatar: true,
            }
        });

        if (!user) {
            return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
        }

        // Masking email for privacy
        const [local, domain] = user.email.split("@");
        const maskedEmail = `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;

        return NextResponse.json({
            message: "Akun ditemukan",
            user: {
                name: user.name,
                username: user.username,
                email: maskedEmail,
                avatar: user.avatar,
            }
        });
    } catch (error) {
        console.error("Forgot Account Error:", error);
        return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
    }
}
