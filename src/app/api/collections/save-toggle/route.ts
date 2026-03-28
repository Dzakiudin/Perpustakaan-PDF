import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { bookId } = await req.json();

    // 1. Find or create the default "Favorit Saya" collection
    let defaultCollection = await prisma.collection.findFirst({
        where: {
            userId: payload.userId,
            name: { in: ["Favorit Saya", "My Favorites"] } // Check both for safety
        }
    });

    if (!defaultCollection) {
        defaultCollection = await prisma.collection.create({
            data: {
                name: "Favorit Saya",
                userId: payload.userId,
                color: "from-amber-500 to-orange-600",
            }
        });
    }

    // 2. Check if book is already in this collection
    const existingItem = await prisma.collectionItem.findUnique({
        where: {
            collectionId_bookId: {
                collectionId: defaultCollection.id,
                bookId: bookId
            }
        }
    });

    if (existingItem) {
        // Remove it
        await prisma.collectionItem.delete({
            where: { id: existingItem.id }
        });

        // Also remove legacy bookmark if it exists to maintain sync
        try {
            await prisma.bookmark.delete({
                where: { userId_bookId: { userId: payload.userId, bookId } }
            });
        } catch (e) { /* ignore */ }

        return NextResponse.json({ saved: false });
    } else {
        // Add it
        await prisma.collectionItem.create({
            data: {
                collectionId: defaultCollection.id,
                bookId: bookId
            }
        });

        // Also create legacy bookmark to maintain sync with components that might still use it
        try {
            await prisma.bookmark.upsert({
                where: { userId_bookId: { userId: payload.userId, bookId } },
                create: { userId: payload.userId, bookId },
                update: {}
            });
        } catch (e) { /* ignore */ }

        return NextResponse.json({ saved: true });
    }
}
