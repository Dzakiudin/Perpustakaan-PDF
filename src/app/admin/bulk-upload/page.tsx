"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

// Lazy load pdfjs to avoid SSR errors/warnings with canvas polyfills
let pdfjsPromise: Promise<any> | null = null;
const getPdfJs = async () => {
    if (typeof window === "undefined") return null;
    if (!pdfjsPromise) {
        // Use the standard build for the browser
        pdfjsPromise = import("pdfjs-dist/build/pdf").then(async (m) => {
            m.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${m.version}/pdf.worker.min.js`;
            return m;
        });
    }
    return pdfjsPromise;
};

interface UploadItem {
    id: string;
    file: File;
    status: "idle" | "processing" | "success" | "error";
    progress: number;
    metadata?: {
        title: string;
        author: string;
        description: string;
        categoryId: string;
        tags: string;
    };
    cover?: string; // Base64
    error?: string;
}

export default function BulkUploadPage() {
    const router = useRouter();
    const { addToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [items, setItems] = useState<UploadItem[]>([]);
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [isUploadingAll, setIsUploadingAll] = useState(false);

    useEffect(() => {
        fetch("/api/categories")
            .then((r) => r.json())
            .then((d) => setCategories(d.categories || []));
    }, []);

    const handleFiles = async (files: FileList | null) => {
        if (!files) return;
        const newItems: UploadItem[] = Array.from(files)
            .filter((f) => f.type === "application/pdf")
            .map((file) => ({
                id: Math.random().toString(36).substr(2, 9),
                file,
                status: "idle",
                progress: 0,
                metadata: {
                    title: file.name.replace(".pdf", ""),
                    author: "",
                    description: "",
                    categoryId: categories[0]?.id || "",
                    tags: "",
                },
            }));

        setItems((prev) => [...prev, ...newItems]);

        // Start generating covers AND metadata in background
        for (const item of newItems) {
            // 1. Cover
            generateCover(item.file).then(cover => {
                if (cover) {
                    setItems(prev => prev.map(i => i.id === item.id ? { ...i, cover } : i));
                }
            });

            // 2. Metadata Analysis
            analyzeMetadata(item);
        }
    };

    const analyzeMetadata = async (item: UploadItem) => {
        try {
            const formData = new FormData();
            formData.append("file", item.file);

            const res = await fetch("/api/admin/books/bulk-upload/analyze", {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                setItems(prev => prev.map(i => i.id === item.id ? {
                    ...i,
                    metadata: data.metadata
                } : i));
            }
        } catch (e) {
            console.error("Analysis failed for", item.file.name, e);
        }
    };

    const generateCover = async (file: File): Promise<string | undefined> => {
        try {
            const pdfjs = await getPdfJs();
            if (!pdfjs) return;

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.6 });
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            if (!context) return;

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport }).promise;
            const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

            // Clean up
            await pdf.destroy();

            return dataUrl;
        } catch (e) {
            console.error("Cover generation failed:", e);
            return undefined;
        }
    };

    const uploadFile = async (item: UploadItem) => {
        if (item.status === "processing" || item.status === "success") return;

        setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, status: "processing", progress: 10 } : i))
        );

        try {
            // 1. Ensure cover exists (if not generated yet)
            let coverDataUrl = item.cover;
            if (!coverDataUrl) {
                coverDataUrl = await generateCover(item.file);
                if (coverDataUrl) {
                    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, cover: coverDataUrl } : i)));
                }
            }

            setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, progress: 30 } : i)));

            // 2. Prepare Form Data
            const formData = new FormData();
            formData.append("file", item.file);
            if (coverDataUrl) {
                const res = await fetch(coverDataUrl);
                const blob = await res.blob();
                formData.append("cover", blob, "cover.jpg");
            }

            // 3. Send to API
            const res = await fetch("/api/admin/books/bulk-upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Uplink failure");
            }

            const data = await res.json();
            setItems((prev) =>
                prev.map((i) =>
                    i.id === item.id
                        ? {
                            ...i,
                            status: "success",
                            progress: 100,
                            metadata: {
                                title: data.book.title,
                                author: data.book.author,
                                description: data.book.description,
                                categoryId: data.book.categoryId || categories[0]?.id || "",
                                tags: data.book.tags || "",
                            },
                        }
                        : i
                )
            );
        } catch (e: any) {
            setItems((prev) =>
                prev.map((i) => (i.id === item.id ? { ...i, status: "error", error: e.message } : i))
            );
        }
    };

    const handleUploadAll = async () => {
        const pending = items.filter((i) => i.status === "idle" || i.status === "error");
        if (pending.length === 0) return;

        setIsUploadingAll(true);
        for (const item of pending) {
            await uploadFile(item);
        }
        setIsUploadingAll(false);
        addToast(`Bulk operation complete. ${pending.length} nodes integrated.`, "success");
    };

    const removeItem = (id: string) => {
        setItems((prev) => prev.filter((i) => i.id !== id));
    };

    return (
        <div className="p-6 md:p-10 flex flex-col gap-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20">
                            <span className="material-symbols-outlined text-3xl">rocket_launch</span>
                        </div>
                        <h1 className="text-3xl font-black text-text-main uppercase tracking-tight">Bulk <span className="text-primary italic">Deploy</span></h1>
                    </div>
                    <p className="text-text-muted text-sm font-medium ml-1">Automated PDF mass-upload with AI-powered metadata extraction.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-3.5 rounded-2xl bg-surface border border-black/10 dark:border-white/10 text-text-main font-black text-xs uppercase tracking-widest hover:bg-black/5 transition-all active:scale-95 flex items-center gap-2 group"
                    >
                        <span className="material-symbols-outlined text-lg group-hover:rotate-12 transition-transform">add_circle</span>
                        Add Vectors
                    </button>
                    <button
                        onClick={handleUploadAll}
                        disabled={isUploadingAll || items.filter(i => i.status !== "success").length === 0}
                        className="px-8 py-3.5 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:opacity-30 transition-all flex items-center gap-2"
                    >
                        {isUploadingAll ? (
                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        ) : (
                            <span className="material-symbols-outlined">bolt</span>
                        )}
                        Initiate Batch Uplink
                    </button>
                </div>
            </div>

            <input
                type="file"
                multiple
                accept="application/pdf"
                ref={fileInputRef}
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
            />

            {items.length === 0 ? (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 min-h-[400px] rounded-[48px] border-4 border-dashed border-black/5 dark:border-white/5 bg-surface/20 flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-primary/40 hover:bg-black/5 transition-all group p-10 mt-10"
                >
                    <div className="size-32 rounded-[40px] bg-bg-dark border border-black/5 dark:border-white/5 flex items-center justify-center text-text-muted group-hover:text-primary group-hover:scale-110 transition-all duration-500">
                        <span className="material-symbols-outlined text-6xl">system_update_alt</span>
                    </div>
                    <div className="flex flex-col items-center text-center gap-2">
                        <h2 className="text-2xl font-black text-text-main uppercase tracking-tight">Drop Knowledge Fragments</h2>
                        <p className="text-text-muted text-sm font-medium tracking-widest uppercase opacity-40">Drag and drop Multiple PDF files or click to browse</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-up">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className={`relative flex flex-col gap-6 p-6 rounded-[40px] bg-surface border transition-all duration-500 ${item.status === "success"
                                ? "border-emerald-500/30 bg-emerald-500/5 shadow-2xl"
                                : item.status === "error"
                                    ? "border-red-500/30 bg-red-500/5"
                                    : "border-black/5 dark:border-white/5 shadow-xl"
                                }`}
                        >
                            {/* Progress Bar */}
                            {item.status === "processing" && (
                                <div className="absolute inset-x-0 top-0 h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-500 shadow-[0_0_10px_rgba(255,90,95,0.5)]"
                                        style={{ width: `${item.progress}%` }}
                                    />
                                </div>
                            )}

                            <div className="flex gap-5">
                                {/* Cover Preview */}
                                <div className="w-24 aspect-[3/4.2] rounded-2xl bg-bg-dark border border-black/5 dark:border-white/10 shrink-0 overflow-hidden relative shadow-lg">
                                    {item.cover ? (
                                        <img src={item.cover} className="size-full object-cover" alt="" />
                                    ) : (
                                        <div className="size-full flex items-center justify-center text-text-muted/20">
                                            <span className="material-symbols-outlined text-4xl">description</span>
                                        </div>
                                    )}
                                    {item.status === "processing" && (
                                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white animate-spin">sync</span>
                                        </div>
                                    )}
                                    {item.status === "success" && (
                                        <div className="absolute top-2 right-2 size-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                                            <span className="material-symbols-outlined text-base font-black">done</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="font-black text-text-main truncate text-lg leading-tight uppercase tracking-tight">
                                            {item.metadata?.title || item.file.name}
                                        </h3>
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            disabled={item.status === "processing"}
                                            className="size-8 rounded-full hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center text-text-muted transition-all disabled:opacity-0"
                                        >
                                            <span className="material-symbols-outlined text-xl">close</span>
                                        </button>
                                    </div>
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest truncate">
                                        {item.metadata?.author || "Author Pending..."}
                                    </p>

                                    {item.status === "success" && (
                                        <div className="mt-2 text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-sm">verified</span>
                                            Node Synchronized
                                        </div>
                                    )}

                                    {item.status === "error" && (
                                        <p className="mt-2 text-[9px] font-bold text-red-500 leading-tight">
                                            {item.error || "Critical Uplink Error"}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Editable Fields (Only if not success) */}
                            {item.status !== "success" && (
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Kategori</label>
                                        <select
                                            value={item.metadata?.categoryId}
                                            onChange={(e) => setItems(prev => prev.map(i => i.id === item.id ? { ...i, metadata: { ...i.metadata!, categoryId: e.target.value } } : i))}
                                            className="w-full h-10 px-4 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs font-bold text-text-main outline-none focus:border-primary/40 transition-all"
                                        >
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
