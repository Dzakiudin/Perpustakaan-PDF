"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import StarRating from "@/components/StarRating";
import { useConfirm } from "@/components/ConfirmModal";
import { useLanguage } from "@/context/LanguageContext";

interface PDFDetailClientProps {
    bookId: string;
}

export default function PDFDetailClient({ bookId }: PDFDetailClientProps) {
    const router = useRouter();
    const { confirm, alert } = useConfirm();
    const { t } = useLanguage();
    const [book, setBook] = useState<any>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [colDropdownOpen, setColDropdownOpen] = useState(false);
    const [collections, setCollections] = useState<any[]>([]);
    const [colLoaded, setColLoaded] = useState(false);
    const [reviews, setReviews] = useState<any[]>([]);
    const [avgRating, setAvgRating] = useState(0);
    const [reviewCount, setReviewCount] = useState(0);
    const [userRating, setUserRating] = useState(0);
    const [userReviewText, setUserReviewText] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);
    const [isEditingReview, setIsEditingReview] = useState(false);
    const [similarBooks, setSimilarBooks] = useState<any[]>([]);

    useEffect(() => {
        fetchCurrentUser();
        fetchBook();
        fetchReviews();
        fetchSimilarBooks();
    }, [bookId]);

    const fetchCurrentUser = async () => {
        try {
            const res = await fetch("/api/auth/me");
            if (res.ok) setCurrentUser(await res.json());
        } catch { /* ignore */ }
    };

    const fetchBook = async () => {
        try {
            const res = await fetch(`/api/books/${bookId}`);
            if (res.ok) setBook(await res.json());
        } catch { /* ignore */ }
        setLoading(false);
    };

    const fetchSimilarBooks = async () => {
        try {
            const res = await fetch(`/api/books/${bookId}/similar`);
            if (res.ok) setSimilarBooks(await res.json());
        } catch { /* ignore */ }
    };

    const toggleLike = async () => {
        const res = await fetch(`/api/books/${bookId}/like`, { method: "POST" });
        if (res.ok) {
            const data = await res.json();
            setBook((b: any) => ({
                ...b,
                userLiked: data.liked,
                likeCount: data.liked ? b.likeCount + 1 : b.likeCount - 1,
            }));
        }
    };

    const toggleBookmark = async () => {
        const res = await fetch("/api/bookmarks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookId }),
        });
        if (res.ok) {
            const data = await res.json();
            setBook((b: any) => ({ ...b, userBookmarked: data.bookmarked }));
        }
    };

    const loadCollections = async () => {
        if (colLoaded) return;
        try {
            const res = await fetch("/api/collections");
            if (res.ok) {
                const data = await res.json();
                setCollections(data.collections);
                setColLoaded(true);
            }
        } catch { /* ignore */ }
    };

    const toggleCollectionItem = async (colId: string) => {
        const col = collections.find((c: any) => c.id === colId);
        const isInCollection = col?.items?.some((i: any) => i.book.id === bookId);

        if (isInCollection) {
            await fetch(`/api/collections/${colId}/items`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookId }),
            });
        } else {
            await fetch(`/api/collections/${colId}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookId }),
            });
        }

        // Update main button if this is a "default" like collection
        if (col.name === t("pdf_default_collection_name") || col.name === "Favorit Saya" || col.name === "My Favorites") {
            setBook((prev: any) => ({ ...prev, userBookmarked: !isInCollection }));
            router.refresh();
        }

        // Refresh collections
        setColLoaded(false);
        loadCollections();
    };

    const fetchReviews = async () => {
        try {
            const res = await fetch(`/api/books/${bookId}/reviews`);
            if (res.ok) {
                const data = await res.json();
                setReviews(data.reviews);
                setAvgRating(data.avgRating);
                setReviewCount(data.reviewCount);
                if (data.userReview) {
                    setUserRating(data.userReview.rating);
                    setUserReviewText(data.userReview.content || "");
                }
            }
        } catch { /* ignore */ }
    };

    const submitReview = async () => {
        if (userRating < 1) return;
        setSubmittingReview(true);
        try {
            const res = await fetch(`/api/books/${bookId}/reviews`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rating: userRating, content: userReviewText }),
            });
            if (res.ok) {
                const data = await res.json();
                setAvgRating(data.avgRating);
                setReviewCount(data.reviewCount);
                setIsEditingReview(false);
                fetchReviews();
            }
        } catch { /* ignore */ }
        setSubmittingReview(false);
    };

    const deleteReview = async () => {
        if (!(await confirm({ title: t("pdf_deleted_review"), message: t("pdf_delete_review_confirm"), isDanger: true }))) return;
        try {
            const res = await fetch(`/api/books/${bookId}/reviews`, { method: "DELETE" });
            if (res.ok) {
                const data = await res.json();
                setAvgRating(data.avgRating);
                setReviewCount(data.reviewCount);
                setUserRating(0);
                setUserReviewText("");
                setIsEditingReview(false);
                fetchReviews();
            }
        } catch { /* ignore */ }
    };

    const editReview = () => {
        setIsEditingReview(true);
    };

    const handleReport = async (type: "BOOK" | "REVIEW", targetId: string) => {
        if (!currentUser) {
            alert({ title: t("pdf_login_required"), message: t("pdf_login_required_msg") });
            return;
        }

        const reason = prompt(t("pdf_report_reason_prompt"));
        if (!reason || !reason.trim()) return;

        try {
            const res = await fetch("/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, targetId, reason: reason.trim() })
            });
            if (res.ok) {
                alert({ title: t("common_success"), message: t("pdf_report_success") });
            } else {
                alert({ title: t("common_error"), message: t("pdf_report_error"), isDanger: true });
            }
        } catch (e) {
            alert({ title: t("common_error"), message: t("common_error"), isDanger: true });
        }
    };

    const cancelEditReview = () => {
        setIsEditingReview(false);
        // Reset to saved review state
        const myRev = reviews.find((r: any) => r.user.id === currentUser?.user?.id);
        if (myRev) {
            setUserRating(myRev.rating);
            setUserReviewText(myRev.content || "");
        } else {
            setUserRating(0);
            setUserReviewText("");
        }
    };

    if (loading) {
        return (
            <div className="max-w-[1200px] mx-auto px-6 py-12 md:py-20 flex flex-col gap-10">
                <div className="flex flex-col md:flex-row gap-12">
                    <div className="skeleton w-64 aspect-[3/4.2] rounded-[32px]" />
                    <div className="flex-1 space-y-6">
                        <div className="skeleton h-12 w-3/4 rounded-xl" />
                        <div className="skeleton h-6 w-1/4 rounded-lg" />
                        <div className="space-y-3">
                            <div className="skeleton h-4 w-full" />
                            <div className="skeleton h-4 w-5/6" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!book) {
        return (
            <div className="max-w-4xl mx-auto px-6 py-32 text-center flex flex-col items-center gap-6">
                <div className="size-24 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center border border-dashed border-black/20 dark:border-white/20">
                    <span className="material-symbols-outlined text-5xl text-text-muted">error</span>
                </div>
                <h2 className="text-3xl font-black text-text-main uppercase tracking-tight">{t("pdf_intel_lost")}</h2>
                <p className="text-text-muted">{t("pdf_node_not_found")}</p>
                <Link href="/" className="px-8 py-3 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs shadow-lg">{t("pdf_back_hub")}</Link>
            </div>
        );
    }

    return (
        <main className="flex-1 w-full max-w-[1440px] mx-auto min-h-screen px-6 py-12 md:py-20 relative">
            {/* Background Decorations Removed for clean look */}

            <div className="relative z-10 flex flex-col gap-16 md:gap-24">
                {/* Book Info Phase 1 */}
                <div className="flex flex-col md:flex-row gap-12 md:gap-20 items-start">
                    {/* Visual Node */}
                    <div className="shrink-0 w-full md:w-auto flex justify-center">
                        <div className="relative w-64 md:w-80 aspect-[3/4.2] rounded-[40px] overflow-hidden shadow-xl border border-black/5 dark:border-white/5 transition-transform duration-700 hover:scale-[1.02] bg-surface group">
                            {book.thumbnailPath ? (
                                <Image src={book.thumbnailPath} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700" alt={book.title || "Cover"} />
                            ) : (
                                <div className={`w-full h-full p-8 flex items-center justify-center text-center bg-gradient-to-br ${book.color || "from-blue-600 to-indigo-900"}`}>
                                    <p className="text-text-main font-black text-xl uppercase leading-tight tracking-[0.1em]">{book.title}</p>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/80 via-transparent to-transparent opacity-60" />
                        </div>
                    </div>

                    {/* Meta Analysis */}
                    <div className="flex-1 flex flex-col gap-8 md:pt-4">
                        <div className="flex flex-col gap-4">
                            {book.category && (
                                <Link href={`/kategori/${book.category.slug}`} className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-black/5 dark:border-white/5 text-primary w-fit hover:bg-primary/10 transition-all active:scale-95 shadow-sm">
                                    <span className="material-symbols-outlined text-[18px]">{book.category.icon || "category"}</span>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{book.category.name}</span>
                                </Link>
                            )}
                            <h1 className="text-4xl md:text-6xl font-black text-text-main leading-[1.05] tracking-tight uppercase">{book.title}</h1>
                            <div className="flex items-center gap-3">
                                <div className="h-px w-8 bg-primary"></div>
                                <p className="text-text-muted text-lg font-medium">{t("pdf_source")}: <span className="text-text-main font-black italic">{book.author || t("search_unknown_source")}</span></p>
                            </div>
                        </div>

                        {book.description && (
                            <p className="text-text-muted text-lg leading-relaxed font-medium max-w-2xl bg-surface p-8 rounded-[32px] border border-black/5 dark:border-white/5 shadow-sm">
                                {book.description}
                            </p>
                        )}

                        {/* Telemetry Stats */}
                        <div className="flex flex-wrap gap-8 py-2 border-y border-black/5 dark:border-white/5">
                            {[
                                { val: book.viewCount, lab: t("pdf_engagement"), icon: "visibility", col: "text-primary" },
                                { val: book.likeCount, lab: t("pdf_pulse_sync"), icon: "favorite", col: "text-red-400" },
                                { val: book.pageCount || 0, lab: t("pdf_data_depth"), icon: "description", col: "text-blue-400" }
                            ].map((s, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className={`size-10 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-center ${s.col}`}>
                                        <span className="material-symbols-outlined text-xl">{s.icon}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-text-main font-black text-xl leading-none">{s.val}</span>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-text-muted mt-1.5">{s.lab}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Indexing Protocols */}
                        {book.tags && (
                            <div className="flex flex-wrap gap-3">
                                {book.tags.split(",").filter(Boolean).map((tag: string) => (
                                    <span key={tag} className="text-[10px] font-black text-text-main/40 uppercase tracking-widest bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 px-4 py-1.5 rounded-full hover:border-primary/30 hover:text-primary transition-all cursor-default">#{tag.trim()}</span>
                                ))}
                            </div>
                        )}

                        {/* Action Control Hub */}
                        <div className="flex flex-wrap gap-5 pt-10">
                            <Link
                                href={`/pdf/${bookId}/baca`}
                                className="group relative inline-flex items-center gap-4 px-10 py-5 rounded-[24px] bg-primary text-white font-black uppercase tracking-[0.2em] text-xs shadow-[0_10px_30px_rgba(255,90,95,0.2)] hover:shadow-[0_15px_40px_rgba(255,90,95,0.4)] transition-all duration-500 ease-out hover:scale-[1.03] active:scale-[0.97]"
                            >
                                <span className="material-symbols-outlined text-2xl relative z-10">menu_book</span>
                                <span className="relative z-10">{t("pdf_init_reader")}</span>
                            </Link>

                            <button
                                onClick={toggleLike}
                                className={`size-16 rounded-[24px] border flex items-center justify-center transition-all duration-500 cursor-pointer active:scale-90 ${book.userLiked
                                    ? "bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                                    : "bg-surface border-black/5 dark:border-white/5 text-text-muted hover:border-black/20 dark:border-white/20 hover:text-white"
                                    }`}
                            >
                                <span className={`material-symbols-outlined text-2xl ${book.userLiked ? "fill-icon" : ""}`}>favorite</span>
                            </button>

                            <button
                                onClick={async () => {
                                    const res = await fetch("/api/collections/save-toggle", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ bookId }),
                                    });
                                    if (res.ok) {
                                        const data = await res.json();
                                        setBook((b: any) => ({ ...b, userBookmarked: data.saved }));
                                        router.refresh();
                                        // Also refresh collections to show the item in "Favorit Saya" if dropdown is open
                                        if (colDropdownOpen) {
                                            setColLoaded(false);
                                            loadCollections();
                                        }
                                    }
                                }}
                                className={`group relative inline-flex items-center gap-4 px-8 py-5 rounded-[24px] border transition-all duration-500 cursor-pointer active:scale-90 ${book.userBookmarked
                                    ? "bg-amber-500 border-amber-500 text-white shadow-[0_10px_20px_rgba(245,158,11,0.2)]"
                                    : "bg-surface border-black/5 dark:border-white/5 text-text-muted hover:border-amber-500/50 hover:text-amber-500"
                                    }`}
                                title={book.userBookmarked ? t("pdf_saved_to_library") : t("pdf_save_to_library")}
                            >
                                <span className={`material-symbols-outlined text-2xl ${book.userBookmarked ? "fill-icon" : ""}`}>
                                    {book.userBookmarked ? "bookmark_added" : "bookmark_add"}
                                </span>
                                <span className="font-black uppercase tracking-widest text-xs">
                                    {book.userBookmarked ? t("pdf_saved_to_library") : t("pdf_save_to_library")}
                                </span>
                            </button>

                            {/* Collections Manager */}
                            <div className="relative">
                                <button
                                    onClick={() => { setColDropdownOpen(!colDropdownOpen); loadCollections(); }}
                                    className="size-16 rounded-[24px] border bg-surface border-black/5 dark:border-white/5 text-text-muted hover:border-primary/30 hover:text-primary flex items-center justify-center transition-all duration-500 cursor-pointer active:scale-90"
                                    title={t("pdf_save_collection")}
                                >
                                    <span className="material-symbols-outlined text-2xl">library_add</span>
                                </button>
                                {colDropdownOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-64 bg-white/95 dark:bg-[#111a24]/95 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-up">
                                        <div className="px-4 py-3 border-b border-black/5 dark:border-white/5">
                                            <h4 className="text-xs font-black text-text-main uppercase tracking-wider">{t("pdf_save_collection")}</h4>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto">
                                            {collections.length === 0 ? (
                                                <div className="p-4 text-center">
                                                    <p className="text-xs text-text-main/40 font-medium">{t("pdf_no_collections")}</p>
                                                </div>
                                            ) : (
                                                collections.map((col: any) => {
                                                    const isIn = col.items?.some((i: any) => i.book.id === bookId);
                                                    return (
                                                        <button
                                                            key={col.id}
                                                            onClick={() => toggleCollectionItem(col.id)}
                                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 dark:bg-white/5 transition-colors text-left cursor-pointer"
                                                        >
                                                            <div className={`size-5 rounded-md border flex items-center justify-center transition-all ${isIn ? "bg-primary border-primary" : "border-black/20 dark:border-white/20"}`}>
                                                                {isIn && <span className="material-symbols-outlined text-text-main text-sm">check</span>}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-text-main truncate">{col.name}</p>
                                                                <p className="text-[10px] text-text-main/40">{col._count?.items || 0} {t("collections_books_count")}</p>
                                                            </div>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                        <div className="border-t border-black/5 dark:border-white/5 p-2">
                                            <Link
                                                href="/koleksi"
                                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">add</span>
                                                {t("collections_create_button")}
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Report PDF */}
                            <button
                                onClick={() => handleReport("BOOK", bookId)}
                                className="size-16 rounded-[24px] border border-black/5 dark:border-white/5 bg-surface text-text-muted hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center transition-all duration-500 cursor-pointer active:scale-90"
                                title={t("pdf_report_violation")}
                            >
                                <span className="material-symbols-outlined text-2xl">flag</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Integration Details & Social Loop */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-20">
                    {/* Left: Origin Identity */}
                    <div className="lg:col-span-4">
                        <div className="sticky top-28 flex flex-col gap-6">
                            <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[0.4em] ml-2">{t("pdf_uplink_source")}</h2>
                            {book.uploader && (
                                <div className="group flex flex-col items-center p-10 rounded-[48px] bg-surface border border-black/5 dark:border-white/5 transition-all duration-500 ease-out hover:shadow-xl relative overflow-hidden">
                                    <div className="relative size-24 rounded-[32px] overflow-hidden bg-bg-dark border border-black/5 dark:border-white/5 group-hover:border-primary/40 transition-all duration-500 mb-6">
                                        {book.uploader.avatar ? (
                                            <Image src={book.uploader.avatar} fill sizes="96px" className="object-cover" alt="" />
                                        ) : (
                                            <div className="size-full flex items-center justify-center text-primary font-black text-2xl">{(book.uploader.name || "?").substring(0, 2).toUpperCase()}</div>
                                        )}
                                    </div>
                                    <div className="relative text-center flex flex-col items-center gap-1">
                                        <p className="text-text-main font-black text-xl group-hover:text-primary transition-colors">{book.uploader.name}</p>
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-1">{book.uploader.uploadCount} {t("pdf_deployed_modules")}</p>
                                    </div>
                                    <Link href={`/profil/${book.uploader.id}`} className="mt-8 px-8 py-3 rounded-2xl bg-bg-dark border border-black/5 dark:border-white/5 text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-primary hover:bg-primary/5 transition-all duration-300 active:scale-[0.97]">{t("pdf_profile_hub")}</Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Reviews & Comments */}
                    <div className="lg:col-span-8 flex flex-col gap-10">
                        {/* Reviews Section */}
                        <div className="flex flex-col gap-10">
                            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-10">
                                <h2 className="text-2xl font-black text-text-main uppercase tracking-tight flex items-center gap-4">
                                    {t("pdf_reader_reviews").split(' ')[0]} <span className="text-amber-400 italic">{t("pdf_reader_reviews").split(' ')[1]}</span>
                                    <span className="text-xs font-black bg-black/5 dark:bg-white/5 px-3 py-1 rounded-full border border-black/5 dark:border-white/5 text-text-muted opacity-60">[{reviewCount}]</span>
                                </h2>
                                <div className="flex items-center gap-3">
                                    <StarRating rating={avgRating} size="md" />
                                    <span className="text-lg font-black text-amber-400">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</span>
                                </div>
                            </div>

                            {/* User's Review or Submit Form */}
                            {currentUser?.user && (() => {
                                const myReview = reviews.find((r: any) => r.user.id === currentUser.user.id);

                                if (myReview && !isEditingReview) {
                                    // Display read-only "Your Review"
                                    return (
                                        <div className="p-8 rounded-[32px] bg-surface border border-black/5 dark:border-white/5 flex flex-col gap-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xs font-black text-text-muted uppercase tracking-widest">{t("pdf_your_review")}</h3>
                                                <div className="flex items-center gap-3">
                                                    <button onClick={editReview} className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 text-text-main transition-all group" title="Edit">
                                                        <span className="material-symbols-outlined text-sm group-hover:scale-110 transition-transform">edit</span>
                                                    </button>
                                                    <button onClick={deleteReview} className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all group" title="Delete">
                                                        <span className="material-symbols-outlined text-sm group-hover:scale-110 transition-transform">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-3 mt-2">
                                                <div className="flex items-center gap-3">
                                                    <StarRating rating={myReview.rating} size="md" />
                                                    <span className="text-[10px] font-bold text-text-muted">{new Date(myReview.createdAt).toLocaleDateString("en-US")}</span>
                                                </div>
                                                {myReview.content && <p className="text-text-main/80 text-sm font-medium leading-relaxed">{myReview.content}</p>}
                                            </div>
                                        </div>
                                    );
                                }

                                // Display Form (New or Edit mode)
                                return (
                                    <div id="review-form" className="p-8 rounded-[32px] bg-surface border border-black/5 dark:border-white/5">
                                        <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-4">
                                            {isEditingReview ? t("pdf_edit_review") : t("pdf_give_rating")}
                                        </h3>
                                        <div className="flex flex-col gap-4">
                                            <StarRating rating={userRating} size="lg" interactive onChange={setUserRating} />
                                            <textarea
                                                value={userReviewText}
                                                onChange={(e) => setUserReviewText(e.target.value)}
                                                placeholder={t("pdf_write_review_placeholder")}
                                                rows={3}
                                                className="w-full bg-surface border border-black/5 dark:border-white/5 rounded-2xl p-4 text-text-main placeholder:text-text-muted/30 outline-none focus:border-primary/40 transition-all resize-none font-medium"
                                            />
                                            <div className="flex items-center justify-end gap-3 mt-2">
                                                {isEditingReview && (
                                                    <button
                                                        onClick={cancelEditReview}
                                                        className="px-6 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 text-text-main font-black uppercase tracking-wider text-[10px] transition-all cursor-pointer"
                                                    >
                                                        {t("common_cancel")}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={submitReview}
                                                    disabled={submittingReview || userRating < 1}
                                                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-white font-black uppercase tracking-wider text-[10px] transition-all cursor-pointer flex items-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined text-sm">{isEditingReview ? 'save' : 'rate_review'}</span>
                                                    {submittingReview ? t("common_saving") : (isEditingReview ? t("common_save_changes") : t("common_submit"))}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Reviews List (excluding user's own review) */}
                            {(() => {
                                const otherReviews = reviews.filter((r: any) => r.user.id !== currentUser?.user?.id);
                                if (otherReviews.length === 0) return null;

                                return (
                                    <div className="flex flex-col gap-4 mt-4">
                                        <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-2 px-2">{t("pdf_all_reviews")}</h3>
                                        {otherReviews.map((r: any) => (
                                            <div key={r.id} className="group flex gap-5 p-6 rounded-[24px] bg-surface border border-black/5 dark:border-white/5 hover:bg-white/4 transition-all">
                                                <div className="shrink-0">
                                                    <div className="relative size-12 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-center overflow-hidden">
                                                        {r.user.avatar ? (
                                                            <Image src={r.user.avatar} fill sizes="48px" className="object-cover" alt="" />
                                                        ) : (
                                                            <span className="text-xs font-black text-primary">{(r.user.name || "?").substring(0, 2).toUpperCase()}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-text-main font-black">{r.user.name}</span>
                                                            </div>
                                                            <StarRating rating={r.rating} size="sm" />
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2">
                                                            <span className="text-[10px] font-bold text-text-muted">{new Date(r.createdAt).toLocaleDateString("en-US")}</span>
                                                            <button
                                                                onClick={() => handleReport("REVIEW", r.id)}
                                                                className="opacity-0 group-hover:opacity-100 material-symbols-outlined text-red-500/50 hover:text-red-400 text-sm transition-opacity cursor-pointer"
                                                                title={t("pdf_report_violation")}
                                                            >
                                                                flag
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {r.content && <p className="text-text-muted text-sm font-medium leading-relaxed mt-2">{r.content}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* Similar Books Section */}
                {similarBooks.length > 0 && (
                    <div className="flex flex-col gap-8 pt-10 border-t border-black/5 dark:border-white/5">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-black text-text-main uppercase tracking-tight">
                                <span className="text-primary italic">{t("pdf_similar_books").split(' ')[0]}</span> {t("pdf_similar_books").split(' ')[1]}
                            </h2>
                            <div className="h-px w-16 bg-black/10 dark:bg-white/10"></div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8">
                            {similarBooks.map((sb) => (
                                <Link key={sb.id} href={`/pdf/${sb.id}`} className="group flex flex-col gap-4">
                                    <div className="relative aspect-[3/4.2] rounded-[24px] overflow-hidden bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 shadow-xl group-hover:shadow-[0_0_30px_rgba(255,90,95,0.15)] group-hover:border-primary/40 transition-all duration-500">
                                        {sb.thumbnailPath ? (
                                            <Image src={sb.thumbnailPath} fill sizes="(max-width: 640px) 50vw, 20vw" className="object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" alt={sb.title || "Cover"} />
                                        ) : (
                                            <div className={`w-full h-full bg-gradient-to-br ${sb.color || "from-blue-600 to-indigo-800"} flex items-center justify-center p-6 text-center opacity-30 group-hover:opacity-100 transition-opacity`}>
                                                <p className="text-text-main font-black text-[10px] uppercase leading-tight tracking-widest">{sb.title}</p>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="px-1 flex flex-col gap-1">
                                        <h3 className="font-black text-text-main text-sm leading-tight truncate group-hover:text-primary transition-colors">{sb.title}</h3>
                                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest truncate">{sb.author || "Unknown Source"}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
