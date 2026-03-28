import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export const metadata = {
    title: "Annotations Hub | Book-in",
    description: "Manage and export your personal reading notes and annotations.",
};

export default async function NotesHubPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    const user = token ? await verifyToken(token) : null;

    if (!user) {
        redirect("/login");
    }

    const annotations = await prisma.annotation.findMany({
        where: { userId: user.userId },
        include: {
            book: {
                select: { id: true, title: true, author: true, thumbnailPath: true, color: true }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    const grouped = annotations.reduce((acc, curr) => {
        if (!acc[curr.bookId]) {
            acc[curr.bookId] = { book: curr.book, annotations: [] };
        }
        acc[curr.bookId].annotations.push(curr);
        return acc;
    }, {} as Record<string, { book: any, annotations: any[] }>);

    const bookList = Object.values(grouped);

    return (
        <main className="flex-1 w-full min-h-screen px-6 md:px-12 py-10 pt-24 md:pt-[104px] relative">
            {/* Background Decorations Removed */}

            <div className="relative z-10 flex flex-col gap-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-black/5 dark:border-white/5">
                    <div className="flex flex-col gap-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-black/5 dark:border-white/5 shadow-sm text-primary self-start">
                            <span className="material-symbols-outlined text-sm fill-icon">edit_note</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Personal Knowledge</span>
                        </div>
                        <h1 className="text-text-main text-4xl md:text-5xl font-black tracking-tight uppercase leading-none">
                            Annotations <span className="text-primary italic text-glow">Hub</span>
                        </h1>
                        <p className="text-text-muted text-lg font-medium max-w-2xl leading-relaxed">
                            Review, manage, and export all the highlights and notes you've made across the library.
                        </p>
                    </div>

                    <div className="flex flex-col px-8 py-4 bg-surface rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm">
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5">Total Annotations</span>
                        <span className="text-text-main text-3xl font-black leading-none">{annotations.length}</span>
                    </div>
                </div>

                {bookList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 rounded-[48px] bg-surface border border-black/5 dark:border-white/5 shadow-xl text-center px-4">
                        <span className="material-symbols-outlined text-7xl text-text-muted opacity-30 mb-6">edit_off</span>
                        <h2 className="text-2xl font-black text-text-main tracking-tight uppercase mb-2">No Annotations Found</h2>
                        <p className="text-text-muted text-sm font-medium mb-8">You haven't made any highlights or notes yet. Start reading and annotating to see them here.</p>
                        <Link href="/search" className="px-10 py-4 rounded-[24px] bg-primary text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                            Explore Library
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {bookList.map((item, index) => {
                            const { book, annotations: bookAnns } = item;
                            const highlights = bookAnns.filter(a => a.type === "highlight").length;
                            const notes = bookAnns.filter(a => a.type === "note").length;
                            const freehand = bookAnns.filter(a => a.type === "freehand").length;

                            return (
                                <div key={book.id} className="flex flex-col bg-surface border border-black/5 dark:border-white/5 rounded-[40px] overflow-hidden group hover:border-primary/30 transition-all duration-500 shadow-xl hover:shadow-2xl">
                                    <div className="flex items-center gap-4 p-6 pb-5 border-b border-black/5 dark:border-white/5 bg-bg-dark/20">
                                        <div className="relative w-16 h-20 rounded-2xl overflow-hidden shrink-0 shadow-md">
                                            {book.thumbnailPath ? (
                                                <Image src={book.thumbnailPath} fill sizes="64px" className="object-cover" alt={book.title} />
                                            ) : (
                                                <div className={`w-full h-full bg-surface border border-black/5 flex items-center justify-center p-2 text-primary font-black text-[8px] uppercase text-center`}>{book.title}</div>
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <h3 className="text-base font-black text-text-main truncate group-hover:text-primary transition-colors">{book.title}</h3>
                                            <p className="text-xs font-bold text-text-muted truncate mb-2">{book.author}</p>
                                            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-text-muted">
                                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs text-amber-500">format_ink_highlighter</span> {highlights}</span>
                                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs text-blue-500">edit_square</span> {notes}</span>
                                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs text-purple-500">draw</span> {freehand}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6 flex flex-col gap-4">
                                        <div className="flex flex-col gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                            {bookAnns.slice(0, 5).map((ann, i) => (
                                                <div key={ann.id} className="flex items-start gap-3 p-4 rounded-[20px] bg-bg-dark/10 border border-black/5">
                                                    <div className="shrink-0 mt-0.5" style={{ color: ann.color || "inherit" }}>
                                                        <span className="material-symbols-outlined text-sm">
                                                            {ann.type === "highlight" ? "format_ink_highlighter" : ann.type === "freehand" ? "draw" : "edit_square"}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 leading-none">Page {ann.page}</span>
                                                        {ann.text ? (
                                                            <p className="text-xs font-medium text-text-main italic leading-relaxed">"{ann.text}"</p>
                                                        ) : (
                                                            <p className="text-[11px] font-mono text-text-muted opacity-80 break-words">Area: {JSON.parse(ann.data).rect?.w?.toFixed(0)}x{JSON.parse(ann.data).rect?.h?.toFixed(0)}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {bookAnns.length > 5 && (
                                                <div className="text-center pt-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">+{bookAnns.length - 5} More...</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-auto pt-4 border-t border-black/5 dark:border-white/5">
                                            <Link href={`/pdf/${book.id}/baca`} className="flex-1 text-center py-4 rounded-[18px] bg-bg-dark text-text-main hover:bg-primary hover:text-white font-black text-[10px] uppercase tracking-widest transition-all">
                                                Open Reader
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    )
}
