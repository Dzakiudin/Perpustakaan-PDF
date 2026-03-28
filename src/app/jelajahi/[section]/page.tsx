"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import BackButton from "@/components/BackButton";

interface Book {
    id: string;
    title: string;
    author: string;
    thumbnailPath: string | null;
    color: string;
    viewCount: number;
    likeCount: number;
    avgRating: number;
    reviewCount: number;
    category: { name: string; slug: string } | null;
    uploader: { name: string } | null;
}

const SECTION_META: Record<string, { title: string; subtitle: string; icon: string; color: string }> = {
    trending: { title: "Trending Today", subtitle: "Books currently being widely read by the community.", icon: "trending_up", color: "from-orange-500 to-red-500" },
    popular: { title: "Most Read", subtitle: "Most popular PDF collections of all time.", icon: "visibility", color: "from-blue-500 to-indigo-500" },
    topRated: { title: "Top Rated", subtitle: "Books with the best ratings from readers.", icon: "star", color: "from-amber-400 to-orange-500" },
    newest: { title: "Recently Uploaded", subtitle: "Latest contributions from the community.", icon: "schedule", color: "from-emerald-500 to-teal-500" },
    mostLiked: { title: "Most Liked", subtitle: "Books with the most likes.", icon: "favorite", color: "from-rose-500 to-pink-500" },
    recommended: { title: "Recommended For You", subtitle: "Based on genres you often read.", icon: "recommend", color: "from-violet-500 to-purple-500" },
};

