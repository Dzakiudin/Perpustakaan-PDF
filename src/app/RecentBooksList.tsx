"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useInView } from "react-intersection-observer";
import { BookCard } from "@/components/BookCard";

export default function RecentBooksList({ initialBooks }: { initialBooks: any[] }) {
    const [books, setBooks] = useState<any[]>(initialBooks);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const { ref, inView } = useInView({
        threshold: 0,
        rootMargin: "400px",
    });

    const fetchMoreBooks = useCallback(async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);

        try {
            const nextPage = page + 1;
            const res = await fetch(`/api/books?page=${nextPage}`);
            if (res.ok) {
                const data = await res.json();
                if (data.books.length > 0) {
                    setBooks(prev => {
                        const existingIds = new Set(prev.map(b => b.id));
                        const newBooks = data.books.filter((b: any) => !existingIds.has(b.id));
                        return [...prev, ...newBooks];
                    });
                    setPage(nextPage);
                    setHasMore(nextPage < data.totalPages);
                } else {
                    setHasMore(false);
                }
            }
        } catch { /* ignore */ }
        setLoadingMore(false);
    }, [page, hasMore, loadingMore]);

    useEffect(() => {
        if (inView) {
            fetchMoreBooks();
        }
    }, [inView, fetchMoreBooks]);

    if (books.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-8 rounded-2xl bg-surface border border-dashed border-border text-center">
                <span className="material-symbols-outlined text-5xl text-text-muted mb-4">library_books</span>
                <h3 className="text-lg font-bold text-text-main mb-2">Belum ada PDF</h3>
                <p className="text-sm text-text-muted mb-6">Jadilah yang pertama upload PDF di sini!</p>
                <Link href="/upload" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm transition-colors">
                    <span className="material-symbols-outlined text-lg">upload_file</span>
                    Upload Sekarang
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                {books.map((book) => (
                    <BookCard key={book.id} book={book} />
                ))}
            </div>

            {/* Infinite Scroll Trigger */}
            {hasMore && (
                <div ref={ref} className="py-8 flex justify-center">
                    {loadingMore && <span className="material-symbols-outlined text-primary animate-spin text-3xl">progress_activity</span>}
                </div>
            )}
        </div>
    );
}
