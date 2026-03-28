"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { runOCR as ocrManagerRun, getCachedOCR, terminateOCR, getOCRQueueSize, type OCRResult } from "./ocrManager";

// Set worker - v3.x uses .js, not .mjs
if (typeof window !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export interface ViewerState {
    currentPage: number;
    numPages: number;
    scale: number;
    pdfDoc: pdfjsLib.PDFDocumentProxy | null;
    outline: any[] | null;
}

export type AnnotationType = "highlight" | "freehand" | "note" | "eraser" | "text";

export interface Annotation {
    id: string;
    type: AnnotationType;
    page: number;
    color: string;
    rect?: { x: number; y: number; w: number; h: number };
    points?: { x: number; y: number }[];
    position?: { x: number; y: number };
    text?: string;
    createdAt: number;
}

interface Props {
    filePath: string;
    initialPage?: number;
    scale: number;
    onStateChange: (state: Partial<ViewerState>) => void;
    searchQuery?: string;
    searchMatchIndex?: number;
    activeTool: AnnotationType | null;
    activeColor: string;
    bookId: string;
    onToolChange: (tool: AnnotationType | null) => void;
    onAnnotationsChange?: (annotations: Annotation[]) => void;
    darkMode?: boolean;
}

interface PageInfo {
    pageNum: number;
    width: number;
    height: number;
}

const STORAGE_KEY = (bookId: string) => `pdf_annotations_${bookId}`;
const genId = () => `ann_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ─── Individual Page Component ──────────────────────────────────────
function PDFPage({
    pdfDoc,
    pageNum,
    scale,
    isVisible,
    baseWidth,
    baseHeight,
    annotations,
    activeTool,
    activeColor,
    onAddAnnotation,
    onDeleteAnnotation,
    onUpdateAnnotation,
    onToolChange,
    bookId,
    onOCRComplete,
}: {
    pdfDoc: pdfjsLib.PDFDocumentProxy;
    pageNum: number;
    scale: number;
    isVisible: boolean;
    baseWidth: number;
    baseHeight: number;
    annotations: Annotation[];
    activeTool: AnnotationType | null;
    activeColor: string;
    onAddAnnotation: (ann: Annotation) => void;
    onDeleteAnnotation: (id: string) => void;
    onUpdateAnnotation: (id: string, data: Partial<Annotation>) => void;
    onToolChange: (tool: AnnotationType | null) => void;
    bookId: string;
    onOCRComplete?: () => void;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textLayerRef = useRef<HTMLDivElement>(null);
    const renderTaskRef = useRef<any>(null);
    const [rendered, setRendered] = useState(false);
    const prevScaleRef = useRef<number | null>(null);

    // Annotation drawing state — use REFS to avoid stale closures during drag
    const drawingRef = useRef(false);
    const drawPointsRef = useRef<{ x: number; y: number }[]>([]);
    const hlStartRef = useRef<{ x: number; y: number } | null>(null);
    const hlRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
    const [renderTick, setRenderTick] = useState(0); // Force re-render for live preview
    const [editingNote, setEditingNote] = useState<string | null>(null);
    const [noteText, setNoteText] = useState("");
    const annotSvgRef = useRef<SVGSVGElement>(null);

    // OCR state
    const [ocrRunning, setOcrRunning] = useState(false);
    const [ocrQueueInfo, setOcrQueueInfo] = useState("");

    useEffect(() => {
        if (!isVisible) return;
        if (prevScaleRef.current === scale && rendered) return;
        prevScaleRef.current = scale;

        let cancelled = false;

        async function render() {
            const canvas = canvasRef.current;
            const textDiv = textLayerRef.current;
            if (!canvas || !textDiv) return;

            try {
                if (renderTaskRef.current) {
                    try { renderTaskRef.current.cancel(); } catch { }
                }

                const page = await pdfDoc.getPage(pageNum);
                if (cancelled) return;

                const viewport = page.getViewport({ scale });
                const ctx = canvas.getContext("2d");
                if (!ctx) return;

                const dpr = window.devicePixelRatio || 1;
                canvas.width = viewport.width * dpr;
                canvas.height = viewport.height * dpr;
                canvas.style.width = `${viewport.width}px`;
                canvas.style.height = `${viewport.height}px`;
                ctx.scale(dpr, dpr);

                const renderTask = page.render({ canvasContext: ctx, viewport });
                renderTaskRef.current = renderTask;
                await renderTask.promise;
                if (cancelled) return;

                // Text layer
                textDiv.innerHTML = "";
                textDiv.style.width = `${viewport.width}px`;
                textDiv.style.height = `${viewport.height}px`;
                textDiv.style.setProperty("--scale-factor", String(scale));

                const textContent = await page.getTextContent();
                if (cancelled) return;

                if (textContent.items && textContent.items.length > 0) {
                    const renderTextTask = pdfjsLib.renderTextLayer({
                        textContent: textContent,
                        container: textDiv,
                        viewport,
                        textDivs: [],
                    } as any);
                    if (renderTextTask?.promise) await renderTextTask.promise;
                } else {
                    // Scanned PDF — use OCR manager (cached + shared worker)
                    if (!cancelled) applyOCR(canvas, textDiv, viewport.width, viewport.height);
                }

                if (!cancelled) setRendered(true);
            } catch (err: any) {
                if (err?.name !== "RenderingCancelledException" && !cancelled) {
                    console.error(`Error rendering page ${pageNum}:`, err);
                }
            }
        }

        render();
        return () => {
            cancelled = true;
            if (renderTaskRef.current) {
                try { renderTaskRef.current.cancel(); } catch { }
            }
        };
    }, [pdfDoc, pageNum, scale, isVisible]);

    // OCR — uses shared worker + localStorage cache
    const applyOCR = async (canvas: HTMLCanvasElement, textDiv: HTMLDivElement, vpWidth: number, vpHeight: number) => {
        // Check cache first (instant)
        const cached = getCachedOCR(bookId, pageNum);
        if (cached) {
            renderOCRWords(cached, textDiv, vpWidth, vpHeight);
            return;
        }

        // Queue for OCR processing
        setOcrRunning(true);
        setOcrQueueInfo(`Queue: ${getOCRQueueSize() + 1}`);
        try {
            const result = await ocrManagerRun(canvas, bookId, pageNum);
            if (result) {
                renderOCRWords(result, textDiv, vpWidth, vpHeight);
                onOCRComplete?.();
            }
        } catch (err) {
            console.error(`OCR error page ${pageNum}:`, err);
        } finally {
            setOcrRunning(false);
            setOcrQueueInfo("");
        }
    };

    const renderOCRWords = (result: OCRResult, textDiv: HTMLDivElement, vpWidth: number, vpHeight: number) => {
        if (!result.words || result.words.length === 0) return;

        // Use percentages for absolute alignment relative to the physical capture
        const px = 100 / (result.width || vpWidth);
        const py = 100 / (result.height || vpHeight);

        // Scale factor for font-size (physical to current logical px)
        const ry = vpHeight / (result.height || vpHeight);

        for (const word of result.words) {
            const span = document.createElement("span");
            // Add a forced space at the end of each word
            span.textContent = word.text + " ";
            const bbox = word.bbox;

            span.style.position = "absolute";
            span.style.left = `${bbox.x0 * px}%`;
            span.style.top = `${bbox.y0 * py}%`;
            span.style.width = `${(bbox.x1 - bbox.x0) * px}%`;
            span.style.height = `${(bbox.y1 - bbox.y0) * py}%`;
            span.style.fontSize = `${(bbox.y1 - bbox.y0) * ry}px`;
            span.style.fontFamily = "sans-serif";
            span.style.color = "transparent";
            // Selection stability improvements
            span.style.whiteSpace = "pre-wrap";
            span.style.cursor = "text";
            span.style.display = "inline-block";
            span.style.lineHeight = "1";
            span.style.overflow = "hidden";
            span.style.textAlign = "center";
            span.style.letterSpacing = "-0.01em";

            // Add custom class for potential future styling/targeting
            span.className = "ocr-text-span";
            textDiv.appendChild(span);
        }
    };

    // --- Annotation mouse handlers (using refs, no stale closure issues) ---
    const interactionRef = useRef<HTMLDivElement>(null);

    const getLocalCoords = useCallback((e: MouseEvent) => {
        const el = interactionRef.current;
        if (!el) return { x: 0, y: 0 };
        const rect = el.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / scale,
            y: (e.clientY - rect.top) / scale,
        };
    }, [scale]);

    // Native DOM event listeners for reliable drag tracking
    useEffect(() => {
        const el = interactionRef.current;
        if (!el || !activeTool) return;

        const onDown = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const { x, y } = getLocalCoords(e);

            if (activeTool === "eraser") return;

            if (activeTool === "freehand") {
                drawingRef.current = true;
                drawPointsRef.current = [{ x, y }];

                // Clear current path
                if (annotSvgRef.current) {
                    const path = annotSvgRef.current.querySelector(".live-path");
                    if (path) path.setAttribute("d", `M ${x * scale} ${y * scale}`);
                }
            } else if (activeTool === "highlight") {
                hlStartRef.current = { x, y };
                hlRectRef.current = null;
                drawingRef.current = true;
            } else if (activeTool === "note" || activeTool === "text") {
                const id = genId();
                onAddAnnotation({
                    id,
                    type: activeTool,
                    page: pageNum,
                    color: activeColor,
                    position: { x, y },
                    text: "",
                    createdAt: Date.now(),
                });
                setEditingNote(id);
                setNoteText("");
                onToolChange(null);
            }
        };

        const onMove = (e: MouseEvent) => {
            if (!drawingRef.current) return;
            const { x, y } = getLocalCoords(e);

            if (activeTool === "freehand") {
                drawPointsRef.current.push({ x, y });
                // Update SVG path directly
                if (annotSvgRef.current) {
                    const pts = drawPointsRef.current;
                    const pathEl = annotSvgRef.current.querySelector(".live-path") as SVGPathElement;
                    if (pathEl) {
                        pathEl.setAttribute("d",
                            `M ${pts[0].x * scale} ${pts[0].y * scale} ` +
                            pts.slice(1).map(p => `L ${p.x * scale} ${p.y * scale}`).join(" ")
                        );
                    }
                }
            } else if (activeTool === "highlight" && hlStartRef.current) {
                hlRectRef.current = {
                    x: Math.min(hlStartRef.current.x, x),
                    y: Math.min(hlStartRef.current.y, y),
                    w: Math.abs(x - hlStartRef.current.x),
                    h: Math.abs(y - hlStartRef.current.y),
                };
                const hlEl = document.getElementById(`hl-preview-${pageNum}`);
                if (hlEl && hlRectRef.current) {
                    const r = hlRectRef.current;
                    hlEl.style.left = `${r.x * scale}px`;
                    hlEl.style.top = `${r.y * scale}px`;
                    hlEl.style.width = `${r.w * scale}px`;
                    hlEl.style.height = `${r.h * scale}px`;
                    hlEl.style.display = "block";
                }
            }
        };

        const onUp = () => {
            if (!drawingRef.current) return;

            if (activeTool === "freehand" && drawPointsRef.current.length > 2) {
                onAddAnnotation({
                    id: genId(),
                    type: "freehand",
                    page: pageNum,
                    color: activeColor,
                    points: [...drawPointsRef.current],
                    createdAt: Date.now(),
                });
            } else if (activeTool === "highlight" && hlRectRef.current && hlRectRef.current.w > 5 && hlRectRef.current.h > 5) {
                onAddAnnotation({
                    id: genId(),
                    type: "highlight",
                    page: pageNum,
                    color: activeColor,
                    rect: { ...hlRectRef.current },
                    createdAt: Date.now(),
                });
            }

            // Reset
            drawingRef.current = false;
            drawPointsRef.current = [];
            hlStartRef.current = null;
            hlRectRef.current = null;
            const hlEl = document.getElementById(`hl-preview-${pageNum}`);
            if (hlEl) hlEl.style.display = "none";
            if (annotSvgRef.current) {
                const pathEl = annotSvgRef.current.querySelector(".live-path") as SVGPathElement;
                if (pathEl) pathEl.setAttribute("d", "");
            }
            setRenderTick(t => t + 1);
        };

        el.addEventListener("mousedown", onDown);
        el.addEventListener("mousemove", onMove);
        el.addEventListener("mouseup", onUp);
        window.addEventListener("mouseup", onUp);

        // Touch support for mobile/tablet
        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length !== 1) return;
            e.preventDefault();
            const touch = e.touches[0];
            onDown({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => { }, stopPropagation: () => { } } as any);
        };
        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length !== 1) return;
            e.preventDefault();
            const touch = e.touches[0];
            onMove({ clientX: touch.clientX, clientY: touch.clientY } as any);
        };
        const onTouchEnd = (e: TouchEvent) => {
            e.preventDefault();
            onUp();
        };

        el.addEventListener("touchstart", onTouchStart, { passive: false });
        el.addEventListener("touchmove", onTouchMove, { passive: false });
        el.addEventListener("touchend", onTouchEnd, { passive: false });

        return () => {
            el.removeEventListener("mousedown", onDown);
            el.removeEventListener("mousemove", onMove);
            el.removeEventListener("mouseup", onUp);
            window.removeEventListener("mouseup", onUp);
            el.removeEventListener("touchstart", onTouchStart);
            el.removeEventListener("touchmove", onTouchMove);
            el.removeEventListener("touchend", onTouchEnd);
        };
    }, [activeTool, activeColor, scale, pageNum, getLocalCoords, onAddAnnotation, onToolChange]);

    const w = baseWidth * scale;
    const h = baseHeight * scale;

    return (
        <div
            className="relative shadow-lg bg-white"
            style={{ width: `${w}px`, height: `${h}px`, marginBottom: "8px" }}
        >
            <canvas ref={canvasRef} className="absolute inset-0" />
            <div
                ref={textLayerRef}
                className="absolute inset-0 textLayer"
                style={{
                    pointerEvents: (activeTool && activeTool !== "eraser") ? "none" : "auto",
                    userSelect: (activeTool && activeTool !== "eraser") ? "none" : "text",
                    zIndex: (activeTool && activeTool !== "eraser") ? 1 : 10
                }}
            />

            {/* Annotation existing items */}
            <div className="absolute inset-0" style={{ zIndex: 15, pointerEvents: "none" }}>
                {annotations.map(ann => {
                    if (ann.type === "highlight" && ann.rect) {
                        return (
                            <div
                                key={ann.id}
                                className="absolute group"
                                style={{
                                    left: `${ann.rect.x * scale}px`, top: `${ann.rect.y * scale}px`,
                                    width: `${ann.rect.w * scale}px`, height: `${ann.rect.h * scale}px`,
                                    backgroundColor: ann.color, opacity: 0.3,
                                    borderRadius: "2px", pointerEvents: "auto",
                                }}
                            >
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(ann.id); }}
                                    className="absolute -top-3 -right-3 size-5 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-md cursor-pointer"
                                >×</button>
                                {activeTool === "eraser" && (
                                    <div
                                        onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(ann.id); }}
                                        className="absolute inset-0 cursor-not-allowed bg-red-500/10 border border-red-500/30 rounded-sm z-10"
                                    />
                                )}
                            </div>
                        );
                    }
                    if (ann.type === "freehand" && ann.points && ann.points.length > 1) {
                        const pts = ann.points;
                        return (
                            <svg key={ann.id} className="absolute inset-0 overflow-visible" style={{ pointerEvents: "none" }}>
                                <path
                                    d={`M ${pts[0].x * scale} ${pts[0].y * scale} ` + pts.slice(1).map(p => `L ${p.x * scale} ${p.y * scale}`).join(" ")}
                                    stroke={ann.color} strokeWidth={2 * scale} fill="none" strokeLinecap="round" strokeLinejoin="round"
                                    className={`pointer-events-auto cursor-pointer ${activeTool === "eraser" ? "hover:stroke-red-500 hover:opacity-50" : ""}`}
                                    onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(ann.id); }}
                                />
                            </svg>
                        );
                    }
                    if (ann.type === "note" && ann.position) {
                        return (
                            <div
                                key={ann.id}
                                className="absolute group"
                                style={{
                                    left: `${ann.position.x * scale}px`, top: `${ann.position.y * scale}px`,
                                    zIndex: 10, pointerEvents: "auto",
                                }}
                            >
                                {editingNote === ann.id ? (
                                    <div className="bg-yellow-100 border border-yellow-400 rounded-lg shadow-xl p-2 w-48" style={{ transform: "translate(-50%, -110%)" }}>
                                        <textarea
                                            autoFocus value={noteText}
                                            onChange={(e) => setNoteText(e.target.value)}
                                            className="w-full h-20 text-xs bg-transparent border-none outline-none resize-none text-gray-800"
                                            placeholder="Write a note..."
                                        />
                                        <div className="flex justify-end gap-1 mt-1">
                                            <button onClick={() => setEditingNote(null)} className="px-2 py-0.5 text-[10px] text-gray-500">Cancel</button>
                                            <button onClick={() => { onUpdateAnnotation(ann.id, { text: noteText }); setEditingNote(null); }} className="px-2 py-0.5 text-[10px] bg-yellow-500 text-white rounded">Save</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative cursor-pointer" onClick={() => { setEditingNote(ann.id); setNoteText(ann.text || ""); }}>
                                        <div className="size-6 rounded-full shadow-lg flex items-center justify-center text-text-main text-xs font-bold" style={{ backgroundColor: ann.color }}>
                                            <span className="material-symbols-outlined text-sm">sticky_note_2</span>
                                        </div>
                                        {ann.text && (
                                            <div className="absolute top-7 left-0 bg-yellow-100 border border-yellow-300 rounded-md shadow-lg p-2 w-40 text-[10px] text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-pre-wrap">
                                                {ann.text}
                                            </div>
                                        )}
                                        <button onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(ann.id); }}
                                            className="absolute -top-2 -right-2 size-4 bg-red-500 text-white rounded-full text-[8px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow cursor-pointer"
                                        >×</button>
                                        {activeTool === "eraser" && (
                                            <div
                                                onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(ann.id); }}
                                                className="absolute inset-0 cursor-not-allowed bg-red-500/20 rounded-full z-10 animate-pulse"
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    }
                    if (ann.type === "text" && ann.position) {
                        return (
                            <div
                                key={ann.id}
                                className="absolute group"
                                style={{
                                    left: `${ann.position.x * scale}px`, top: `${ann.position.y * scale}px`,
                                    zIndex: 10, pointerEvents: "auto",
                                }}
                            >
                                {editingNote === ann.id ? (
                                    <div className="bg-white/90 border border-gray-300 rounded shadow-lg p-1 min-w-[150px]" style={{ transform: "translate(0, -100%)" }}>
                                        <textarea
                                            autoFocus value={noteText}
                                            onChange={(e) => setNoteText(e.target.value)}
                                            className="w-full text-sm bg-transparent border-none outline-none resize-none font-sans"
                                            style={{ color: ann.color }}
                                            placeholder="Type text here..."
                                            rows={Math.max(1, noteText.split('\n').length)}
                                        />
                                        <div className="flex justify-end gap-1 mt-1">
                                            <button onClick={() => setEditingNote(null)} className="px-2 py-0.5 text-[10px] text-gray-500">Cancel</button>
                                            <button onClick={() => { onUpdateAnnotation(ann.id, { text: noteText }); setEditingNote(null); }} className="px-2 py-0.5 text-[10px] bg-blue-500 text-white rounded">Save</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative cursor-pointer min-w-[20px] min-h-[20px]" onClick={() => { setEditingNote(ann.id); setNoteText(ann.text || ""); }}>
                                        <div className="text-sm font-sans whitespace-pre-wrap hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 transition-colors" style={{ color: ann.color }}>
                                            {ann.text || <span className="text-gray-400 italic">Empty text</span>}
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(ann.id); }}
                                            className="absolute -top-3 -right-3 size-4 bg-red-500 text-white rounded-full text-[8px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow cursor-pointer"
                                        >×</button>
                                        {activeTool === "eraser" && (
                                            <div
                                                onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(ann.id); }}
                                                className="absolute inset-0 cursor-not-allowed bg-red-500/20 rounded z-10 animate-pulse"
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    }
                    return null;
                })}
            </div>

            {/* Annotation interaction layer — always rendered, pointer-events controlled */}
            <div
                ref={interactionRef}
                className="absolute inset-0"
                style={{
                    zIndex: activeTool ? 20 : 5,
                    cursor: (activeTool === "note" || activeTool === "text") ? "cell" : activeTool === "eraser" ? "default" : activeTool ? "crosshair" : "text",
                    pointerEvents: (activeTool && activeTool !== "eraser") ? "auto" : "none",
                }}
            >
                {/* Live freehand SVG */}
                <svg ref={annotSvgRef} className="absolute inset-0 pointer-events-none overflow-visible">
                    <path
                        className="live-path"
                        d=""
                        stroke={activeColor} strokeWidth={2 * scale} fill="none" strokeLinecap="round" opacity={0.7}
                    />
                </svg>
                {/* Live highlight preview */}
                <div
                    id={`hl-preview-${pageNum}`}
                    className="absolute pointer-events-none"
                    style={{
                        display: "none",
                        backgroundColor: activeColor, opacity: 0.25,
                        border: `1px dashed ${activeColor}`, borderRadius: "2px",
                    }}
                />
            </div>

            {/* Loading spinner */}
            {!rendered && isVisible && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 z-20">
                    <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400 text-lg animate-spin">progress_activity</span>
                        {ocrRunning && (
                            <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[10px] text-gray-500 font-medium">Running OCR...</span>
                                {ocrQueueInfo && <span className="text-[9px] text-gray-400">{ocrQueueInfo}</span>}
                            </div>
                        )}
                    </div>
                </div>
            )}
            {!isVisible && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <span className="text-gray-300 text-sm font-medium">{pageNum}</span>
                </div>
            )}
        </div>
    );
}

// ─── Main Continuous Viewer ─────────────────────────────────────────
export default function PDFContinuousViewer({
    filePath,
    initialPage = 1,
    scale,
    onStateChange,
    searchQuery,
    searchMatchIndex,
    activeTool,
    activeColor,
    bookId,
    onToolChange,
    onAnnotationsChange,
    darkMode,
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const pageObserverRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [pages, setPages] = useState<PageInfo[]>([]);
    const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const initialScrollDone = useRef(false);
    const dbSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isDBUser = useRef(false);
    const [ocrCounter, setOcrCounter] = useState(0); // Increments when any page OCR completes

    const onOCRComplete = useCallback(() => {
        setOcrCounter(c => c + 1);
    }, []);

    // Load annotations: try DB first, fallback to localStorage
    useEffect(() => {
        let cancelled = false;
        async function loadAnnotations() {
            try {
                const res = await fetch(`/api/annotations?bookId=${bookId}`);
                if (res.ok) {
                    const { annotations: dbAnns } = await res.json();
                    if (!cancelled && Array.isArray(dbAnns)) {
                        setAnnotations(dbAnns);
                        isDBUser.current = true;
                        // Also update localStorage as backup
                        try { localStorage.setItem(STORAGE_KEY(bookId), JSON.stringify(dbAnns)); } catch { }
                        return;
                    }
                }
            } catch { }
            // Fallback: localStorage
            if (!cancelled) {
                try {
                    const stored = localStorage.getItem(STORAGE_KEY(bookId));
                    if (stored) setAnnotations(JSON.parse(stored));
                } catch { }
            }
        }
        loadAnnotations();
        return () => { cancelled = true; };
    }, [bookId]);

    // Save annotations: always localStorage + debounced DB sync
    const undoStackRef = useRef<Annotation[][]>([]);
    const redoStackRef = useRef<Annotation[][]>([]);

    useEffect(() => {
        // Notify parent about annotation changes
        onAnnotationsChange?.(annotations);

        // Always save to localStorage (instant backup)
        try {
            localStorage.setItem(STORAGE_KEY(bookId), JSON.stringify(annotations));
        } catch { }

        // Debounced DB sync (2s after last change)
        if (dbSyncTimerRef.current) clearTimeout(dbSyncTimerRef.current);
        dbSyncTimerRef.current = setTimeout(() => {
            if (!isDBUser.current && annotations.length === 0) return;
            fetch("/api/annotations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookId, annotations }),
            }).then(res => {
                if (res.ok) isDBUser.current = true;
            }).catch(() => { /* silently fail, localStorage has the data */ });
        }, 2000);

        return () => {
            if (dbSyncTimerRef.current) clearTimeout(dbSyncTimerRef.current);
        };
    }, [annotations, bookId, onAnnotationsChange]);

    const pushUndo = useCallback((prev: Annotation[]) => {
        undoStackRef.current = [...undoStackRef.current.slice(-49), prev];
        redoStackRef.current = []; // Clear redo on new action
    }, []);

    const addAnnotation = useCallback((ann: Annotation) => {
        setAnnotations(prev => {
            pushUndo(prev);
            return [...prev, ann];
        });
    }, [pushUndo]);

    const deleteAnnotation = useCallback((id: string) => {
        setAnnotations(prev => {
            pushUndo(prev);
            return prev.filter(a => a.id !== id);
        });
    }, [pushUndo]);

    const updateAnnotation = useCallback((id: string, data: Partial<Annotation>) => {
        setAnnotations(prev => {
            pushUndo(prev);
            return prev.map(a => a.id === id ? { ...a, ...data } : a);
        });
    }, [pushUndo]);

    const undo = useCallback(() => {
        if (undoStackRef.current.length === 0) return;
        setAnnotations(prev => {
            redoStackRef.current = [...redoStackRef.current, prev];
            return undoStackRef.current.pop()!;
        });
    }, []);

    const redo = useCallback(() => {
        if (redoStackRef.current.length === 0) return;
        setAnnotations(prev => {
            undoStackRef.current = [...undoStackRef.current, prev];
            return redoStackRef.current.pop()!;
        });
    }, []);

    // Expose undo/redo and add-highlight on window for keyboard shortcuts & text selection popup
    useEffect(() => {
        (window as any).__pdfUndo = undo;
        (window as any).__pdfRedo = redo;
        (window as any).__pdfAddHighlight = (data: { page: number; rect: { x: number; y: number; w: number; h: number }; text?: string; color: string }) => {
            addAnnotation({
                id: genId(),
                type: "highlight",
                page: data.page,
                color: data.color,
                rect: data.rect,
                text: data.text,
                createdAt: Date.now(),
            });
        };
        return () => {
            delete (window as any).__pdfUndo;
            delete (window as any).__pdfRedo;
            delete (window as any).__pdfAddHighlight;
        };
    }, [undo, redo, addAnnotation]);

    // Load PDF document
    useEffect(() => {
        let cancelled = false;
        async function loadPDF() {
            try {
                setLoading(true);
                setError(null);
                const loadingTask = pdfjsLib.getDocument(filePath);
                const doc = await loadingTask.promise;
                if (cancelled) return;
                setPdfDoc(doc);

                const pageInfos: PageInfo[] = [];
                for (let i = 1; i <= doc.numPages; i++) {
                    const page = await doc.getPage(i);
                    const vp = page.getViewport({ scale: 1.0 });
                    pageInfos.push({ pageNum: i, width: vp.width, height: vp.height });
                }

                let outline: any[] | null = null;
                try { outline = await doc.getOutline(); } catch { }

                if (cancelled) return;
                setPages(pageInfos);
                setLoading(false);
                onStateChange({ numPages: doc.numPages, pdfDoc: doc, outline });
            } catch (err: any) {
                console.error("PDF load error:", err);
                if (!cancelled) {
                    setError(err?.message || "Failed to load PDF document.");
                    setLoading(false);
                }
            }
        }
        loadPDF();
        return () => { cancelled = true; terminateOCR(); };
    }, [filePath]);

    // IntersectionObserver
    useEffect(() => {
        if (pages.length === 0 || !containerRef.current) return;
        observerRef.current?.disconnect();

        const observer = new IntersectionObserver(
            (entries) => {
                setVisiblePages(prev => {
                    const next = new Set(prev);
                    for (const entry of entries) {
                        const pn = Number(entry.target.getAttribute("data-page"));
                        if (entry.isIntersecting) next.add(pn); else next.delete(pn);
                    }
                    return next;
                });

                const container = containerRef.current;
                if (!container) return;
                const containerRect = container.getBoundingClientRect();
                let currentPage = 1;
                let minDistance = Infinity;
                pageObserverRefs.current.forEach((el, num) => {
                    const rect = el.getBoundingClientRect();
                    if (rect.bottom > containerRect.top && rect.top < containerRect.bottom) {
                        const d = Math.abs(rect.top - containerRect.top);
                        if (d < minDistance) { minDistance = d; currentPage = num; }
                    }
                });
                onStateChange({ currentPage });
            },
            { root: containerRef.current, rootMargin: "300px 0px", threshold: 0.01 }
        );

        observerRef.current = observer;
        requestAnimationFrame(() => {
            pageObserverRefs.current.forEach((el) => observer.observe(el));
        });
        return () => observer.disconnect();
    }, [pages, onStateChange]);

    // Initial scroll to page
    useEffect(() => {
        if (!loading && pages.length > 0 && !initialScrollDone.current && initialPage > 1) {
            initialScrollDone.current = true;
            setTimeout(() => scrollToPage(initialPage), 400);
        }
    }, [loading, pages, initialPage]);

    const scrollToPage = useCallback((pageNum: number) => {
        const el = pageObserverRefs.current.get(pageNum);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, []);

    useEffect(() => {
        (window as any).__pdfScrollToPage = scrollToPage;
        return () => { delete (window as any).__pdfScrollToPage; };
    }, [scrollToPage]);

    // Search highlight logic
    useEffect(() => {
        if (!containerRef.current) return;
        containerRef.current.querySelectorAll(".search-highlight").forEach(el => {
            const parent = el.parentNode;
            if (parent) { parent.replaceChild(document.createTextNode(el.textContent || ""), el); parent.normalize(); }
        });
        if (!searchQuery?.trim()) return;
        const query = searchQuery.toLowerCase();
        let matchCounter = 0;
        const textLayers = containerRef.current.querySelectorAll(".textLayer");
        textLayers.forEach((textDiv) => {
            const walker = document.createTreeWalker(textDiv, NodeFilter.SHOW_TEXT);
            const textNodes: Text[] = [];
            let node: Text | null;
            while ((node = walker.nextNode() as Text)) textNodes.push(node);
            for (const textNode of textNodes) {
                const text = textNode.textContent || "";
                const lowerText = text.toLowerCase();
                let idx = lowerText.indexOf(query);
                if (idx === -1) continue;
                const fragment = document.createDocumentFragment();
                let lastIdx = 0;
                while (idx !== -1) {
                    if (idx > lastIdx) fragment.appendChild(document.createTextNode(text.slice(lastIdx, idx)));
                    const span = document.createElement("span");
                    span.className = `search-highlight${matchCounter === searchMatchIndex ? " search-highlight-active" : ""}`;
                    span.textContent = text.slice(idx, idx + query.length);
                    fragment.appendChild(span);
                    matchCounter++;
                    lastIdx = idx + query.length;
                    idx = lowerText.indexOf(query, lastIdx);
                }
                if (lastIdx < text.length) fragment.appendChild(document.createTextNode(text.slice(lastIdx)));
                textNode.parentNode?.replaceChild(fragment, textNode);
            }
        });
        if (searchMatchIndex !== undefined && searchMatchIndex >= 0) {
            const activeEl = containerRef.current.querySelector(".search-highlight-active");
            if (activeEl) activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, [searchQuery, searchMatchIndex, ocrCounter]);

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 h-full">
                <div className="size-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-3xl animate-spin">progress_activity</span>
                </div>
                <div className="text-center">
                    <p className="text-text-main font-bold text-sm">Loading document...</p>
                    <p className="text-text-muted text-xs mt-1">Preparing pages for continuous reading</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 h-full">
                <div className="size-16 rounded-2xl bg-red-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-red-400 text-3xl">error</span>
                </div>
                <div className="text-center">
                    <p className="text-text-main font-bold text-sm">{error}</p>
                    <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-primary/20 border border-primary/30 rounded-xl text-primary text-xs font-bold hover:bg-primary/30 transition-all">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="flex-1 overflow-auto bg-[#525659]" style={darkMode ? { filter: "invert(0.88) hue-rotate(180deg)", transition: "filter 0.3s ease" } : { transition: "filter 0.3s ease" }}>
            <div className="flex flex-col items-center py-4 gap-1">
                {pdfDoc && pages.map((page) => (
                    <div
                        key={page.pageNum}
                        data-page={page.pageNum}
                        ref={(el) => { if (el) pageObserverRefs.current.set(page.pageNum, el); }}
                    >
                        <PDFPage
                            pdfDoc={pdfDoc}
                            pageNum={page.pageNum}
                            scale={scale}
                            isVisible={visiblePages.has(page.pageNum)}
                            baseWidth={page.width}
                            baseHeight={page.height}
                            annotations={annotations.filter(a => a.page === page.pageNum)}
                            activeTool={activeTool}
                            activeColor={activeColor}
                            onAddAnnotation={addAnnotation}
                            onDeleteAnnotation={deleteAnnotation}
                            onUpdateAnnotation={updateAnnotation}
                            onToolChange={onToolChange}
                            bookId={bookId}
                            onOCRComplete={onOCRComplete}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
