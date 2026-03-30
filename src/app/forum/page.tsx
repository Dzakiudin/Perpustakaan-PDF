"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useInView } from "react-intersection-observer";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";

function stripHtml(html: string) {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

const getTopics = (t: any) => [
    { value: "", label: t("forum_topic_all"), icon: "tag", color: "text-primary" },
    { value: "umum", label: t("forum_topic_general"), icon: "forum", color: "text-blue-500" },
    { value: "akademik", label: t("forum_topic_academic"), icon: "school", color: "text-purple-500" },
    { value: "teknologi", label: t("forum_topic_tech"), icon: "computer", color: "text-emerald-500" },
    { value: "fiksi", label: t("forum_topic_fiction"), icon: "auto_stories", color: "text-orange-500" },
    { value: "rekomendasi", label: t("forum_topic_recommendation"), icon: "recommend", color: "text-green-500" },
];

export default function ForumPage() {
    const { t } = useLanguage();
    const TOPICS = getTopics(t);
    const [threads, setThreads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTopic, setSelectedTopic] = useState("");
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [forumStats, setForumStats] = useState({ threads: 0, replies: 0, users: 0, books: 0 });

    const { ref, inView } = useInView({
        threshold: 0,
        rootMargin: "400px",
    });

    const fetchThreads = useCallback(async (pageNum: number, topic: string, query: string) => {
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);

        try {
            const params = new URLSearchParams({ page: String(pageNum) });
            if (topic) params.set("topic", topic);
            if (query) params.set("q", query);

            const res = await fetch(`/api/forum?${params}`);
            if (res.ok) {
                const data = await res.json();
                if (pageNum === 1) {
                    setThreads(data.threads || []);
                } else {
                    setThreads(prev => [...prev, ...(data.threads || [])]);
                }
                setHasMore(pageNum < (data.totalPages || 0));
            }
        } catch { /* ignore */ }

        setLoading(false);
        setLoadingMore(false);
    }, []);

    useEffect(() => {
        setPage(1);
        setHasMore(true);
        fetchThreads(1, selectedTopic, search);
    }, [selectedTopic, search, fetchThreads]);

    useEffect(() => {
        fetch("/api/forum/stats").then(r => r.ok ? r.json() : null).then(data => {
            if (data) setForumStats(data);
        }).catch(() => { });
    }, []);

    useEffect(() => {
        if (inView && hasMore && !loading && !loadingMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchThreads(nextPage, selectedTopic, search);
        }
    }, [inView, hasMore, loading, loadingMore, page, selectedTopic, search, fetchThreads]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput.trim());
    };

    return (
        <div className="flex-1 w-full min-h-screen px-6 md:px-12 py-10 pt-24 md:pt-[104px] relative">
            {/* Background Decorations Removed */}

            <div className="relative z-10 flex flex-col gap-10">
                {/* Breadcrumb & Meta */}

                {/* Page Header */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-4">
                    <div className="flex flex-col gap-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-black/5 dark:border-white/5 text-primary self-start shadow-sm">
                            <span className="material-symbols-outlined text-sm fill-icon">groups</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">{t("forum_subtitle")}</span>
                        </div>
                        <h1 className="text-text-main text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-none uppercase">
                            {t("forum_title").split(' ')[0]} <span className="text-primary italic">{t("forum_title").split(' ')[1]}</span>
                        </h1>
                        <p className="text-text-muted text-lg font-medium max-w-3xl leading-relaxed">
                            {t("forum_desc")}
                        </p>
                    </div>
                    <Link href="/forum/baru" className="inline-flex items-center justify-center gap-3 bg-primary text-white px-8 py-4 rounded-[24px] font-black uppercase tracking-widest text-[11px] transition-all duration-500 ease-out shadow-[0_10px_30px_rgba(255,90,95,0.2)] hover:shadow-[0_15px_40px_rgba(255,90,95,0.4)] hover:scale-[1.03] active:scale-[0.97] group shrink-0">
                        <span className="material-symbols-outlined text-[22px] transition-transform duration-500 ease-out group-hover:rotate-180">add_circle</span>
                        <span>{t("forum_new_thread")}</span>
                    </Link>
                </div>

                {/* Search Bar & Stats */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-surface p-8 rounded-[32px] border border-black/5 dark:border-white/5 shadow-xl">
                    <form onSubmit={handleSearch} className="flex-1 flex items-center gap-3 w-full">
                        <div className="relative flex-1 group">
                            <span className="material-symbols-outlined text-text-muted absolute left-4 top-1/2 -translate-y-1/2 text-xl group-focus-within:text-primary transition-colors">search</span>
                            <input
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                placeholder={t("forum_search_placeholder")}
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-[#0f172a] text-text-main font-medium outline-none transition-all"
                            />
                        </div>
                        <button
                            type="submit"
                            className="bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-lg active:scale-95"
                        >
                            {t("forum_search_button")}
                        </button>
                    </form>

                    {search && (
                        <button
                            onClick={() => { setSearch(""); setSearchInput(""); }}
                            className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-500 transition-colors flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">close</span>
                            {t("forum_clear_filter")}
                        </button>
                    )}
                </div>

                {/* Filters Section */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                        <div className="h-px bg-black/5 dark:bg-white/5 flex-1"></div>
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.4em]">{t("forum_filter_label")}</p>
                        <div className="h-px bg-black/5 dark:bg-white/5 flex-1"></div>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center justify-center">
                        {TOPICS.map((t) => {
                            const active = selectedTopic === t.value;
                            return (
                                <button
                                    key={t.value}
                                    onClick={() => setSelectedTopic(t.value)}
                                    className={`relative px-5 py-3 rounded-2xl flex items-center gap-3 transition-all duration-500 ease-out border font-black uppercase tracking-widest text-[11px] border-transparent hover:scale-[1.03] active:scale-[0.98] group ${active
                                        ? "bg-primary text-white shadow-[0_10px_20px_rgba(255,90,95,0.2)]"
                                        : "bg-surface text-text-muted border-black/5 dark:border-white/5 hover:border-primary/30"
                                        }`}
                                >
                                    <span className={`material-symbols-outlined text-[20px] transition-colors duration-500 ${active ? "text-white" : "group-hover:text-primary"}`}>{t.icon}</span>
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Discussion Grid - Cards Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading && threads.length === 0 ? (
                        <div className="col-span-full py-32 flex flex-col items-center justify-center gap-6 animate-pulse">
                            <div className="size-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                            <p className="text-sm font-black text-text-muted uppercase tracking-widest">{t("forum_loading")}</p>
                        </div>
                    ) : threads.length === 0 ? (
                        <div className="col-span-full py-32 px-10 flex flex-col items-center justify-center text-center opacity-40">
                            <div className="size-24 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-6 border border-white/5 shadow-xl">
                                <span className="material-symbols-outlined text-5xl">inventory_2</span>
                            </div>
                            <h3 className="text-3xl font-black text-text-main uppercase tracking-tight mb-2">{t("forum_empty_title")}</h3>
                            <p className="text-lg font-medium text-text-muted max-w-md">{t("forum_empty_desc")}</p>
                        </div>
                    ) : (
                        threads.map((thread, index) => {
                            const topicConfig = TOPICS.find(t => t.value === thread.topicTag?.toLowerCase()) || TOPICS[1];
                            return (
                                <Link
                                    key={thread.id}
                                    href={`/forum/${thread.id}`}
                                    className="group relative flex flex-col p-6 rounded-[32px] bg-surface/30 apple-glass border border-black/5 dark:border-white/5 hover:border-primary/40 hover:bg-surface/50 transition-all duration-500 shadow-xl overflow-hidden"
                                >
                                    {/* Topic Badge */}
                                    <div className="flex items-center justify-between mb-4">
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${thread.topicTag === 'akademik' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                            thread.topicTag === 'teknologi' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                thread.topicTag === 'fiksi' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                    'bg-primary/10 text-primary border-primary/20'
                                            }`}>
                                            {thread.topicTag || "General"}
                                        </span>
                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-text-muted opacity-40 group-hover:opacity-100 transition-opacity">
                                            <span className="material-symbols-outlined text-[14px]">history</span>
                                            {new Date(thread.updatedAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })}
                                        </div>
                                    </div>

                                    {/* Icon & Title */}
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className={`shrink-0 size-12 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-center transition-all duration-700 ease-out group-hover:bg-primary/10 group-hover:border-primary/40 group-hover:rotate-[8deg] ${topicConfig.color}`}>
                                            <span className="material-symbols-outlined text-2xl">{topicConfig.icon}</span>
                                        </div>
                                        <h3 className="text-lg font-black text-text-main group-hover:text-primary transition-all leading-tight line-clamp-2">
                                            {thread.title}
                                        </h3>
                                    </div>

                                    {/* Excerpt */}
                                    <p className="text-sm font-medium text-text-muted line-clamp-2 mb-6 opacity-60">
                                        {stripHtml(thread.content)}
                                    </p>

                                    {/* Meta & Actions */}
                                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-black/5 dark:border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 rounded-full overflow-hidden border border-black/10 dark:border-white/10 p-0.5 bg-surface ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                                                {thread.user?.avatar ? (
                                                    <Image src={thread.user.avatar} width={32} height={32} className="size-full object-cover rounded-full" alt="" />
                                                ) : (
                                                    <div className="size-full flex items-center justify-center text-[10px] font-black text-primary bg-primary/5 rounded-full">
                                                        {(thread.user?.name || "?").substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted truncate max-w-[80px]">
                                                {thread.user?.name.split(' ')[0]}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5 text-text-muted group-hover:text-primary transition-colors">
                                                <span className="material-symbols-outlined text-[16px]">forum</span>
                                                <span className="text-[11px] font-black">{thread._count?.replies || 0}</span>
                                            </div>
                                            <div className="size-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-text-muted group-hover:bg-primary group-hover:text-white transition-all transform group-hover:translate-x-1 shadow-inner ring-1 ring-transparent hover:ring-primary/50">
                                                <span className="material-symbols-outlined text-[18px]">east</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hover Glow */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                </Link>
                            )
                        })
                    )}
                </div>

                {/* Loading trigger for intersection observer */}
                {hasMore && !loading && (
                    <div ref={ref} className="py-20 flex justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="size-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Mapping more insights...</p>
                        </div>
                    </div>
                )}

                {/* Community Stats Footer */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10">
                    {[
                        { label: t("forum_stats_active"), val: forumStats.threads.toLocaleString("id-ID"), icon: "forum", sub: t("forum_stats_threads") },
                        { label: t("forum_stats_knowledge"), val: forumStats.books.toLocaleString("id-ID"), icon: "library_books", sub: t("forum_stats_collections") },
                        { label: t("forum_stats_member"), val: forumStats.users.toLocaleString("id-ID"), icon: "group", sub: t("forum_stats_researchers") }
                    ].map((s, i) => (
                        <div key={i} className="p-8 rounded-[32px] bg-surface border border-black/5 dark:border-white/5 flex items-center justify-between group hover:shadow-xl transition-all duration-500 ease-out">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">{s.label}</span>
                                <span className="text-3xl font-black text-text-main mt-1">{s.val}</span>
                                <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-1 opacity-50 group-hover:opacity-100 transition-opacity">{s.sub}</span>
                            </div>
                            <div className="size-14 rounded-2xl bg-bg-dark flex items-center justify-center text-text-muted group-hover:text-primary group-hover:bg-primary/5 transition-all duration-500 ease-out">
                                <span className="material-symbols-outlined text-3xl">{s.icon}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
