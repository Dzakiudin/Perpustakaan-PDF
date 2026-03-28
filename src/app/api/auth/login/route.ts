import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, signToken } from "@/lib/auth";
import { z } from "zod";

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const data = loginSchema.parse(body);

        const user = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (!user || !(await comparePassword(data.password, user.password))) {
            return NextResponse.json(
                { error: "Email atau password salah" },
                { status: 401 }
            );
        }

        if (user.isSuspended) {
            return NextResponse.json(
                { error: "Akses ditolak: Akun Anda telah di-suspend karena pelanggaran." },
                { status: 403 }
            );
        }

        const token = await signToken({ userId: user.id, email: user.email, role: user.role });

        // Update User last login & create session
        const userAgent = req.headers.get("user-agent") || "Unknown Device";
        const ip = req.headers.get("x-forwarded-for")?.split(',')[0] || "127.0.0.1";

        await prisma.user.update({
            where: { id: user.id },
            data: {
                lastLogin: new Date(),
                lastIp: ip
            }
        });

        // Upsert session: find existing by userId, ip, and device
        const existingSession = await prisma.session.findFirst({
            where: {
                userId: user.id,
                ip: ip,
                device: userAgent
            }
        });

        if (existingSession) {
            await prisma.session.update({
                where: { id: existingSession.id },
                data: {
                    token: token,
                    lastUsed: new Date()
                }
            });
        } else {
            await prisma.session.create({
                data: {
                    userId: user.id,
                    token: token,
                    device: userAgent,
                    ip: ip,
                    lastUsed: new Date()
                }
            });
        }

        return NextResponse.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
