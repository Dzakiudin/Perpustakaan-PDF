"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

interface SearchResult {
    id: string;
    title: string;
    author: string;
    thumbnailPath?: string;
    color?: string;
}

interface NavSearchProps {
    searchPlaceholder: string;
}

export default function NavSearch({ searchPlaceholder }: NavSearchProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const handleSearch = useCallback((value: string) => {
        setSearchQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (value.trim().length < 2) {
            setSearchResults([]);
            setSearchOpen(false);
            return;
        }
        setSearching(true);
        setSearchOpen(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}`);
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data.results || []);
                }
            } catch { /* ignore */ }
            setSearching(false);
        }, 350);
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={searchRef} id="tour-search" className="flex-1 max-w-2xl relative pointer-events-auto group/search">
            <div className="relative flex items-center h-10 md:h-14 w-full rounded-2xl bg-surface hover:bg-surface-hover backdrop-blur-md border border-border focus-within:bg-surface focus-within:border-black/5 dark:focus-within:border-white/10 focus-within:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)] transition-all duration-300 ease-out overflow-hidden">
                <div className="absolute left-3 md:left-6 text-text-muted flex items-center justify-center pointer-events-none">
                    {searching ? (
                        <span className="material-symbols-outlined text-[20px] md:text-[24px] text-primary animate-spin">progress_activity</span>
                    ) : (
                        <span className="material-symbols-outlined text-[20px] md:text-[24px] group-focus-within/search:text-primary transition-colors">search</span>
                    )}
                </div>
                <input
                    id="nav-search"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => searchQuery.length >= 2 && setSearchOpen(true)}
                    className="w-full h-full bg-transparent border-none focus:ring-0 text-text-main placeholder:text-text-muted pl-10 pr-4 md:pl-16 md:pr-6 text-sm md:text-base font-medium tracking-wide outline-none"
                    placeholder={searchPlaceholder}
                />
            </div>

            {searchOpen && (
                <div className="absolute top-[calc(100%+8px)] left-0 right-0 p-2 bg-surface backdrop-blur-2xl border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[420px] overflow-y-auto z-[200] animate-fade-up">
                    {searchResults.length > 0 ? (
                        <div className="flex flex-col gap-1">
                            <p className="px-5 py-3 text-[11px] font-bold text-text-muted uppercase tracking-[0.1em] border-b border-border mb-1">Search Results</p>
                            {searchResults.map((book) => (
                                <Link
                                    key={book.id}
                                    href={`/pdf/${book.id}`}
                                    onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                                    className="flex items-center gap-4 px-4 py-3 hover:bg-surface-hover rounded-2xl transition-all duration-300 group"
                                >
                                    <div className="relative w-12 h-16 rounded-[10px] shrink-0 overflow-hidden shadow-sm border border-border transition-transform group-hover:scale-105">
                                        {book.thumbnailPath ? (
                                            <Image src={book.thumbnailPath} fill sizes="48px" className="object-cover" alt={book.title || "Cover"} />
                                        ) : (
                                            <div className={`w-full h-full bg-gradient-to-br ${book.color || "from-blue-500 to-indigo-700"} flex items-center justify-center`}>
                                                <span className="text-[10px] text-white font-black uppercase text-center p-1 leading-tight">{book.title?.substring(0, 10)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[15px] font-bold text-text-main truncate group-hover:text-primary transition-colors">{book.title}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[13px] text-text-muted font-medium truncate">{book.author}</span>
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined text-text-muted opacity-0 group-hover:opacity-100 transition-all mr-2">arrow_forward</span>
                                </Link>
                            ))}
                        </div>
                    ) : searching ? (
                        <div className="p-8 text-center flex flex-col items-center gap-3">
                            <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
                            <p className="text-sm font-medium text-text-muted">Analyzing library...</p>
                        </div>
                    ) : (
                        <div className="p-10 text-center flex flex-col items-center gap-4">
                            <span className="material-symbols-outlined text-4xl text-text-muted">search_off</span>
                            <p className="text-sm font-medium text-text-muted">Nothing found for &quot;<span className="text-text-main font-bold">{searchQuery}</span>&quot;</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
