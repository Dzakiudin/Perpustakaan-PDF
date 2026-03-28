"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import Link from "next/link";
import { useConfirm } from "@/components/ConfirmModal";
import Image from "next/image";

export default function AdminBooksClient({ initialBooks }: { initialBooks: any[] }) {
    const [books, setBooks] = useState(initialBooks);
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const { addToast } = useToast();
    const { confirm } = useConfirm();

    // Get unique categories
    const categories = ["all", ...new Set(initialBooks.map(b => b.category?.name).filter(Boolean))];

    const filteredBooks = books.filter(book => {
        const matchesSearch = book.title.toLowerCase().includes(search.toLowerCase()) ||
            book.author.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === "all" || book.category?.name === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleDelete = async (id: string, title: string) => {
        if (!(await confirm({ title: "Delete Asset", message: `Execute deletion protocol for "${title}"? This asset will be permanently erased from storage.`, isDanger: true }))) return;

        try {
            const res = await fetch(`/api/admin/books/${id}`, { method: "DELETE" });
            if (res.ok) {
                setBooks(books.filter(b => b.id !== id));
                setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
                addToast("Asset successfully erased", "success");
            } else {
                addToast("Deletion protocol failed", "error");
            }
        } catch {
            addToast("Uplink unstable", "error");
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!(await confirm({ title: "Bulk Delete", message: `Execute deletion protocol for ${selectedIds.length} assets? This action is irreversible.`, isDanger: true }))) return;

        try {
            // Delete one by one for now as we don't have a bulk API yet, or we can assume there's one.
            // Let's assume there's one or we implement it. For safety and simplicity, we'll loop or just hint at it.
            // Actually, let's just do it sequentially for now or implement a quick loop.
            let successCount = 0;
            for (const id of selectedIds) {
                const res = await fetch(`/api/admin/books/${id}`, { method: "DELETE" });
                if (res.ok) successCount++;
            }

            if (successCount > 0) {
                setBooks(books.filter(b => !selectedIds.includes(b.id)));
                setSelectedIds([]);
                addToast(`Successfully erased ${successCount} assets`, "success");
            }
        } catch {
            addToast("Bulk operation failed", "error");
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredBooks.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredBooks.map(b => b.id));
        }
    };

    return (
        <div className="flex flex-col">
            {/* Filters Bar */}
            <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-black/5 dark:border-white/5 bg-surface/50">
                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-text-muted group-focus-within:text-primary transition-colors">search</span>
                        <input
                            type="text"
                            placeholder="Filter by title/author..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-12 pr-6 py-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary/30 outline-none w-full md:w-[320px] font-medium text-sm transition-all"
                        />
                    </div>

                    <div className="relative">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="appearance-none pl-6 pr-12 py-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary/30 outline-none font-black text-[10px] uppercase tracking-widest cursor-pointer transition-all"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat === 'all' ? 'All Classes' : cat}</option>
                            ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">keyboard_arrow_down</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10 animate-in fade-in zoom-in duration-300"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                            Purge {selectedIds.length} Selected
                        </button>
                    )}
                    <div className="px-4 py-2 rounded-xl bg-primary/5 border border-primary/10">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Total Registry</p>
                        <p className="text-xl font-black text-text-main mt-1 leading-none">{filteredBooks.length}</p>
                    </div>
                </div>
            </div>

            <div className="w-full overflow-x-auto custom-scrollbar">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                            <th className="px-6 py-6 text-center w-14">
                                <button
                                    onClick={toggleSelectAll}
                                    className={`size-6 rounded-lg border-2 transition-all flex items-center justify-center ${selectedIds.length === filteredBooks.length && filteredBooks.length > 0
                                            ? "bg-primary border-primary text-white"
                                            : "border-black/10 dark:border-white/10 hover:border-primary/50"
                                        }`}
                                >
                                    {selectedIds.length === filteredBooks.length && filteredBooks.length > 0 && <span className="material-symbols-outlined text-[16px] font-black">check</span>}
                                </button>
                            </th>
                            <th className="px-6 py-6 text-left text-[10px] font-black text-text-muted uppercase tracking-[0.2em] min-w-[320px]">Asset Designation</th>
                            <th className="px-6 py-6 text-left text-[10px] font-black text-text-muted uppercase tracking-[0.2em] min-w-[180px]">Primary Source</th>
                            <th className="px-6 py-6 text-center text-[10px] font-black text-text-muted uppercase tracking-[0.2em] min-w-[140px]">Classification</th>
                            <th className="px-6 py-6 text-center text-[10px] font-black text-text-muted uppercase tracking-[0.2em] min-w-[120px]">Engagement Stats</th>
                            <th className="px-10 py-6 text-right text-[10px] font-black text-text-muted uppercase tracking-[0.2em] min-w-[120px]">Kernel Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredBooks.map((book) => (
                            <tr key={book.id} className={`group transition-all duration-300 ${selectedIds.includes(book.id) ? 'bg-primary/5' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                <td className="px-6 py-8 text-center">
                                    <button
                                        onClick={() => toggleSelect(book.id)}
                                        className={`size-6 rounded-lg border-2 transition-all flex items-center justify-center mx-auto ${selectedIds.includes(book.id)
                                                ? "bg-primary border-primary text-white ring-4 ring-primary/10"
                                                : "border-black/10 dark:border-white/10 group-hover:border-primary/50"
                                            }`}
                                    >
                                        {selectedIds.includes(book.id) && <span className="material-symbols-outlined text-[16px] font-black">check</span>}
                                    </button>
                                </td>
                                <td className="px-6 py-8">
                                    <Link href={`/pdf/${book.id}`} className="flex items-center gap-5">
                                        <div className="relative shrink-0 w-12 h-16 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 shadow-lg group-hover:scale-110 group-hover:rotate-2 transition-all duration-500">
                                            {book.thumbnailPath ? (
                                                <Image src={book.thumbnailPath} fill sizes="48px" className="object-cover grayscale group-hover:grayscale-0" alt="" />
                                            ) : (
                                                <div className="size-full bg-gradient-to-br from-primary/20 to-bg-dark flex items-center justify-center p-2">
                                                    <span className="material-symbols-outlined text-primary text-xl">description</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-1 min-w-0">
                                            <h3 className="text-text-main font-black group-hover:text-primary transition-colors text-lg truncate max-w-[200px] leading-tight">{book.title}</h3>
                                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-tighter truncate max-w-[200px]">By {book.author || "Unknown"}</p>
                                        </div>
                                    </Link>
                                </td>
                                <td className="px-6 py-8">
                                    <div className="flex items-center gap-3">
                                        <div className="relative size-8 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-center overflow-hidden ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                                            {book.uploader?.avatar ? (
                                                <Image src={book.uploader.avatar} fill sizes="32px" className="object-cover" alt="" />
                                            ) : (
                                                <span className="text-[9px] font-black text-text-muted">{(book.uploader?.name || "?").substring(0, 2).toUpperCase()}</span>
                                            )}
                                        </div>
                                        <span className="text-sm font-black text-text-muted group-hover:text-text-main transition-colors">{book.uploader?.name || "System"}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-8 text-center">
                                    <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-text-muted group-hover:border-primary/30 group-hover:text-primary transition-all">
                                        {book.category?.name || "Unclassified"}
                                    </span>
                                </td>
                                <td className="px-6 py-8 text-center">
                                    <div className="inline-flex flex-col items-center">
                                        <div className="flex items-center gap-2 text-text-main font-black text-xs">
                                            <span className="material-symbols-outlined text-[14px] text-primary">visibility</span>
                                            {book.viewCount}
                                        </div>
                                        <div className="flex items-center gap-2 text-text-muted font-bold text-[9px] uppercase">
                                            <span className="material-symbols-outlined text-[12px]">favorite</span>
                                            {book.likeCount}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-10 py-8 text-right">
                                    <button
                                        onClick={() => handleDelete(book.id, book.title)}
                                        className="size-10 rounded-2xl bg-red-500/5 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer group/btn active:scale-90 inline-flex items-center justify-center"
                                        title="Erase Asset"
                                    >
                                        <span className="material-symbols-outlined text-[20px] transition-transform group-hover/btn:rotate-12">delete</span>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredBooks.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-10 py-32 text-center">
                                    <div className="flex flex-col items-center gap-2 opacity-30">
                                        <span className="material-symbols-outlined text-5xl text-primary animate-pulse">inventory_2</span>
                                        <p className="text-[10px] font-black uppercase tracking-widest">No matching assets in local cache</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
