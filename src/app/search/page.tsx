"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { useLanguage } from "@/context/LanguageContext";

function SearchContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { addToast } = useToast();
    const { t } = useLanguage();

    // Filters state from URL
    const q = searchParams.get("q") || "";
    const categoryId = searchParams.get("categoryId") || "";
    const sort = searchParams.get("sort") || "newest";
    const minRating = searchParams.get("minRating") || "0";
    const page = parseInt(searchParams.get("page") || "1");

    const [results, setResults] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<any[]>([]);
    const [localQuery, setLocalQuery] = useState(q);

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchResults();
        setLocalQuery(q);
    }, [q, categoryId, sort, minRating, page]);

    const fetchCategories = async () => {
        try {
            const res = await fetch("/api/categories");
            if (res.ok) {
                const data = await res.json();
                setCategories(data.categories || []);
            }
        } catch { /* ignore */ }
    };

    const fetchResults = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                q,
                categoryId,
                sort,
                minRating,
                page: page.toString(),
                limit: "12"
            });
            const res = await fetch(`/api/search?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setResults(data.results || []);
                setTotal(data.total || 0);
                setTotalPages(data.totalPages || 0);
            }
        } catch {
            addToast(t("search_failed"), "error");
        }
        setLoading(false);
    };

    const updateFilters = (newFilters: any) => {
        const current = new URLSearchParams(Array.from(searchParams.entries()));
        Object.keys(newFilters).forEach(key => {
            if (newFilters[key] !== undefined) {
                if (newFilters[key]) {
                    current.set(key, newFilters[key]);
                } else {
                    current.delete(key);
                }
            }
        });
        current.set("page", "1"); // Reset to page 1 on filter change
        router.push(`/search?${current.toString()}`);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateFilters({ q: localQuery });
    };

    return (
        <div className="min-h-screen py-10 pt-24 md:pt-[104px] pb-28 md:pb-16 px-6 md:px-12 relative">
            {/* Background Decorations Removed */}

            <div className="relative z-10 flex flex-col lg:flex-row gap-12">
                {/* Sidebar Filters */}
                <aside className="lg:w-72 shrink-0 flex flex-col gap-10">
                    <div className="flex flex-col gap-6 p-8 rounded-[40px] bg-surface border border-black/5 dark:border-white/5 shadow-xl relative overflow-hidden">

                        {/* Categories */}
                        <div className="flex flex-col gap-4 relative">
                            <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">{t("nav_library")}</h3>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => updateFilters({ categoryId: "" })}
                                    className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest text-left transition-all ${!categoryId ? "bg-primary text-white shadow-lg shadow-[rgba(255,90,95,0.2)]" : "text-text-muted hover:bg-bg-dark"}`}
                                >
                                    {t("search_all_categories")}
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => updateFilters({ categoryId: cat.id })}
                                        className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest text-left transition-all flex items-center justify-between group ${categoryId === cat.id ? "bg-primary text-white shadow-lg shadow-[rgba(255,90,95,0.2)]" : "text-text-muted hover:bg-bg-dark"}`}
                                    >
                                        <span className="truncate pr-2">{cat.name}</span>
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full ${categoryId === cat.id ? "bg-white/20 text-white" : "bg-black/5 dark:bg-white/10 text-text-muted"}`}>{cat._count.books}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Rating Filter */}
                        <div className="flex flex-col gap-4 relative pt-6 border-t border-black/5 dark:border-white/5">
                            <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">{t("search_min_rating")}</h3>
                            <div className="flex flex-col gap-2">
                                {[4, 3, 2, 0].map(rating => (
                                    <button
                                        key={rating}
                                        onClick={() => updateFilters({ minRating: rating.toString() })}
                                        className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest text-left transition-all flex items-center gap-2 ${minRating === rating.toString() ? "bg-primary text-white shadow-lg shadow-[rgba(255,90,95,0.2)]" : "text-text-muted hover:bg-bg-dark"}`}
                                    >
                                        <span className="material-symbols-outlined text-[16px] fill-icon text-yellow-500">star</span>
                                        {rating > 0 ? `${rating}+ ${t("search_stars")}` : t("search_all_ratings")}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sort Order */}
                        <div className="flex flex-col gap-4 relative pt-6 border-t border-black/5 dark:border-white/5">
                            <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">{t("search_sort_by")}</h3>
                            <div className="flex flex-col gap-2">
                                {[
                                    { value: "newest", label: t("search_sort_newest"), icon: "schedule" },
                                    { value: "popular", label: t("search_sort_popular"), icon: "trending_up" },
                                    { value: "top_rated", label: t("search_sort_top_rated"), icon: "star" },
                                    { value: "likes", label: t("search_sort_likes"), icon: "favorite" }
                                ].map(s => (
                                    <button
                                        key={s.value}
                                        onClick={() => updateFilters({ sort: s.value })}
                                        className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest text-left transition-all flex items-center gap-2 ${sort === s.value ? "bg-primary text-white shadow-lg shadow-[rgba(255,90,95,0.2)]" : "text-text-muted hover:bg-bg-dark"}`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">{s.icon}</span>
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col gap-10">
                    <div className="flex flex-col gap-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-black/5 dark:border-white/5 shadow-sm text-primary self-start">
                            <span className="material-symbols-outlined text-sm fill-icon">explore</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">{t("search_discovery_hub")}</span>
                        </div>
                        <h1 className="text-text-main text-4xl md:text-5xl font-black tracking-tight uppercase leading-none">{t("search_heading").split(' ')[0]} <span className="text-primary italic">{t("search_heading").split(' ')[1]}</span></h1>
                    </div>

                    {/* Search Bar */}
                    <form onSubmit={handleSearchSubmit} className="relative group">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors">
                            <span className="material-symbols-outlined text-3xl">database_search</span>
                        </div>
                        <input
                            value={localQuery}
                            onChange={(e) => setLocalQuery(e.target.value)}
                            className="w-full h-20 px-20 rounded-[40px] bg-surface border border-black/5 dark:border-white/5 text-text-main text-xl font-bold placeholder:text-text-muted/30 focus:border-primary/40 focus:shadow-2xl outline-none transition-all"
                            placeholder={t("search_placeholder_main")}
                        />
                        <button
                            type="submit"
                            className="absolute right-3 top-3 bottom-3 px-10 bg-primary hover:bg-primary-hover text-white text-xs font-black uppercase tracking-widest rounded-[32px] shadow-[0_10px_30px_rgba(255,90,95,0.2)] hover:shadow-2xl transition-all duration-500 ease-out cursor-pointer active:scale-[0.97] hover:scale-[1.02] flex items-center justify-center gap-2"
                        >
                            {t("forum_search_button")}
                        </button>
                    </form>

                    {/* Results Count */}
                    <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-6">
                        <h2 className="text-xl font-black text-text-main uppercase tracking-widest">
                            <span className="text-primary italic mr-2">{total}</span> {t("search_results_found")}
                        </h2>
                        {loading && <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>}
                    </div>

                    {/* Book Grid */}
                    {loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                <div key={i} className="flex flex-col gap-4 animate-pulse">
                                    <div className="aspect-[3/4.2] w-full rounded-[28px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5" />
                                    <div className="h-4 w-3/4 rounded-full bg-black/5 dark:bg-white/5" />
                                    <div className="h-3 w-1/2 rounded-full bg-black/5 dark:bg-white/5" />
                                </div>
                            ))}
                        </div>
                    ) : results.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-40 rounded-[40px] bg-surface/20 apple-glass border border-black/5 dark:border-white/5 text-center opacity-40">
                            <span className="material-symbols-outlined text-7xl mb-6">explore_off</span>
                            <h2 className="text-2xl font-black text-text-main uppercase tracking-tight mb-2">{t("search_empty_title")}</h2>
                            <p className="text-sm font-medium text-text-muted">{t("search_empty_desc")}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8">
                            {results.map(book => (
                                <Link key={book.id} href={`/pdf/${book.id}`} className="group flex flex-col gap-4">
                                    <div className="relative aspect-[3/4.2] rounded-[32px] overflow-hidden bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 shadow-2xl group-hover:shadow-[0_0_30px_rgba(255,90,95,0.15)] group-hover:border-primary/40 transition-all duration-500">
                                        {book.thumbnailPath ? (
                                            <Image src={book.thumbnailPath} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" alt={book.title} />
                                        ) : (
                                            <div className={`w-full h-full bg-surface flex items-center justify-center p-8 text-center opacity-30 group-hover:opacity-100 transition-opacity`}>
                                                <p className="text-primary font-black text-xs uppercase leading-tight tracking-widest">{book.title}</p>
                                            </div>
                                        )}
                                        {/* Overlay Info */}
                                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-white/70 uppercase tracking-widest">
                                                    <span className="material-symbols-outlined text-xs">visibility</span> {book.viewCount || 0}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-yellow-500 uppercase tracking-widest">
                                                    <span className="material-symbols-outlined text-xs fill-icon">star</span> {book.avgRating?.toFixed(1) || "0.0"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-1 flex flex-col gap-1">
                                        <h3 className="font-black text-text-main text-base leading-tight truncate group-hover:text-primary transition-colors">{book.title}</h3>
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest truncate">{book.author || t("search_unknown_source")}</p>
                                            <span className="text-[9px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/10 uppercase tracking-widest">{book.category?.name || t("search_library")}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3 pt-12">
                            <button
                                disabled={page === 1}
                                onClick={() => updateFilters({ page: (page - 1).toString() })}
                                className="size-12 rounded-2xl bg-surface border border-black/5 dark:border-white/5 flex items-center justify-center text-text-main disabled:opacity-20 hover:bg-primary hover:text-white transition-all active:scale-90 shadow-sm"
                            >
                                <span className="material-symbols-outlined">chevron_left</span>
                            </button>
                            <div className="flex items-center gap-2">
                                {[...Array(totalPages)].map((_, i) => {
                                    const p = i + 1;
                                    // Show first, last, and pages around current
                                    if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
                                        return (
                                            <button
                                                key={p}
                                                onClick={() => updateFilters({ page: p.toString() })}
                                                className={`size-12 rounded-2xl border transition-all font-black text-sm active:scale-90 ${page === p ? "bg-primary border-primary text-white shadow-lg shadow-[rgba(255,90,95,0.2)] scale-110" : "bg-surface border-black/5 dark:border-white/5 text-text-muted hover:bg-bg-dark shadow-sm"}`}
                                            >
                                                {p}
                                            </button>
                                        );
                                    } else if (p === page - 2 || p === page + 2) {
                                        return <span key={p} className="text-text-muted">...</span>;
                                    }
                                    return null;
                                })}
                            </div>
                            <button
                                disabled={page === totalPages}
                                onClick={() => updateFilters({ page: (page + 1).toString() })}
                                className="size-12 rounded-2xl bg-surface border border-black/5 dark:border-white/5 flex items-center justify-center text-text-main disabled:opacity-20 hover:bg-primary hover:text-white transition-all active:scale-90 shadow-sm"
                            >
                                <span className="material-symbols-outlined">chevron_right</span>
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="size-12 rounded-full border-2 border-primary border-t-transparent animate-spin"></div></div>}>
            <SearchContent />
        </Suspense>
    );
}
