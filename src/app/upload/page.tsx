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

export default function UploadPage() {
    const router = useRouter();
    const { addToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [tags, setTags] = useState("");
    const [categories, setCategories] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        fetch("/api/categories")
            .then(r => r.json())
            .then(d => {
                if (d.categories) {
                    setCategories(d.categories);
                    if (d.categories.length > 0) setCategoryId(d.categories[0].id);
                }
            });
    }, []);

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

            await pdf.destroy();
            return dataUrl;
        } catch (e) {
            console.error("Cover generation failed:", e);
            return undefined;
        }
    };

    const analyzeMetadata = async (file: File) => {
        setIsAnalyzing(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/admin/books/bulk-upload/analyze", {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                const m = data.metadata;
                if (m.title) setTitle(m.title);
                if (m.author) setAuthor(m.author);
                if (m.description) setDescription(m.description);
                if (m.tags) setTags(m.tags);
                if (m.categoryId) setCategoryId(m.categoryId);
                addToast("AI Analysis complete. Metadata synchronized.", "success");
            }
        } catch (e) {
            console.error("Analysis failed", e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const processFile = async (selectedFile: File) => {
        if (selectedFile.type !== "application/pdf") {
            addToast("Mandatory Error: Only PDF vectors are compatible.", "error");
            return;
        }

        setFile(selectedFile);
        setTitle(selectedFile.name.replace(".pdf", ""));

        // Auto Cover
        generateCover(selectedFile).then(dataUrl => {
            if (dataUrl) setCoverPreview(dataUrl);
        });

        // AI analysis
        analyzeMetadata(selectedFile);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) processFile(droppedFile);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) processFile(selectedFile);
    };

    const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type.startsWith("image/")) {
            setCoverFile(selectedFile);
            setCoverPreview(URL.createObjectURL(selectedFile));
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !title) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        // If we have a system-generated cover (Base64), convert it back to a blob
        if (coverPreview && coverPreview.startsWith("data:")) {
            const res = await fetch(coverPreview);
            const blob = await res.blob();
            formData.append("cover", blob, "cover.jpg");
        } else if (coverFile) {
            formData.append("cover", coverFile);
        }

        formData.append("title", title);
        formData.append("author", author || "Unknown");
        formData.append("description", description);
        formData.append("categoryId", categoryId);
        formData.append("tags", tags);

        try {
            const res = await fetch("/api/books", {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                addToast("Transmission complete. Knowledge node integrated.", "success");
                router.push(`/pdf/${data.book.id}`);
            } else {
                const err = await res.json();
                addToast(err.error || "Uplink synchronization failure.", "error");
            }
        } catch {
            addToast("Communication severed. Check terminal connection.", "error");
        }
        setUploading(false);
    };

    return (
        <main className="flex-1 w-full max-w-[1440px] mx-auto min-h-screen px-6 md:px-10 py-10 md:py-16 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 -ml-40 -mt-40 size-[800px] bg-primary/5 rounded-full blur-[140px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 -mr-40 -mb-40 size-[600px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col items-center">
                {/* Header Information */}
                <div className="flex flex-col items-center text-center max-w-3xl mx-auto gap-6 mb-16 md:mb-24">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary w-fit animate-fade-up">
                        <span className="material-symbols-outlined text-[16px]">publish</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Deployment Terminal</span>
                    </div>
                    <h1 className="text-text-main text-5xl md:text-7xl font-black tracking-tight leading-none uppercase animate-fade-up [animation-delay:100ms]">
                        Broadcast <span className="text-primary italic text-glow">Knowledge.</span>
                    </h1>
                    <p className="text-text-muted text-lg md:text-xl font-medium leading-relaxed max-w-2xl animate-fade-up [animation-delay:200ms]">
                        Contribute to the collective intelligence by deploying your digital documents to the Book-in global index.
                    </p>
                </div>

                <form onSubmit={handleUpload} className="w-full max-w-5xl flex flex-col gap-12 animate-fade-up [animation-delay:300ms]">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                        {/* Phase 1: File & Cover Selection */}
                        <div className="md:col-span-5 flex flex-col gap-8">
                            <div className="flex flex-col gap-4">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] ml-2">Upload Cover</label>
                                <div
                                    onClick={() => coverInputRef.current?.click()}
                                    className="relative aspect-[3/4.2] rounded-[40px] bg-surface border-2 border-dashed border-black/5 dark:border-white/5 hover:border-primary/40 hover:bg-black/5 dark:bg-white/5 transition-all duration-500 cursor-pointer overflow-hidden flex flex-col items-center justify-center group"
                                >
                                    <input type="file" ref={coverInputRef} onChange={handleCoverSelect} accept="image/*" className="hidden" />
                                    {coverPreview ? (
                                        <>
                                            <img src={coverPreview} alt="" className="size-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                                                <div className="size-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
                                                    <span className="material-symbols-outlined text-text-main">edit</span>
                                                </div>
                                                <span className="text-[10px] font-black text-text-main uppercase tracking-widest">Swap Visual Node</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-4 text-center p-8">
                                            <div className="size-20 rounded-[28px] bg-bg-dark border border-black/5 dark:border-white/5 text-text-muted group-hover:text-primary group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <p className="text-text-main font-black text-lg uppercase tracking-tight">Visual Identity</p>
                                                <p className="text-text-muted text-[11px] font-bold uppercase tracking-widest leading-relaxed">Generated from PDF or upload manual artwork.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Phase 2: Core Data & Uplink */}
                        <div className="md:col-span-7 flex flex-col gap-10">
                            <div className="flex flex-col gap-4">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] ml-2">Upload PDF</label>
                                <div
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative h-48 rounded-[40px] border-2 border-dashed transition-all duration-500 cursor-pointer flex flex-col items-center justify-center gap-4 overflow-hidden ${file ? "border-primary bg-primary/5 bg-noise shadow-2xl" : "border-black/5 dark:border-white/5 bg-surface hover:border-primary/40 hover:bg-black/5 dark:bg-white/5"
                                        }`}
                                >
                                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="application/pdf" className="hidden" />
                                    <div className={`size-16 rounded-[20px] flex items-center justify-center transition-all duration-500 ${file ? "bg-primary text-white shadow-[0_0_30px_rgba(19,127,236,0.5)] rotate-0" : "bg-bg-dark text-text-muted group-hover:text-primary -rotate-6"
                                        }`}>
                                        <span className="material-symbols-outlined text-3xl leading-none">{file ? "verified" : "upload_file"}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 text-center px-8">
                                        <p className="text-text-main font-black text-base truncate max-w-xs">{file ? file.name : "Initiate Knowledge Uplink"}</p>
                                        <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest">{file ? "PDF Verification Success" : "Select or drag file [Max 50MB]"}</p>
                                    </div>

                                    {isAnalyzing && (
                                        <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-fade-in">
                                            <span className="material-symbols-outlined animate-spin text-3xl text-primary">psychology</span>
                                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] animate-pulse">AI Parsing Knowledge Node...</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Metadata Matrix */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 p-10 rounded-[40px] bg-surface border border-black/5 dark:border-white/5 backdrop-blur-xl">
                                <div className="sm:col-span-2 flex flex-col gap-3">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Title</label>
                                    <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full h-14 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl text-text-main px-6 font-bold focus:border-primary/50 focus:bg-black/10 dark:bg-white/10 outline-none transition-all placeholder:text-text-muted/50" placeholder="Formal subject nomenclature..." />
                                </div>

                                <div className="flex flex-col gap-3">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Author</label>
                                    <input value={author} onChange={e => setAuthor(e.target.value)} className="w-full h-14 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl text-text-main px-6 font-bold focus:border-primary/50 focus:bg-black/10 dark:bg-white/10 outline-none transition-all placeholder:text-text-muted/50" placeholder="Source identity..." />
                                </div>

                                <div className="flex flex-col gap-3">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Category</label>
                                    <div className="relative">
                                        <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full h-14 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl text-text-main px-6 font-bold focus:border-primary/50 focus:bg-black/10 dark:bg-white/10 outline-none appearance-none transition-all">
                                            {categories.map(c => <option key={c.id} value={c.id} className="bg-bg-dark text-text-main">{c.name}</option>)}
                                        </select>
                                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">expand_more</span>
                                    </div>
                                </div>

                                <div className="sm:col-span-2 flex flex-col gap-3">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Tags</label>
                                    <input value={tags} onChange={e => setTags(e.target.value)} className="w-full h-14 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl text-text-main px-6 font-bold focus:border-primary/50 focus:bg-black/10 dark:bg-white/10 outline-none transition-all placeholder:text-text-muted/50" placeholder="e.g. quantum, biology, history" />
                                </div>

                                <div className="sm:col-span-2 flex flex-col gap-3">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Description</label>
                                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full p-6 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-[30px] text-text-main font-medium focus:border-primary/50 focus:bg-black/10 dark:bg-white/10 outline-none transition-all resize-none placeholder:text-text-muted/50" placeholder="Provide a summary for indexing accuracy..." />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Execution Command */}
                    <div className="flex flex-col gap-6 pt-4">
                        <button
                            type="submit"
                            disabled={uploading || !file || !title}
                            className="w-full h-20 rounded-[30px] bg-gradient-to-r from-primary to-[#0f5bb5] text-white font-black uppercase tracking-[0.3em] text-[13px] shadow-[0_0_50px_rgba(19,127,236,0.3)] hover:shadow-[0_0_60px_rgba(19,127,236,0.5)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-30 disabled:hover:scale-100 transition-all duration-500 ease-out cursor-pointer flex items-center justify-center gap-5 group"
                        >
                            {uploading ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
                                    <span>Synchronizing Data Stream...</span>
                                </>
                            ) : (
                                <>
                                    <span>Finalize Deployment Protocol</span>
                                    <span className="material-symbols-outlined text-3xl group-hover:translate-x-1 transition-transform">rocket_launch</span>
                                </>
                            )}
                        </button>
                        <p className="text-center text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] opacity-40">By deploying this asset, you confirm synchronization with community standards.</p>
                    </div>
                </form>
            </div>
        </main>
    );
}
