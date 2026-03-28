"use client";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
    currentPage: number;
    numPages: number;
    scale: number;
    onScaleChange: (scale: number) => void;
    onPageChange: (page: number) => void;
    onToggleSidebar: () => void;
    onToggleSearch: () => void;
    onToggleAI?: () => void;
    sidebarOpen: boolean;
    searchOpen: boolean;
    bookTitle: string;
    onBack: () => void;
    filePath?: string;
}

const ZOOM_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0];

export default function PDFToolbar({
    currentPage,
    numPages,
    scale,
    onScaleChange,
    onPageChange,
    onToggleSidebar,
    onToggleSearch,
    onToggleAI,
    sidebarOpen,
    searchOpen,
    bookTitle,
    onBack,
    filePath,
}: Props) {
    const { t } = useLanguage();
    const handleZoomIn = () => {
        const next = ZOOM_PRESETS.find((z) => z > scale + 0.01);
        onScaleChange(next ?? 3.0);
    };

    const handleZoomOut = () => {
        const prev = [...ZOOM_PRESETS].reverse().find((z) => z < scale - 0.01);
        onScaleChange(prev ?? 0.5);
    };

    const handlePageInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            const val = parseInt((e.target as HTMLInputElement).value);
            if (val >= 1 && val <= numPages) {
                onPageChange(val);
            }
        }
    };

    return (
        <div className="h-14 bg-surface/80 backdrop-blur-xl flex items-center justify-between px-4 gap-3 text-text-main text-sm select-none shrink-0 border-b border-black/5 dark:border-white/5 shadow-sm z-50">
            {/* Left: Back + Sidebar toggle */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onBack}
                    className="size-10 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-primary transition-all active:scale-95 flex items-center justify-center border border-transparent hover:border-black/5 dark:hover:border-white/5"
                    title={t("pdf_back_hub")}
                >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>

                <div className="w-px h-6 bg-black/5 dark:bg-white/5 mx-1" />

                <button
                    onClick={onToggleSidebar}
                    className={`size-10 rounded-xl transition-all active:scale-95 flex items-center justify-center border ${sidebarOpen
                        ? "bg-primary/10 text-primary border-primary/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]"
                        : "text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5 border-transparent"}`}
                    title={t("reader_toggle_sidebar")}
                >
                    <span className="material-symbols-outlined text-[20px]">menu</span>
                </button>
            </div>

            {/* Center: Page navigation & Zoom */}
            <div className="flex items-center gap-2">
                {/* Page nav */}
                <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 rounded-2xl p-1 h-10 border border-black/5 dark:border-white/5">
                    <button
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1}
                        className="size-8 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-text-muted hover:text-primary disabled:opacity-20 transition-all flex items-center justify-center active:scale-90"
                    >
                        <span className="material-symbols-outlined text-[20px]">expand_less</span>
                    </button>

                    <div className="flex items-center gap-1.5 text-[11px] font-black px-1">
                        <input
                            type="text"
                            defaultValue={currentPage}
                            key={currentPage}
                            onKeyDown={handlePageInput}
                            className="w-10 text-center bg-white dark:bg-black/20 rounded-lg py-1 text-text-main outline-none focus:ring-2 focus:ring-primary/50 text-[11px] font-black border border-black/5 dark:border-white/5 shadow-inner"
                        />
                        <span className="text-text-muted/40">/</span>
                        <span className="text-text-muted min-w-[20px] uppercase tracking-tighter">{numPages}</span>
                    </div>

                    <button
                        onClick={() => onPageChange(Math.min(numPages, currentPage + 1))}
                        disabled={currentPage >= numPages}
                        className="size-8 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-text-muted hover:text-primary disabled:opacity-20 transition-all flex items-center justify-center active:scale-90"
                    >
                        <span className="material-symbols-outlined text-[20px]">expand_more</span>
                    </button>
                </div>

                <div className="w-px h-6 bg-black/5 dark:bg-white/5 mx-1 hidden sm:block" />

                {/* Zoom controls */}
                <div className="hidden sm:flex items-center gap-1 bg-black/5 dark:bg-white/5 rounded-2xl p-1 h-10 border border-black/5 dark:border-white/5">
                    <button
                        onClick={handleZoomOut}
                        disabled={scale <= 0.5}
                        className="size-8 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-text-muted hover:text-primary disabled:opacity-20 transition-all flex items-center justify-center active:scale-90"
                    >
                        <span className="material-symbols-outlined text-[20px]">remove</span>
                    </button>

                    <div className="relative group">
                        <select
                            value={scale}
                            onChange={(e) => onScaleChange(parseFloat(e.target.value))}
                            className="bg-white dark:bg-black/20 text-[10px] font-black text-text-main outline-none cursor-pointer w-16 h-8 text-center appearance-none rounded-lg border border-black/5 dark:border-white/5 hover:border-primary/30 transition-all shadow-inner px-1 uppercase tracking-tighter"
                        >
                            {ZOOM_PRESETS.map((z) => (
                                <option key={z} value={z} className="bg-surface text-text-main">
                                    {Math.round(z * 100)}%
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleZoomIn}
                        disabled={scale >= 3.0}
                        className="size-8 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-text-muted hover:text-primary disabled:opacity-20 transition-all flex items-center justify-center active:scale-90"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                    </button>
                </div>
            </div>

            {/* Right: Tools */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onToggleSearch}
                    className={`size-10 rounded-xl transition-all active:scale-95 flex items-center justify-center border ${searchOpen
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5 border-transparent"}`}
                    title={t("reader_search_tooltip")}
                >
                    <span className="material-symbols-outlined text-[20px]">search</span>
                </button>

                {filePath && (
                    <button
                        onClick={() => window.open(filePath, "_blank")}
                        className="size-10 rounded-xl text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-black/5 dark:hover:border-white/5 transition-all hidden sm:flex items-center justify-center active:scale-95"
                        title={t("reader_print")}
                    >
                        <span className="material-symbols-outlined text-[20px]">print</span>
                    </button>
                )}

                <button
                    onClick={() => {
                        if (document.fullscreenElement) {
                            document.exitFullscreen();
                        } else {
                            document.documentElement.requestFullscreen();
                        }
                    }}
                    className="size-10 rounded-xl text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-black/5 dark:hover:border-white/5 transition-all hidden md:flex items-center justify-center active:scale-95"
                    title={t("reader_fullscreen")}
                >
                    <span className="material-symbols-outlined text-[20px]">fullscreen</span>
                </button>

                {onToggleAI && (
                    <button
                        onClick={onToggleAI}
                        className="size-10 rounded-xl bg-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] text-white hover:scale-105 active:scale-95 transition-all flex items-center justify-center border border-primary/20"
                        title={t("reader_ai_assistant")}
                    >
                        <span className="material-symbols-outlined text-[20px] fill-icon">smart_toy</span>
                    </button>
                )}
            </div>
        </div>
    );
}
