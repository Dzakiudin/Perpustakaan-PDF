"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmModal";
import Image from "next/image";

export default function AdminReportsClient({ initialReports }: { initialReports: any[] }) {
    const [reports, setReports] = useState(initialReports);
    const { addToast } = useToast();
    const { confirm } = useConfirm();

    const handleAction = async (reportId: string, action: "DISMISS" | "DELETE_CONTENT") => {
        if (action === "DELETE_CONTENT" && !(await confirm({ title: "Delete Content", message: "Are you sure you want to permanently delete this content?", isDanger: true }))) return;

        try {
            const res = await fetch(`/api/admin/reports/${reportId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action })
            });
            if (res.ok) {
                setReports(reports.map(r => r.id === reportId ? { ...r, status: "RESOLVED" } : r));
                addToast(action === "DISMISS" ? "Report dismissed" : "Content deleted & Report closed", "success");
            } else {
                addToast("Failed to process report", "error");
            }
        } catch {
            addToast("Network error occurred", "error");
        }
    };

    return (
        <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                        <th className="px-6 py-6 text-left text-[10px] font-black text-text-muted uppercase tracking-[0.2em] min-w-[200px]">Reporter</th>
                        <th className="px-6 py-6 text-left text-[10px] font-black text-text-muted uppercase tracking-[0.2em] min-w-[150px]">Content Type</th>
                        <th className="px-6 py-6 text-left text-[10px] font-black text-text-muted uppercase tracking-[0.2em] min-w-[300px]">Report Reason</th>
                        <th className="px-6 py-6 text-center text-[10px] font-black text-text-muted uppercase tracking-[0.2em] min-w-[120px]">Status</th>
                        <th className="px-10 py-6 text-right text-[10px] font-black text-text-muted uppercase tracking-[0.2em] min-w-[200px]">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {reports.map((report) => (
                        <tr key={report.id} className="group hover:bg-black/5 dark:bg-white/5 transition-all duration-300">
                            <td className="px-6 py-6">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-center relative overflow-hidden group-hover:bg-primary/10 transition-all">
                                        {report.reporter.avatar ? (
                                            <Image src={report.reporter.avatar} fill sizes="40px" className="object-cover grayscale group-hover:grayscale-0 transition-all" alt="" />
                                        ) : (
                                            <span className="text-[10px] font-black text-primary">{(report.reporter.name || "?").substring(0, 2).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <p className="text-text-main font-black text-sm">{report.reporter.name}</p>
                                        <p className="text-[10px] text-text-muted font-medium">{new Date(report.createdAt).toLocaleDateString("en-US")}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-6">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all
                                    ${report.type === 'BOOK' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : ''}
                                    ${report.type === 'THREAD' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : ''}
                                    ${report.type === 'REVIEW' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : ''}
                                    ${report.type === 'REPLY' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : ''}
                                `}>
                                    {report.type}
                                </span>
                            </td>
                            <td className="px-6 py-6">
                                <p className="text-text-main text-sm font-medium line-clamp-2" title={report.reason}>{report.reason}</p>
                            </td>
                            <td className="px-6 py-6 text-center">
                                <span className={`flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border mx-auto w-fit transition-all
                                    ${report.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-green-500/10 text-green-500 border-green-500/20'}
                                `}>
                                    {report.status === 'PENDING' ? <span className="material-symbols-outlined text-[12px] animate-pulse">hourglass_empty</span> : <span className="material-symbols-outlined text-[12px]">check_circle</span>}
                                    {report.status}
                                </span>
                            </td>
                            <td className="px-10 py-6 text-right">
                                {report.status === 'PENDING' ? (
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleAction(report.id, "DISMISS")}
                                            className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 text-text-muted hover:text-text-main hover:bg-black/10 dark:bg-white/10 border border-transparent transition-all font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                                            title="Dismiss Report"
                                        >
                                            Dismiss
                                        </button>
                                        <button
                                            onClick={() => handleAction(report.id, "DELETE_CONTENT")}
                                            className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer"
                                            title="Delete Reported Content"
                                        >
                                            Delete Content
                                        </button>
                                    </div>
                                ) : (
                                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-50">Already Resolved</span>
                                )}
                            </td>
                        </tr>
                    ))}
                    {reports.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-10 py-32 text-center">
                                <div className="flex flex-col items-center gap-2 opacity-30">
                                    <span className="material-symbols-outlined text-5xl">task_alt</span>
                                    <p className="text-[10px] font-black uppercase tracking-widest">No incoming reports. System secure.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
