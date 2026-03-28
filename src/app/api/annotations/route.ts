import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

/**
 * GET /api/annotations?bookId=xxx
 * Returns all annotations for the authenticated user + specified book.
 */
export async function GET(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const bookId = req.nextUrl.searchParams.get("bookId");
    if (!bookId) return NextResponse.json({ error: "bookId is required" }, { status: 400 });

    const annotations = await prisma.annotation.findMany({
        where: { userId: payload.userId, bookId },
        orderBy: { createdAt: "asc" },
    });

    // Parse JSON data field back to object
    const parsed = annotations.map(a => ({
        id: a.id,
        type: a.type,
        page: a.page,
        color: a.color,
        ...JSON.parse(a.data),
        text: a.text || undefined,
        createdAt: a.createdAt.getTime(),
    }));

    return NextResponse.json({ annotations: parsed });
}

/**
 * POST /api/annotations
 * Body: { bookId, annotations: Annotation[] }
 * Syncs all annotations — replaces all existing for this user+book.
 */
export async function POST(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { bookId, annotations } = await req.json();
    if (!bookId || !Array.isArray(annotations)) {
        return NextResponse.json({ error: "bookId and annotations array required" }, { status: 400 });
    }

    // Transaction: delete all existing, then insert new ones
    await prisma.$transaction(async (tx) => {
        await tx.annotation.deleteMany({
            where: { userId: payload.userId, bookId },
        });

        if (annotations.length > 0) {
            await tx.annotation.createMany({
                data: annotations.map((ann: any) => {
                    // Extract the type-specific data (rect, points, position)
                    const { id, type, page, color, text, createdAt, ...rest } = ann;
                    return {
                        id: id || undefined,
                        type,
                        page,
                        color,
                        data: JSON.stringify(rest),
                        text: text || null,
                        userId: payload.userId,
                        bookId,
                        createdAt: createdAt ? new Date(createdAt) : new Date(),
                    };
                }),
            });
        }
    });

    return NextResponse.json({ success: true, count: annotations.length });
}

/**
 * DELETE /api/annotations?id=xxx
 * Deletes a single annotation by ID (must belong to user).
 */
export async function DELETE(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const annotation = await prisma.annotation.findUnique({ where: { id } });
    if (!annotation || annotation.userId !== payload.userId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.annotation.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
