"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import PDFToolbar from "@/components/pdf/PDFToolbar";
import PDFSidebar from "@/components/pdf/PDFSidebar";
import PDFSearchPanel from "@/components/pdf/PDFSearchPanel";
import PDFAnnotationToolbar from "@/components/pdf/PDFAnnotationToolbar";
import PDFExportAnnotations from "@/components/pdf/PDFExportAnnotations";
import DraggableFloatingToolbar from "@/components/pdf/DraggableFloatingToolbar";
import type { ViewerState, AnnotationType, Annotation } from "@/components/pdf/PDFContinuousViewer";
import { useLanguage } from "@/context/LanguageContext";

// Dynamic imports to avoid SSR issues
function ViewerLoading() {
    const { t } = useLanguage();
    return (
        <div className="flex-1 flex items-center justify-center bg-[#2a2a2e]">
            <div className="flex flex-col items-center gap-4">
                <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-2xl animate-spin">progress_activity</span>
                </div>
                <p className="text-text-main/50 text-xs font-medium">{t("reader_initializing")}</p>
            </div>
        </div>
    );
}

const PDFContinuousViewer = dynamic(
    () => import("@/components/pdf/PDFContinuousViewer"),
    {
        ssr: false,
        loading: () => <ViewerLoading />,
    }
);

const PDFAIPanel = dynamic(
    () => import("@/components/pdf/PDFAIPanel"),
    { ssr: false }
);

