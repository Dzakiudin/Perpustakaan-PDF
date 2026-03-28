import { prisma } from "@/lib/prisma";
import AdminReportsClient from "./AdminReportsClient";

export default async function AdminReportsPage() {
    const reports = await prisma.report.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            reporter: {
                select: { name: true, avatar: true, email: true }
            }
        }
    });

    return (
        <div className="flex-1 w-full p-6 md:p-10 relative">
            <div className="absolute top-0 right-0 -mr-60 -mt-60 size-[800px] bg-red-500/5 rounded-full blur-[140px] pointer-events-none translate-x-1/4"></div>

            <div className="relative z-10 flex flex-col gap-10">
                <div className="flex flex-col gap-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 w-fit">
                        <span className="material-symbols-outlined text-sm">gavel</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Moderation Hub</span>
                    </div>
                    <h1 className="text-text-main text-4xl md:text-5xl font-black tracking-tight leading-none uppercase">
                        Content <span className="text-red-500 italic text-glow">Reports</span>
                    </h1>
                    <p className="text-text-muted text-lg font-medium leading-relaxed max-w-2xl">
                        Monitor intelligence anomalies and user-flagged content across the network. Manage infractions to keep the node secure.
                    </p>
                </div>

                <div className="bg-surface backdrop-blur-xl rounded-[40px] border border-black/5 dark:border-white/5 overflow-hidden shadow-2xl">
                    <AdminReportsClient initialReports={reports} />
                </div>
            </div>
        </div>
    );
}
