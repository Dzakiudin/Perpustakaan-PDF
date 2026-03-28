import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const reviews = await prisma.review.findMany({
        where: { bookId: id },
        include: {
            user: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    // Get aggregated stats
    const book = await prisma.book.findUnique({
        where: { id },
        select: { avgRating: true, reviewCount: true },
    });

    // Check if current user already reviewed
    let userReview = null;
    const payload = await getUserFromRequest(req);
    if (payload) {
        userReview = await prisma.review.findUnique({
            where: { userId_bookId: { userId: payload.userId, bookId: id } },
        });
    }

    return NextResponse.json({
        reviews,
        avgRating: book?.avgRating || 0,
        reviewCount: book?.reviewCount || 0,
        userReview,
    });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { rating, content } = await req.json();

    if (!rating || rating < 1 || rating > 5) {
        return NextResponse.json({ error: "Rating harus antara 1-5" }, { status: 400 });
    }

    // Upsert: create or update the user's review for this book
    const review = await prisma.review.upsert({
        where: { userId_bookId: { userId: payload.userId, bookId: id } },
        create: {
            rating,
            content: content?.trim() || null,
            userId: payload.userId,
            bookId: id,
        },
        update: {
            rating,
            content: content?.trim() || null,
        },
    });

    // Recalculate average rating
    const allReviews = await prisma.review.findMany({
        where: { bookId: id },
        select: { rating: true },
    });

    const avg = allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
        : 0;

    await prisma.book.update({
        where: { id },
        data: {
            avgRating: Math.round(avg * 10) / 10, // 1 decimal place
            reviewCount: allReviews.length,
        },
    });

    // Fetch the book to get the uploaderId
    const book = await prisma.book.findUnique({
        where: { id },
        select: { uploaderId: true, title: true }
    });

    // Add activity log
    await prisma.activity.create({
        data: {
            userId: payload.userId,
            type: "REVIEW_BOOK",
            bookId: id,
            content: JSON.stringify({ rating, reviewId: review.id }),
        }
    });

    // Notify the book uploader
    if (book && book.uploaderId !== payload.userId) {
        const payloadUser = await prisma.user.findUnique({ where: { id: payload.userId }, select: { name: true } });
        await prisma.notification.create({
            data: {
                userId: book.uploaderId,
                type: "review",
                message: `${payloadUser?.name || "Seseorang"} memberikan ulasan ${rating} bintang pada buku "${book.title}".`,
                link: `/pdf/${id}`,
            }
        });
    }

    // Award XP to the reviewer (+20 XP for reviewing)
    const updatedReviewer = await prisma.user.update({
        where: { id: payload.userId },
        data: {
            xp: { increment: 20 },
        },
        select: { badges: true, _count: { select: { reviews: true } } }
    });

    // Check Badge "CRITIC" for first review
    if (updatedReviewer._count.reviews === 1) {
        let currentBadges = updatedReviewer.badges ? updatedReviewer.badges.split(',') : [];
        if (!currentBadges.includes("CRITIC")) {
            currentBadges.push("CRITIC");
            await prisma.user.update({
                where: { id: payload.userId },
                data: { badges: currentBadges.join(',') }
            });
        }
    }

    return NextResponse.json({
        success: true,
        avgRating: Math.round(avg * 10) / 10,
        reviewCount: allReviews.length,
    });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Remove the user's review for this book
    try {
        await prisma.review.delete({
            where: { userId_bookId: { userId: payload.userId, bookId: id } },
        });

        // Recalculate average rating
        const allReviews = await prisma.review.findMany({
            where: { bookId: id },
            select: { rating: true },
        });

        const avg = allReviews.length > 0
            ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
            : 0;

        await prisma.book.update({
            where: { id },
            data: {
                avgRating: Math.round(avg * 10) / 10,
                reviewCount: allReviews.length,
            },
        });

        return NextResponse.json({
            success: true,
            avgRating: Math.round(avg * 10) / 10,
            reviewCount: allReviews.length,
        });
    } catch (e) {
        // Record might not exist, ignore
        return NextResponse.json({ success: false }, { status: 400 });
    }
}
