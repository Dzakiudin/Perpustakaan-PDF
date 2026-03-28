import { prisma } from "@/lib/prisma";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminUsersPage() {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true,
            isSuspended: true,
            createdAt: true,
            uploadCount: true,
            _count: {
                select: { forumThreads: true, forumReplies: true }
            }
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
                        <span className="material-symbols-outlined text-sm">security</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">User Intelligence</span>
                    </div>
                    <h1 className="text-text-main text-4xl md:text-5xl font-black tracking-tight leading-none uppercase">
                        Access <span className="text-primary italic text-glow">Control</span>
                    </h1>
                    <p className="text-text-muted text-lg font-medium leading-relaxed max-w-2xl">
                        Universal synchronization hub for monitoring and regulating user entities within the Book-in ecosystem.
                    </p>
                </div>

                <div className="bg-surface backdrop-blur-xl rounded-[40px] border border-black/5 dark:border-white/5 overflow-hidden shadow-2xl">
                    <AdminUsersClient initialUsers={users} />
                </div>
            </div>
        </div>
    );
}
