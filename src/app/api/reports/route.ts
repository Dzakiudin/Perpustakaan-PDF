import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { type, targetId, reason } = body;

        if (!type || !targetId || !reason) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const report = await prisma.report.create({
            data: {
                reporterId: user.userId,
                type,
                targetId,
                reason,
            }
        });

        return NextResponse.json({ success: true, report });
    } catch (error) {
        console.error("Error creating report:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
