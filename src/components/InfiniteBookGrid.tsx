"use client";

import { useState, useEffect, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { BookCard, BookGridSkeleton } from "./BookCard";

interface InfiniteBookGridProps {
    initialBooks?: any[];
    fetchUrl: string;       // e.g. "/api/books?sort=newest"
    emptyMessage?: string;
}

export function InfiniteBookGrid({ initialBooks = [], fetchUrl, emptyMessage = "No books found." }: InfiniteBookGridProps) {
    const [books, setBooks] = useState<any[]>(initialBooks);
    const [page, setPage] = useState(initialBooks.length > 0 ? 1 : 0);
    const [hasMore, setHasMore] = useState(initialBooks.length >= 6); // Assuming limit is at least 6
    const [loading, setLoading] = useState(initialBooks.length === 0);

    const { ref, inView } = useInView({
        threshold: 0.1,
        rootMargin: "400px", // Trigger earlier
    });

    const loadMore = useCallback(async () => {
        if (loading || !hasMore) return;
        setLoading(true);
        const nextPage = page + 1;

        try {
            const separator = fetchUrl.includes("?") ? "&" : "?";
            const res = await fetch(`${fetchUrl}${separator}page=${nextPage}`);
            if (res.ok) {
                const data = await res.json();
                if (data.books && data.books.length > 0) {
                    setBooks(prev => {
                        // Avoid duplicates if API returns overlapping items
                        const existingIds = new Set(prev.map(b => b.id));
                        const newBooks = data.books.filter((b: any) => !existingIds.has(b.id));
                        return [...prev, ...newBooks];
                    });
                    setPage(data.page);
                    setHasMore(data.page < data.totalPages);
                } else {
                    setHasMore(false);
                }
            } else {
                setHasMore(false);
            }
        } catch {
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, [page, hasMore, loading, fetchUrl]);

    // Initial load if no books provided
    useEffect(() => {
        if (initialBooks.length === 0 && page === 0) {
            loadMore();
        }
    }, [initialBooks, page, loadMore]);

    // Load more when scrolling into view
    useEffect(() => {
        if (inView) {
            loadMore();
        }
    }, [inView, loadMore]);

    if (books.length === 0 && !loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50 border border-dashed border-black/5 dark:border-white/5 rounded-[40px] bg-surface">
                <span className="material-symbols-outlined text-6xl">inbox_customize</span>
                <p className="text-xs font-black uppercase tracking-[0.2em]">{emptyMessage}</p>
            </div>
        );
    }

    // Update if initialBooks changes (e.g. from router.refresh())
    useEffect(() => {
        setBooks(initialBooks);
        if (initialBooks.length > 0) {
            setPage(1);
            setHasMore(initialBooks.length >= 6);
        }
    }, [initialBooks]);

    return (
        <div className="flex flex-col gap-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {books.map((book) => (
                    <BookCard key={book.id} book={book} />
                ))}
            </div>

            {/* Loading Indicator / Intersection Observer Target */}
            {hasMore && (
                <div ref={ref} className="w-full flex justify-center py-8">
                    {loading && (
                        <div className="w-full">
                            <BookGridSkeleton count={6} />
                        </div>
                    )}
                </div>
            )}

            {!hasMore && books.length > 0 && (
                <div className="w-full text-center py-8 opacity-30">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-main">End of results</p>
                </div>
            )}
        </div>
    );
}
