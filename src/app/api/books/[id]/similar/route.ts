import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // Fetch current book to get its categoryId and author
        const currentBook = await prisma.book.findUnique({
            where: { id },
            select: { categoryId: true, author: true }
        });

        if (!currentBook) {
            return NextResponse.json({ error: "Book not found" }, { status: 404 });
        }

        // Find similar books by same category or same author, excluding the current book
        const similarBooks = await prisma.book.findMany({
            where: {
                id: { not: id },
                OR: [
                    { categoryId: currentBook.categoryId },
                    { author: currentBook.author }
                ]
            },
            select: {
                id: true,
                title: true,
                author: true,
                thumbnailPath: true,
                color: true,
            },
            take: 6,
            orderBy: {
                viewCount: "desc" // Show most popular similar books first
            }
        });

        return NextResponse.json(similarBooks);
    } catch (error) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
