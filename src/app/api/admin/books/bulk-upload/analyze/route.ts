import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { extractTextFromPDF } from "@/lib/pdf-service";
import { extractBookMetadata } from "@/lib/ai-service";

export async function POST(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload || payload.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // 1. Extract Text
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const textContent = await extractTextFromPDF(buffer);

        // 2. Get Categories for mapping
        const categories = await prisma.category.findMany({ select: { id: true, name: true } });

        // 3. AI Analysis
        const aiMetadata = await extractBookMetadata(textContent, categories);

        // 4. Map category name to ID
        let categoryId = "";
        if (aiMetadata?.categoryName) {
            const matchedCat = categories.find(c => c.name.toLowerCase() === aiMetadata.categoryName.toLowerCase());
            if (matchedCat) categoryId = matchedCat.id;
        }

        return NextResponse.json({
            success: true,
            metadata: {
                title: aiMetadata?.title || file.name.replace(".pdf", ""),
                author: aiMetadata?.author || "Unknown",
                description: aiMetadata?.description || "",
                categoryId: categoryId || categories[0]?.id || "",
                tags: aiMetadata?.tags || ""
            }
        });
    } catch (error: any) {
        console.error("Analysis error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
