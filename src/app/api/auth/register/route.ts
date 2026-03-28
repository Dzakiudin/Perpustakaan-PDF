import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";
import { z } from "zod";

const registerSchema = z.object({
    email: z.string().email(),
    name: z.string().min(2),
    password: z.string().min(6),
});

function generateUsername(name: string): string {
    const base = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${base || "user"}${suffix}`;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const data = registerSchema.parse(body);

        // Check if user exists
        const existing = await prisma.user.findUnique({
            where: { email: data.email },
        });
        if (existing) {
            return NextResponse.json(
                { error: "Email sudah terdaftar" },
                { status: 400 }
            );
        }

        // Create user with auto-generated username
        const hashedPassword = await hashPassword(data.password);
        const user = await prisma.user.create({
            data: {
                email: data.email,
                name: data.name,
                password: hashedPassword,
                username: generateUsername(data.name),
            },
        });

        // Generate token
        const token = await signToken({ userId: user.id, email: user.email, role: user.role });

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
