import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { bookId } = await req.json();

    // Verify collection ownership
    const collection = await prisma.collection.findUnique({ where: { id } });
    if (!collection || collection.userId !== payload.userId) {
        return NextResponse.json({ error: "Koleksi tidak ditemukan" }, { status: 404 });
    }

    // Check if already exists
    const existing = await prisma.collectionItem.findUnique({
        where: { collectionId_bookId: { collectionId: id, bookId } },
    });

    if (existing) {
        return NextResponse.json({ error: "Buku sudah ada dalam koleksi ini" }, { status: 409 });
    }

    const item = await prisma.collectionItem.create({
        data: { collectionId: id, bookId },
    });

    // Touch the collection updatedAt
    await prisma.collection.update({ where: { id }, data: { updatedAt: new Date() } });

    // Sync with legacy Bookmark if this is the default collection
    if (collection.name === "Favorit Saya" || collection.name === "My Favorites") {
        try {
            await prisma.bookmark.upsert({
                where: { userId_bookId: { userId: payload.userId, bookId } },
                create: { userId: payload.userId, bookId },
                update: {}
            });
        } catch (e) { /* ignore */ }
    }

    return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { bookId } = await req.json();

    // Verify collection ownership
    const collection = await prisma.collection.findUnique({ where: { id } });
    if (!collection || collection.userId !== payload.userId) {
        return NextResponse.json({ error: "Koleksi tidak ditemukan" }, { status: 404 });
    }

    await prisma.collectionItem.deleteMany({
        where: { collectionId: id, bookId },
    });

    // Sync with legacy Bookmark if this is the default collection
    if (collection.name === "Favorit Saya" || collection.name === "My Favorites") {
        try {
            await prisma.bookmark.delete({
                where: { userId_bookId: { userId: payload.userId, bookId } }
            });
        } catch (e) { /* ignore */ }
    }

    return NextResponse.json({ removed: true });
}
