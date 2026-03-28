"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useLanguage } from "@/context/LanguageContext";
import { Skeleton } from "@/components/Skeleton";

interface CollectionPreview {
    id: string;
    name: string;
    description: string | null;
    color: string;
    _count: { items: number };
    items: { book: { id: string; title: string; thumbnailPath: string | null; color: string } }[];
}

const GRADIENT_OPTIONS = [
    "from-blue-500 to-indigo-600",
    "from-purple-500 to-pink-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-red-600",
    "from-cyan-500 to-blue-600",
    "from-violet-500 to-purple-600",
    "from-lime-500 to-green-600",
];

export default function KoleksiPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const { addToast } = useToast();
    const [collections, setCollections] = useState<CollectionPreview[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newColor, setNewColor] = useState(GRADIENT_OPTIONS[0]);

    useEffect(() => {
        fetch("/api/collections")
            .then(r => {
                if (!r.ok) throw new Error();
                return r.json();
            })
            .then(d => { setCollections(d.collections); setLoading(false); })
            .catch(() => { router.push("/login"); });
    }, [router]);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const res = await fetch("/api/collections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName.trim(), description: newDesc.trim(), color: newColor }),
            });
            if (res.ok) {
                const data = await res.json();
                setCollections(prev => [{ ...data.collection, _count: { items: 0 }, items: [] }, ...prev]);
                setShowCreate(false);
                setNewName("");
                setNewDesc("");
                setNewColor(GRADIENT_OPTIONS[0]);
                addToast(t("collections_created_success"), "success");
            } else {
                addToast(t("collections_create_failed"), "error");
            }
        } catch {
            addToast("An error occurred", "error");
        }
        setCreating(false);
    };

    if (loading) {
        return (
            <main className="flex-1 w-full min-h-screen px-6 md:px-12 py-10 pt-24 md:pt-[104px] relative overflow-hidden">
                <div className="relative z-10 flex flex-col gap-12 w-full">
                    {/* Header Skeleton */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex flex-col gap-4">
                            <Skeleton className="h-6 w-32 rounded-full" />
                            <Skeleton className="h-16 w-64 md:w-[480px] rounded-[24px]" />
                            <Skeleton className="h-6 w-80 rounded-full" />
                        </div>
                        <Skeleton className="h-14 w-48 rounded-[24px]" />
                    </div>

                    {/* Collection Cards Skeleton */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="flex flex-col rounded-[40px] bg-surface border border-black/5 dark:border-white/5 overflow-hidden shadow-xl">
                                <Skeleton className="h-28 w-full rounded-none" />
                                <div className="p-6 flex flex-col gap-3">
                                    <Skeleton className="h-6 w-3/4 rounded-full" />
                                    <Skeleton className="h-4 w-1/2 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="flex-1 w-full min-h-screen px-6 md:px-12 py-10 pt-24 md:pt-[104px] relative">
            {/* Background Decorations Removed */}

            <div className="relative z-10 flex flex-col gap-12 w-full">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex flex-col gap-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-black/5 dark:border-white/5 text-primary w-fit shadow-sm">
                            <span className="material-symbols-outlined text-[16px]">collections_bookmark</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t("collections_subtitle")}</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-text-main leading-none uppercase tracking-tight">
                            {t("collections_title").split(' ')[0]} <span className="text-primary italic">{t("collections_title").split(' ')[1]}</span>
                        </h1>
                        <p className="text-text-muted text-lg font-medium max-w-lg">{t("collections_desc")}</p>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-8 py-4 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-[24px] hover:scale-[1.03] active:scale-[0.97] transition-all duration-500 ease-out shadow-[0_10px_30px_rgba(255,90,95,0.2)] hover:shadow-[0_15px_40px_rgba(255,90,95,0.4)] cursor-pointer group"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        {t("collections_create_button")}
                    </button>
                </div>

                {/* Create Modal */}
                {showCreate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
                        <div className="w-full max-w-md p-8 bg-white dark:bg-[#111a24] border border-black/10 dark:border-white/10 rounded-[32px] shadow-2xl animate-fade-up" onClick={e => e.stopPropagation()}>
                            <h3 className="text-xl font-black text-text-main uppercase tracking-tight mb-6">{t("collections_new_title")}</h3>
                            <div className="flex flex-col gap-4">
                                <input
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder={t("collections_name_placeholder")}
                                    className="w-full h-12 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-text-main px-4 font-bold text-sm focus:border-primary/50 outline-none transition-all"
                                    autoFocus
                                />
                                <textarea
                                    value={newDesc}
                                    onChange={e => setNewDesc(e.target.value)}
                                    rows={2}
                                    placeholder={t("collections_desc_placeholder")}
                                    className="w-full p-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-text-main font-medium text-sm focus:border-primary/50 outline-none transition-all resize-none"
                                />
                                <div>
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">{t("collections_choose_color")}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {GRADIENT_OPTIONS.map(g => (
                                            <button
                                                key={g}
                                                onClick={() => setNewColor(g)}
                                                className={`size-8 rounded-xl bg-gradient-to-br ${g} transition-all cursor-pointer ${newColor === g ? "ring-2 ring-white ring-offset-2 ring-offset-[#111a24] scale-110" : "opacity-60 hover:opacity-100"}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowCreate(false)} className="flex-1 h-12 rounded-xl border border-black/10 dark:border-white/10 text-text-main/60 font-bold text-sm hover:bg-black/5 dark:bg-white/5 transition-all cursor-pointer">{t("collections_cancel")}</button>
                                <button onClick={handleCreate} disabled={creating || !newName.trim()} className="flex-1 h-12 rounded-xl bg-primary text-white font-black text-sm uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50">
                                    {creating ? t("collections_creating") : t("collections_create")}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Collection Cards */}
                {collections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40 border border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-surface">
                        <span className="material-symbols-outlined text-6xl">folder_open</span>
                        <p className="text-sm font-black uppercase tracking-[0.2em]">{t("collections_empty_title")}</p>
                        <p className="text-xs text-text-muted font-medium">{t("collections_empty_desc")}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {collections.map(col => (
                            <Link
                                key={col.id}
                                href={`/koleksi/${col.id}`}
                                className="group flex flex-col rounded-[40px] bg-surface border border-black/5 dark:border-white/5 overflow-hidden hover:border-primary/30 transition-all duration-500 ease-out shadow-xl hover:shadow-2xl active:scale-[0.98]"
                            >
                                {/* Color Header */}
                                <div className={`h-24 bg-gradient-to-br ${col.color} relative overflow-hidden`}>
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                                    <div className="absolute bottom-3 left-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-text-main/80 text-lg">collections_bookmark</span>
                                        <span className="text-[10px] font-black text-text-main/80 uppercase tracking-widest">{col._count.items} {t("collections_books_count")}</span>
                                    </div>

                                    {/* Thumbnails preview */}
                                    <div className="absolute -bottom-4 right-4 flex -space-x-3">
                                        {col.items.slice(0, 3).map((item, i) => (
                                            <div key={item.book.id} className="size-12 rounded-lg overflow-hidden border-2 border-[#111a24] shadow-md" style={{ zIndex: 3 - i }}>
                                                {item.book.thumbnailPath ? (
                                                    <Image src={item.book.thumbnailPath} width={48} height={48} className="size-full object-cover" alt="" />
                                                ) : (
                                                    <div className={`size-full bg-gradient-to-br ${item.book.color}`}></div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-5 flex flex-col gap-2">
                                    <h3 className="font-black text-text-main text-lg leading-tight group-hover:text-primary transition-colors truncate">{col.name}</h3>
                                    {col.description && (
                                        <p className="text-text-muted text-xs font-medium line-clamp-2">{col.description}</p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
