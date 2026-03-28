"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmModal";

interface BookInCollection {
    id: string;
    title: string;
    author: string;
    thumbnailPath: string | null;
    color: string;
    viewCount: number;
    pageCount: number;
    category: { name: string; slug: string } | null;
    uploader: { id: string; name: string };
}

interface Collection {
    id: string;
    name: string;
    description: string | null;
    color: string;
    user: { id: string; name: string; avatar: string | null };
    items: { id: string; book: BookInCollection }[];
}

export default function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { addToast } = useToast();
    const { confirm } = useConfirm();
    const [collection, setCollection] = useState<Collection | null>(null);
    const [isOwner, setIsOwner] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");

    useEffect(() => {
        fetch(`/api/collections/${id}`)
            .then(r => {
                if (!r.ok) throw new Error();
                return r.json();
            })
            .then(d => {
                setCollection(d.collection);
                setIsOwner(d.isOwner || false);
                setEditName(d.collection.name);
                setEditDesc(d.collection.description || "");
                setLoading(false);
            })
            .catch(() => { router.push("/"); });
    }, [id, router]);

    const handleSave = async () => {
        if (!editName.trim()) return;
        const res = await fetch(`/api/collections/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() }),
        });
        if (res.ok) {
            const data = await res.json();
            setCollection(prev => prev ? { ...prev, name: data.collection.name, description: data.collection.description } : prev);
            setEditing(false);
            addToast("Collection updated successfully", "success");
        }
    };

    const handleRemoveBook = async (bookId: string) => {
        const res = await fetch(`/api/collections/${id}/items`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookId }),
        });
        if (res.ok) {
            setCollection(prev => prev ? { ...prev, items: prev.items.filter(i => i.book.id !== bookId) } : prev);
            addToast("Book removed from collection", "success");
        }
    };

    const handleDeleteCollection = async () => {
        if (!(await confirm({ title: "Delete Collection", message: "Are you sure you want to delete this collection? Its books will not be deleted.", isDanger: true }))) return;
        const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
        if (res.ok) {
            addToast("Collection deleted", "success");
            router.push("/koleksi");
        }
    };

    if (loading || !collection) {
        return (
            <main className="flex-1 w-full max-w-[1440px] mx-auto min-h-screen px-6 md:px-10 py-10 md:py-16 relative overflow-hidden animate-pulse">
                {/* Background */}
                <div className="absolute top-0 right-0 -mr-40 -mt-40 size-[700px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="relative z-10 flex flex-col gap-10">
                    {/* Breadcrumb Skeleton */}
                    <div className="h-4 w-48 rounded-md bg-black/5 dark:bg-white/5"></div>

                    {/* Header Skeleton */}
                    <div className="p-8 md:p-12 rounded-[40px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                        <div className="flex flex-col gap-4 w-full max-w-xl">
                            <div className="h-12 w-3/4 rounded-xl bg-black/10 dark:bg-white/10"></div>
                            <div className="h-4 w-full rounded-md bg-black/5 dark:bg-white/5"></div>
                            <div className="h-6 w-32 rounded-full bg-black/10 dark:bg-white/10 mt-2"></div>
                        </div>
                        <div className="flex gap-2">
                            <div className="h-10 w-24 rounded-xl bg-black/10 dark:bg-white/10"></div>
                            <div className="h-10 w-24 rounded-xl bg-black/10 dark:bg-white/10"></div>
                        </div>
                    </div>

                    {/* Book Grid Skeleton */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8 mt-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="flex flex-col gap-4">
                                <div className="aspect-[3/4.2] w-full rounded-[28px] bg-black/5 dark:bg-white/5" />
                                <div className="h-4 w-3/4 bg-black/10 dark:bg-white/10 rounded-full" />
                                <div className="h-3 w-1/2 bg-black/5 dark:bg-white/5 rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="flex-1 w-full max-w-[1440px] mx-auto min-h-screen px-6 md:px-10 py-10 md:py-16 relative overflow-hidden">
            {/* Background */}
            <div className="absolute top-0 right-0 -mr-40 -mt-40 size-[700px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col gap-10">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-xs font-bold text-text-muted">
                    <Link href="/koleksi" className="hover:text-primary transition-colors">Collections</Link>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    <span className="text-text-main">{collection.name}</span>
                </div>

                {/* Header */}
                <div className={`p-8 md:p-12 rounded-[40px] bg-gradient-to-br ${collection.color} relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/30"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                        <div className="flex flex-col gap-3">
                            {editing ? (
                                <div className="flex flex-col gap-3">
                                    <input
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        className="text-3xl md:text-5xl font-black text-text-main bg-black/10 dark:bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2 border border-black/20 dark:border-white/20 outline-none"
                                        autoFocus
                                    />
                                    <input
                                        value={editDesc}
                                        onChange={e => setEditDesc(e.target.value)}
                                        placeholder="Description..."
                                        className="text-sm text-text-main/80 bg-black/10 dark:bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-black/20 dark:border-white/20 outline-none font-medium"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={handleSave} className="px-4 py-2 bg-black/20 dark:bg-white/20 text-text-main font-bold text-xs uppercase rounded-lg hover:bg-white/30 transition-all cursor-pointer">Save</button>
                                        <button onClick={() => setEditing(false)} className="px-4 py-2 text-text-main/60 font-bold text-xs uppercase rounded-lg hover:bg-black/10 dark:bg-white/10 transition-all cursor-pointer">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h1 className="text-3xl md:text-5xl font-black text-text-main leading-none">{collection.name}</h1>
                                    {collection.description && <p className="text-text-main/70 text-sm font-medium max-w-xl">{collection.description}</p>}
                                    <div className="flex items-center gap-3">
                                        <p className="text-text-main/50 text-xs font-black uppercase tracking-widest">{collection.items.length} books</p>
                                        {collection.user && (
                                            <Link href={`/profil/${collection.user.id}`} className="flex items-center gap-2 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-xl hover:bg-black/30 transition-all">
                                                {collection.user.avatar ? (
                                                    <Image src={collection.user.avatar} width={20} height={20} className="size-5 rounded-full object-cover" alt="" />
                                                ) : (
                                                    <div className="size-5 rounded-full bg-primary/30 flex items-center justify-center text-[8px] font-black text-white">
                                                        {(collection.user.name || "?").substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                                <span className="text-[10px] font-bold text-text-main/70">{collection.user.name}</span>
                                            </Link>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                        {!editing && isOwner && (
                            <div className="flex gap-2">
                                <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-4 py-2 bg-black/10 dark:bg-white/10 backdrop-blur-md text-text-main font-bold text-xs uppercase rounded-xl hover:bg-black/20 dark:bg-white/20 transition-all cursor-pointer border border-black/10 dark:border-white/10">
                                    <span className="material-symbols-outlined text-sm">edit</span> Edit
                                </button>
                                <button onClick={handleDeleteCollection} className="flex items-center gap-1.5 px-4 py-2 bg-red-500/20 backdrop-blur-md text-red-300 font-bold text-xs uppercase rounded-xl hover:bg-red-500/30 transition-all cursor-pointer border border-red-500/20">
                                    <span className="material-symbols-outlined text-sm">delete</span> Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Book Grid */}
                {collection.items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40 border border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-surface">
                        <span className="material-symbols-outlined text-6xl">library_books</span>
                        <p className="text-sm font-black uppercase tracking-[0.2em]">Collection is empty</p>
                        <p className="text-xs text-text-muted font-medium">Add books from the PDF Detail page</p>
                        <Link href="/search" className="mt-2 px-6 py-3 bg-primary text-white font-black text-xs uppercase tracking-wider rounded-2xl hover:scale-105 active:scale-95 transition-all">
                            Explore Library
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8">
                        {collection.items.map(({ id: itemId, book }) => (
                            <div key={itemId} className="group flex flex-col gap-4 relative">
                                {/* Remove button - only for owner */}
                                {isOwner && (
                                    <button
                                        onClick={(e) => { e.preventDefault(); handleRemoveBook(book.id); }}
                                        className="absolute -top-2 -right-2 z-10 size-8 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110 cursor-pointer"
                                        title="Remove from collection"
                                    >
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                )}

                                <Link href={`/pdf/${book.id}`} className="flex flex-col gap-4">
                                    <div className="relative aspect-[3/4.2] rounded-[28px] overflow-hidden bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 shadow-2xl group-hover:shadow-[0_0_30px_rgba(19,127,236,0.15)] group-hover:border-primary/40 transition-all duration-500">
                                        {book.thumbnailPath ? (
                                            <Image src={book.thumbnailPath} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw" className="object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" alt={book.title || "Cover"} />
                                        ) : (
                                            <div className={`w-full h-full bg-gradient-to-br ${book.color || "from-blue-600 to-indigo-800"} flex items-center justify-center p-6 text-center opacity-30 group-hover:opacity-100 transition-opacity`}>
                                                <p className="text-text-main font-black text-[10px] uppercase leading-tight tracking-widest">{book.title}</p>
                                            </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-bg-dark/80 to-transparent">
                                            <div className="flex items-center gap-1 text-[9px] font-black text-text-main/50 uppercase">
                                                <span className="material-symbols-outlined text-[10px]">visibility</span> {book.viewCount}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-1 flex flex-col gap-1">
                                        <h3 className="font-black text-text-main text-base leading-tight truncate group-hover:text-primary transition-colors">{book.title}</h3>
                                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                                            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest truncate">{book.author || "Unknown"}</span>
                                            {book.category && (
                                                <span className="text-[8px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded shadow-sm border border-primary/20 shrink-0 uppercase">{book.category.name}</span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
