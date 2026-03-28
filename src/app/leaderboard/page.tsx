"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import BackButton from "@/components/BackButton";

interface LeaderboardUser {
    id: string;
    name: string;
    avatar: string | null;
    xp: number;
    level: number;
    badges: string[];
}

export default function LeaderboardPage() {
    const [users, setUsers] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [myRank, setMyRank] = useState<{ rank: number; xp: number; level: number } | null>(null);

    // Fetch current user
    useEffect(() => {
        fetch("/api/auth/me").then(r => r.json()).then(d => {
            if (d.user) setCurrentUserId(d.user.id);
        }).catch(() => { });
    }, []);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/leaderboard?page=${page}&limit=20`)
            .then(r => r.json())
            .then(data => {
                setUsers(data.leaderboard || []);
                setTotal(data.total || 0);
                setTotalPages(data.totalPages || 1);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [page]);

    // Fetch my rank
    useEffect(() => {
        if (!currentUserId) return;
        fetch("/api/leaderboard/me").then(r => r.json()).then(d => {
            if (d.rank) setMyRank(d);
        }).catch(() => { });
    }, [currentUserId]);

    const getRankStyles = (rank: number) => {
        if (rank === 1) return "bg-amber-500 border-amber-500 text-white shadow-[0_10px_20px_rgba(245,158,11,0.2)]";
        if (rank === 2) return "bg-slate-500 border-slate-500 text-white shadow-[0_10px_20px_rgba(100,116,139,0.2)]";
        if (rank === 3) return "bg-orange-600 border-orange-600 text-white shadow-[0_10px_20px_rgba(234,88,12,0.2)]";
        return "bg-bg-dark border-black/5 dark:border-white/5 text-text-muted";
    };

    return (
        <main className="flex-1 w-full min-h-screen px-6 md:px-12 py-10 md:pt-32 md:pb-16 relative">
            {/* Background Decorations Removed */}

            <div className="relative z-10 flex flex-col gap-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                    <div className="flex flex-col gap-2">
                        <BackButton href="/" label="Return Home" className="mb-4" />
                        <h1 className="text-text-main text-4xl md:text-5xl font-black tracking-tight leading-none uppercase">Leaderboard <span className="text-primary italic">Elite</span></h1>
                        <p className="text-text-muted text-lg font-medium">Read more, act more, be the leading contributor.</p>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-surface border border-black/5 dark:border-white/5 transition-all w-fit shadow-sm">
                        <div className="size-2 rounded-full bg-primary animate-pulse"></div>
                        <span className="text-[11px] font-black text-text-main uppercase tracking-widest">{total} Active Readers</span>
                    </div>
                </div>

                {/* Your Rank Card */}
                {myRank && (
                    <div className="flex items-center gap-6 px-8 py-5 rounded-[32px] bg-primary/5 border-2 border-primary/30 shadow-lg">
                        <div className="size-14 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-xl shadow-lg shadow-primary/30">
                            #{myRank.rank}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Your Rank</span>
                            <span className="text-text-main text-2xl font-black leading-tight">{myRank.xp.toLocaleString()} <span className="text-sm text-text-muted">XP</span></span>
                        </div>
                        <div className="ml-auto flex flex-col items-center px-5 py-2 rounded-xl bg-primary/10 border border-primary/20">
                            <span className="text-[8px] font-black text-primary uppercase tracking-widest">Level</span>
                            <span className="text-xl font-black text-primary">{myRank.level}</span>
                        </div>
                    </div>
                )}

                {/* Leaderboard List */}
                <div className="flex flex-col gap-3">
                    {/* Table Header (Desktop) */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-4 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] border-b border-black/5 dark:border-white/5">
                        <div className="col-span-1 text-center">Rank</div>
                        <div className="col-span-8">User</div>
                        <div className="col-span-1 text-center">Level</div>
                        <div className="col-span-2 text-right">Total XP</div>
                    </div>

                    {loading ? (
                        Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-20 w-full rounded-3xl bg-black/5 dark:bg-white/5 animate-pulse" />
                        ))
                    ) : (
                        users.map((user, index) => {
                            const rank = (page - 1) * 20 + index + 1;
                            const isTop3 = rank <= 3;
                            const isMe = currentUserId === user.id;
                            const rankStyle = getRankStyles(rank);
                            const level = Math.floor(user.xp / 100) + 1;

                            return (
                                <Link
                                    key={user.id}
                                    href={`/profil/${user.id}`}
                                    className={`group grid grid-cols-1 md:grid-cols-12 items-center gap-4 px-8 py-5 rounded-[40px] bg-surface border transition-all duration-500 shadow-xl hover:shadow-2xl
                                        ${isMe ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20" : "border-black/5 dark:border-white/5 hover:border-primary/30"}`}
                                >
                                    {/* Rank */}
                                    <div className="col-span-1 flex justify-center">
                                        <div className={`size-10 md:size-11 rounded-2xl flex items-center justify-center font-black text-sm md:text-base border ${rankStyle}`}>
                                            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
                                        </div>
                                    </div>

                                    {/* User Info */}
                                    <div className="col-span-8 flex items-center gap-4 min-w-0">
                                        <div className="relative shrink-0">
                                            <div className="relative size-12 md:size-14 rounded-2xl overflow-hidden border-2 border-black/5 dark:border-white/10 group-hover:border-primary/30 transition-colors">
                                                {user.avatar ? (
                                                    <Image src={user.avatar} alt={user.name} fill sizes="56px" className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-bg-dark flex items-center justify-center text-primary font-black">
                                                        {user.name.substring(0, 1).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            {isTop3 && (
                                                <div className="absolute -top-2 -right-2 size-6 bg-primary rounded-full flex items-center justify-center border-4 border-surface text-white shadow-lg">
                                                    <span className="material-symbols-outlined text-[14px] font-black fill-icon">verified</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <h3 className="text-text-main font-black text-lg truncate group-hover:text-primary transition-colors flex items-center gap-2">
                                                {user.name}
                                                {isMe && <span className="text-[8px] font-black bg-primary text-white px-2 py-0.5 rounded-full uppercase tracking-widest">You</span>}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="h-1 w-20 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary" style={{ width: `${user.xp % 100}%` }}></div>
                                                </div>
                                                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{user.xp % 100}/100</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Level (Desktop) */}
                                    <div className="hidden md:flex col-span-1 justify-center">
                                        <div className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex flex-col items-center min-w-[60px]">
                                            <span className="text-[8px] font-black text-text-muted uppercase tracking-widest leading-none mb-1">Level</span>
                                            <span className="text-lg font-black text-text-main leading-none">{level}</span>
                                        </div>
                                    </div>

                                    {/* XP Total */}
                                    <div className="col-span-2 text-right flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2">
                                        <span className="md:hidden text-[10px] font-black text-text-muted uppercase tracking-widest">Total XP</span>
                                        <div className="flex flex-col items-end">
                                            <span className="text-xl md:text-2xl font-black text-text-main group-hover:text-primary transition-colors leading-none tracking-tighter">
                                                {user.xp.toLocaleString()}
                                            </span>
                                            <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mt-1 leading-none opacity-60">Active Points</span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4 pb-8">
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

                {/* Footer/Visual Polish */}
                <div className="py-12 flex flex-col items-center gap-4 opacity-40">
                    <div className="w-px h-12 bg-gradient-to-b from-primary to-transparent"></div>
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-text-muted">Top Contributors Excellence</span>
                </div>
            </div>
        </main>
    );
}
