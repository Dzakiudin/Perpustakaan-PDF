"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RichTextEditor from "@/components/RichTextEditor";

const TOPICS = [
    { value: "umum", label: "General", icon: "forum" },
    { value: "akademik", label: "Academic", icon: "school" },
    { value: "teknologi", label: "Technology", icon: "computer" },
    { value: "fiksi", label: "Fiction", icon: "auto_stories" },
    { value: "rekomendasi", label: "Recommendation", icon: "recommend" },
];

export default function NewThreadPage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [topicTag, setTopicTag] = useState("umum");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = content;
        const textContent = tempDiv.textContent || tempDiv.innerText || "";

        if (!title.trim() || !textContent.trim()) {
            setError("Mandatory fields: Thread Title and Content Inquiry.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/forum", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content, topicTag }),
            });

            if (res.ok) {
                const data = await res.json();
                router.push(`/forum/${data.thread.id}`);
            } else {
                const data = await res.json();
                setError(data.error || "System failure: Failed to broadcast thread.");
            }
        } catch {
            setError("Connection severed. Check uplink status.");
        }
        setLoading(false);
    };

    return (
        <div className="flex-1 w-full max-w-[800px] mx-auto min-h-screen px-6 py-12 md:py-20 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 -ml-40 -mt-20 size-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col gap-10">
                {/* Exit Control */}
                <Link href="/forum" className="group inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-text-muted hover:text-text-main transition-all duration-300 ease-out">
                    <div className="size-8 rounded-full border border-black/5 dark:border-white/5 flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors duration-300 ease-out">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </div>
                    Abort Operation
                </Link>

                {/* Header Information */}
                <div className="flex flex-col gap-3 pb-8 border-b border-black/5 dark:border-white/5">
                    <h1 className="text-4xl md:text-5xl font-black text-text-main uppercase tracking-tight">Broadcast <span className="text-primary italic">Inquiry</span></h1>
                    <p className="text-text-muted text-sm font-medium">Initialize a new knowledge node in the community collective.</p>
                </div>

                {error && (
                    <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-black uppercase tracking-widest flex items-center gap-3 animate-shake">
                        <span className="material-symbols-outlined">warning</span>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                    {/* Topic Discipline Selection */}
                    <div className="flex flex-col gap-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Select Discipline Tag</label>
                        <div className="flex flex-wrap gap-3">
                            {TOPICS.map((t) => {
                                const active = topicTag === t.value;
                                return (
                                    <button
                                        key={t.value}
                                        type="button"
                                        onClick={() => setTopicTag(t.value)}
                                        className={`px-5 py-3 rounded-2xl flex items-center gap-2 transition-all duration-500 ease-out border font-black uppercase tracking-widest text-[10px] cursor-pointer hover:scale-[1.03] active:scale-[0.97] ${active
                                            ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(255,90,95,0.1)] text-white"
                                            : "bg-surface-hover/50 border-black/5 dark:border-white/5 text-text-muted hover:border-black/10 dark:border-white/10 hover:bg-black/10 dark:bg-white/10"
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-lg">{t.icon}</span>
                                        {t.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Thread Title Identification */}
                    <div className="flex flex-col gap-4">
                        <label htmlFor="title" className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Inquiry Designation (Title)</label>
                        <input
                            id="title"
                            autoComplete="off"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full h-16 px-6 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-[24px] text-text-main text-lg font-bold placeholder:text-text-muted/30 outline-none focus:border-primary/50 focus:bg-black/10 dark:bg-white/10 transition-all shadow-inner"
                            placeholder="Designate the subject of your discourse..."
                        />
                    </div>

                    {/* Core Content Analysis */}
                    <div className="flex flex-col gap-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Body Intelligence (Content)</label>
                        <div className="rounded-[32px] overflow-hidden border border-black/5 dark:border-white/5 bg-surface focus-within:border-primary/50 transition-all shadow-xl">
                            <RichTextEditor
                                value={content}
                                onChange={setContent}
                                placeholder="Quantum data stream initialization required..."
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Final Execution Control */}
                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={loading || !title.trim() || !content.trim()}
                            className="w-full h-16 rounded-[24px] bg-gradient-to-r from-primary to-[#E5484D] text-white font-black uppercase tracking-[0.2em] text-xs shadow-[0_0_40px_rgba(255,90,95,0.2)] hover:shadow-[0_0_50px_rgba(255,90,95,0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:hover:scale-100 transition-all duration-500 ease-out cursor-pointer flex items-center justify-center gap-4 group"
                        >
                            {loading ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-[22px]">progress_activity</span>
                                    <span>Synchronizing Transmission Hub...</span>
                                </>
                            ) : (
                                <>
                                    <span>Initialize Knowledge Broadcast</span>
                                    <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1">send</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
