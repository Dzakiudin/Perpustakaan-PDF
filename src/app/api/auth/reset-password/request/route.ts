import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";

const requestSchema = z.object({
    identifier: z.string().min(3),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { identifier } = requestSchema.parse(body);

        // Find user
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { username: identifier },
                    { phoneNumber: identifier },
                ]
            }
        });

        if (!user) {
            return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
        }

        // Generate token
        const token = crypto.randomBytes(32).toString("hex");
        const expiry = new Date(Date.now() + 3600000); // 1 hour from now

        // Store token in database
        await (prisma.user as any).update({
            where: { id: user.id },
            data: {
                resetToken: token,
                resetTokenExpiry: expiry,
            }
        });

        const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

        // Send actual email
        const emailSubject = "Reset Password - Book-in";
        const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 12px;">
                <h2 style="color: #137fec;">Reset Password Akun Anda</h2>
                <p>Halo <b>${user.name}</b>,</p>
                <p>Kami menerima permintaan untuk mereset password akun Book-in Anda. Silakan klik tombol di bawah ini untuk melanjutkan:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #137fec; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password Sekarang</a>
                </div>
                <p style="color: #666; font-size: 12px;">Link ini akan kedaluwarsa dalam 1 jam. Jika Anda tidak merasa melakukan permintaan ini, silakan abaikan email ini.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 10px; text-align: center;">Book-in Collective &copy; 2026</p>
            </div>
        `;

        const emailResult = await sendEmail(user.email, emailSubject, emailHtml);

        // Logging result to terminal as fallback/verification
        console.log("--- RESET PASSWORD REQUEST ---");
        console.log(`User: ${user.email}`);
        console.log(`Link: ${resetLink}`);
        console.log(`Email Status: ${emailResult.success ? 'Sent' : 'Failed'}`);
        if (!emailResult.success) console.error("Email Error:", emailResult.error);
        console.log("------------------------------");

        return NextResponse.json({
            message: "Link reset password telah dikirim ke email Anda",
            email: user.email
        });
    } catch (error: any) {
        console.error("Reset Request Error:", error);
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
