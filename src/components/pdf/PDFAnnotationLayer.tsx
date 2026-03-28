"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";

export type AnnotationType = "highlight" | "freehand" | "note" | "eraser" | "text";

export interface Annotation {
    id: string;
    type: AnnotationType;
    page: number;
    color: string;
    // For highlight: rect area
    rect?: { x: number; y: number; w: number; h: number };
    // For freehand: array of points
    points?: { x: number; y: number }[];
    // For note: position + text
    position?: { x: number; y: number };
    text?: string;
    createdAt: number;
}

interface Props {
    bookId: string;
    currentPage: number;
    numPages: number;
    scale: number;
    activeTool: AnnotationType | null;
    activeColor: string;
    onToolChange: (tool: AnnotationType | null) => void;
}

const STORAGE_KEY = (bookId: string) => `pdf_annotations_${bookId}`;

export default function PDFAnnotationLayer({
    bookId,
    currentPage,
    numPages,
    scale,
    activeTool,
    activeColor,
    onToolChange,
}: Props) {
    const { t } = useLanguage();
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [drawing, setDrawing] = useState(false);
    const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
    const [highlightStart, setHighlightStart] = useState<{ x: number; y: number } | null>(null);
    const [highlightRect, setHighlightRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
    const [editingNote, setEditingNote] = useState<string | null>(null);
    const [noteText, setNoteText] = useState("");
    const overlayRef = useRef<HTMLDivElement>(null);
    const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialLoadRef = useRef(true);

    // Load annotations: try API first, fallback to localStorage cache
    useEffect(() => {
        let cancelled = false;
        const loadAnnotations = async () => {
            // Show localStorage cache instantly for fast feel
            try {
                const stored = localStorage.getItem(STORAGE_KEY(bookId));
                if (stored && !cancelled) setAnnotations(JSON.parse(stored));
            } catch { }

            // Then fetch from cloud (authoritative source)
            try {
                const res = await fetch(`/api/annotations?bookId=${bookId}`);
                if (res.ok && !cancelled) {
                    const data = await res.json();
                    if (data.annotations && data.annotations.length > 0) {
                        setAnnotations(data.annotations);
                        // Update cache
                        localStorage.setItem(STORAGE_KEY(bookId), JSON.stringify(data.annotations));
                    }
                    setSyncStatus("synced");
                }
            } catch {
                // Offline — localStorage cache is fine
                setSyncStatus("idle");
            }
            if (!cancelled) isInitialLoadRef.current = false;
        };
        loadAnnotations();
        return () => { cancelled = true; };
    }, [bookId]);

    // Debounced cloud sync on annotation change
    useEffect(() => {
        // Skip initial hydration to avoid re-syncing what we just loaded
        if (isInitialLoadRef.current) return;

        // Always update localStorage immediately (fast cache)
        try {
            localStorage.setItem(STORAGE_KEY(bookId), JSON.stringify(annotations));
        } catch { }

        // Debounce cloud sync (2 seconds)
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        setSyncStatus("syncing");
        syncTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch("/api/annotations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ bookId, annotations }),
                });
                if (res.ok) {
                    setSyncStatus("synced");
                } else {
                    setSyncStatus("error");
                }
            } catch {
                setSyncStatus("error");
            }
        }, 2000);

        return () => {
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        };
    }, [annotations, bookId]);

    const genId = () => `ann_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Find the page container element from click coordinates
    const getPageFromEvent = (e: React.MouseEvent): { page: number; x: number; y: number } | null => {
        const target = e.target as HTMLElement;
        const pageEl = target.closest("[data-page]");
        if (!pageEl) return null;
        const rect = pageEl.getBoundingClientRect();
        return {
            page: Number(pageEl.getAttribute("data-page")),
            x: (e.clientX - rect.left) / scale,
            y: (e.clientY - rect.top) / scale,
        };
    };

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!activeTool) return;
        const info = getPageFromEvent(e);
        if (!info) return;

        if (activeTool === "freehand") {
            setDrawing(true);
            setCurrentPoints([{ x: info.x, y: info.y }]);
        } else if (activeTool === "highlight") {
            setHighlightStart({ x: info.x, y: info.y });
            setHighlightRect(null);
        } else if (activeTool === "note") {
            const id = genId();
            const newNote: Annotation = {
                id,
                type: "note",
                page: info.page,
                color: activeColor,
                position: { x: info.x, y: info.y },
                text: "",
                createdAt: Date.now(),
            };
            setAnnotations(prev => [...prev, newNote]);
            setEditingNote(id);
            setNoteText("");
            onToolChange(null);
        }
    }, [activeTool, activeColor, scale, onToolChange]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!activeTool) return;
        const info = getPageFromEvent(e);
        if (!info) return;

        if (activeTool === "freehand" && drawing) {
            setCurrentPoints(prev => [...prev, { x: info.x, y: info.y }]);
        } else if (activeTool === "highlight" && highlightStart) {
            setHighlightRect({
                x: Math.min(highlightStart.x, info.x),
                y: Math.min(highlightStart.y, info.y),
                w: Math.abs(info.x - highlightStart.x),
                h: Math.abs(info.y - highlightStart.y),
            });
        }
    }, [activeTool, drawing, highlightStart, scale]);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        if (!activeTool) return;
        const info = getPageFromEvent(e);
        if (!info) return;

        if (activeTool === "freehand" && drawing && currentPoints.length > 1) {
            setAnnotations(prev => [...prev, {
                id: genId(),
                type: "freehand",
                page: info.page,
                color: activeColor,
                points: currentPoints,
                createdAt: Date.now(),
            }]);
        } else if (activeTool === "highlight" && highlightRect && highlightRect.w > 5 && highlightRect.h > 5) {
            setAnnotations(prev => [...prev, {
                id: genId(),
                type: "highlight",
                page: info.page,
                color: activeColor,
                rect: highlightRect,
                createdAt: Date.now(),
            }]);
        }

        setDrawing(false);
        setCurrentPoints([]);
        setHighlightStart(null);
        setHighlightRect(null);
    }, [activeTool, drawing, currentPoints, highlightRect, activeColor]);

    const deleteAnnotation = (id: string) => {
        setAnnotations(prev => prev.filter(a => a.id !== id));
        if (editingNote === id) setEditingNote(null);
    };

    const saveNoteText = (id: string) => {
        setAnnotations(prev => prev.map(a =>
            a.id === id ? { ...a, text: noteText } : a
        ));
        setEditingNote(null);
    };

    // Render annotations for a specific page
    const renderPageAnnotations = (pageNum: number) => {
        const pageAnns = annotations.filter(a => a.page === pageNum);
        return pageAnns.map(ann => {
            if (ann.type === "highlight" && ann.rect) {
                return (
                    <div
                        key={ann.id}
                        className="absolute group cursor-pointer"
                        style={{
                            left: `${ann.rect.x * scale}px`,
                            top: `${ann.rect.y * scale}px`,
                            width: `${ann.rect.w * scale}px`,
                            height: `${ann.rect.h * scale}px`,
                            backgroundColor: ann.color,
                            opacity: 0.3,
                            borderRadius: "2px",
                            pointerEvents: "auto",
                        }}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}
                            className="absolute -top-3 -right-3 size-5 bg-red-500 text-white rounded-full text-[10px] leading-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-md"
                        >×</button>
                    </div>
                );
            }

            if (ann.type === "freehand" && ann.points && ann.points.length > 1) {
                const pts = ann.points;
                const pathData = `M ${pts[0].x * scale} ${pts[0].y * scale} ` +
                    pts.slice(1).map(p => `L ${p.x * scale} ${p.y * scale}`).join(" ");
                return (
                    <svg
                        key={ann.id}
                        className="absolute inset-0 pointer-events-none"
                        style={{ width: "100%", height: "100%", overflow: "visible" }}
                    >
                        <path
                            d={pathData}
                            stroke={ann.color}
                            strokeWidth={2 * scale}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="pointer-events-auto cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}
                        />
                    </svg>
                );
            }

            if (ann.type === "note" && ann.position) {
                const isEditing = editingNote === ann.id;
                return (
                    <div
                        key={ann.id}
                        className="absolute group"
                        style={{
                            left: `${ann.position.x * scale}px`,
                            top: `${ann.position.y * scale}px`,
                            zIndex: 10,
                            pointerEvents: "auto",
                        }}
                    >
                        {isEditing ? (
                            <div className="bg-yellow-100 border border-yellow-400 rounded-lg shadow-xl p-2 w-48" style={{ transform: "translate(-50%, -100%)" }}>
                                <textarea
                                    autoFocus
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    className="w-full h-20 text-xs bg-transparent border-none outline-none resize-none text-gray-800"
                                    placeholder={t("note_placeholder")}
                                />
                                <div className="flex justify-end gap-1 mt-1">
                                    <button onClick={() => setEditingNote(null)} className="px-2 py-0.5 text-[10px] text-gray-500 hover:text-gray-700">{t("common_cancel")}</button>
                                    <button onClick={() => saveNoteText(ann.id)} className="px-2 py-0.5 text-[10px] bg-yellow-500 text-white rounded">{t("note_save")}</button>
                                </div>
                            </div>
                        ) : (
                            <div
                                className="relative cursor-pointer"
                                onClick={() => { setEditingNote(ann.id); setNoteText(ann.text || ""); }}
                            >
                                <div className="size-6 rounded-full shadow-lg flex items-center justify-center text-text-main text-xs font-bold" style={{ backgroundColor: ann.color }}>
                                    <span className="material-symbols-outlined text-sm">note</span>
                                </div>
                                {ann.text && (
                                    <div className="absolute top-7 left-0 bg-yellow-100 border border-yellow-300 rounded-md shadow-lg p-2 w-40 text-[10px] text-gray-700 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        {ann.text}
                                    </div>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}
                                    className="absolute -top-2 -right-2 size-4 bg-red-500 text-white rounded-full text-[8px] leading-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow"
                                >×</button>
                            </div>
                        )}
                    </div>
                );
            }

            return null;
        });
    };

    // Find all page containers and inject annotations
    useEffect(() => {
        if (!overlayRef.current) return;

        // Watch for page containers
        const pageElements = document.querySelectorAll("[data-page]");
        pageElements.forEach(el => {
            const pageNum = Number(el.getAttribute("data-page"));
            let overlay = el.querySelector(".annotation-overlay") as HTMLDivElement;
            if (!overlay) {
                overlay = document.createElement("div");
                overlay.className = "annotation-overlay absolute inset-0";
                overlay.style.zIndex = "5";
                overlay.style.pointerEvents = activeTool ? "auto" : "none";
                el.appendChild(overlay);
            } else {
                overlay.style.pointerEvents = activeTool ? "auto" : "none";
            }
        });
    }, [annotations, activeTool, currentPage]);

    return (
        <>
            {/* Invisible global event catcher for drawing */}
            <div
                ref={overlayRef}
                className="absolute inset-0"
                style={{
                    zIndex: activeTool ? 20 : -1,
                    cursor: activeTool === "freehand" ? "crosshair" : activeTool === "highlight" ? "crosshair" : activeTool === "note" ? "cell" : "default",
                    pointerEvents: activeTool ? "auto" : "none",
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            />

            {/* Render current drawing in-progress */}
            {drawing && currentPoints.length > 1 && (
                <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 25 }}>
                    <path
                        d={`M ${currentPoints[0].x * scale} ${currentPoints[0].y * scale} ` +
                            currentPoints.slice(1).map(p => `L ${p.x * scale} ${p.y * scale}`).join(" ")}
                        stroke={activeColor}
                        strokeWidth={2 * scale}
                        fill="none"
                        strokeLinecap="round"
                    />
                </svg>
            )}

            {/* Highlight preview */}
            {highlightRect && (
                <div
                    className="absolute pointer-events-none"
                    style={{
                        left: `${highlightRect.x * scale}px`,
                        top: `${highlightRect.y * scale}px`,
                        width: `${highlightRect.w * scale}px`,
                        height: `${highlightRect.h * scale}px`,
                        backgroundColor: activeColor,
                        opacity: 0.25,
                        borderRadius: "2px",
                        border: `1px dashed ${activeColor}`,
                        zIndex: 25,
                    }}
                />
            )}

            {/* Cloud Sync Status Indicator */}
            <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-2xl bg-surface border border-border shadow-lg text-xs font-bold uppercase tracking-widest pointer-events-none select-none transition-all duration-500" style={{ opacity: syncStatus === "idle" ? 0 : 1 }}>
                {syncStatus === "syncing" && (
                    <>
                        <span className="material-symbols-outlined text-primary text-sm animate-spin">sync</span>
                        <span className="text-text-muted">{t("sync_syncing")}</span>
                    </>
                )}
                {syncStatus === "synced" && (
                    <>
                        <span className="material-symbols-outlined text-emerald-500 text-sm fill-icon">cloud_done</span>
                        <span className="text-text-muted">{t("sync_saved")}</span>
                    </>
                )}
                {syncStatus === "error" && (
                    <>
                        <span className="material-symbols-outlined text-red-500 text-sm fill-icon">cloud_off</span>
                        <span className="text-text-muted">{t("sync_offline")}</span>
                    </>
                )}
            </div>
        </>
    );
}
