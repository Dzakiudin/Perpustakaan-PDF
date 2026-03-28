import { prisma } from "@/lib/prisma";
import AdminBooksClient from "./AdminBooksClient";

export default async function AdminBooksPage() {
    const books = await prisma.book.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            uploader: { select: { id: true, name: true, avatar: true } },
            category: { select: { id: true, name: true } },
        }
    });

    return (
        <div className="flex-1 w-full p-6 md:p-10 relative">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 -mr-60 -mt-60 size-[800px] bg-primary/5 rounded-full blur-[140px] pointer-events-none translate-x-1/4"></div>

            <div className="relative z-10 flex flex-col gap-10">
                {/* Header Section */}
                <div className="flex flex-col gap-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary w-fit">
                        <span className="material-symbols-outlined text-sm">library_books</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Asset Management</span>
                    </div>
                    <h1 className="text-text-main text-4xl md:text-5xl font-black tracking-tight leading-none uppercase">
                        Knowledge <span className="text-primary italic text-glow">Inventory</span>
                    </h1>
                    <p className="text-text-muted text-lg font-medium leading-relaxed max-w-2xl">
                        Comprehensive ledger of all encoded knowledge assets currently synchronized with the platform core.
                    </p>
                </div>

                <div className="bg-surface backdrop-blur-xl rounded-[40px] border border-black/5 dark:border-white/5 overflow-hidden shadow-2xl">
                    <AdminBooksClient initialBooks={books} />
                </div>
            </div>
        </div>
    );
}
