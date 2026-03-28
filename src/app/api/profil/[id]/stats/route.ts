import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/profil/[id]/stats — Get user reading statistics
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // Count unique books read
    const booksRead = await prisma.readHistory.count({
        where: { userId: id },
    });

    // Total pages read (sum of lastPage from all ReadHistory entries)
    const readHistories = await prisma.readHistory.findMany({
        where: { userId: id },
        select: { lastPage: true },
    });
    const totalPages = readHistories.reduce((sum, h) => sum + h.lastPage, 0);

    // Books uploaded
    const booksUploaded = await prisma.book.count({
        where: { uploaderId: id },
    });

    // Annotations made
    const annotationCount = await prisma.annotation.count({
        where: { userId: id },
    });

    // Forum threads
    const forumThreads = await prisma.forumThread.count({
        where: { userId: id },
    });

    // Reading streak (consecutive days with ReadHistory updates)
    const recentHistories = await prisma.readHistory.findMany({
        where: { userId: id },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
        take: 365,
    });

    let streak = 0;
    if (recentHistories.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const days = new Set<string>();
        for (const h of recentHistories) {
            const d = new Date(h.updatedAt);
            d.setHours(0, 0, 0, 0);
            days.add(d.toISOString());
        }
        const sorted = [...days].sort().reverse();
        for (let i = 0; i < sorted.length; i++) {
            const expected = new Date(today);
            expected.setDate(expected.getDate() - i);
            expected.setHours(0, 0, 0, 0);
            if (sorted[i] === expected.toISOString()) {
                streak++;
            } else {
                break;
            }
        }
    }

    return NextResponse.json({
        booksRead,
        totalPages,
        booksUploaded,
        annotationCount,
        forumThreads,
        streak,
    });
}
