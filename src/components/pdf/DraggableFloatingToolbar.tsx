"use client";

import { useState, useRef, useCallback, memo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import PDFAnnotationToolbar from "./PDFAnnotationToolbar";
import PDFExportAnnotations from "./PDFExportAnnotations";
import type { AnnotationType, Annotation } from "./PDFContinuousViewer";

interface Props {
    zenMode: boolean;
    activeTool: AnnotationType | null;
    setActiveTool: (tool: AnnotationType | null) => void;
    activeColor: string;
    setActiveColor: (color: string) => void;
    allAnnotations: Annotation[];
    bookTitle: string;
    bookId: string;
    pdfTextContent: string;
    setAiPrompt: (prompt: string) => void;
    setAiOpen: (open: boolean) => void;
    handleTTS: (text: string) => void;
    isSpeaking: boolean;
    darkMode: boolean;
    setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
    aiOpen: boolean;
    setZenMode: (val: boolean | ((prev: boolean) => boolean)) => void;
    setSidebarOpen: (val: boolean) => void;
}

const DraggableFloatingToolbar = memo(function DraggableFloatingToolbar({
    zenMode,
    activeTool,
    setActiveTool,
    activeColor,
    setActiveColor,
    allAnnotations,
    bookTitle,
    bookId,
    pdfTextContent,
    setAiPrompt,
    setAiOpen,
    handleTTS,
    isSpeaking,
    darkMode,
    setDarkMode,
    aiOpen,
    setZenMode,
    setSidebarOpen,
}: Props) {
    const { t } = useLanguage();
    // Draggable Toolbar State (Isolated here to prevent re-rendering the whole page!)
    const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
    const [toolbarExpanded, setToolbarExpanded] = useState(true);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
    const animationFrameRef = useRef<number | null>(null);

    const handleDragStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        isDraggingRef.current = true;
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            posX: toolbarPos.x,
            posY: toolbarPos.y
        };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, [toolbarPos]);

    const handleDragMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingRef.current) return;

        // Prevent default touch actions (like scrolling) during drag
        e.preventDefault();

        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

        animationFrameRef.current = requestAnimationFrame(() => {
            const deltaX = e.clientX - dragStartRef.current.x;
            const deltaY = e.clientY - dragStartRef.current.y;

            setToolbarPos({
                x: dragStartRef.current.posX + deltaX,
                y: dragStartRef.current.posY + deltaY
            });
        });
    }, []);

    const handleDragEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        isDraggingRef.current = false;
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }, []);

    return (
        <div
            className={`absolute z-30 flex items-center gap-1 p-1.5 bg-white/90 dark:bg-black/80 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-2xl shadow-[0_12px_40px_-5px_rgba(0,0,0,0.3)] transition-opacity duration-300 ${zenMode ? 'opacity-20 hover:opacity-100' : ''}`}
            style={{
                bottom: '32px',
                left: '50%',
                transform: `translate3d(calc(-50% + ${toolbarPos.x}px), ${toolbarPos.y}px, 0)`,
                touchAction: 'none'
            }}
        >
            {/* Drag Handle */}
            <div
                className="flex items-center justify-center pl-1 pr-2 py-2 cursor-grab active:cursor-grabbing text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/70 transition-colors"
                onPointerDown={handleDragStart}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                onPointerCancel={handleDragEnd}
                title={t("toolkit_drag")}
            >
                <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
            </div>

            {/* Main Toolkit Button */}
            <div className="relative">
                <button
                    onClick={() => setToolbarExpanded(!toolbarExpanded)}
                    className={`flex items-center gap-3 pl-3 pr-4 h-11 rounded-xl transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest border ${toolbarExpanded
                        ? "bg-primary text-white border-primary shadow-[0_8px_20px_-5px_rgba(255,90,95,0.4)]"
                        : "bg-black/5 dark:bg-white/10 text-text-main dark:text-white border-transparent hover:bg-black/10 dark:hover:bg-white/20"}`}
                >
                    <span className="material-symbols-outlined text-[20px]">widgets</span>
                    <span>{t("toolkit_label")}</span>
                    <span className={`material-symbols-outlined text-[16px] transition-transform duration-300 ${toolbarExpanded ? 'rotate-180' : ''}`}>
                        keyboard_arrow_up
                    </span>
                </button>

                {/* Vertical Dropdown Menu */}
                {toolbarExpanded && (
                    <div className={`absolute bottom-full mb-4 left-0 w-[280px] border rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 flex flex-col gap-1 z-50 animate-fade-up backdrop-blur-3xl ${darkMode ? 'bg-[#141417]/95 border-white/10' : 'bg-white/95 border-black/10'}`}>
                        {/* Annotation Section */}
                        <div className={`p-2 pt-1 border-b mb-1 ${darkMode ? 'border-white/5' : 'border-black/5'}`}>
                            <div className={`text-[9px] font-black uppercase tracking-[0.2em] mb-3 ml-2 ${darkMode ? 'text-white/30' : 'text-black/30'}`}>{t("toolkit_quick_tools")}</div>
                            <PDFAnnotationToolbar
                                activeTool={activeTool}
                                onToolChange={setActiveTool}
                                activeColor={activeColor}
                                onColorChange={setActiveColor}
                                darkMode={darkMode}
                            />
                        </div>

                        {/* Actions Section */}
                        <div className="flex flex-col gap-1">
                            <PDFExportAnnotations
                                annotations={allAnnotations}
                                bookTitle={bookTitle}
                                bookId={bookId}
                                darkMode={darkMode}
                            />

                            <button
                                onClick={() => {
                                    setAiPrompt(`${t("toolkit_translate_page_prompt")}\n\n"${pdfTextContent.substring(0, 1500)}..."`);
                                    setAiOpen(true);
                                    setToolbarExpanded(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-bold ${darkMode ? 'text-white/50 hover:text-white hover:bg-white/5' : 'text-black/50 hover:text-black hover:bg-black/5'}`}
                            >
                                <span className="material-symbols-outlined text-[20px]">translate</span>
                                {t("toolkit_translate_page")}
                            </button>

                            <button
                                onClick={() => {
                                    handleTTS(isSpeaking ? "" : pdfTextContent);
                                    if (!isSpeaking) setToolbarExpanded(false);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-xs font-bold ${isSpeaking ? "bg-green-500/10 text-green-400" : (darkMode ? "text-white/50 hover:text-white hover:bg-white/5" : "text-black/50 hover:text-black hover:bg-black/5")}`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-[20px]">{isSpeaking ? "stop_circle" : "record_voice_over"}</span>
                                    <span>{isSpeaking ? t("toolkit_stop_reading") : t("toolkit_read_text")}</span>
                                </div>
                                {isSpeaking && <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />}
                            </button>

                            <div className={`h-px my-1 mx-2 ${darkMode ? 'bg-white/5' : 'bg-black/5'}`} />

                            <button
                                onClick={() => {
                                    setDarkMode(!darkMode);
                                    setToolbarExpanded(false);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-xs font-bold ${darkMode ? 'text-white/50 hover:text-white hover:bg-white/5' : 'text-black/50 hover:text-black hover:bg-black/5'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-[20px]">{darkMode ? "light_mode" : "dark_mode"}</span>
                                    <span>{darkMode ? t("toolkit_mode_light") : t("toolkit_mode_dark")}</span>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    setAiOpen(true);
                                    setToolbarExpanded(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${aiOpen ? "bg-primary/10 text-primary" : (darkMode ? "text-white/50 hover:text-white hover:bg-white/5" : "text-black/50 hover:text-black hover:bg-black/5")}`}
                            >
                                <span className={`material-symbols-outlined text-[20px] ${aiOpen ? "fill-icon" : ""}`}>auto_awesome</span>
                                {t("toolkit_ask_ai")}
                            </button>

                            <button
                                onClick={() => {
                                    setZenMode(!zenMode);
                                    if (!zenMode) setSidebarOpen(false);
                                    setToolbarExpanded(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${zenMode ? "bg-primary text-white" : (darkMode ? "text-white/50 hover:text-white hover:bg-white/5" : "text-black/50 hover:text-black hover:bg-black/5")}`}
                            >
                                <span className="material-symbols-outlined text-[20px]">{zenMode ? 'fullscreen_exit' : 'fullscreen'}</span>
                                {t("toolkit_zen_mode")}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export default DraggableFloatingToolbar;
