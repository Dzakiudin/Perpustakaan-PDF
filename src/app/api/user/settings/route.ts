import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { z } from "zod";

const settingsSchema = z.object({
    name: z.string().min(2).optional(),
    username: z.string().min(3).regex(/^[a-zA-Z0-9_]+$/).optional().nullable(),
    bio: z.string().optional().nullable(),
    phoneNumber: z.string().optional().nullable(),
    language: z.string().optional(),
    timezone: z.string().optional(),
    targetBooks: z.number().min(0).optional(),
    targetPages: z.number().min(0).optional(),
    birthday: z.string().optional().nullable(),
    gender: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    loginAlerts: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
    try {
        const session = await getUserFromRequest(req);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Using a more generic query to avoid strict type issues if Prisma Client is out of sync
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Remove sensitive fields manually
        const { password, twoFactorSecret, backupCodes, ...safeUser } = user as any;

        return NextResponse.json({ user: safeUser });
    } catch (error: any) {
        console.error("Settings GET Error:", error.message);
        return NextResponse.json({
            error: "Internal Server Error",
            details: error.message
        }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getUserFromRequest(req);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const validatedData = settingsSchema.parse(body);

        // Check username uniqueness if changing
        if (validatedData.username) {
            const existing = await (prisma.user as any).findFirst({
                where: {
                    username: validatedData.username,
                    NOT: { id: session.userId }
                }
            });
            if (existing) {
                return NextResponse.json({ error: "Username sudah digunakan" }, { status: 400 });
            }
        }

        const updateData: any = {
            ...validatedData,
        };

        // Date conversion for birthday if present
        if (validatedData.birthday) {
            try {
                const date = new Date(validatedData.birthday);
                if (!isNaN(date.getTime())) {
                    updateData.birthday = date;
                } else {
                    delete updateData.birthday;
                }
            } catch {
                delete updateData.birthday;
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: session.userId },
            data: updateData as any,
        });

        const { password, twoFactorSecret, backupCodes, ...safeUser } = updatedUser as any;

        return NextResponse.json({ user: safeUser });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || "Input tidak valid" }, { status: 400 });
        }
        console.error("Settings Update Error:", error.message);
        return NextResponse.json({
            error: "Internal Server Error",
            details: error.message
        }, { status: 500 });
    }
}
