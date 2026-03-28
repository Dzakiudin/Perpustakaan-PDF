import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const session = await getUserFromRequest(req);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            include: {
                books: true,
                activities: {
                    take: 50,
                    orderBy: { createdAt: "desc" }
                },
                collections: true,
            }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Remove sensitive info
        const { password, twoFactorSecret, backupCodes, ...safeData } = user as any;

        const exportData = {
            version: "1.0",
            exportDate: new Date().toISOString(),
            account: safeData,
        };

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="book-in_data_${session.userId}.json"`,
            }
        });
    } catch (error) {
        console.error("Export Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
