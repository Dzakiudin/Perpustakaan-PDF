"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmModal";
import Image from "next/image";

export default function AdminUsersClient({ initialUsers }: { initialUsers: any[] }) {
    const [users, setUsers] = useState(initialUsers);
    const { addToast } = useToast();
    const { confirm } = useConfirm();

    const handleDelete = async (id: string, name: string) => {
        if (!(await confirm({ title: "Purge Node", message: `Purge entity "${name}"? This action is irreversible and all associated data pulses will be terminated.`, isDanger: true }))) return;

        try {
            const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
            if (res.ok) {
                setUsers(users.filter(u => u.id !== id));
                addToast("Entity successfully purged from system", "success");
            } else {
                addToast("Purge protocol failed", "error");
            }
        } catch {
            addToast("Communication error with central core", "error");
        }
    };

    const handleSuspend = async (id: string, name: string, isSuspended: boolean) => {
        const action = isSuspended ? "reactivate" : "suspend";
        if (!(await confirm({ title: `${isSuspended ? 'Reactivate' : 'Suspend'} Link`, message: `Are you sure you want to ${action} user "${name}"?`, isDanger: !isSuspended }))) return;

        try {
            const res = await fetch(`/api/admin/users/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isSuspended: !isSuspended })
            });
            if (res.ok) {
                setUsers(users.map(u => u.id === id ? { ...u, isSuspended: !isSuspended } : u));
                addToast(`Login access for ${name} has been ${isSuspended ? 'reactivated' : 'suspended'}`, "success");
            } else {
                addToast(`Failed to ${action} user`, "error");
            }
        } catch {
            addToast("Network error", "error");
        }
    };

    return (
        <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                        <th className="px-10 py-6 text-left text-[10px] font-black text-text-muted uppercase tracking-[0.2em] min-w-[300px]">Node Identity</th>
                        <th className="px-6 py-6 text-left text-[10px] font-black text-text-muted uppercase tracking-[0.2em] min-w-[200px]">Uplink Address</th>
                        <th className="px-6 py-6 text-center text-[10px] font-black text-text-muted uppercase tracking-[0.2em] min-w-[120px]">Authorization</th>
                        <th className="px-6 py-6 text-center text-[10px] font-black text-text-muted uppercase tracking-[0.2em] min-w-[100px]">Knowledge Uploads</th>
                        <th className="px-6 py-6 text-center text-[10px] font-black text-text-muted uppercase tracking-[0.2em] min-w-[100px]">Social Pulses</th>
                        <th className="px-10 py-6 text-right text-[10px] font-black text-text-muted uppercase tracking-[0.2em] min-w-[120px]">Console Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {users.map((user) => (
                        <tr key={user.id} className="group hover:bg-black/5 dark:bg-white/5 transition-all duration-300">
                            <td className="px-10 py-8">
                                <div className="flex items-center gap-4">
                                    <div className="size-12 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-center relative overflow-hidden group-hover:bg-primary/10 group-hover:border-primary/40 transition-all duration-500">
                                        {user.avatar ? (
                                            <Image src={user.avatar} fill sizes="48px" className="object-cover grayscale group-hover:grayscale-0 transition-all" alt="" />
                                        ) : (
                                            <span className="text-[11px] font-black text-primary">{(user.name || "?").substring(0, 2).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <p className="text-text-main font-black group-hover:text-primary transition-colors text-lg truncate max-w-[200px]">{user.name}</p>
                                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Registered {new Date(user.createdAt).toLocaleDateString("en-US")}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-8">
                                <span className="text-text-muted font-medium text-sm group-hover:text-text-main transition-colors">{user.email}</span>
                            </td>
                            <td className="px-6 py-8 text-center">
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${user.role === 'ADMIN'
                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                                    : 'bg-primary/10 text-primary border-primary/20'
                                    }`}>
                                    {user.role}
                                </span>
                                {user.isSuspended && (
                                    <span className="block mt-2 text-[10px] font-black uppercase text-red-500 tracking-widest bg-red-500/10 px-2 py-1 rounded w-fit mx-auto border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                                        Suspended
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-8 text-center">
                                <div className="inline-flex items-center justify-center px-3 py-1 bg-black/5 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5 text-sm font-black text-text-main group-hover:border-primary/30 transition-all">
                                    {user.uploadCount}
                                </div>
                            </td>
                            <td className="px-6 py-8 text-center">
                                <div className="inline-flex items-center justify-center px-3 py-1 bg-black/5 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5 text-sm font-black text-text-main group-hover:border-primary/30 transition-all">
                                    {user._count.forumThreads + user._count.forumReplies}
                                </div>
                            </td>
                            <td className="px-10 py-8 text-right">
                                {user.role !== 'ADMIN' ? (
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleSuspend(user.id, user.name, user.isSuspended)}
                                            className={`size-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer group/btn active:scale-90 border ${user.isSuspended
                                                ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                                                : 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20 hover:text-orange-400'
                                                }`}
                                            title={user.isSuspended ? "Activate Account" : "Suspend Account"}
                                        >
                                            <span className="material-symbols-outlined text-[20px] transition-transform group-hover/btn:scale-110">
                                                {user.isSuspended ? 'how_to_reg' : 'block'}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.id, user.name)}
                                            className="size-10 rounded-2xl bg-red-500/5 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer group/btn active:scale-90 inline-flex items-center justify-center"
                                            title="Purge Node"
                                        >
                                            <span className="material-symbols-outlined text-[20px] transition-transform group-hover/btn:rotate-12">delete_forever</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="size-10 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-center text-text-muted opacity-20">
                                        <span className="material-symbols-outlined text-[20px]">lock</span>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                    {users.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-10 py-32 text-center">
                                <div className="flex flex-col items-center gap-2 opacity-30">
                                    <span className="material-symbols-outlined text-5xl">person_off</span>
                                    <p className="text-[10px] font-black uppercase tracking-widest">No nodes detected in local perimeter</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