export default function SectionDetailPage({ params }: { params: Promise<{ section: string }> }) {
    const { section } = use(params);
    const meta = SECTION_META[section];

    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page) });
        if (search) params.set("q", search);

        fetch(`/api/books/explore/${section}?${params}`)
            .then(r => r.json())
            .then(d => {
                setBooks(d.books || []);
                setTotalPages(d.totalPages || 1);
                setTotal(d.total || 0);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [section, page, search]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        setSearch(searchInput.trim());
    };

    if (!meta) {
        return (
            <main className="flex-1 w-full px-6 md:px-12 py-10 pt-24 md:pt-[104px] text-center">
                <h1 className="text-3xl font-black text-text-main">Section not found</h1>
                <Link href="/" className="text-primary font-bold mt-4 inline-block">Back to Home</Link>
            </main>
        );
    }

    return (
        <main className="flex-1 w-full min-h-screen px-6 md:px-12 py-10 pt-24 md:pt-[104px] pb-28 md:pb-16 relative overflow-hidden">
            {/* Background */}
            <div className="absolute top-0 right-0 -mr-40 -mt-40 size-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col gap-10">
                {/* Back */}
                <BackButton href="/" label="Back to Home" />

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className={`size-16 rounded-3xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-white shadow-xl`}>
                            <span className="material-symbols-outlined text-2xl">{meta.icon}</span>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-text-main text-4xl md:text-5xl font-black tracking-tight">{meta.title}</h1>
                            <p className="text-text-muted text-sm font-medium mt-1">{meta.subtitle}</p>
                            <p className="text-text-muted/50 text-xs font-black uppercase tracking-widest mt-2">
                                {total} books found
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <form onSubmit={handleSearch} className="flex items-center gap-2">
                        <div className="relative">
                            <span className="material-symbols-outlined text-text-muted absolute left-4 top-1/2 -translate-y-1/2 text-lg">search</span>
                            <input
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                placeholder="Search title or author..."
                                className="pl-12 pr-4 py-3.5 rounded-2xl bg-surface border border-black/5 dark:border-white/5 text-text-main text-sm font-medium outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all w-[280px] md:w-[340px]"
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-6 py-3.5 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-wider hover:bg-primary-hover active:scale-95 transition-all shadow-lg shadow-primary/20"
                        >
                            Search
                        </button>
                    </form>
                </div>

                {/* Active Search Filter */}
                {search && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary/5 border border-primary/10">
                        <span className="material-symbols-outlined text-primary text-sm">filter_list</span>
                        <span className="text-xs font-bold text-text-muted">Search results for: <span className="text-primary">&quot;{search}&quot;</span></span>
                        <button
                            onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
                            className="ml-auto text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                            Clear Filter
                        </button>
                    </div>
                )}

                {/* Book Grid */}
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                        {Array.from({ length: 18 }).map((_, i) => (
                            <div key={i} className="flex flex-col gap-4 animate-pulse">
                                <div className="aspect-[3/4.2] rounded-[28px] bg-black/5 dark:bg-white/5" />
                                <div className="h-3 w-3/4 bg-black/5 dark:bg-white/5 rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : books.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center opacity-40 border border-dashed border-black/5 dark:border-white/5 rounded-[32px]">
                        <span className="material-symbols-outlined text-5xl mb-3">search_off</span>
                        <p className="text-sm font-black uppercase tracking-widest">No books found</p>
                        {search && <p className="text-xs text-text-muted font-medium mt-2">Try a different keyword</p>}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                        {books.map((book) => (
                            <Link key={book.id} href={`/pdf/${book.id}`} className="group flex flex-col gap-3">
                                <div className="relative aspect-[3/4.2] rounded-[28px] overflow-hidden bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 shadow-xl group-hover:shadow-[0_0_30px_rgba(19,127,236,0.15)] group-hover:border-primary/40 transition-all duration-500">
                                    {book.thumbnailPath ? (
                                        <Image src={book.thumbnailPath} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw" className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out" alt={book.title} />
                                    ) : (
                                        <div className={`w-full h-full bg-gradient-to-br ${book.color || "from-blue-600 to-indigo-800"} flex items-center justify-center p-4 text-center`}>
                                            <p className="text-white font-black text-[10px] uppercase leading-tight tracking-widest">{book.title}</p>
                                        </div>
                                    )}
                                    {book.category && (
                                        <div className="absolute top-3 left-3">
                                            <span className="text-[8px] font-black bg-black/60 text-white px-2.5 py-1 rounded-lg uppercase tracking-wider backdrop-blur-sm">{book.category.name}</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent flex items-center gap-3 text-[9px] font-black text-white/70">
                                        <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[10px]">visibility</span> {book.viewCount}</span>
                                        <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[10px]">favorite</span> {book.likeCount}</span>
                                        {book.avgRating > 0 && (
                                            <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[10px]">star</span> {book.avgRating.toFixed(1)}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="px-1 flex flex-col gap-1">
                                    <h3 className="font-black text-text-main text-sm leading-tight truncate group-hover:text-primary transition-colors">{book.title}</h3>
                                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest truncate">{book.author}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                        <button
                            onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            disabled={page <= 1}
                            className="size-12 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center text-text-muted hover:text-primary hover:border-primary/30 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
                        >
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                            .reduce((acc: (number | string)[], p, i, arr) => {
                                if (i > 0 && typeof arr[i - 1] === 'number' && (p as number) - (arr[i - 1] as number) > 1) {
                                    acc.push("...");
                                }
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((p, i) =>
                                typeof p === "string" ? (
                                    <span key={`dots-${i}`} className="px-2 text-text-muted/30 font-bold text-sm">…</span>
                                ) : (
                                    <button
                                        key={p}
                                        onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        className={`size-12 rounded-2xl font-black text-sm transition-all cursor-pointer ${page === p
                                            ? "bg-primary text-white shadow-lg shadow-primary/30"
                                            : "border border-black/5 dark:border-white/5 text-text-muted hover:text-primary hover:border-primary/30"
                                            }`}
                                    >
                                        {p}
                                    </button>
                                )
                            )}

                        <button
                            onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            disabled={page >= totalPages}
                            className="size-12 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center text-text-muted hover:text-primary hover:border-primary/30 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
                        >
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}
