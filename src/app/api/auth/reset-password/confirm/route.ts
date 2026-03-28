import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";

const confirmSchema = z.object({
    token: z.string(),
    newPassword: z.string().min(6),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, newPassword } = confirmSchema.parse(body);

        // Find user by token and ensure it's not expired
        // Using 'as any' to bypass stale Prisma Client types
        const user = await (prisma.user as any).findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date(),
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: "Token tidak valid atau sudah kedaluwarsa" }, { status: 400 });
        }

        // Hash new password
        const hashedPassword = await hashPassword(newPassword);

        // Update password and clear token
        await (prisma.user as any).update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null,
            },
        });

        return NextResponse.json({ message: "Password berhasil diperbarui" });
    } catch (error: any) {
        console.error("Reset Confirm Error:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        return NextResponse.json({
            error: "Terjadi kesalahan server",
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