export default function PDFReaderPage() {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();
    const { t } = useLanguage();
    const [book, setBook] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Viewer state
    const [viewerState, setViewerState] = useState<ViewerState>({
        currentPage: 1,
        numPages: 0,
        scale: 1.0,
        pdfDoc: null,
        outline: null,
    });

    // UI state
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchMatchIndex, setSearchMatchIndex] = useState(0);
    const [totalMatches, setTotalMatches] = useState(0);
    const [initialPage, setInitialPage] = useState(1);

    // Zen Mode & Mobile layout
    const [zenMode, setZenMode] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Annotation state
    const [activeTool, setActiveTool] = useState<AnnotationType | null>(null);
    const [activeColor, setActiveColor] = useState("rgba(255, 235, 59, 0.8)");

    // AI state
    const [aiOpen, setAiOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState<string | undefined>();
    const [pdfTextContent, setPdfTextContent] = useState("");

    // Dark mode + annotations for export
    const [darkMode, setDarkMode] = useState(false);
    const [allAnnotations, setAllAnnotations] = useState<Annotation[]>([]);

    // Reading progress (Phase 15)
    const [readingProgress, setReadingProgress] = useState(0);

    // Text selection highlight popup (Phase 14)
    const [selectionPopup, setSelectionPopup] = useState<{ x: number; y: number; text: string } | null>(null);
    const selectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Reading enhancements (Phase 29)
    const [isSpeaking, setIsSpeaking] = useState(false);

    const handleTTS = useCallback((textToSpeak: string) => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            if (!textToSpeak) return; // Acts as a stop toggle
        }
        if (!textToSpeak) return;

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = "id-ID"; // Try ID, fallback to EN implicitly based on text
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
    }, []);

    useEffect(() => {
        return () => {
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        };
    }, []);

    // Extract text from current visible page for AI context
    useEffect(() => {
        const timer = setTimeout(() => {
            const pageEl = document.querySelector(`[data-page="${viewerState.currentPage}"]`);
            if (pageEl) {
                const textLayer = pageEl.querySelector(".textLayer");
                if (textLayer) {
                    setPdfTextContent(textLayer.textContent || "");
                }
            }
        }, 1000); // Wait for text layer to render
        return () => clearTimeout(timer);
    }, [viewerState.currentPage]);

    // Fetch book data and reading history
    useEffect(() => {
        Promise.all([
            fetch(`/api/books/${id}`).then(r => r.json()),
            fetch(`/api/history`).then(r => r.json()).catch(() => ({ history: [] })),
        ]).then(([bookData, historyData]) => {
            setBook(bookData);
            setLoading(false);
            if (historyData.history) {
                const past = historyData.history.find((h: any) => h.bookId === id);
                if (past?.lastPage > 1) setInitialPage(past.lastPage);
            }

            const mobileCheck = window.innerWidth < 1024;
            setIsMobile(mobileCheck);
            if (!mobileCheck) setSidebarOpen(true);
        }).catch(() => setLoading(false));

        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [id]);

    // Save reading history (debounced)
    useEffect(() => {
        if (!book || viewerState.currentPage <= 0) return;
        const timeout = setTimeout(() => {
            fetch("/api/history", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookId: id, lastPage: viewerState.currentPage }),
            }).catch(() => { });
        }, 2000);
        return () => clearTimeout(timeout);
    }, [viewerState.currentPage, id, book]);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "f") { e.preventDefault(); setSearchOpen(prev => !prev); }
            if (e.ctrlKey && e.key === "h") { e.preventDefault(); setActiveTool(prev => prev === "highlight" ? null : "highlight"); }
            if (e.ctrlKey && e.key === "d") { e.preventDefault(); setActiveTool(prev => prev === "freehand" ? null : "freehand"); }
            if (e.ctrlKey && e.key === "n" && !e.shiftKey) { e.preventDefault(); setActiveTool(prev => prev === "note" ? null : "note"); }
            if (e.ctrlKey && e.key === "b") { e.preventDefault(); /* Bookmark sidebar */ }
            if (e.ctrlKey && e.key === "z" && !e.shiftKey) { e.preventDefault(); (window as any).__pdfUndo?.(); }
            if ((e.ctrlKey && e.key === "y") || (e.ctrlKey && e.shiftKey && e.key === "z")) { e.preventDefault(); (window as any).__pdfRedo?.(); }
            if (e.key === "Escape") {
                if (activeTool) setActiveTool(null);
                else setZenMode(false); // Exit Zen Mode on Esc
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [activeTool]);

    const handleStateChange = useCallback((partial: Partial<ViewerState>) => {
        setViewerState(prev => ({ ...prev, ...partial }));
    }, []);

    const handlePageChange = useCallback((page: number) => {
        const scrollFn = (window as any).__pdfScrollToPage;
        if (scrollFn) scrollFn(page);
        setViewerState(prev => ({ ...prev, currentPage: page }));
    }, []);

    const handleSearch = useCallback((query: string, matchIndex: number) => {
        setSearchQuery(query);
        setSearchMatchIndex(matchIndex);
        if (!query.trim()) setTotalMatches(0);
    }, []);

    // Count search matches
    useEffect(() => {
        if (!searchQuery.trim()) { setTotalMatches(0); return; }
        const timer = setTimeout(() => {
            setTotalMatches(document.querySelectorAll(".search-highlight").length);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, viewerState.currentPage]);

    // Reading progress scroll handler (Phase 15)
    useEffect(() => {
        const handler = () => {
            const viewer = document.querySelector(".flex-1.overflow-auto.bg-\\[\\#525659\\]");
            if (viewer) {
                const p = viewer.scrollTop / Math.max(1, viewer.scrollHeight - viewer.clientHeight);
                setReadingProgress(Math.min(100, Math.round(p * 100)));
            }
        };
        const viewer = document.querySelector(".flex-1.overflow-auto.bg-\\[\\#525659\\]");
        if (viewer) viewer.addEventListener("scroll", handler, { passive: true });
        return () => { if (viewer) viewer.removeEventListener("scroll", handler); };
    }, [viewerState.numPages]);

    // Text selection highlight popup (Phase 14)
    useEffect(() => {
        const onMouseUp = () => {
            if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
            selectionTimerRef.current = setTimeout(() => {
                const sel = window.getSelection();
                if (!sel || sel.isCollapsed || !sel.toString().trim()) {
                    setSelectionPopup(null);
                    return;
                }
                // Only show if selection is inside a .textLayer
                const anchor = sel.anchorNode?.parentElement;
                if (!anchor?.closest(".textLayer")) {
                    setSelectionPopup(null);
                    return;
                }
                const range = sel.getRangeAt(0);
                const rect = range.getBoundingClientRect();

                // Advanced extraction to solve missing spaces in PDF text layer spans
                const container = document.createElement("div");
                container.appendChild(range.cloneContents());

                let extracted = "";
                const walk = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
                let node;
                while ((node = walk.nextNode())) {
                    if (node.textContent?.trim()) {
                        extracted += node.textContent + " ";
                    }
                }
                const extractedText = extracted.trim().replace(/\s+/g, " ");

                setSelectionPopup({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 8,
                    text: extractedText,
                });
            }, 200);
        };
        const onMouseDown = (e: MouseEvent) => {
            if ((e.target as HTMLElement).closest("#pdf-selection-popup")) return;
            setSelectionPopup(null);
        };
        document.addEventListener("mouseup", onMouseUp);
        document.addEventListener("mousedown", onMouseDown);
        return () => {
            document.removeEventListener("mouseup", onMouseUp);
            document.removeEventListener("mousedown", onMouseDown);
        };
    }, []);

    if (loading || !book) {
        return (
            <div className="flex items-center justify-center h-[100dvh] bg-bg-dark">
                <div className="flex flex-col items-center gap-6 animate-fade-up">
                    <div className="size-16 rounded-[24px] bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_30px_rgba(var(--primary-rgb),0.1)]">
                        <span className="material-symbols-outlined text-primary text-3xl animate-spin">progress_activity</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <p className="text-text-main text-sm font-black uppercase tracking-widest">{t("reader_init_core")}</p>
                        <p className="text-text-muted text-[10px] font-bold uppercase tracking-tighter opacity-50">{t("reader_sync_assets")}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[100dvh] bg-[#141417] overflow-hidden">
            {/* Toolbar (Hides in Zen Mode unless hovered/tapped at top, floats on mobile) */}
            <div className={`transition-transform duration-300 z-40 ${zenMode ? '-translate-y-full absolute top-0 inset-x-0 hover:translate-y-0' : (isMobile ? 'absolute top-0 inset-x-0 overflow-hidden shadow-2xl border border-black/10 dark:border-white/10' : 'relative')}`}>
                <PDFToolbar
                    currentPage={viewerState.currentPage}
                    numPages={viewerState.numPages}
                    scale={viewerState.scale}
                    onScaleChange={(s) => setViewerState(prev => ({ ...prev, scale: s }))}
                    onPageChange={handlePageChange}
                    onToggleSidebar={() => setSidebarOpen(prev => !prev)}
                    onToggleSearch={() => setSearchOpen(prev => !prev)}
                    sidebarOpen={sidebarOpen}
                    searchOpen={searchOpen}
                    bookTitle={book.title}
                    onBack={() => router.push(`/pdf/${id}`)}
                    filePath={book.filePath}
                />
            </div>

            {/* Reading Progress Bar (Phase 15) */}
            <div className="h-0.5 bg-[#2a2a2e] shrink-0 relative">
                <div
                    className="h-full bg-gradient-to-r from-primary via-blue-400 to-cyan-400 transition-all duration-300 ease-out"
                    style={{ width: `${readingProgress}%` }}
                />
            </div>

            {/* Main area */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* Sidebar */}
                <PDFSidebar
                    pdfDoc={viewerState.pdfDoc}
                    outline={viewerState.outline}
                    numPages={viewerState.numPages}
                    currentPage={viewerState.currentPage}
                    onPageSelect={handlePageChange}
                    open={sidebarOpen}
                    bookId={id}
                />

                {/* Viewer area */}
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    {/* Search Panel (floating) */}
                    <PDFSearchPanel
                        open={searchOpen}
                        onClose={() => { setSearchOpen(false); setSearchQuery(""); setTotalMatches(0); }}
                        onSearch={handleSearch}
                        totalMatches={totalMatches}
                    />

                    {/* Continuous Viewer (annotations integrated per-page) */}
                    <PDFContinuousViewer
                        filePath={book.filePath}
                        initialPage={initialPage}
                        scale={viewerState.scale}
                        onStateChange={handleStateChange}
                        searchQuery={searchQuery}
                        searchMatchIndex={searchMatchIndex}
                        activeTool={activeTool}
                        activeColor={activeColor}
                        bookId={id}
                        onToolChange={setActiveTool}
                        onAnnotationsChange={setAllAnnotations}
                        darkMode={darkMode}
                    />

                    {/* AI Panel (slides from right) */}
                    <PDFAIPanel
                        open={aiOpen}
                        onClose={() => setAiOpen(false)}
                        bookId={id}
                        bookTitle={book.title}
                        currentPage={viewerState.currentPage}
                        numPages={viewerState.numPages}
                        pdfTextContent={pdfTextContent}
                        initialPrompt={aiPrompt}
                    />

                    {/* Floating Annotation Toolbar (Draggable, Memoized to prevent lag) */}
                    <DraggableFloatingToolbar
                        zenMode={zenMode}
                        activeTool={activeTool}
                        setActiveTool={setActiveTool}
                        activeColor={activeColor}
                        setActiveColor={setActiveColor}
                        allAnnotations={allAnnotations}
                        bookTitle={book.title}
                        bookId={id}
                        pdfTextContent={pdfTextContent}
                        setAiPrompt={setAiPrompt}
                        setAiOpen={setAiOpen}
                        handleTTS={handleTTS}
                        isSpeaking={isSpeaking}
                        darkMode={darkMode}
                        setDarkMode={setDarkMode}
                        aiOpen={aiOpen}
                        setZenMode={setZenMode}
                        setSidebarOpen={setSidebarOpen}
                    />
                </div>
            </div>


            {/* Text Selection Highlight Popup (Phase 14) */}
            {selectionPopup && (
                <div
                    id="pdf-selection-popup"
                    className={`fixed z-50 flex items-center gap-1 px-2 py-1.5 border rounded-lg shadow-xl animate-fade-up backdrop-blur-xl ${darkMode ? 'bg-[#1a1a1e]/95 border-white/15' : 'bg-white/95 border-black/10'}`}
                    style={{ left: `${selectionPopup.x}px`, top: `${selectionPopup.y}px`, transform: "translate(-50%, -100%)" }}
                >
                    <button
                        onClick={() => {
                            setAiPrompt(`${t("reader_explain_prompt")}\n\n"${selectionPopup.text}"`);
                            setAiOpen(true);
                            setSelectionPopup(null);
                        }}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-[11px] font-bold ${darkMode ? 'text-purple-400 hover:bg-white/5' : 'text-purple-600 hover:bg-black/5'}`}
                    >
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        {t("reader_ask_ai")}
                    </button>
                    <div className={`w-px h-4 ${darkMode ? 'bg-white/10' : 'bg-black/10'}`} />
                    <button
                        onClick={() => {
                            setAiPrompt(`${t("reader_translate_prompt")}\n\n"${selectionPopup.text}"`);
                            setAiOpen(true);
                            setSelectionPopup(null);
                        }}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-[11px] font-bold ${darkMode ? 'text-blue-400 hover:bg-white/5' : 'text-blue-600 hover:bg-black/5'}`}
                    >
                        <span className="material-symbols-outlined text-sm">translate</span>
                        {t("reader_translate")}
                    </button>
                    <div className={`w-px h-4 ${darkMode ? 'bg-white/10' : 'bg-black/10'}`} />
                    <button
                        onClick={() => {
                            handleTTS(selectionPopup.text);
                            setSelectionPopup(null);
                        }}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-[11px] font-bold ${darkMode ? 'text-green-400 hover:bg-white/5' : 'text-green-600 hover:bg-black/5'}`}
                    >
                        <span className="material-symbols-outlined text-sm">volume_up</span>
                        {t("reader_read_aloud")}
                    </button>
                    <div className={`w-px h-4 ${darkMode ? 'bg-white/10' : 'bg-black/10'}`} />
                    <button
                        onClick={() => {
                            // Create highlight annotation from selected text
                            const sel = window.getSelection();
                            if (sel && !sel.isCollapsed) {
                                const range = sel.getRangeAt(0);
                                const pageEl = range.startContainer.parentElement?.closest("[data-page]");
                                if (pageEl) {
                                    const pageNum = parseInt(pageEl.getAttribute("data-page") || "1");
                                    const pageRect = pageEl.getBoundingClientRect();
                                    const selRect = range.getBoundingClientRect();
                                    const scale = viewerState.scale;
                                    // Add annotation via window API
                                    (window as any).__pdfAddHighlight?.({
                                        page: pageNum,
                                        rect: {
                                            x: (selRect.left - pageRect.left) / scale,
                                            y: (selRect.top - pageRect.top) / scale,
                                            w: selRect.width / scale,
                                            h: selRect.height / scale,
                                        },
                                        text: selectionPopup.text,
                                        color: activeColor,
                                    });
                                    sel.removeAllRanges();
                                }
                            }
                            setSelectionPopup(null);
                        }}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-[11px] font-bold ${darkMode ? 'text-amber-300 hover:bg-white/5' : 'text-amber-600 hover:bg-black/5'}`}
                    >
                        <span className="material-symbols-outlined text-sm">ink_highlighter</span>
                        {t("reader_highlight")}
                    </button>
                    <div className={`w-px h-4 ${darkMode ? 'bg-white/10' : 'bg-black/10'}`} />
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(selectionPopup.text);
                            setSelectionPopup(null);
                        }}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-[11px] font-bold ${darkMode ? 'text-text-main/60 hover:bg-white/5' : 'text-text-main/70 hover:bg-black/5'}`}
                    >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        {t("reader_copy")}
                    </button>
                </div>
            )}
        </div>
    );
}
