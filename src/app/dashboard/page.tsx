"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmModal";

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

export default function DashboardPage() {
    const router = useRouter();
    const { addToast } = useToast();
    const { confirm } = useConfirm();

    // Dashboard Data
    const [books, setBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalUploads: 0,
        totalViews: 0,
        booksRead: 0,
        pagesRead: 0,
        targetBooks: 5,
        targetPages: 500
    });

    // Upload State
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
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Edit Modal State
    const [editingBook, setEditingBook] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({ title: "", author: "", categoryId: "", tags: "", description: "" });
    const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
    const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchDashboard();
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        const res = await fetch("/api/categories");
        if (res.ok) {
            const data = await res.json();
            setCategories(data.categories || []);
            if (data.categories && data.categories.length > 0) {
                setCategoryId(data.categories[0].id);
            }
        }
    };

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const userRes = await fetch("/api/auth/me");
            if (userRes.ok) {
                const userData = await userRes.json();
                const res = await fetch(`/api/profil/${userData.user.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setBooks(data.books || []);

                    const totalViews = (data.books || []).reduce((acc: number, curr: any) => acc + (curr.viewCount || 0), 0);
                    const booksRead = (data.readHistory || []).filter((h: any) => h.completed).length;
                    const pagesRead = (data.readHistory || []).reduce((acc: number, curr: any) => acc + (curr.lastPage || 0), 0);

                    setStats({
                        totalUploads: (data.books || []).length,
                        totalViews,
                        booksRead,
                        pagesRead,
                        targetBooks: data.targetBooks || 5,
                        targetPages: data.targetPages || 500
                    });
                }
            }
        } catch { /* ignore */ }
        setLoading(false);
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
                addToast("AI Analysis complete. Metadata updated.", "success");
            }
        } catch (e) {
            console.error("Analysis failed", e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const processFile = async (selectedFile: File) => {
        if (selectedFile.type !== "application/pdf") {
            addToast("Only PDF files are allowed", "error");
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

    // Upload Handlers
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

    const removeCover = () => {
        setCoverFile(null);
        setCoverPreview(null);
        if (coverInputRef.current) coverInputRef.current.value = "";
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !title) return;

        setUploading(true);
        setUploadProgress(0);
        const formData = new FormData();
        formData.append("file", file);

        // Handle Auto-generated cover (Base64)
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
            const result = await new Promise<any>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("POST", "/api/books");
                xhr.upload.addEventListener("progress", (e) => {
                    if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
                });
                xhr.addEventListener("load", () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        try { reject(JSON.parse(xhr.responseText)); } catch { reject({ error: "Upload failed" }); }
                    }
                });
                xhr.addEventListener("error", () => reject({ error: "Network error" }));
                xhr.send(formData);
            });

            addToast("PDF integrated successfully!", "success");
            setFile(null); setCoverFile(null); setCoverPreview(null);
            setTitle(""); setAuthor(""); setDescription(""); setTags("");
            fetchDashboard();
        } catch (err: any) {
            addToast(err?.error || "Failed to integrate data stream", "error");
        }
        setUploading(false);
        setUploadProgress(0);
    };

    // Edit/Delete Handlers
    const handleDelete = async (id: string, name: string) => {
        if (!(await confirm({ title: "Delete Document", message: `Are you sure you want to delete the PDF "${name}"?`, isDanger: true }))) return;
        try {
            const res = await fetch(`/api/books/${id}`, { method: "DELETE" });
            if (res.ok) {
                addToast("PDF deleted successfully", "success");
                setBooks(books.filter(b => b.id !== id));
            } else {
                addToast("Failed to delete PDF", "error");
            }
        } catch {
            addToast("Network error", "error");
        }
    };

    const openEditModal = (book: any) => {
        setEditingBook(book);
        setEditForm({
            title: book.title,
            author: book.author || "",
            categoryId: book.categoryId || "",
            tags: book.tags || "",
            description: book.description || "",
        });
        setEditCoverFile(null);
        setEditCoverPreview(book.thumbnailPath || null);
    };

    const handleEditCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith("image/")) {
            setEditCoverFile(file);
            setEditCoverPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBook) return;

        setSaving(true);
        const formData = new FormData();
        formData.append("title", editForm.title);
        formData.append("author", editForm.author);
        formData.append("categoryId", editForm.categoryId);
        formData.append("tags", editForm.tags);
        formData.append("description", editForm.description);
        if (editCoverFile) formData.append("cover", editCoverFile);

        try {
            const res = await fetch(`/api/books/${editingBook.id}`, { method: "PUT", body: formData });
            if (res.ok) {
                const data = await res.json();
                addToast("Successfully updated PDF info", "success");
                setBooks(books.map(b => b.id === data.book.id ? { ...b, ...data.book } : b));
                setEditingBook(null);
            } else {
                addToast("Failed to update", "error");
            }
        } catch {
            addToast("Network error", "error");
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <main className="flex-1 w-full min-h-screen px-6 md:px-12 py-10 pt-24 md:pt-[104px] relative overflow-hidden animate-pulse">
                {/* Background Decorations */}
                <div className="absolute top-0 right-0 -mr-40 -mt-40 size-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -ml-40 -mb-40 size-[400px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="relative z-10 flex flex-col gap-10">
                    {/* Header Section Skeleton */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex flex-col gap-4 w-full max-w-2xl">
                            <div className="h-6 w-32 rounded-full bg-primary/10"></div>
                            <div className="h-12 w-64 md:w-96 rounded-xl bg-black/10 dark:bg-white/10"></div>
                            <div className="h-4 w-[80%] max-w-md rounded-md bg-black/5 dark:bg-white/5"></div>
                        </div>

                        {/* Quick Stats Banner Skeleton */}
                        <div className="flex flex-wrap items-center gap-6 w-full md:w-auto mt-4 md:mt-0">
                            <div className="h-20 w-48 rounded-[24px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5"></div>
                            <div className="h-20 flex-1 min-w-[320px] rounded-[32px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5"></div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-16 mt-6">
                        {/* Upload Skeleton */}
                        <div className="flex flex-col gap-6">
                            <div className="h-8 w-64 rounded-xl bg-black/10 dark:bg-white/10"></div>
                            <div className="h-64 rounded-[32px] bg-black/5 dark:bg-white/5 border-2 border-dashed border-black/10 dark:border-white/10"></div>
                        </div>

                        {/* Publications Skeleton */}
                        <div className="flex flex-col gap-10">
                            <div className="flex items-center justify-between">
                                <div className="h-8 w-48 rounded-xl bg-black/10 dark:bg-white/10"></div>
                                <div className="h-6 w-16 rounded-full bg-black/5 dark:bg-white/5"></div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="flex flex-col rounded-[32px] bg-surface/50 border border-black/5 dark:border-white/5 overflow-hidden">
                                        <div className="aspect-[3/4.2] bg-black/10 dark:bg-white/10"></div>
                                        <div className="p-6 flex flex-col gap-4">
                                            <div className="h-5 w-3/4 rounded-md bg-black/10 dark:bg-white/10"></div>
                                            <div className="h-4 w-1/3 rounded-full bg-primary/10"></div>
                                            <div className="flex items-center gap-2 pt-4 mt-4 border-t border-black/5 dark:border-white/5">
                                                <div className="flex-1 h-11 rounded-xl bg-black/5 dark:bg-white/5"></div>
                                                <div className="size-11 rounded-xl bg-black/5 dark:bg-white/5"></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="flex-1 w-full min-h-screen px-6 md:px-12 py-10 pt-24 md:pt-[104px] relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 -mr-40 -mt-40 size-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -ml-40 -mb-40 size-[400px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col gap-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex flex-col gap-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary self-start">
                            <span className="material-symbols-outlined text-sm fill-icon">dashboard</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Contributor Hub</span>
                        </div>
                        <h1 className="text-text-main text-4xl md:text-5xl font-black tracking-tight">Reading <span className="text-primary italic">Dashboard</span></h1>
                        <p className="text-text-muted text-lg font-medium max-w-2xl">Manage your library, track your performance, and share new knowledge with the world.</p>
                    </div>

                    {/* Quick Stats Banner & Goals */}
                    <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-2 rounded-[24px] backdrop-blur-md">
                            <div className="flex flex-col px-6 py-2 border-r border-black/5 dark:border-white/5">
                                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Total Uploads</span>
                                <span className="text-text-main text-2xl font-black leading-none">{stats.totalUploads}</span>
                            </div>
                            <div className="flex flex-col px-6 py-2">
                                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Total Reads</span>
                                <span className="text-text-main text-2xl font-black leading-none text-glow">{stats.totalViews}</span>
                            </div>
                        </div>

                        {/* Reading Goals Widget */}
                        <div className="flex flex-1 min-w-[320px] items-center gap-8 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-4 rounded-[32px] backdrop-blur-md overflow-hidden relative group">
                            <div className="absolute top-0 right-0 -tr-10 -mr-10 size-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>

                            {/* Book Progress */}
                            <div className="flex flex-col gap-3 flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[14px]">auto_stories</span>
                                        Book Target
                                    </span>
                                    <span className="text-[10px] font-black text-text-main">{stats.booksRead}/{stats.targetBooks}</span>
                                </div>
                                <div className="h-2 w-full bg-black/10 dark:bg-white/5 rounded-full overflow-hidden border border-black/5 dark:border-white/5">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-[#0f5bb5] transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(19,127,236,0.3)]"
                                        style={{ width: `${Math.min(100, (stats.booksRead / stats.targetBooks) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="h-10 w-px bg-black/5 dark:bg-white/10 hidden sm:block"></div>

                            {/* Page Progress */}
                            <div className="flex flex-col gap-3 flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[14px]">menu_book</span>
                                        Page Target
                                    </span>
                                    <span className="text-[10px] font-black text-text-main">{stats.pagesRead}/{stats.targetPages}</span>
                                </div>
                                <div className="h-2 w-full bg-black/10 dark:bg-white/5 rounded-full overflow-hidden border border-black/5 dark:border-white/5">
                                    <div
                                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                        style={{ width: `${Math.min(100, (stats.pagesRead / stats.targetPages) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-16">
                    {/* Top: Upload & Management (Full Width) */}
                    <div className="flex flex-col gap-10">
                        {/* Custom Upload Area */}
                        <div className="flex flex-col gap-6">
                            <h2 className="text-text-main text-2xl font-black tracking-tight flex items-center gap-3">
                                <span className="size-8 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-xl">upload_file</span>
                                </span>
                                Upload New Document
                            </h2>

                            <form onSubmit={handleUpload} className="flex flex-col gap-6">
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                    onDragLeave={() => setIsDragOver(false)}
                                    onDrop={(e) => { handleDrop(e); setIsDragOver(false); }}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`group relative h-64 rounded-[32px] border-2 border-dashed transition-all duration-500 cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-4
                                        ${file ? "border-primary bg-primary/5"
                                            : isDragOver ? "border-primary bg-primary/10 scale-[1.02] shadow-[0_0_40px_rgba(19,127,236,0.2)]"
                                                : "border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:border-primary/40 hover:bg-black/10 dark:bg-white/10"}`}
                                >
                                    <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-10 pointer-events-none"></div>
                                    <div className={`size-20 rounded-[24px] flex items-center justify-center transition-all duration-500
                                        ${file ? "bg-primary text-white shadow-[0_0_30px_rgba(19,127,236,0.5)] rotate-0"
                                            : isDragOver ? "bg-primary text-white scale-110 animate-pulse"
                                                : "bg-bg-dark text-text-muted group-hover:text-primary group-hover:scale-110 -rotate-3 hover:rotate-0"}`}>
                                        <span className="material-symbols-outlined text-4xl leading-none">{file ? "task_alt" : isDragOver ? "download" : "file_upload"}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 text-center px-6">
                                        <p className="text-text-main text-lg font-black tracking-tight">{file ? file.name : isDragOver ? "Drop your file here!" : "Drag & drop your PDF file"}</p>
                                        <p className="text-text-muted text-sm font-medium">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB • File selected successfully` : isDragOver ? "Release to upload" : "or click to browse from device"}</p>
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="application/pdf" className="hidden" />

                                    {isAnalyzing && (
                                        <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-fade-in">
                                            <span className="material-symbols-outlined animate-spin text-3xl text-primary">psychology</span>
                                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] animate-pulse">AI Parsing Knowledge Node...</span>
                                        </div>
                                    )}
                                </div>

                                {file && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface/50 backdrop-blur-md border border-black/5 dark:border-white/5 p-8 rounded-[32px] animate-fade-up">
                                        <div className="md:col-span-2 flex flex-col gap-1 mb-2">
                                            <h3 className="text-text-main text-lg font-black uppercase tracking-widest text-primary/80">Document Metadata</h3>
                                            <div className="h-1 w-12 bg-primary rounded-full"></div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Title *</label>
                                            <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full h-12 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl text-text-main px-5 text-sm font-bold focus:border-primary/50 focus:bg-black/10 dark:bg-white/10 outline-none transition-all" placeholder="Enter document title" />
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Category *</label>
                                            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full h-12 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl text-text-main px-5 text-sm font-bold focus:border-primary/50 focus:bg-black/10 dark:bg-white/10 outline-none appearance-none transition-all">
                                                {categories.map(c => <option key={c.id} value={c.id} className="bg-surface text-text-main">{c.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Author</label>
                                            <input value={author} onChange={e => setAuthor(e.target.value)} className="w-full h-12 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl text-text-main px-5 text-sm font-bold focus:border-primary/50 focus:bg-black/10 dark:bg-white/10 outline-none transition-all" placeholder="Original author" />
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Tags</label>
                                            <input value={tags} onChange={e => setTags(e.target.value)} className="w-full h-12 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl text-text-main px-5 text-sm font-bold focus:border-primary/50 focus:bg-black/10 dark:bg-white/10 outline-none transition-all" placeholder="design, dev, science..." />
                                        </div>

                                        <div className="md:col-span-2 flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Description</label>
                                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full p-5 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-[24px] text-text-main text-sm font-medium focus:border-primary/50 focus:bg-black/10 dark:bg-white/10 outline-none transition-all resize-none" placeholder="Provide a short description of this document..."></textarea>
                                        </div>

                                        <div className="md:col-span-2 flex flex-col md:flex-row items-center justify-between gap-6 pt-4 border-t border-black/5 dark:border-white/5">
                                            <div className="flex items-center gap-4">
                                                <div className="size-20 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-center relative overflow-hidden group/cover cursor-pointer" onClick={() => coverInputRef.current?.click()}>
                                                    {coverPreview ? (
                                                        <Image src={coverPreview} fill sizes="80px" className="object-cover" alt="" />
                                                    ) : (
                                                        <span className="material-symbols-outlined text-text-muted">add_photo_alternate</span>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-text-main text-xl">upload</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col">
                                                    <p className="text-text-main text-sm font-bold">Document Cover</p>
                                                    <p className="text-text-muted text-[11px] font-medium max-w-[180px]">Personalize how your document appears in the library.</p>
                                                    <input type="file" ref={coverInputRef} onChange={handleCoverSelect} accept="image/*" className="hidden" />
                                                </div>
                                            </div>

                                            <div className="flex gap-3 w-full md:w-auto">
                                                <button type="button" onClick={() => setFile(null)} className="flex-1 md:flex-none px-8 py-3 rounded-2xl text-text-muted font-bold hover:text-text-main hover:bg-black/5 dark:bg-white/5 transition-all uppercase tracking-widest text-[11px]">Cancel</button>
                                                <button type="submit" disabled={uploading || !file || !title} className="flex-1 md:flex-none px-8 py-3 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[11px] shadow-[0_0_20px_rgba(19,127,236,0.3)] hover:bg-primary-hover hover:scale-105 transition-all flex items-center justify-center gap-2 relative overflow-hidden">
                                                    {uploading && (
                                                        <div className="absolute inset-0 bg-white/10" style={{ width: `${uploadProgress}%`, transition: 'width 0.3s ease' }} />
                                                    )}
                                                    <span className="relative z-10 flex items-center gap-2">
                                                        {uploading && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                                                        {uploading ? `Uploading ${uploadProgress}%` : "Publish to Library"}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>

                    {/* Bottom: Published Documents (Full Width Grid) */}
                    <div className="flex flex-col gap-10">
                        <div className="flex items-center justify-between">
                            <h2 className="text-text-main text-2xl font-black tracking-tight">Your Publications</h2>
                            <span className="px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 text-[10px] font-black text-text-muted uppercase border border-black/5 dark:border-white/5">{books.length} Items</span>
                        </div>

                        <div className="flex flex-col gap-4">
                            {books.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 rounded-[40px] bg-surface/30 apple-glass border border-black/5 dark:border-white/5 text-center opacity-40">
                                    <span className="material-symbols-outlined text-6xl mb-4">cloud_off</span>
                                    <p className="text-base font-black uppercase tracking-widest text-text-muted">No documents integrated</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                                    {books.map(book => (
                                        <div key={book.id} className="group relative flex flex-col rounded-[32px] bg-surface/50 apple-glass border border-black/5 dark:border-white/5 overflow-hidden hover:border-primary/30 hover:bg-surface transition-all duration-500 shadow-lg hover:shadow-2xl">
                                            {/* Cover Area */}
                                            <Link href={`/pdf/${book.id}`} className="relative aspect-[3/4.2] overflow-hidden bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                                                {book.thumbnailPath ? (
                                                    <Image src={book.thumbnailPath} fill sizes="(max-width: 640px) 100vw, 25vw" className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:grayscale-0 grayscale-[0.3]" alt={book.title} />
                                                ) : (
                                                    <div className={`w-full h-full bg-gradient-to-br ${book.color || "from-blue-600 to-indigo-800"} flex items-center justify-center p-8 text-center`}>
                                                        <p className="text-text-main font-black text-xs uppercase leading-tight tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">{book.title}</p>
                                                    </div>
                                                )}
                                                {/* Overlay Info */}
                                                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-bg-dark/80 to-transparent">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-text-main/60 uppercase tracking-widest">
                                                        <span className="material-symbols-outlined text-xs">visibility</span> {book.viewCount || 0} Reads
                                                    </div>
                                                </div>

                                                {/* View Button */}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center pointer-events-none">
                                                    <div className="px-6 py-2.5 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] transform translate-y-4 group-hover:translate-y-0 transition-transform shadow-xl">
                                                        Access Node
                                                    </div>
                                                </div>
                                            </Link>

                                            {/* Content Area */}
                                            <div className="p-6 flex flex-col gap-4">
                                                <div className="flex flex-col gap-2 min-w-0">
                                                    <h3 className="font-black text-text-main text-lg leading-tight truncate group-hover:text-primary transition-colors">{book.title}</h3>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20 uppercase tracking-widest">{book.category?.name || "Library"}</span>
                                                    </div>
                                                </div>

                                                {/* Action Bar */}
                                                <div className="flex items-center gap-2 pt-4 border-t border-black/5 dark:border-white/5 mt-auto">
                                                    <button
                                                        onClick={() => openEditModal(book)}
                                                        className="flex-1 h-11 rounded-xl bg-black/5 dark:bg-white/5 text-text-main hover:bg-primary hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 group/edit"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px] transition-transform group-hover/edit:rotate-12">edit</span>
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(book.id, book.title)}
                                                        className="size-11 rounded-xl bg-red-500/5 text-red-500/40 hover:text-white hover:bg-red-500 transition-all flex items-center justify-center group/del"
                                                    >
                                                        <span className="material-symbols-outlined text-[22px] transition-transform group-hover/del:scale-110">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Redesigned Edit Modal */}
            {editingBook && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10 animate-fade-in">
                    <div className="absolute inset-0 bg-bg-dark/90 backdrop-blur-2xl" onClick={() => setEditingBook(null)}></div>
                    <div className="relative w-full max-w-4xl bg-surface/50 border border-black/10 dark:border-white/10 rounded-[40px] shadow-2xl overflow-hidden animate-fade-up">
                        <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none"></div>

                        <div className="relative z-10 p-8 md:p-12">
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex flex-col gap-2">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Management Console</p>
                                    <h2 className="text-3xl font-black text-text-main tracking-tight">Redefine Document <span className="text-primary italic">Metadata</span></h2>
                                </div>
                                <button onClick={() => setEditingBook(null)} className="size-12 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-text-muted hover:text-text-main hover:bg-black/10 dark:bg-white/10 transition-all shadow-lg active:scale-95">
                                    <span className="material-symbols-outlined text-2xl">close</span>
                                </button>
                            </div>

                            <form onSubmit={handleSaveEdit} className="grid grid-cols-1 md:grid-cols-12 gap-10">
                                {/* Left: Cover Preview */}
                                <div className="md:col-span-4 flex flex-col gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Cover Art</label>
                                        <div className="relative aspect-[3/4.2] rounded-[32px] overflow-hidden border border-black/5 dark:border-white/5 shadow-2xl group cursor-pointer" onClick={() => (document.getElementById('edit-cover-input') as HTMLInputElement)?.click()}>
                                            {editCoverPreview ? (
                                                <Image src={editCoverPreview} fill sizes="(max-width: 640px) 100vw, 30vw" className="object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                                            ) : (
                                                <div className="size-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-4xl text-text-muted">add_photo_alternate</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2">
                                                <div className="size-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg">
                                                    <span className="material-symbols-outlined">edit</span>
                                                </div>
                                                <span className="text-[10px] font-black text-text-main uppercase tracking-widest">Update Artwork</span>
                                            </div>
                                            <input id="edit-cover-input" type="file" onChange={handleEditCoverSelect} accept="image/*" className="hidden" />
                                        </div>
                                        <p className="text-[10px] text-text-muted font-medium text-center italic mt-2">Optimal: 600x900px, PNG/JPG</p>
                                    </div>
                                </div>

                                {/* Right: Controls */}
                                <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="sm:col-span-2 flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Display Title *</label>
                                        <input required value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} className="w-full h-12 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl text-text-main px-5 text-sm font-bold focus:border-primary/50 focus:bg-black/10 dark:bg-white/10 outline-none transition-all" />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Primary Category</label>
                                        <div className="relative">
                                            <select value={editForm.categoryId} onChange={e => setEditForm({ ...editForm, categoryId: e.target.value })} className="w-full h-12 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl text-text-main px-5 text-sm font-bold focus:border-primary/50 focus:bg-black/10 dark:bg-white/10 outline-none appearance-none transition-all">
                                                {categories.map(c => <option key={c.id} value={c.id} className="bg-surface text-text-main">{c.name}</option>)}
                                            </select>
                                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">expand_more</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Author Identity</label>
                                        <input value={editForm.author} onChange={e => setEditForm({ ...editForm, author: e.target.value })} className="w-full h-12 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl text-text-main px-5 text-sm font-bold focus:border-primary/50 focus:bg-black/10 dark:bg-white/10 outline-none transition-all" />
                                    </div>

                                    <div className="sm:col-span-2 flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Description Brief</label>
                                        <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={5} className="w-full p-5 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-[24px] text-text-main text-sm font-medium focus:border-primary/50 focus:bg-black/10 dark:bg-white/10 outline-none transition-all resize-none" />
                                    </div>

                                    <div className="sm:col-span-2 flex items-center justify-end gap-3 pt-6 border-t border-black/5 dark:border-white/5">
                                        <button type="button" onClick={() => setEditingBook(null)} className="px-8 py-3 rounded-2xl text-text-muted font-black uppercase tracking-widest text-[11px] hover:text-text-main hover:bg-black/5 dark:bg-white/5 transition-all">Discard</button>
                                        <button type="submit" disabled={saving || !editForm.title} className="px-10 py-4 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[11px] shadow-[0_0_30px_rgba(19,127,236,0.3)] hover:bg-primary-hover hover:scale-105 transition-all active:scale-95 flex items-center gap-2">
                                            {saving && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                                            {saving ? "Updating Systems..." : "Commit Changes"}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
