"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import Link from "next/link";
import { useConfirm } from "@/components/ConfirmModal";

export default function AdminForumClient({ initialThreads }: { initialThreads: any[] }) {
    const [threads, setThreads] = useState(initialThreads);
    const { addToast } = useToast();
    const { confirm } = useConfirm();

    const handleDelete = async (id: string, title: string) => {
        if (!(await confirm({ title: "Delete Thread", message: `Delete thread "${title}" along with all its replies?`, isDanger: true }))) return;

        try {
            const res = await fetch(`/api/admin/forum/${id}`, { method: "DELETE" });
            if (res.ok) {
                setThreads(threads.filter(t => t.id !== id));
                addToast("Thread successfully deleted", "success");
            } else {
                addToast("Failed to delete thread", "error");
            }
        } catch {
            addToast("Network error", "error");
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text-muted">
                <thead className="text-xs uppercase bg-surface-hover/50 text-text-main font-bold">
                    <tr>
                        <th className="px-6 py-4 w-[40%]">Thread</th>
                        <th className="px-6 py-4">Author</th>
                        <th className="px-6 py-4 text-center">Topic</th>
                        <th className="px-6 py-4 text-center">Replies</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {threads.map((thread) => (
                        <tr key={thread.id} className="hover:bg-surface-hover/30 transition-colors">
                            <td className="px-6 py-4">
                                <Link href={`/forum/${thread.id}`} className="font-bold text-text-main hover:text-primary transition-colors block truncate max-w-sm mb-1">
                                    {thread.title}
                                </Link>
                                <span className="text-xs text-text-muted">
                                    {new Date(thread.createdAt).toLocaleDateString("en-US")}
                                </span>
                            </td>
                            <td className="px-6 py-4 font-medium text-text-main">{thread.user.name}</td>
                            <td className="px-6 py-4 text-center">
                                <span className="px-2.5 py-1 bg-surface-hover border border-border rounded-lg text-xs font-bold text-primary">
                                    {thread.topicTag}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-center font-mono text-xs">{thread._count.replies}</td>
                            <td className="px-6 py-4 text-right">
                                <button
                                    onClick={() => handleDelete(thread.id, thread.title)}
                                    className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                                    title="Delete Thread"
                                >
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                </button>
                            </td>
                        </tr>
                    ))}
                    {threads.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-text-muted">
                                No threads have been created yet.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
