import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PDFDetailClient from "./PDFDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const book = await prisma.book.findUnique({ where: { id }, select: { title: true, author: true, description: true } });
    if (!book) return { title: "PDF tidak ditemukan" };
    return {
        title: book.title,
        description: book.description || `Baca ${book.title} oleh ${book.author} di Book-in.`,
        openGraph: {
            title: book.title,
            description: book.description || `Baca ${book.title} oleh ${book.author} di Book-in.`,
            type: "article",
            authors: [book.author],
        },
        twitter: {
            card: "summary_large_image",
            title: book.title,
            description: book.description || `Baca ${book.title} oleh ${book.author} di Book-in.`,
        }
    };
}

export default async function PDFDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // Increment view count (non-blocking)
    prisma.book.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => { });

    const exists = await prisma.book.findUnique({ where: { id }, select: { id: true } });
    if (!exists) notFound();

    return <PDFDetailClient bookId={id} />;
}
