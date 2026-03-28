import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const payload = await getUserFromRequest(req);

    const { id } = await params;

    const collection = await prisma.collection.findUnique({
        where: { id },
        include: {
            user: { select: { id: true, name: true, avatar: true } },
            items: {
                orderBy: { createdAt: "desc" },
                include: {
                    book: {
                        include: {
                            category: { select: { name: true, slug: true } },
                            uploader: { select: { id: true, name: true } },
                        }
                    }
                }
            }
        }
    });

    if (!collection) return NextResponse.json({ error: "Koleksi tidak ditemukan" }, { status: 404 });

    const isOwner = payload?.userId === collection.userId;

    return NextResponse.json({ collection, isOwner });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { name, description, color } = await req.json();

    if (!name?.trim()) {
        return NextResponse.json({ error: "Nama koleksi tidak boleh kosong" }, { status: 400 });
    }

    const existing = await prisma.collection.findUnique({ where: { id } });
    if (!existing || existing.userId !== payload.userId) {
        return NextResponse.json({ error: "Koleksi tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.collection.update({
        where: { id },
        data: {
            name: name.trim(),
            description: description?.trim() || null,
            color: color || existing.color,
        },
    });

    return NextResponse.json({ collection: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const existing = await prisma.collection.findUnique({ where: { id } });
    if (!existing || existing.userId !== payload.userId) {
        return NextResponse.json({ error: "Koleksi tidak ditemukan" }, { status: 404 });
    }

    await prisma.collection.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
}
