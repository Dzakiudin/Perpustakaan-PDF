"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";

export function BookGrid({ books }: { books: any[] }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {books.map((book) => (
                <BookCard key={book.id} book={book} />
            ))}
        </div>
    );
}

export function BookCard({ book }: { book: any }) {
    const { t } = useLanguage();
    const [isSaved, setIsSaved] = useState(book.userBookmarked || false);
    const [saving, setSaving] = useState(false);

    // Sync with prop changes (from external fetches)
    useEffect(() => {
        setIsSaved(book.userBookmarked || false);
    }, [book.userBookmarked]);

    const toggleSave = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (saving) return;
        setSaving(true);
        try {
            const res = await fetch("/api/collections/save-toggle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookId: book.id }),
            });
            if (res.ok) {
                const data = await res.json();
                setIsSaved(data.saved);
            }
        } catch { /* ignore */ }
        setSaving(false);
    };

    return (
        <Link href={`/pdf/${book.id}`} className="group flex flex-col gap-3 relative pro-max-card-wrapper border-0">
            <div className="relative aspect-[3/4.2] rounded-2xl overflow-hidden bg-surface border border-border shadow-sm group-hover:shadow-xl group-hover:-translate-y-2 transition-all duration-300">
                {book.thumbnailPath ? (
                    <Image
                        src={book.thumbnailPath}
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        alt={book.title || "Cover"}
                    />
                ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${book.color || "from-blue-500 to-indigo-700"} flex items-center justify-center p-6 relative overflow-hidden transition-transform duration-500 ease-out group-hover:scale-105`}>
                        <p className="text-white font-bold text-[14px] text-center leading-snug line-clamp-4 relative z-10 tracking-wider opacity-95">{book.title}</p>
                    </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out flex flex-col justify-end p-4">
                    <div className="translate-y-8 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 delay-100 ease-out flex items-center justify-between">
                        <div className="size-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg mb-2">
                            <span className="material-symbols-outlined text-[24px] fill-icon">play_arrow</span>
                        </div>

                        {/* Quick Save Action */}
                        <button
                            onClick={toggleSave}
                            disabled={saving}
                            className={`size-10 rounded-full flex items-center justify-center backdrop-blur-md border transition-all active:scale-95 ${isSaved
                                ? "bg-amber-500 border-amber-500 text-white shadow-lg"
                                : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                                }`}
                        >
                            <span className={`material-symbols-outlined text-[20px] ${isSaved ? "fill-icon" : ""}`}>
                                {isSaved ? "bookmark_added" : "bookmark_add"}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Category Badge - Desktop only on card top */}
                {book.category && (
                    <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-surface/90 backdrop-blur-md border border-black/5 dark:bg-black/80 dark:border-white/10 scale-95 origin-top-left group-hover:bg-primary group-hover:text-white transition-all duration-300 ease-out shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-inherit">{book.category.name}</span>
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-1 px-1 mt-2">
                <h3 className="text-text-main text-[15px] font-bold leading-tight line-clamp-1 group-hover:text-primary transition-colors duration-300 tracking-normal">{book.title}</h3>
                <p className="text-text-muted text-[13px] font-medium leading-normal truncate">{book.author}</p>
                <div className="flex items-center gap-3 mt-1 text-text-muted font-medium">
                    <div className="flex items-center gap-1.5" title={`${book.viewCount || 0} ${t("pdf_engagement")}`}>
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                        <span className="text-[12px]">{book.viewCount || 0}</span>
                    </div>
                    <div className="size-1 rounded-full bg-border"></div>
                    <div className="flex items-center gap-1.5">
                        <span className={`material-symbols-outlined text-[16px] ${isSaved ? "text-amber-500 fill-icon" : "text-primary"}`}>
                            {isSaved ? "bookmark" : "favorite"}
                        </span>
                        <span className="text-[12px]">{book.likeCount || 0}</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

export function BookCardSkeleton() {
    return (
        <div className="flex flex-col gap-3 relative animate-pulse">
            <div className="relative aspect-[3/4.2] rounded-[24px] overflow-hidden bg-surface border border-border">
                {/* Simulated category badge */}
                <div className="absolute top-3 left-3 w-16 h-6 rounded-full bg-border"></div>
            </div>
            <div className="flex flex-col gap-2 px-1">
                <div className="w-full h-4 bg-border rounded"></div>
                <div className="w-2/3 h-3 bg-border rounded opacity-50"></div>
                <div className="flex items-center gap-3 mt-1.5">
                    <div className="w-8 h-3 bg-border rounded opacity-50"></div>
                    <div className="w-8 h-3 bg-border rounded opacity-50"></div>
                </div>
            </div>
        </div>
    );
}

export function BookGridSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <BookCardSkeleton key={i} />
            ))}
        </div>
    );
}
