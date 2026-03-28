import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";

export default async function AdminDashboardPage() {
    const [userCount, bookCount, threadCount, replyCount, reviewCount, pendingReports, resolvedReports, topBooks, recentNewUsers, recentReports] = await Promise.all([
        prisma.user.count(),
        prisma.book.count(),
        prisma.forumThread.count(),
        prisma.forumReply.count(),
        prisma.review.count(),
        prisma.report.count({ where: { status: "PENDING" } }),
        prisma.report.count({ where: { status: "RESOLVED" } }),
        prisma.book.findMany({
            orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }],
            take: 5,
            select: { id: true, title: true, author: true, viewCount: true, likeCount: true, avgRating: true },
        }),
        prisma.user.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { id: true, name: true, avatar: true, email: true, createdAt: true },
        }),
        prisma.report.findMany({
            where: { status: "PENDING" },
            orderBy: { createdAt: "desc" },
            take: 3,
            include: { reporter: { select: { name: true } } }
        }),
    ]);

    // Compute real weekly trends
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const [thisWeekBooks, lastWeekBooks, thisWeekUsers, lastWeekUsers] = await Promise.all([
        prisma.book.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.book.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
        prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.user.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
    ]);

    const calcTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? "+100%" : "0%";
        const pct = Math.round(((current - previous) / previous) * 100);
        return pct >= 0 ? `+${pct}%` : `${pct}%`;
    };

    const userTrend = calcTrend(thisWeekUsers, lastWeekUsers);
    const bookTrend = calcTrend(thisWeekBooks, lastWeekBooks);

    // Weekly chart data
    const recentBooksData = await prisma.book.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
    });
    const recentUsersData = await prisma.user.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
    });

    const days: { label: string; books: number; users: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const nextD = new Date(d);
        nextD.setDate(nextD.getDate() + 1);
        const label = d.toLocaleDateString("en-US", { weekday: "short" });
        const books = recentBooksData.filter(b => new Date(b.createdAt) >= d && new Date(b.createdAt) < nextD).length;
        const users = recentUsersData.filter(u => new Date(u.createdAt) >= d && new Date(u.createdAt) < nextD).length;
        days.push({ label, books, users });
    }
    const maxActivity = Math.max(1, ...days.map(d => d.books + d.users));

    return (
        <div className="flex-1 w-full p-6 md:p-10 relative">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 -mr-60 -mt-60 size-[800px] bg-primary/5 rounded-full blur-[140px] pointer-events-none translate-x-1/4"></div>
            <div className="absolute bottom-0 left-0 -ml-60 -mb-60 size-[600px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none -translate-x-1/4"></div>

            <div className="relative z-10 flex flex-col gap-10">
                {/* Hero Welcome Section */}
                <div className="relative overflow-hidden rounded-[40px] bg-surface backdrop-blur-xl border border-black/5 dark:border-white/5 shadow-2xl group">
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity duration-700"></div>

                    <div className="relative p-8 md:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex flex-col gap-4 max-w-xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary w-fit">
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">System Active</span>
                            </div>
                            <h1 className="text-text-main text-3xl md:text-4xl font-black tracking-tight leading-none">
                                Admin <span className="text-primary italic text-glow">Dashboard</span>
                            </h1>
                            <p className="text-text-muted text-base font-medium leading-relaxed">
                                Administrative hub for managing users, books, forum, and library content.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Grid — 6 cards */}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                    {[
                        { label: "Total Users", val: userCount, icon: "group", color: "text-blue-400", bg: "bg-blue-500/10", trend: userTrend },
                        { label: "Books", val: bookCount, icon: "picture_as_pdf", color: "text-emerald-400", bg: "bg-emerald-500/10", trend: bookTrend },
                        { label: "Threads", val: threadCount, icon: "forum", color: "text-purple-400", bg: "bg-purple-500/10" },
                        { label: "Replies", val: replyCount, icon: "chat", color: "text-orange-400", bg: "bg-orange-500/10" },
                        { label: "Reviews", val: reviewCount, icon: "star", color: "text-amber-400", bg: "bg-amber-500/10" },
                        { label: "Reports", val: pendingReports + resolvedReports, icon: "flag", color: "text-red-400", bg: "bg-red-500/10", extra: pendingReports > 0 ? `${pendingReports} pending` : null },
                    ].map((s, i) => (
                        <div key={i} className="flex flex-col rounded-[32px] p-6 bg-surface/30 apple-glass border border-black/5 dark:border-white/5 shadow-xl relative overflow-hidden group hover:border-primary/30 hover:bg-surface transition-all duration-500">
                            <div className={`absolute right-0 top-0 size-24 ${s.bg} rounded-full blur-2xl -mr-10 -mt-10 opacity-20 group-hover:opacity-50 transition-opacity`}></div>
                            <div className="relative z-10 flex items-center justify-between mb-5">
                                <div className={`size-12 rounded-[18px] ${s.bg} ${s.color} border border-black/5 dark:border-white/5 flex items-center justify-center shadow-inner`}>
                                    <span className="material-symbols-outlined text-[24px]">{s.icon}</span>
                                </div>
                                {s.trend && (
                                    <span className={`${s.color} text-[10px] font-black px-2.5 py-1 bg-black/5 dark:bg-white/5 rounded-full border border-black/5 dark:border-white/5`}>
                                        {s.trend}
                                    </span>
                                )}
                            </div>
                            <div className="relative z-10 flex flex-col">
                                <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em] mb-1">{s.label}</p>
                                <p className="text-text-main text-3xl font-black tracking-tighter text-glow">{s.val}</p>
                                {s.extra && (
                                    <div className="flex items-center gap-1.5 mt-2 bg-red-500/10 text-red-500 px-2.5 py-1 rounded-full w-fit border border-red-500/10">
                                        <span className="size-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                        <span className="text-[9px] font-black uppercase tracking-wider">{s.extra}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Two-column: Chart + Top Books */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Weekly Activity Chart */}
                    <div className="lg:col-span-3 rounded-[40px] bg-surface/30 apple-glass border border-black/5 dark:border-white/5 shadow-xl p-8 md:p-10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 -ml-10 -mt-10 size-40 bg-primary/5 rounded-full blur-3xl"></div>
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                            <div>
                                <h3 className="text-xl font-black text-text-main tracking-tight uppercase">Activity <span className="text-primary italic">Analysis</span></h3>
                                <p className="text-text-muted text-xs font-bold uppercase tracking-widest mt-1 opacity-60 font-mono">Real-time weekly ingestion metrics</p>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2.5">
                                    <div className="size-3 rounded-full bg-primary shadow-[0_0_8px_rgba(19,127,236,0.5)]"></div>
                                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">Asset Ingress</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <div className="size-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">Node Sync</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10 flex items-end gap-3 md:gap-4 h-48 px-2">
                            {days.map((day, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                                    <div className="w-full h-40 flex items-end gap-1.5 justify-center relative">
                                        <div
                                            className="w-1/3 bg-gradient-to-t from-primary/40 to-primary rounded-t-xl transition-all duration-700 group-hover:scale-x-110 group-hover:shadow-[0_0_20px_rgba(19,127,236,0.3)]"
                                            style={{ height: `${Math.max(5, (day.books / maxActivity) * 100)}%` }}
                                        />
                                        <div
                                            className="w-1/3 bg-gradient-to-t from-emerald-500/40 to-emerald-500 rounded-t-xl transition-all duration-700 group-hover:scale-x-110 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                                            style={{ height: `${Math.max(5, (day.users / maxActivity) * 100)}%` }}
                                        />

                                        {/* Value Indicator on hover */}
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-surface p-1.5 rounded-lg border border-border shadow-2xl z-20 whitespace-nowrap">
                                            <span className="text-[10px] font-black text-primary">{day.books}B</span>
                                            <span className="mx-1 font-black text-text-muted">/</span>
                                            <span className="text-[10px] font-black text-emerald-500">{day.users}U</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest group-hover:text-text-main transition-colors">{day.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Books */}
                    <div className="lg:col-span-2 rounded-[40px] bg-surface/30 apple-glass border border-black/5 dark:border-white/5 shadow-xl p-8 md:p-10 flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-text-main tracking-tight uppercase">High <span className="text-primary italic">Yield</span> Books</h3>
                            <span className="material-symbols-outlined text-primary text-2xl text-shadow-sm">trending_up</span>
                        </div>
                        <div className="flex flex-col gap-2 flex-1">
                            {topBooks.map((book, i) => (
                                <Link key={book.id} href={`/pdf/${book.id}`} className="flex items-center gap-4 p-4 rounded-3xl hover:bg-white/5 dark:hover:bg-white/5 transition-all duration-500 group border border-transparent hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
                                    <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-[11px] font-black text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-inner">#{i + 1}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-text-main truncate group-hover:text-primary transition-colors">{book.title}</p>
                                        <p className="text-[11px] text-text-muted font-bold truncate opacity-60 uppercase tracking-widest leading-none">{book.author}</p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-text-muted">
                                            <span className="material-symbols-outlined text-sm text-primary">visibility</span>
                                            {book.viewCount}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                            {topBooks.length === 0 && (
                                <div className="flex flex-col items-center justify-center flex-1 py-10 opacity-30">
                                    <span className="material-symbols-outlined text-5xl mb-4">folder_open</span>
                                    <p className="text-[10px] font-black uppercase tracking-widest">No active indices</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sub-grid for Recent Reports & New Nodes */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Recent Users */}
                    <div className="lg:col-span-3 rounded-[40px] bg-surface/30 apple-glass border border-black/5 dark:border-white/5 shadow-xl p-8 md:p-10">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-xl font-black text-text-main tracking-tight uppercase">New <span className="text-primary italic">Synchronized</span> Nodes</h3>
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest opacity-60">Latest access requested by protocol</p>
                            </div>
                            <Link href="/admin/users" className="h-10 px-6 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-lg hover:shadow-primary/20">Manage Nodes</Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {recentNewUsers.map((u) => (
                                <Link key={u.id} href={`/profil/${u.id}`} className="group flex items-center gap-4 p-4 rounded-[28px] border border-black/5 dark:border-white/5 hover:border-primary/30 hover:bg-surface/50 transition-all duration-500">
                                    <div className="size-12 rounded-2xl overflow-hidden shrink-0 bg-primary/10 flex items-center justify-center border border-black/5 dark:border-white/5 p-0.5 transition-all group-hover:rotate-6">
                                        {u.avatar ? (
                                            <Image src={u.avatar} width={48} height={48} className="size-full object-cover rounded-[14px]" alt="" />
                                        ) : (
                                            <div className="size-full flex items-center justify-center bg-gradient-to-br from-primary to-blue-600 rounded-[14px]">
                                                <span className="text-xs font-black text-white">{(u.name || "?").substring(0, 2).toUpperCase()}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-black text-text-main truncate group-hover:text-primary transition-colors">{u.name}</p>
                                        <p className="text-[10px] text-text-muted font-bold truncate opacity-60 font-mono tracking-tight leading-none">{u.email}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Pending Reports */}
                    <div className="lg:col-span-2 rounded-[40px] bg-red-500/5 dark:bg-red-500/5 backdrop-blur-xl border border-red-500/10 shadow-xl p-8 md:p-10 flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-xl font-black text-text-main tracking-tight uppercase">Pending <span className="text-red-500 italic">Incidents</span></h3>
                                <p className="text-[10px] font-black text-red-500/60 uppercase tracking-widest">Awaiting moderation action</p>
                            </div>
                            <Link href="/admin/reports" className="h-10 px-6 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg hover:shadow-red-500/20 group">
                                View All
                                <span className="material-symbols-outlined text-[14px] ml-2 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                            </Link>
                        </div>
                        <div className="flex flex-col gap-3 flex-1">
                            {recentReports.map((report: any) => (
                                <div key={report.id} className="p-4 rounded-3xl bg-white/5 border border-white/5 hover:border-red-500/20 transition-all group">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500/80 bg-red-500/10 px-2 py-0.5 rounded-full">{report.reason}</span>
                                        <span className="text-[9px] font-mono text-text-muted opacity-50">{new Date(report.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-xs font-medium text-text-main line-clamp-2 mb-2 group-hover:text-red-500 transition-colors">"{report.content}"</p>
                                    <div className="flex items-center gap-2">
                                        <div className="size-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-black text-primary italic">BY</div>
                                        <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">{report.reporter?.name || "System"}</span>
                                    </div>
                                </div>
                            ))}
                            {recentReports.length === 0 && (
                                <div className="flex flex-col items-center justify-center flex-1 py-6 opacity-30">
                                    <span className="material-symbols-outlined text-4xl mb-3 text-emerald-500">check_circle</span>
                                    <p className="text-[10px] font-black uppercase tracking-widest">Protocol Secured</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* System Status Section */}
                <div className="w-full flex flex-col items-center justify-center p-20 rounded-[48px] bg-primary/5 border border-primary/20 border-dashed relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/30 to-transparent pointer-events-none"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                    <div className="size-24 rounded-[32px] bg-surface apple-glass flex items-center justify-center mb-8 relative z-10 border border-black/5 dark:border-white/5 shadow-2xl group-hover:scale-110 transition-all duration-700">
                        <span className="material-symbols-outlined text-5xl text-primary animate-pulse shadow-primary/20">verified_user</span>
                    </div>
                    <h3 className="text-text-main text-3xl font-black tracking-tight relative z-10 uppercase">System <span className="text-primary italic">Optimal</span></h3>
                    <p className="text-text-muted text-base font-bold max-w-lg text-center mt-4 leading-relaxed relative z-10 opacity-70 uppercase tracking-widest text-[11px]">
                        {resolvedReports > 0 ? `${resolvedReports} incident reports purged from stack.` : "No critical sync deviations detected."} {pendingReports > 0 ? `${pendingReports} pending moderation callbacks.` : ""}
                    </p>

                    <div className="mt-10 flex gap-4 relative z-10">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                            <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Gateway Ready</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                            <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Storage Encryped</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
