"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import BackButton from "@/components/BackButton";

interface Activity {
    id: string;
    type: string;
    content: string | null;
    createdAt: string;
    user: { id: string; name: string; avatar: string | null };
    book: { id: string; title: string; color: string } | null;
}

export default function AktivitasPage() {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [feedType, setFeedType] = useState<"global" | "following">("global");

    useEffect(() => {
        setLoading(true);
        fetch(`/api/activities?page=${page}&limit=20&feed=${feedType}`)
            .then(r => r.json())
            .then(data => {
                setActivities(data.activities || []);
                setTotalPages(data.totalPages || 1);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [page, feedType]);

    const getActivityConfig = (type: string) => {
        switch (type) {
            case "UPLOAD_BOOK":
                return { icon: "upload_file", color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Uploaded a new book" };
            case "REVIEW_BOOK":
                return { icon: "star", color: "text-amber-500", bg: "bg-amber-500/10", label: "Left a review" };
            case "CREATE_THREAD":
                return { icon: "forum", color: "text-blue-500", bg: "bg-blue-500/10", label: "Started a discussion" };
            case "CREATE_REPLY":
                return { icon: "reply", color: "text-indigo-500", bg: "bg-indigo-500/10", label: "Replied to discussion" };
            case "COMMENT_BOOK":
                return { icon: "chat", color: "text-pink-500", bg: "bg-pink-500/10", label: "Commented on book" };
            case "FOLLOW_USER":
                return { icon: "person_add", color: "text-purple-500", bg: "bg-purple-500/10", label: "Followed user" };
            default:
                return { icon: "info", color: "text-primary", bg: "bg-primary/10", label: "Activity performed" };
        }
    };

    return (
        <main className="flex-1 w-full min-h-screen px-6 md:px-12 py-10 md:pt-32 md:pb-16 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 -mr-40 -mt-40 size-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col gap-12">
                {/* Back Button */}
                <BackButton href="/" label="Kembali ke Beranda" />

                {/* Header */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-5">
                        <div className="size-16 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center text-white shadow-xl">
                            <span className="material-symbols-outlined text-3xl">history</span>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-text-main text-4xl md:text-5xl font-black tracking-tight uppercase">Community Activity</h1>
                            <p className="text-text-muted text-sm font-medium mt-1">Monitor the latest developments from all Book-in readers.</p>
                        </div>
                    </div>

                    {/* Filter Toggle */}
                    <div className="flex bg-black/5 dark:bg-white/5 p-1.5 rounded-2xl w-fit border border-black/5 dark:border-white/5">
                        <button
                            onClick={() => { setFeedType("global"); setPage(1); }}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${feedType === "global" ? "bg-white dark:bg-[#1a2332] text-primary shadow-lg" : "text-text-muted hover:text-text-main"}`}
                        >
                            <span className="material-symbols-outlined text-lg">public</span>
                            Global Feed
                        </button>
                        <button
                            onClick={() => { setFeedType("following"); setPage(1); }}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${feedType === "following" ? "bg-white dark:bg-[#1a2332] text-primary shadow-lg" : "text-text-muted hover:text-text-main"}`}
                        >
                            <span className="material-symbols-outlined text-lg">group</span>
                            Following
                        </button>
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="flex flex-col gap-6">
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-32 rounded-[32px] bg-black/5 dark:bg-white/5 animate-pulse" />
                        ))
                    ) : activities.length === 0 ? (
                        <div className="py-20 text-center opacity-40">
                            <span className="material-symbols-outlined text-5xl mb-3">history_toggle_off</span>
                            <p className="font-black uppercase tracking-widest">No public activity yet</p>
                        </div>
                    ) : (
                        activities.map((activity) => {
                            const config = getActivityConfig(activity.type);
                            return (
                                <div key={activity.id} className="group relative flex gap-6 p-6 rounded-[32px] bg-surface border border-black/5 dark:border-white/5 hover:border-primary/20 transition-all duration-500">
                                    <Link href={`/profil/${activity.user.id}`} className="relative shrink-0 size-14 rounded-2xl overflow-hidden border-2 border-primary/10 group-hover:border-primary transition-colors">
                                        {activity.user.avatar ? (
                                            <Image src={activity.user.avatar} alt={activity.user.name} fill sizes="56px" className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black">
                                                {activity.user.name.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                    </Link>

                                    <div className="flex flex-col flex-1 gap-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Link href={`/profil/${activity.user.id}`} className="text-text-main font-black text-base hover:text-primary transition-colors">
                                                {activity.user.name}
                                            </Link>
                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${config.bg} ${config.color}`}>
                                                {config.label}
                                            </span>
                                            <span className="text-[10px] text-text-muted font-bold ml-auto">
                                                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>

                                        {activity.book && (
                                            <Link href={`/pdf/${activity.book.id}`} className="mt-2 flex items-center gap-4 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 group-hover:border-primary/10 transition-all">
                                                <div className={`size-10 rounded-xl bg-gradient-to-br ${activity.book.color || "from-blue-600 to-indigo-800"} flex items-center justify-center text-white shrink-0`}>
                                                    <span className="material-symbols-outlined text-lg">book</span>
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Related Book</span>
                                                    <h4 className="text-text-main font-bold text-sm truncate">{activity.book.title}</h4>
                                                </div>
                                            </Link>
                                        )}

                                        {activity.content && (
                                            <div className="mt-3 border-l-2 border-primary/20 pl-4 py-1">
                                                {activity.type === "REVIEW_BOOK" ? (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1 text-amber-500">
                                                            {Array.from({ length: 5 }).map((_, i) => (
                                                                <span key={i} className={`material-symbols-outlined text-sm ${i < (JSON.parse(activity.content || "{}").rating || 0) ? "fill-icon" : "opacity-20"}`}>star</span>
                                                            ))}
                                                        </div>
                                                        <p className="text-text-muted text-sm font-medium italic">
                                                            &quot;Gave a {JSON.parse(activity.content || "{}").rating}/5 rating for this work.&quot;
                                                        </p>
                                                    </div>
                                                ) : activity.type === "CREATE_THREAD" ? (
                                                    <p className="text-text-muted text-sm font-medium leading-relaxed italic">
                                                        &quot;Started a new discussion: {activity.content}&quot;
                                                    </p>
                                                ) : activity.type === "CREATE_REPLY" ? (
                                                    <p className="text-text-muted text-sm font-medium leading-relaxed italic">
                                                        &quot;Replied to discussion: {activity.content}&quot;
                                                    </p>
                                                ) : activity.type === "COMMENT_BOOK" ? (
                                                    <p className="text-text-muted text-sm font-medium leading-relaxed italic">
                                                        &quot;Commented on a book: {activity.content}&quot;
                                                    </p>
                                                ) : activity.type === "UPLOAD_BOOK" ? (
                                                    <p className="text-text-muted text-sm font-medium leading-relaxed italic">
                                                        &quot;Successfully integrated book: {activity.content}&quot;
                                                    </p>
                                                ) : (
                                                    <p className="text-text-muted text-sm font-medium leading-relaxed italic">
                                                        &quot;{activity.content}&quot;
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8 pb-8">
                        <button
                            onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            disabled={page <= 1}
                            className="size-12 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center text-text-muted hover:text-primary hover:border-primary/30 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
                        >
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                            .reduce((acc: (number | string)[], p, i, arr) => {
                                if (i > 0 && typeof arr[i - 1] === 'number' && (p as number) - (arr[i - 1] as number) > 1) {
                                    acc.push("...");
                                }
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((p, i) =>
                                typeof p === "string" ? (
                                    <span key={`dots-${i}`} className="px-2 text-text-muted/30 font-bold text-sm">…</span>
                                ) : (
                                    <button
                                        key={p}
                                        onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        className={`size-12 rounded-2xl font-black text-sm transition-all cursor-pointer ${page === p
                                            ? "bg-primary text-white shadow-lg shadow-primary/30"
                                            : "border border-black/5 dark:border-white/5 text-text-muted hover:text-primary hover:border-primary/30"
                                            }`}
                                    >
                                        {p}
                                    </button>
                                )
                            )}

                        <button
                            onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            disabled={page >= totalPages}
                            className="size-12 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center text-text-muted hover:text-primary hover:border-primary/30 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
                        >
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}
