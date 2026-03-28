"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
    pdfDoc: pdfjsLib.PDFDocumentProxy | null;
    outline: any[] | null;
    numPages: number;
    currentPage: number;
    onPageSelect: (page: number) => void;
    open: boolean;
    bookId: string;
}

type Tab = "thumbnails" | "outline" | "bookmarks";

interface Bookmark {
    page: number;
    label: string;
    createdAt: number;
}

export default function PDFSidebar({
    pdfDoc,
    outline,
    numPages,
    currentPage,
    onPageSelect,
    open,
    bookId,
}: Props) {
    const { t } = useLanguage();
    const [tab, setTab] = useState<Tab>("thumbnails");
    const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const thumbContainerRef = useRef<HTMLDivElement>(null);
    const thumbObserver = useRef<IntersectionObserver | null>(null);

    // Load bookmarks from localStorage (per book)
    const bmKey = `pdf-bookmarks-${bookId}`;
    useEffect(() => {
        const stored = localStorage.getItem(bmKey);
        if (stored) {
            try {
                setBookmarks(JSON.parse(stored));
            } catch { /* ignore */ }
        }
    }, [bmKey]);

    const saveBookmarks = (bms: Bookmark[]) => {
        setBookmarks(bms);
        localStorage.setItem(bmKey, JSON.stringify(bms));
    };

    const addBookmark = () => {
        const exists = bookmarks.find(b => b.page === currentPage);
        if (exists) return;
        const bm: Bookmark = {
            page: currentPage,
            label: `Page ${currentPage}`,
            createdAt: Date.now(),
        };
        saveBookmarks([...bookmarks, bm].sort((a, b) => a.page - b.page));
    };

    const removeBookmark = (page: number) => {
        saveBookmarks(bookmarks.filter(b => b.page !== page));
    };

    // Generate thumbnail for a page
    const generateThumbnail = useCallback(async (pageNum: number) => {
        if (!pdfDoc || thumbnails.has(pageNum)) return;
        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 0.2 });
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: ctx, viewport }).promise;
            const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
            setThumbnails(prev => new Map(prev).set(pageNum, dataUrl));
        } catch { /* ignore */ }
    }, [pdfDoc, thumbnails]);

    // Lazy-load thumbnails with IntersectionObserver
    useEffect(() => {
        if (tab !== "thumbnails" || !pdfDoc || !open) return;

        thumbObserver.current?.disconnect();
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const pageNum = Number(entry.target.getAttribute("data-thumb"));
                        if (pageNum) generateThumbnail(pageNum);
                    }
                });
            },
            {
                root: thumbContainerRef.current,
                rootMargin: "200px 0px",
                threshold: 0.01,
            }
        );

        thumbObserver.current = observer;

        // Observe all thumb placeholders
        const container = thumbContainerRef.current;
        if (container) {
            container.querySelectorAll("[data-thumb]").forEach(el => observer.observe(el));
        }

        return () => observer.disconnect();
    }, [tab, pdfDoc, open, numPages, generateThumbnail]);

    // Scroll active thumbnail into view
    useEffect(() => {
        if (tab !== "thumbnails" || !open) return;
        const activeThumb = thumbContainerRef.current?.querySelector(`[data-thumb="${currentPage}"]`);
        if (activeThumb) {
            activeThumb.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [currentPage, tab, open]);

    // Navigate outline items
    const navigateOutline = async (item: any) => {
        if (!pdfDoc) return;
        try {
            const dest = item.dest;
            if (typeof dest === "string") {
                const resolved = await pdfDoc.getDestination(dest);
                if (resolved) {
                    const pageIndex = await pdfDoc.getPageIndex(resolved[0]);
                    onPageSelect(pageIndex + 1);
                }
            } else if (Array.isArray(dest)) {
                const pageIndex = await pdfDoc.getPageIndex(dest[0]);
                onPageSelect(pageIndex + 1);
            }
        } catch { /* ignore */ }
    };

    if (!open) return null;

    return (
        <aside className="w-56 lg:w-64 bg-bg-dark/80 backdrop-blur-md border-r border-black/5 dark:border-white/5 flex flex-col shrink-0 overflow-hidden h-full z-40">
            {/* Tabs */}
            <div className="flex border-b border-black/5 dark:border-white/5 shrink-0 bg-surface/50">
                {([
                    { id: "thumbnails" as Tab, icon: "grid_view", label: t("reader_tab_pages") },
                    { id: "outline" as Tab, icon: "toc", label: t("reader_tab_toc") },
                    { id: "bookmarks" as Tab, icon: "bookmark", label: t("reader_tab_bookmarks") },
                ]).map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-1 py-3 flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-[0.15em] transition-all relative ${tab === t.id
                            ? "text-primary bg-primary/5"
                            : "text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5"
                            }`}
                    >
                        <span className="material-symbols-outlined text-[18px] mb-0.5">{t.icon}</span>
                        {t.label}
                        {tab === t.id && (
                            <div className="absolute bottom-0 inset-x-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto" ref={thumbContainerRef}>
                {/* Thumbnails */}
                {tab === "thumbnails" && (
                    <div className="p-3 grid grid-cols-2 gap-2">
                        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                            <button
                                key={pageNum}
                                data-thumb={pageNum}
                                onClick={() => onPageSelect(pageNum)}
                                className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${pageNum === currentPage
                                    ? "border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)] scale-[0.98]"
                                    : "border-black/5 dark:border-white/5 hover:border-primary/30"
                                    }`}
                            >
                                {thumbnails.has(pageNum) ? (
                                    <img
                                        src={thumbnails.get(pageNum)}
                                        alt={`Page ${pageNum}`}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-[#3e3e42] flex items-center justify-center">
                                        <span className="text-text-main/20 text-[10px] font-bold">{pageNum}</span>
                                    </div>
                                )}
                                <div className={`absolute bottom-0 inset-x-0 text-center py-0.5 text-[9px] font-bold ${pageNum === currentPage ? "bg-primary text-white" : "bg-black/60 text-white/60"
                                    }`}>
                                    {pageNum}
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Outline / TOC */}
                {tab === "outline" && (
                    <div className="p-2">
                        {outline && outline.length > 0 ? (
                            <OutlineTree items={outline} onNavigate={navigateOutline} level={0} />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-main/30">
                                <span className="material-symbols-outlined text-3xl">toc</span>
                                <p className="text-xs font-bold">{t("reader_no_toc")}</p>
                                <p className="text-[10px] text-center px-4">{t("reader_no_toc_msg")}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Bookmarks */}
                {tab === "bookmarks" && (
                    <div className="p-3 flex flex-col gap-2">
                        <button
                            onClick={addBookmark}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary/10 border border-primary/20 rounded-lg text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[16px]">bookmark_add</span>
                            {t("reader_add_bookmark")} {currentPage}
                        </button>

                        {bookmarks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-main/30">
                                <span className="material-symbols-outlined text-3xl">bookmarks</span>
                                <p className="text-xs font-bold">{t("reader_no_bookmarks")}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1 mt-2">
                                {bookmarks.map((bm) => (
                                    <div
                                        key={bm.page}
                                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors group ${bm.page === currentPage
                                            ? "bg-primary/10 text-primary"
                                            : "hover:bg-black/5 dark:bg-white/5 text-white/70"
                                            }`}
                                    >
                                        <button
                                            onClick={() => onPageSelect(bm.page)}
                                            className="flex items-center gap-2 flex-1 min-w-0 text-left"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">bookmark</span>
                                            <span className="text-xs font-bold truncate">{bm.label}</span>
                                        </button>
                                        <button
                                            onClick={() => removeBookmark(bm.page)}
                                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-black/10 dark:bg-white/10 text-text-main/40 hover:text-red-400 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </aside>
    );
}

// Recursive outline tree
function OutlineTree({ items, onNavigate, level }: { items: any[]; onNavigate: (item: any) => void; level: number }) {
    return (
        <ul className="flex flex-col" style={{ paddingLeft: level > 0 ? "12px" : "0" }}>
            {items.map((item, idx) => (
                <li key={idx}>
                    <button
                        onClick={() => onNavigate(item)}
                        className="w-full text-left px-3 py-2 rounded-md text-xs text-text-main/70 hover:text-text-main hover:bg-black/5 dark:bg-white/5 transition-colors truncate flex items-center gap-1.5 cursor-pointer"
                    >
                        {item.items && item.items.length > 0 && (
                            <span className="material-symbols-outlined text-[14px] text-text-main/30">chevron_right</span>
                        )}
                        <span className="truncate font-medium">{item.title}</span>
                    </button>
                    {item.items && item.items.length > 0 && (
                        <OutlineTree items={item.items} onNavigate={onNavigate} level={level + 1} />
                    )}
                </li>
            ))}
        </ul>
    );
}
