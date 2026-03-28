import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, comparePassword } from "@/lib/auth";
import { z } from "zod";

const emailSchema = z.object({
    newEmail: z.string().email(),
    password: z.string().min(6),
});

export async function POST(req: NextRequest) {
    try {
        const session = await getUserFromRequest(req);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { newEmail, password } = emailSchema.parse(body);

        // Fetch user to verify password
        const user = await prisma.user.findUnique({
            where: { id: session.userId }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Verify password
        const isPasswordCorrect = await comparePassword(password, user.password);
        if (!isPasswordCorrect) {
            return NextResponse.json({ error: "Password saat ini salah" }, { status: 400 });
        }

        // Check if new email is already taken
        const existingUser = await prisma.user.findUnique({
            where: { email: newEmail }
        });

        if (existingUser) {
            return NextResponse.json({ error: "Email sudah digunakan oleh akun lain" }, { status: 400 });
        }

        // Update email
        await prisma.user.update({
            where: { id: session.userId },
            data: { email: newEmail }
        });

        // In a real production app, we would send a verification email to the new address here.
        // For now, we update it directly.

        return NextResponse.json({ message: "Email berhasil diperbarui" });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
        }
        console.error("Email Update Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
