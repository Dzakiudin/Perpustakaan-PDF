import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import path from "path";
import { writeFile, mkdir } from "fs/promises";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const book = await prisma.book.findUnique({
        where: { id },
        include: {
            uploader: { select: { id: true, name: true, avatar: true, uploadCount: true } },
            category: true,
            _count: { select: { likes: true, bookmarks: true } },
        },
    });

    if (!book) {
        return NextResponse.json({ error: "PDF tidak ditemukan" }, { status: 404 });
    }

    // Check if current user liked/bookmarked
    let userLiked = false;
    let userBookmarked = false;
    const payload = await getUserFromRequest(req);
    if (payload) {
        const [like, bookmark, defaultCol] = await Promise.all([
            prisma.like.findUnique({ where: { userId_bookId: { userId: payload.userId, bookId: id } } }),
            prisma.bookmark.findUnique({ where: { userId_bookId: { userId: payload.userId, bookId: id } } }),
            prisma.collection.findFirst({
                where: {
                    userId: payload.userId,
                    name: { in: ["Favorit Saya", "My Favorites"] },
                    items: { some: { bookId: id } }
                }
            })
        ]);
        userLiked = !!like;
        userBookmarked = !!bookmark || !!defaultCol;
    }

    return NextResponse.json({ ...book, userLiked, userBookmarked });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const book = await prisma.book.findUnique({ where: { id } });
    if (!book || book.uploaderId !== payload.userId) {
        return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
    }

    await prisma.book.delete({ where: { id } });
    await prisma.user.update({
        where: { id: payload.userId },
        data: { uploadCount: { decrement: 1 } },
    });

    return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const book = await prisma.book.findUnique({ where: { id } });
    if (!book || book.uploaderId !== payload.userId) {
        return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
    }

    const formData = await req.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string || "";
    const author = formData.get("author") as string || "Unknown";
    const categoryId = formData.get("categoryId") as string || null;
    const tags = formData.get("tags") as string || "";
    const cover = formData.get("cover") as File | null;

    if (!title) {
        return NextResponse.json({ error: "Judul wajib diisi" }, { status: 400 });
    }

    let thumbnailPath = book.thumbnailPath;
    if (cover && cover.type.startsWith("image/")) {
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadDir, { recursive: true });

        const coverUniqueName = `${Date.now()}-cover-${cover.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const coverFullPath = path.join(uploadDir, coverUniqueName);
        const coverBytes = await cover.arrayBuffer();
        await writeFile(coverFullPath, Buffer.from(coverBytes));
        thumbnailPath = `/uploads/${coverUniqueName}`;
    }

    const updatedBook = await prisma.book.update({
        where: { id },
        data: {
            title,
            description,
            author,
            categoryId,
            tags,
            thumbnailPath,
        },
    });

    return NextResponse.json({ book: updatedBook });
}
