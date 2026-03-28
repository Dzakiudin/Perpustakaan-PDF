import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const collections = await prisma.collection.findMany({
        where: { userId: payload.userId },
        include: {
            _count: { select: { items: true } },
            items: {
                take: 4,
                orderBy: { createdAt: "desc" },
                include: {
                    book: {
                        select: { id: true, title: true, thumbnailPath: true, color: true }
                    }
                }
            }
        },
        orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ collections });
}

export async function POST(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, description, color } = await req.json();

    if (!name?.trim()) {
        return NextResponse.json({ error: "Nama koleksi tidak boleh kosong" }, { status: 400 });
    }

    const collection = await prisma.collection.create({
        data: {
            name: name.trim(),
            description: description?.trim() || null,
            color: color || "from-blue-500 to-indigo-600",
            userId: payload.userId,
        },
    });

    return NextResponse.json({ collection }, { status: 201 });
}
