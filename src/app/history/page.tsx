import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { translations, Language } from "@/lib/translations";

const PER_PAGE = 20;

function formatDate(dateStr: string | Date) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "Baru saja";
    if (diffMin < 60) return `${diffMin} menit lalu`;
    if (diffHrs < 24) return `${diffHrs} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function getProgress(lastPage: number, pageCount: number) {
    if (!pageCount || pageCount === 0) return 0;
    return Math.min(100, Math.round((lastPage / pageCount) * 100));
}

export default async function HistoryPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>;
}) {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    const user = token ? await verifyToken(token) : null;

    if (!user) redirect("/login");

    const params = await searchParams;
    const page = Math.max(1, parseInt(params.page || "1"));

    const [history, total] = await Promise.all([
        prisma.readHistory.findMany({
            where: { userId: user.userId },
            orderBy: { updatedAt: "desc" },
            include: {
                book: {
                    select: { id: true, title: true, author: true, thumbnailPath: true, color: true, pageCount: true }
                },
            },
            skip: (page - 1) * PER_PAGE,
            take: PER_PAGE,
        }),
        prisma.readHistory.count({ where: { userId: user.userId } }),
    ]);

    const totalPages = Math.ceil(total / PER_PAGE);

    return (
        <main className="flex-1 w-full min-h-screen px-6 md:px-12 py-10 pt-24 md:pt-[104px] pb-28 md:pb-16 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 -mr-40 -mt-40 size-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -ml-40 -mb-40 size-[400px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col gap-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-black/5 dark:border-white/5">
                    <div className="flex flex-col gap-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-black/5 dark:border-white/5 shadow-sm text-primary self-start">
                            <span className="material-symbols-outlined text-sm fill-icon">history</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Reading Log</span>
                        </div>
                        <h1 className="text-text-main text-4xl md:text-5xl font-black tracking-tight uppercase leading-none">
                            Reading <span className="text-primary italic text-glow">History</span>
                        </h1>
                        <p className="text-text-muted text-lg font-medium max-w-2xl leading-relaxed">
                            Semua PDF yang pernah kamu baca, terurut dari yang terakhir dibaca.
                        </p>
                    </div>

                    <div className="flex flex-col px-8 py-4 bg-surface rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm shrink-0">
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5">Total Dibaca</span>
                        <span className="text-text-main text-3xl font-black leading-none">{total}</span>
                    </div>
                </div>

                {/* Content */}
                {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 rounded-[48px] bg-surface border border-black/5 dark:border-white/5 shadow-xl text-center px-4">
                        <span className="material-symbols-outlined text-7xl text-text-muted opacity-30 mb-6">menu_book</span>
                        <h2 className="text-2xl font-black text-text-main tracking-tight uppercase mb-2">Belum Ada Riwayat</h2>
                        <p className="text-text-muted text-sm font-medium mb-8">Kamu belum membaca PDF manapun. Mulai membaca dan riwayatmu akan muncul di sini.</p>
                        <Link href="/" className="px-10 py-4 rounded-[24px] bg-primary text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                            Jelajahi Perpustakaan
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {history.map((item) => {
                                const progress = getProgress(item.lastPage, item.book.pageCount);
                                const isCompleted = progress >= 100;

                                return (
                                    <Link
                                        key={item.id}
                                        href={`/pdf/${item.book.id}/baca`}
                                        className="group flex gap-4 p-5 rounded-[28px] bg-surface border border-black/5 dark:border-white/5 hover:border-primary/30 transition-all duration-500 overflow-hidden relative shadow-sm hover:shadow-xl active:scale-[0.98]"
                                    >
                                        {/* Book Cover */}
                                        <div className="relative size-20 rounded-2xl overflow-hidden shadow-md border border-black/5 bg-bg-dark shrink-0">
                                            {item.book.thumbnailPath ? (
                                                <Image
                                                    src={item.book.thumbnailPath}
                                                    alt={item.book.title}
                                                    fill
                                                    unoptimized
                                                    sizes="80px"
                                                    className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                                />
                                            ) : (
                                                <div className={`w-full h-full bg-gradient-to-br ${item.book.color} flex items-center justify-center p-2`}>
                                                    <span className="text-white font-black text-[7px] uppercase text-center leading-tight">{item.book.title}</span>
                                                </div>
                                            )}
                                            {/* Completion badge */}
                                            {isCompleted && (
                                                <div className="absolute inset-0 bg-primary/80 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-white text-2xl fill-icon">task_alt</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex flex-col flex-1 min-w-0 justify-between">
                                            <div>
                                                <h3 className="font-black text-text-main text-sm leading-tight truncate group-hover:text-primary transition-colors">
                                                    {item.book.title}
                                                </h3>
                                                <p className="text-[11px] text-text-muted font-bold truncate mt-0.5">
                                                    {item.book.author}
                                                </p>
                                            </div>

                                            <div className="flex flex-col gap-1.5 mt-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                                                        {formatDate(item.updatedAt)}
                                                    </span>
                                                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                                                        {item.book.pageCount > 0 ? `${progress}%` : `Hal. ${item.lastPage}`}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-700 ${isCompleted ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-primary shadow-[0_0_8px_rgba(255,90,95,0.3)]"}`}
                                                        style={{ width: `${Math.max(4, progress)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Server-Side Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-3 pt-4">
                                {page > 1 && (
                                    <Link
                                        href={`/history?page=${page - 1}`}
                                        className="px-6 py-3 rounded-[20px] bg-surface border border-black/5 dark:border-white/5 text-text-main font-black uppercase tracking-widest text-[11px] hover:bg-surface-hover hover:border-primary/30 hover:shadow-xl transition-all flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                        Sebelumnya
                                    </Link>
                                )}
                                <span className="text-[11px] font-black text-text-muted uppercase tracking-widest px-4">
                                    {page} / {totalPages}
                                </span>
                                {page < totalPages && (
                                    <Link
                                        href={`/history?page=${page + 1}`}
                                        className="px-6 py-3 rounded-[20px] bg-surface border border-black/5 dark:border-white/5 text-text-main font-black uppercase tracking-widest text-[11px] hover:bg-surface-hover hover:border-primary/30 hover:shadow-xl transition-all flex items-center gap-2"
                                    >
                                        Selanjutnya
                                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                    </Link>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
