import { prisma } from "@/lib/prisma";
import AdminForumClient from "./AdminForumClient";

export default async function AdminForumPage() {
    const threads = await prisma.forumThread.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            user: { select: { id: true, name: true } },
            _count: { select: { replies: true } }
        }
    });

    return (
        <div className="p-6 md:p-10 w-full space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-text-main">Forum Moderation</h1>
                    <p className="text-text-muted mt-2">List of all community threads that can be deleted if they violate rules.</p>
                </div>
            </div>

            <div className="bg-surface border border-border rounded-3xl overflow-hidden">
                <AdminForumClient initialThreads={threads} />
            </div>
        </div>
    );
}
