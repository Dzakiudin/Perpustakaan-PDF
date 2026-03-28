import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { extractTextFromPDF } from "@/lib/pdf-service";
import { extractBookMetadata } from "@/lib/ai-service";

export async function POST(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload || payload.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const cover = formData.get("cover") as File | null;

        // Optional manual overrides if provided
        const manualTitle = formData.get("title") as string;
        const manualAuthor = formData.get("author") as string;
        const manualDescription = formData.get("description") as string;
        const manualCategoryId = formData.get("categoryId") as string;
        const manualTags = formData.get("tags") as string;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // 1. Save File
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadDir, { recursive: true });

        const uniqueName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const filePath = `/uploads/${uniqueName}`;
        const fullPath = path.join(uploadDir, uniqueName);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(fullPath, buffer);

        // 2. Extract Text for AI
        const textContent = await extractTextFromPDF(buffer);

        // 3. Get Categories for AI mapping
        const categories = await prisma.category.findMany({ select: { id: true, name: true } });

        // 4. Call AI to Extract Metadata
        const aiMetadata = await extractBookMetadata(textContent, categories);

        // 5. Build Final Data (Manual Overrides > AI Extracted > Defaults)
        const title = manualTitle || aiMetadata?.title || file.name.replace(".pdf", "");
        const author = manualAuthor || aiMetadata?.author || "Unknown";
        const description = manualDescription || aiMetadata?.description || "";
        const tags = manualTags || aiMetadata?.tags || "";

        // Map category name to ID
        let categoryId = manualCategoryId || null;
        if (!categoryId && aiMetadata?.categoryName) {
            const matchedCat = categories.find(c => c.name.toLowerCase() === aiMetadata.categoryName.toLowerCase());
            if (matchedCat) categoryId = matchedCat.id;
        }

        // 6. Save Cover if provided
        let thumbnailPath: string | null = null;
        if (cover) {
            const coverUniqueName = `${Date.now()}-cover-${cover.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
            const coverFullPath = path.join(uploadDir, coverUniqueName);
            const coverBytes = await cover.arrayBuffer();
            await writeFile(coverFullPath, Buffer.from(coverBytes));
            thumbnailPath = `/uploads/${coverUniqueName}`;
        }

        // 7. Determine Gradient Color
        const colors = [
            "from-blue-400 to-indigo-600", "from-emerald-400 to-teal-600",
            "from-amber-400 to-orange-600", "from-rose-400 to-pink-600",
            "from-violet-400 to-purple-600", "from-cyan-400 to-blue-600",
        ];
        const color = colors[title.length % colors.length];

        // 8. Create Database Record
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
            include: { category: true }
        });

        // 9. Update User & Activity
        await prisma.user.update({
            where: { id: payload.userId },
            data: { xp: { increment: 50 }, uploadCount: { increment: 1 } }
        });

        await prisma.activity.create({
            data: {
                userId: payload.userId,
                type: "UPLOAD_BOOK",
                bookId: book.id,
                content: book.title,
            }
        });

        return NextResponse.json({ success: true, book });
    } catch (error: any) {
        console.error("Bulk upload error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
