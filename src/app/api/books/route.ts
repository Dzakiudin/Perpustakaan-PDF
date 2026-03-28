import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import path from "path";
import { writeFile, mkdir } from "fs/promises";

export async function GET(req: NextRequest) {
    const categoryId = req.nextUrl.searchParams.get("category");
    const sort = req.nextUrl.searchParams.get("sort") || "newest";
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = 20;

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;

    let orderBy: any = { createdAt: "desc" };
    if (sort === "popular") orderBy = [{ viewCount: "desc" }, { likeCount: "desc" }];
    if (sort === "likes") orderBy = { likeCount: "desc" };
    if (sort === "trending") orderBy = [{ viewCount: "desc" }, { reviewCount: "desc" }, { likeCount: "desc" }];
    if (sort === "top_rated") orderBy = [{ avgRating: "desc" }, { reviewCount: "desc" }];

    const [books, total] = await Promise.all([
        prisma.book.findMany({
            where,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
            include: {
                uploader: { select: { name: true } },
                category: { select: { name: true, slug: true } },
            },
        }),
        prisma.book.count({ where }),
    ]);

    // Check if current user saved these books
    const payload = await getUserFromRequest(req);
    let bookmarkedIds: string[] = [];
    if (payload) {
        const bookmarks = await prisma.bookmark.findMany({
            where: { userId: payload.userId, bookId: { in: books.map(b => b.id) } },
            select: { bookId: true }
        });
        bookmarkedIds = bookmarks.map(b => b.bookId);
    }

    const booksWithStatus = books.map(book => ({
        ...book,
        userBookmarked: bookmarkedIds.includes(book.id)
    }));

    return NextResponse.json({ books: booksWithStatus, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const cover = formData.get("cover") as File | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string || "";
    const author = formData.get("author") as string || "Unknown";
    const categoryId = formData.get("categoryId") as string || null;
    const tags = formData.get("tags") as string || "";

    if (!file || !title) {
        return NextResponse.json({ error: "File dan judul wajib diisi" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json({ error: "Hanya file PDF yang diterima" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const uniqueName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = `/uploads/${uniqueName}`;
    const fullPath = path.join(uploadDir, uniqueName);

    const bytes = await file.arrayBuffer();
    await writeFile(fullPath, Buffer.from(bytes));

    let thumbnailPath: string | null = null;
    if (cover && cover.type.startsWith("image/")) {
        const coverUniqueName = `${Date.now()}-cover-${cover.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const coverFullPath = path.join(uploadDir, coverUniqueName);
        const coverBytes = await cover.arrayBuffer();
        await writeFile(coverFullPath, Buffer.from(coverBytes));
        thumbnailPath = `/uploads/${coverUniqueName}`;
    }

    // Generate gradient color based on title
    const colors = [
        "from-blue-400 to-indigo-600", "from-emerald-400 to-teal-600",
        "from-amber-400 to-orange-600", "from-rose-400 to-pink-600",
        "from-violet-400 to-purple-600", "from-cyan-400 to-blue-600",
        "from-lime-400 to-green-600", "from-fuchsia-400 to-pink-600",
    ];
    const color = colors[title.length % colors.length];

    const book = await prisma.book.create({
        data: {
            title,
            description,
            author,
            categoryId,
            tags,
            filePath,
            fileSize: file.size,
            thumbnailPath,
            color,
            uploaderId: payload.userId,
        },
    });

    // Update user upload count & gamification XP
    const updatedUser = await prisma.user.update({
        where: { id: payload.userId },
        data: {
            uploadCount: { increment: 1 },
            xp: { increment: 50 },
        },
    });

    // Simple Badge Check: "PIONEER" for first upload
    if (updatedUser.uploadCount === 1) {
        let currentBadges = updatedUser.badges ? updatedUser.badges.split(',') : [];
        if (!currentBadges.includes("PIONEER")) {
            currentBadges.push("PIONEER");
            await prisma.user.update({
                where: { id: payload.userId },
                data: { badges: currentBadges.join(',') }
            });
        }
    }

    // Add activity log
    await prisma.activity.create({
        data: {
            userId: payload.userId,
            type: "UPLOAD_BOOK",
            bookId: book.id,
            content: book.title,
        }
    });

    return NextResponse.json({ book }, { status: 201 });
}
