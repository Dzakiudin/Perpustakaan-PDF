import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, comparePassword, hashPassword } from "@/lib/auth";
import { z } from "zod";

const passwordSchema = z.object({
    oldPassword: z.string(),
    newPassword: z.string().min(8),
});

export async function POST(req: NextRequest) {
    try {
        const session = await getUserFromRequest(req);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { oldPassword, newPassword } = passwordSchema.parse(body);

        // Fetch user including password
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // If user has a password (not just OAuth), verify it
        if (user.password) {
            const isMatch = await comparePassword(oldPassword, user.password);
            if (!isMatch) {
                return NextResponse.json({ error: "Password lama salah" }, { status: 400 });
            }
        }

        // Hash and update
        const hashedPassword = await hashPassword(newPassword);
        await prisma.user.update({
            where: { id: session.userId },
            data: { password: hashedPassword }
        });

        // Log activity
        await prisma.activity.create({
            data: {
                userId: session.userId,
                type: "UPDATE_PASSWORD",
                content: "Mengubah password akun",
            }
        });

        return NextResponse.json({ message: "Password berhasil diperbarui" });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        console.error("Change Password Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
