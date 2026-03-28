"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import RichTextEditor from "@/components/RichTextEditor";
import { useConfirm } from "@/components/ConfirmModal";
import Image from "next/image";

export default function ForumThreadPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { confirm, alert } = useConfirm();
    const [thread, setThread] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [reply, setReply] = useState("");
    const [posting, setPosting] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [replyingTo, setReplyingTo] = useState<{ id: string, name: string } | null>(null);

    // Edit states
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);

    // Dropdown state
    const [showOptions, setShowOptions] = useState(false);
    const [isRootExpanded, setIsRootExpanded] = useState(false);
    const optionsRef = useRef<HTMLDivElement>(null);

    // Add ref for the rich text editor container
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Fetch current user
        fetch("/api/auth/me")
            .then(res => res.json())
            .then(data => setCurrentUser(data.user))
            .catch(() => { });

        // Fetch thread
        fetch(`/api/forum/${id}`)
            .then((r) => r.json())
            .then((data) => {
                setThread(data.thread);
                setEditTitle(data.thread.title);
                setEditContent(data.thread.content);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [id]);

    // Handle clicking outside options dropdown
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
                setShowOptions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const postReply = async () => {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = reply;
        const textContent = tempDiv.textContent || tempDiv.innerText || "";

        if (!textContent.trim()) return;

        setPosting(true);
        try {
            const res = await fetch(`/api/forum/${id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: reply, parentId: replyingTo?.id || null }),
            });
            if (res.ok) {
                const data = await res.json();
                setThread((t: any) => ({ ...t, replies: [...t.replies, data.reply] }));
                setReply("");
                setReplyingTo(null);
            }
        } catch { /* ignore */ }
        setPosting(false);
    };

    const handleDeleteReply = async (replyId: string) => {
        if (!(await confirm({ title: "Delete Reply", message: "Are you sure you want to delete this reply? All nested replies will also be deleted.", isDanger: true }))) return;

        try {
            const res = await fetch(`/api/forum/replies/${replyId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setThread((prev: any) => {
                    const getAllDescendants = (parentId: string, replies: any[]): string[] => {
                        let ids = [parentId];
                        const children = replies.filter(r => r.parentId === parentId);
                        for (const child of children) {
                            ids = [...ids, ...getAllDescendants(child.id, replies)];
                        }
                        return ids;
                    };

                    const idsToRemove = getAllDescendants(replyId, prev.replies);
                    return {
                        ...prev,
                        replies: prev.replies.filter((r: any) => !idsToRemove.includes(r.id))
                    };
                });
            } else {
                alert({ title: "Error", message: "Failed to delete reply.", isDanger: true });
            }
        } catch {
            alert({ title: "Error", message: "An error occurred while deleting.", isDanger: true });
        }
    };

    const handleSetReply = (replyId: string, username: string) => {
        setReplyingTo({ id: replyId, name: username });
        // Scroll to editor
        if (editorRef.current) {
            editorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const startEditing = () => {
        setEditTitle(thread.title);
        setEditContent(thread.content);
        setIsEditing(true);
        setShowOptions(false);
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setEditTitle(thread.title);
        setEditContent(thread.content);
    };

    const saveEdit = async () => {
        if (!editTitle.trim() || !editContent.trim()) return;

        setSavingEdit(true);
        try {
            const res = await fetch(`/api/forum/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: editTitle, content: editContent }),
            });
            if (res.ok) {
                const data = await res.json();
                setThread((prev: any) => ({ ...prev, title: data.thread.title, content: data.thread.content, updatedAt: data.thread.updatedAt }));
                setIsEditing(false);
            } else {
                alert({ title: "Error", message: "Failed to save changes.", isDanger: true });
            }
        } catch {
            alert({ title: "Error", message: "A system error occurred.", isDanger: true });
        }
        setSavingEdit(false);
    };

    const deleteThread = async () => {
        if (!(await confirm({ title: "Delete Thread", message: "Are you sure you want to permanently delete this thread? All replies will also be deleted.", isDanger: true }))) return;

        try {
            const res = await fetch(`/api/forum/${id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                router.push("/forum");
            } else {
                alert({ title: "Error", message: "Failed to delete thread.", isDanger: true });
            }
        } catch {
            alert({ title: "Error", message: "An error occurred while deleting.", isDanger: true });
        }
    };

    const handleReport = async (type: "THREAD" | "REPLY", targetId: string) => {
        if (!currentUser) {
            alert({ title: "Login Required", message: "Please login to report content." });
            return;
        }

        const reason = prompt("State the reason why this content violates the rules:");
        if (!reason || !reason.trim()) return;

        try {
            const res = await fetch("/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, targetId, reason: reason.trim() })
            });
            if (res.ok) {
                alert({ title: "Success", message: "Report sent to Admin successfully. Thank you." });
                setShowOptions(false);
            } else {
                alert({ title: "Error", message: "Failed to send report.", isDanger: true });
            }
        } catch (e) {
            alert({ title: "Error", message: "An error occurred while sending the report.", isDanger: true });
        }
    };

    const canEdit = currentUser && thread && (currentUser.id === thread.userId || currentUser.role === "ADMIN");

    if (loading) {
        return (
            <div className="max-w-[1000px] mx-auto px-6 py-12 space-y-10">
                <div className="flex flex-col gap-4 animate-pulse">
                    <div className="h-4 w-32 bg-black/5 dark:bg-white/5 rounded-full" />
                    <div className="h-12 w-3/4 bg-black/5 dark:bg-white/5 rounded-2xl" />
                </div>
                <div className="h-[400px] bg-surface border border-black/5 dark:border-white/5 rounded-[40px] animate-pulse" />
            </div>
        );
    }

    if (!thread) {
        return (
            <div className="max-w-[1000px] mx-auto px-6 py-20 text-center flex flex-col items-center gap-6">
                <div className="size-24 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-5xl text-red-500/50">error</span>
                </div>
                <div className="flex flex-col gap-2">
                    <h2 className="text-3xl font-black text-text-main uppercase tracking-tight">Transmission Failed</h2>
                    <p className="text-text-muted font-medium">The requested thread does not exist or has been archived.</p>
                </div>
                <Link href="/forum" className="px-8 py-3 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20 hover:scale-105 transition-all">Back to Hub</Link>
            </div>
        );
    }

    return (
        <div className="flex-1 w-full max-w-[1000px] mx-auto min-h-screen px-6 py-12 md:py-20 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 -mr-40 -mt-20 size-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col gap-10">
                {/* Back Control */}
                <Link href="/forum" className="group inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-text-muted hover:text-text-main transition-all">
                    <div className="size-8 rounded-full border border-black/5 dark:border-white/5 flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                    </div>
                    Return to Community Grid
                </Link>

                {/* Main Thread Article */}
                <article className="relative group">
                    <div className="absolute inset-0 bg-primary/5 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                    <div className="relative bg-surface backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-[40px] overflow-hidden shadow-2xl p-8 md:p-12">
                        {/* Header Stats & Metadata */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 pb-10 border-b border-black/5 dark:border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="p-1 rounded-full bg-gradient-to-br from-primary/40 to-transparent">
                                    <div className="size-14 rounded-full overflow-hidden border border-black/10 dark:border-white/10 bg-[#151d27]">
                                        {thread.user.avatar ? (
                                            <Image src={thread.user.avatar} width={56} height={56} className="size-full object-cover" alt="" />
                                        ) : (
                                            <div className="size-full flex items-center justify-center text-xs font-black text-primary">
                                                {(thread.user.name || "?").substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <p className="text-lg font-black text-text-main">{thread.user.name}</p>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Broadcasted on {new Date(thread.createdAt).toLocaleDateString("en-US", { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="px-5 py-2 rounded-2xl bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">{thread.topicTag}</span>
                                {currentUser && (
                                    <div className="relative" ref={optionsRef}>
                                        <button
                                            onClick={() => setShowOptions(!showOptions)}
                                            className="size-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:bg-white/10 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-text-muted text-[20px]">more_vert</span>
                                        </button>

                                        {/* Dropdown Options */}
                                        {showOptions && (
                                            <div className="absolute right-0 top-[calc(100%+8px)] w-40 py-2 bg-white dark:bg-[#111a24] border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                                                {canEdit && (
                                                    <button onClick={startEditing} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-text-muted hover:text-text-main hover:bg-black/5 dark:bg-white/5 transition-colors text-left">
                                                        <span className="material-symbols-outlined text-lg">edit</span>
                                                        Edit Thread
                                                    </button>
                                                )}
                                                <button onClick={() => canEdit ? deleteThread() : handleReport("THREAD", thread.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left">
                                                    <span className="material-symbols-outlined text-lg">{canEdit ? 'delete' : 'flag'}</span>
                                                    {canEdit ? 'Delete' : 'Report'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Title & Content */}
                        {isEditing ? (
                            <div className="flex flex-col gap-6 mb-12">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Thread Title</label>
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="w-full px-6 py-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-main font-bold placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 transition-colors"
                                        placeholder="Type discussion title..."
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Discussion Details</label>
                                    <div className="rounded-[24px] overflow-hidden border border-black/5 dark:border-white/5 bg-surface">
                                        <RichTextEditor
                                            value={editContent}
                                            onChange={setEditContent}
                                            placeholder="Details of questions or discussion topics..."
                                            disabled={savingEdit}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-2">
                                    <button
                                        onClick={cancelEditing}
                                        disabled={savingEdit}
                                        className="px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-text-muted hover:text-text-main hover:bg-black/5 dark:bg-white/5 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={saveEdit}
                                        disabled={savingEdit || !editTitle.trim() || !editContent.trim()}
                                        className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-primary text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                                    >
                                        {savingEdit ? (
                                            <><span className="material-symbols-outlined text-[16px] animate-spin">sync</span> Saving...</>
                                        ) : (
                                            <><span className="material-symbols-outlined text-[16px]">save</span> Save Changes</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-8 mb-12">
                                <div className="flex flex-col gap-2">
                                    <h1 className="text-3xl md:text-5xl font-black text-text-main leading-tight uppercase tracking-tight">{thread.title}</h1>
                                    {thread.updatedAt !== thread.createdAt && (
                                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest italic">
                                            (Edited on {new Date(thread.updatedAt).toLocaleDateString("en-US")})
                                        </p>
                                    )}
                                </div>
                                <div
                                    className="prose prose-md dark:prose-invert max-w-none text-text-muted/90 font-medium leading-[2]
                                        prose-p:mb-6 prose-strong:text-text-main prose-a:text-primary prose-code:bg-black/5 dark:prose-code:bg-white/5 prose-code:px-2 prose-code:py-0.5 prose-code:rounded"
                                    dangerouslySetInnerHTML={{ __html: thread.content }}
                                />
                            </div>
                        )}

                        {/* Interaction Bar */}
                        <div className="flex items-center justify-between pt-10 border-t border-black/5 dark:border-white/5">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-3 text-text-muted">
                                    <span className="material-symbols-outlined fill-icon text-primary">mode_comment</span>
                                    <span className="text-xs font-black uppercase tracking-widest">{thread.replies.length} Exchanges</span>
                                </div>
                                <div className="h-4 w-px bg-black/5 dark:bg-white/5"></div>
                                <div className="flex items-center gap-3 text-text-muted hover:text-text-main transition-colors cursor-pointer">
                                    <span className="material-symbols-outlined text-[20px]">share</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Transmit Link</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </article>

                {/* Exchanges Section */}
                <section className="flex flex-col gap-8">
                    <div className="flex items-center gap-4">
                        <div className="h-px bg-black/5 dark:bg-white/5 flex-1"></div>
                        <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[0.5em]">Thread Exchanges</h2>
                        <div className="h-px bg-black/5 dark:bg-white/5 flex-1"></div>
                    </div>

                    {/* Active Input Exchange */}
                    <div ref={editorRef} className="bg-surface backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-[32px] overflow-hidden p-6 md:p-8 flex flex-col gap-6 group hover:border-primary/30 transition-all duration-500 shadow-xl">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-4">
                                <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-xl">draw</span>
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Initiate Pulse Response</p>
                                    {replyingTo && (
                                        <p className="text-sm font-medium text-text-main">Replying to <span className="text-primary">@{replyingTo.name}</span></p>
                                    )}
                                </div>
                            </div>
                            {replyingTo && (
                                <button
                                    onClick={() => setReplyingTo(null)}
                                    className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20"
                                >
                                    Cancel Reply
                                </button>
                            )}
                        </div>
                        <div className="rounded-[24px] overflow-hidden border border-black/5 dark:border-white/5 bg-surface transition-all group-focus-within:border-primary/50 group-focus-within:bg-black/5 dark:bg-white/5">
                            <RichTextEditor
                                value={reply}
                                onChange={setReply}
                                placeholder="Quantum insights required..."
                                disabled={posting}
                            />
                        </div>
                        <div className="flex items-center justify-between px-2">
                            <p className="text-[10px] font-bold text-text-muted uppercase italic opacity-50">Content auto-saved to node buffer</p>
                            <button
                                onClick={postReply}
                                disabled={posting || !reply.trim()}
                                className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[11px] shadow-[0_0_30px_rgba(19,127,236,0.3)] hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 transition-all cursor-pointer"
                            >
                                {posting ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                                        <span>Transmitting...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[18px]">send</span>
                                        <span>Deploy Reply</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Reply Stream */}
                    <div className="flex flex-col gap-4">
                        {thread.replies.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center text-center opacity-30">
                                <span className="material-symbols-outlined text-5xl mb-4">forum</span>
                                <p className="text-sm font-black uppercase tracking-widest">Awaiting First Insight</p>
                            </div>
                        ) : (() => {
                            const rootReplies = thread.replies.filter((r: any) => !r.parentId);
                            const visibleRoot = isRootExpanded ? rootReplies : rootReplies.slice(0, 2);
                            return (
                                <div className="flex flex-col gap-4">
                                    {visibleRoot.map((rootReply: any) => (
                                        <ReplyThread
                                            key={rootReply.id}
                                            reply={rootReply}
                                            allReplies={thread.replies}
                                            onReply={handleSetReply}
                                            onReport={handleReport}
                                            onDelete={handleDeleteReply}
                                            currentUser={currentUser}
                                        />
                                    ))}
                                    {!isRootExpanded && rootReplies.length > 2 && (
                                        <div className="flex pt-4">
                                            <button
                                                onClick={() => setIsRootExpanded(true)}
                                                className="w-full py-4 rounded-2xl border border-dashed border-primary/20 text-primary font-black uppercase tracking-widest text-[10px] hover:bg-primary/5 transition-all flex items-center justify-center gap-3 group"
                                            >
                                                <span className="material-symbols-outlined text-sm group-hover:rotate-180 transition-transform">expand_more</span>
                                                See {rootReplies.length - 2} more main replies
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </section>
            </div>
        </div>
    );
}

const ReplyThread = ({ reply, allReplies, onReply, onReport, onDelete, currentUser, level = 0 }: { reply: any, allReplies: any[], onReply: (id: string, name: string) => void, onReport: (type: "THREAD" | "REPLY", id: string) => void, onDelete: (id: string) => void, currentUser: any, level?: number }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const children = allReplies.filter(r => r.parentId === reply.id);
    // Limit indentation at level 2 as requested
    const indent = Math.min(level, 2);

    // Find parent user if this is a nested reply
    const parentReply = reply.parentId ? allReplies.find(r => r.id === reply.parentId) : null;

    // Visible children logic: show max 2 unless expanded
    const visibleChildren = isExpanded ? children : children.slice(0, 2);

    return (
        <div className={`flex flex-col ${level > 0 ? "mt-1" : "mt-2"}`}>
            <div className="flex">
                {/* Single clean indent bar for nested replies */}
                {indent > 0 && (
                    <div className="flex shrink-0" style={{ width: `${indent * 24}px` }}>
                        <div className="w-px bg-primary/15 mx-auto rounded-full" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="group relative flex gap-4 p-4 md:p-6 rounded-2xl bg-surface border border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 hover:border-primary/20 transition-all duration-300 shadow-sm">
                        <div className="shrink-0">
                            <div className={`rounded-full border border-black/10 dark:border-white/10 bg-surface flex items-center justify-center overflow-hidden ${level > 0 ? "size-8" : "size-10"}`}>
                                {reply.user.avatar ? (
                                    <Image src={reply.user.avatar} width={40} height={40} className="size-full object-cover" alt="" />
                                ) : (
                                    <div className="text-[10px] md:text-xs font-black text-primary">
                                        {(reply.user.name || "?").substring(0, 2).toUpperCase()}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs md:text-sm font-bold text-text-main pr-1">{reply.user.name}</span>
                                        {parentReply && (
                                            <span className="text-[10px] font-medium text-primary bg-primary/5 px-2 py-0.5 rounded-md">
                                                Replying to @{parentReply.user.name}
                                            </span>
                                        )}
                                        <span className="text-[9px] font-medium text-text-muted">{new Date(reply.createdAt).toLocaleDateString("en-US")}</span>
                                    </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                    <button
                                        onClick={() => onReply(reply.id, reply.user.name)}
                                        className="material-symbols-outlined text-text-muted text-sm cursor-pointer hover:text-primary transition-colors"
                                        title="Reply"
                                    >
                                        reply
                                    </button>
                                    {(currentUser?.id === reply.userId || currentUser?.role === "ADMIN") && (
                                        <button
                                            onClick={() => onDelete(reply.id)}
                                            className="material-symbols-outlined text-red-500/50 text-sm cursor-pointer hover:text-red-500 transition-colors"
                                            title="Delete Reply"
                                        >
                                            delete
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onReport("REPLY", reply.id)}
                                        className="material-symbols-outlined text-text-muted/50 text-sm cursor-pointer hover:text-red-400 transition-colors"
                                        title="Report"
                                    >
                                        flag
                                    </button>
                                </div>
                            </div>
                            <div
                                className="prose prose-sm dark:prose-invert max-w-none text-text-muted/80 font-medium leading-relaxed
                                    prose-p:mb-1 prose-p:last:mb-0 prose-strong:text-text-main prose-code:bg-black/5 dark:prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded"
                                dangerouslySetInnerHTML={{ __html: reply.content }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Children with Expansion Toggle */}
            {children.length > 0 && (
                <div className="flex flex-col gap-1">
                    {visibleChildren.map(child => (
                        <ReplyThread
                            key={child.id}
                            reply={child}
                            allReplies={allReplies}
                            onReply={onReply}
                            onReport={onReport}
                            onDelete={onDelete}
                            currentUser={currentUser}
                            level={level + 1}
                        />
                    ))}

                    {!isExpanded && children.length > 2 && (
                        <div className="flex ml-[24px] mt-1">
                            <button
                                onClick={() => setIsExpanded(true)}
                                className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline flex items-center gap-2 opacity-60 hover:opacity-100 transition-all p-2"
                            >
                                <span className="material-symbols-outlined text-[14px]">expand_more</span>
                                See {children.length - 2} more replies
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
