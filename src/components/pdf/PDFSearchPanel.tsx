"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
    open: boolean;
    onClose: () => void;
    onSearch: (query: string, matchIndex: number) => void;
    totalMatches?: number;
}

export default function PDFSearchPanel({ open, onClose, onSearch, totalMatches = 0 }: Props) {
    const { t } = useLanguage();
    const [query, setQuery] = useState("");
    const [matchIndex, setMatchIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    useEffect(() => {
        if (open) {
            const handler = (e: KeyboardEvent) => {
                if (e.key === "Escape") {
                    onClose();
                }
            };
            window.addEventListener("keydown", handler);
            return () => window.removeEventListener("keydown", handler);
        }
    }, [open, onClose]);

    const handleSearch = (newQuery: string) => {
        setQuery(newQuery);
        setMatchIndex(0);
        onSearch(newQuery, 0);
    };

    const goNext = () => {
        if (totalMatches === 0) return;
        const next = (matchIndex + 1) % totalMatches;
        setMatchIndex(next);
        onSearch(query, next);
    };

    const goPrev = () => {
        if (totalMatches === 0) return;
        const prev = (matchIndex - 1 + totalMatches) % totalMatches;
        setMatchIndex(prev);
        onSearch(query, prev);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            if (e.shiftKey) {
                goPrev();
            } else {
                goNext();
            }
        }
    };

    if (!open) return null;

    return (
        <div className="absolute top-14 right-4 z-50 flex items-center gap-2 bg-[#323236] border border-[#3e3e42] rounded-lg shadow-2xl px-3 py-2 animate-in slide-in-from-top-2">
            <span className="material-symbols-outlined text-text-main/40 text-[18px]">search</span>

            <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("reader_search_placeholder")}
                className="w-48 sm:w-64 bg-transparent text-text-main text-sm outline-none placeholder:text-text-main/25"
            />

            {query && (
                <span className="text-text-main/40 text-[11px] font-mono whitespace-nowrap min-w-[50px] text-center">
                    {totalMatches > 0 ? `${matchIndex + 1}/${totalMatches}` : "0/0"}
                </span>
            )}

            <div className="flex items-center gap-0.5">
                <button
                    onClick={goPrev}
                    disabled={totalMatches === 0}
                    className="p-1 rounded hover:bg-black/10 dark:bg-white/10 disabled:opacity-30 transition-colors text-text-main/60"
                >
                    <span className="material-symbols-outlined text-[16px]">keyboard_arrow_up</span>
                </button>
                <button
                    onClick={goNext}
                    disabled={totalMatches === 0}
                    className="p-1 rounded hover:bg-black/10 dark:bg-white/10 disabled:opacity-30 transition-colors text-text-main/60"
                >
                    <span className="material-symbols-outlined text-[16px]">keyboard_arrow_down</span>
                </button>
            </div>

            <button
                onClick={onClose}
                className="p-1 rounded hover:bg-black/10 dark:bg-white/10 transition-colors text-text-main/40"
            >
                <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
        </div>
    );
}
