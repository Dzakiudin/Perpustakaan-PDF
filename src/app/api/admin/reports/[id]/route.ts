import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const user = await getUserFromRequest(req);

        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { action } = body;

        if (action === "DISMISS") {
            const report = await prisma.report.update({
                where: { id },
                data: { status: "RESOLVED" }
            });
            return NextResponse.json({ success: true, report });
        } else if (action === "DELETE_CONTENT") {
            const report = await prisma.report.findUnique({ where: { id } });
            if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

            // Delete the related content
            switch (report.type) {
                case "BOOK":
                    await prisma.book.delete({ where: { id: report.targetId } }).catch(() => { });
                    break;
                case "THREAD":
                    await prisma.forumThread.delete({ where: { id: report.targetId } }).catch(() => { });
                    break;
                case "REVIEW":
                    await prisma.review.delete({ where: { id: report.targetId } }).catch(() => { });
                    break;
                case "REPLY":
                    await prisma.forumReply.delete({ where: { id: report.targetId } }).catch(() => { });
                    break;
            }

            // Mark all reports for this target as RESOLVED to clean up
            await prisma.report.updateMany({
                where: { targetId: report.targetId },
                data: { status: "RESOLVED" }
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Error updating report:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
