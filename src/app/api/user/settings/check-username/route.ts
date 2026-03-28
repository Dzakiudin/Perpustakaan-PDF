import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const session = await getUserFromRequest(req);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const username = searchParams.get("username");

        if (!username || username.length < 3) {
            return NextResponse.json({ available: false, message: "Minimal 3 karakter" });
        }

        const existing = await prisma.user.findFirst({
            where: {
                username: {
                    equals: username,
                },
                NOT: {
                    id: session.userId
                }
            }
        });

        return NextResponse.json({ available: !existing });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
