"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { useLanguage } from "@/context/LanguageContext";
import { UserCardSkeleton, ChatBubbleSkeleton } from "@/components/Skeleton";

/* ───── Types ───── */
interface UserResult {
    id: string; name: string; avatar: string | null; bio: string | null;
    xp: number; level: number; followers: number; books: number; isFollowed: boolean;
}
interface ConversationPreview {
    id: string;
    friend: { id: string; name: string; avatar: string | null } | null;
    lastMessage: { content: string; senderId: string; createdAt: string } | null;
    unread: number;
}
interface Reaction { id: string; emoji: string; userId: string; }
interface ChatMessage {
    id: string; content: string; senderId: string; createdAt: string;
    sender: { id: string; name: string; avatar: string | null };
    reactions?: Reaction[];
    replyTo?: { id: string; content: string; sender: { id: string; name: string } } | null;
}

const EMOJIS = ["❤️", "👍", "😂", "😮", "😢"];

/* ───── Component ───── */
export default function SocialPage() {
    const { addToast } = useToast();
    const { t } = useLanguage();

    // Current user
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    useEffect(() => {
        fetch("/api/user/settings").then(r => r.json()).then(d => { if (d.user) setCurrentUserId(d.user.id); }).catch(() => { });
    }, []);

    /* == DISCOVERY == */
    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState<UserResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const searchUsers = useCallback(async (q: string) => {
        if (q.trim().length < 2) { setSearchResults([]); setSearched(false); return; }
        setSearchLoading(true); setSearched(true);
        try {
            const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
            if (res.ok) { const d = await res.json(); setSearchResults(d.users || []); }
        } catch { }
        setSearchLoading(false);
    }, []);

    useEffect(() => {
        const t = setTimeout(() => searchUsers(query), 400);
        return () => clearTimeout(t);
    }, [query, searchUsers]);

    /* == FRIENDS (following) == */
    const [friends, setFriends] = useState<UserResult[]>([]);
    const [friendsLoading, setFriendsLoading] = useState(true);
    const [followLoading, setFollowLoading] = useState<string | null>(null);

    const fetchFriends = useCallback(async () => {
        try {
            const res = await fetch("/api/users/following");
            if (res.ok) { const d = await res.json(); setFriends(d.users || []); }
        } catch { }
        setFriendsLoading(false);
    }, []);

    useEffect(() => { fetchFriends(); }, [fetchFriends]);

    const handleFollow = async (userId: string, isFollowed: boolean) => {
        setFollowLoading(userId);
        try {
            const res = await fetch(`/api/users/${userId}/follow`, { method: isFollowed ? "DELETE" : "POST" });
            if (res.ok) {
                // Update both lists
                const updater = (u: UserResult) => u.id === userId ? { ...u, isFollowed: !isFollowed, followers: isFollowed ? u.followers - 1 : u.followers + 1 } : u;
                setSearchResults(prev => prev.map(updater));
                if (!isFollowed) fetchFriends(); // refresh circle
                else setFriends(prev => prev.filter(u => u.id !== userId));
                addToast(isFollowed ? "Unfollowed." : "Followed!", "success");
            }
        } catch { addToast("Failed.", "error"); }
        setFollowLoading(null);
    };

    /* == MESSAGES == */
    const [conversations, setConversations] = useState<ConversationPreview[]>([]);
    const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [sending, setSending] = useState(false);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<NodeJS.Timeout | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msgId: string; isMe: boolean } | null>(null);
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const [onlineMap, setOnlineMap] = useState<Record<string, boolean>>({});
    const [peerTyping, setPeerTyping] = useState(false);
    const typingTimeout = useRef<NodeJS.Timeout | null>(null);
    const [chatSearch, setChatSearch] = useState("");
    const [chatSearchOpen, setChatSearchOpen] = useState(false);
    const [emojiPicker, setEmojiPicker] = useState<string | null>(null); // msgId showing picker

    const fetchConversations = useCallback(async () => {
        try {
            const res = await fetch("/api/chat/conversations");
            if (res.ok) { const d = await res.json(); setConversations(d.conversations || []); }
        } catch { }
    }, []);

    useEffect(() => { fetchConversations(); const i = setInterval(fetchConversations, 10000); return () => clearInterval(i); }, [fetchConversations]);

    const fetchMessages = useCallback(async (cid: string) => {
        try {
            const res = await fetch(`/api/chat/conversations/${cid}/messages`);
            if (res.ok) { const d = await res.json(); setMessages(d.messages || []); }
        } catch { }
    }, []);

    useEffect(() => {
        if (!activeConvoId) return;
        fetchMessages(activeConvoId);
        fetch(`/api/chat/conversations/${activeConvoId}/read`, { method: "POST" }).catch(() => { });
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(() => {
            fetchMessages(activeConvoId);
            fetchConversations();
            // Poll typing
            fetch(`/api/chat/conversations/${activeConvoId}/typing`)
                .then(r => r.json()).then(d => setPeerTyping(d.typing || false)).catch(() => { });
        }, 3000);
        setPeerTyping(false);
        setChatSearch(""); setChatSearchOpen(false);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [activeConvoId, fetchMessages, fetchConversations]);

    // Fetch online status for friends
    useEffect(() => {
        const ids = [...friends.map(f => f.id), ...conversations.map(c => c.friend?.id).filter(Boolean)];
        const unique = [...new Set(ids)].filter(Boolean);
        if (unique.length === 0) return;
        fetch(`/api/users/online?ids=${unique.join(",")}`)
            .then(r => r.json()).then(d => setOnlineMap(d.statuses || {})).catch(() => { });
        const interval = setInterval(() => {
            fetch(`/api/users/online?ids=${unique.join(",")}`)
                .then(r => r.json()).then(d => setOnlineMap(d.statuses || {})).catch(() => { });
        }, 30000);
        return () => clearInterval(interval);
    }, [friends, conversations]);

    useEffect(() => {
        const el = messagesContainerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages]);

    const openChat = async (friendId: string) => {
        try {
            const res = await fetch("/api/chat/conversations", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ friendId }),
            });
            if (res.ok) { const d = await res.json(); setActiveConvoId(d.conversationId); fetchConversations(); }
        } catch { addToast("Failed to open chat.", "error"); }
    };

    const sendMessage = async () => {
        if (!chatInput.trim() || !activeConvoId || sending) return;
        const content = chatInput.trim(); const replyId = replyTo?.id || null;
        setChatInput(""); setSending(true); setReplyTo(null);
        try {
            const res = await fetch(`/api/chat/conversations/${activeConvoId}/messages`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content, ...(replyId ? { replyToId: replyId } : {}) }),
            });
            if (res.ok) { const d = await res.json(); setMessages(p => [...p, d.message]); fetchConversations(); }
        } catch { }
        setSending(false);
    };

    const handleTyping = () => {
        if (!activeConvoId) return;
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
            fetch(`/api/chat/conversations/${activeConvoId}/typing`, { method: "POST" }).catch(() => { });
        }, 300);
    };

    const toggleReaction = async (msgId: string, emoji: string) => {
        if (!activeConvoId) return;
        try {
            const res = await fetch(`/api/chat/conversations/${activeConvoId}/messages/${msgId}/react`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emoji }),
            });
            if (res.ok) {
                const d = await res.json();
                setMessages(prev => prev.map(m => {
                    if (m.id !== msgId) return m;
                    const reactions = m.reactions || [];
                    if (d.action === "added") return { ...m, reactions: [...reactions, { id: "temp", emoji, userId: currentUserId! }] };
                    return { ...m, reactions: reactions.filter(r => !(r.emoji === emoji && r.userId === currentUserId)) };
                }));
            }
        } catch { }
        setEmojiPicker(null);
    };

    const deleteMessage = async (messageId: string) => {
        if (!activeConvoId) return;
        try {
            const res = await fetch(`/api/chat/conversations/${activeConvoId}/messages/${messageId}`, { method: "DELETE" });
            if (res.ok) {
                setMessages(prev => prev.filter(m => m.id !== messageId));
                addToast("Message deleted.", "success");
            }
        } catch { addToast("Failed to delete.", "error"); }
        setContextMenu(null);
    };

    const removeConversation = async (convoId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation(); // Don't open the conversation
        if (!confirm("Remove this conversation from your list?")) return;
        try {
            const res = await fetch(`/api/chat/conversations/${convoId}/clear`, { method: "DELETE" });
            if (res.ok) {
                setConversations(prev => prev.filter(c => c.id !== convoId));
                if (activeConvoId === convoId) { setActiveConvoId(null); setMessages([]); }
                addToast("Conversation removed.", "success");
            }
        } catch { addToast("Failed to remove.", "error"); }
    };

    const handleContextMenu = (e: React.MouseEvent, msg: ChatMessage) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            msgId: msg.id,
            isMe: msg.senderId === currentUserId,
        });
    };

    // Close context menu on any click or scroll
    useEffect(() => {
        if (!contextMenu) return;
        const close = () => setContextMenu(null);
        window.addEventListener("click", close);
        window.addEventListener("scroll", close, true);
        return () => {
            window.removeEventListener("click", close);
            window.removeEventListener("scroll", close, true);
        };
    }, [contextMenu]);

    const handleReply = (msgId: string) => {
        const msg = messages.find(m => m.id === msgId);
        if (msg) setReplyTo(msg);
        setContextMenu(null);
    };

    const fmt = (d: string) => {
        const ms = Date.now() - new Date(d).getTime();
        if (ms < 60000) return "now";
        if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
        if (ms < 86400000) return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return new Date(d).toLocaleDateString([], { day: "numeric", month: "short" });
    };

    const dateSeparator = (d: string) => {
        const date = new Date(d);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const msgDay = new Date(date); msgDay.setHours(0, 0, 0, 0);
        const diff = (today.getTime() - msgDay.getTime()) / 86400000;
        if (diff === 0) return "Today";
        if (diff === 1) return "Yesterday";
        return date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
    };

    const filteredMessages = chatSearch.trim()
        ? messages.filter(m => m.content.toLowerCase().includes(chatSearch.toLowerCase()))
        : messages;

    const activeConvo = conversations.find(c => c.id === activeConvoId);

    // Which list to show on the left: search results or friends circle
    const showSearchResults = searched && query.trim().length >= 2;
    const leftList = showSearchResults ? searchResults : friends;

    return (
        <div className="flex-1 flex flex-col w-full px-6 md:px-12 py-8 pt-24 md:pt-[104px] gap-8 min-h-[calc(100vh-80px)]">
            {/* ── TOP: Discovery ── */}
            <section>
                <div className="rounded-[32px] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8 md:p-10">
                    <h1 className="text-2xl md:text-3xl font-black text-text-main tracking-tight uppercase leading-none mb-2">
                        {t("social_discover_title").split(" ")[0]} <span className="text-primary italic">{t("social_discover_title").split(" ").slice(1).join(" ")}</span>
                    </h1>
                    <p className="text-sm text-text-muted font-medium mb-6">{t("social_discover_subtitle")}</p>
                    <div className="relative max-w-2xl">
                        <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-xl text-text-muted">search</span>
                        <input
                            type="text" value={query} onChange={e => setQuery(e.target.value)}
                            placeholder={t("social_search_placeholder")}
                            className="w-full pl-14 pr-6 py-4 text-sm font-bold text-text-main bg-surface border border-border rounded-2xl focus:border-primary/40 focus:shadow-lg outline-none transition-all placeholder:text-text-muted/40"
                            autoFocus
                        />
                    </div>
                </div>
            </section>

            {/* ── MAIN: Two Columns ── */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-8 min-h-0">
                {/* LEFT COLUMN: Circle / Search Results */}
                <div className="lg:col-span-3 flex flex-col gap-6 overflow-hidden">
                    {/* Stats Bar */}
                    <div className="flex items-center gap-6 px-2">
                        <h2 className="text-lg font-black text-text-main uppercase tracking-tight">
                            {showSearchResults ? t("social_search_results") : t("social_your_circle")}
                        </h2>
                        <div className="flex items-center gap-5 ml-auto">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-dark border border-border">
                                <span className="material-symbols-outlined text-sm text-primary fill-icon">group</span>
                                <span className={`text-sm font-black leading-none ${friends.length > 0 ? 'text-primary' : 'text-text-muted'}`}>{friends.length}</span>
                                <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">{t("social_friends")}</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-dark border border-border">
                                <span className="material-symbols-outlined text-sm text-emerald-500 fill-icon">mark_chat_unread</span>
                                <span className={`text-sm font-black leading-none ${conversations.reduce((s, c) => s + c.unread, 0) > 0 ? 'text-emerald-500' : 'text-text-muted'}`}>{conversations.reduce((s, c) => s + c.unread, 0)}</span>
                                <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">{t("social_unread")}</span>
                            </div>
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {(showSearchResults ? searchLoading : friendsLoading) ? (
                            <div className="flex flex-col gap-3">
                                <UserCardSkeleton />
                                <UserCardSkeleton />
                                <UserCardSkeleton />
                            </div>
                        ) : leftList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="size-20 rounded-[28px] bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center mb-5 shadow-sm">
                                    <span className="material-symbols-outlined text-4xl text-primary/40">{showSearchResults ? "person_off" : "diversity_3"}</span>
                                </div>
                                <h3 className="text-base font-black text-text-main mb-1.5">{showSearchResults ? t("social_no_results") : t("social_no_friends")}</h3>
                                <p className="text-xs text-text-muted font-medium max-w-xs">{showSearchResults ? t("social_try_different") : t("social_use_search")}</p>
                            </div>
                        ) : (
                            leftList.map(user => (
                                <div key={user.id} className="flex items-center gap-4 p-4 rounded-2xl bg-surface border border-border hover:border-primary/20 transition-all group">
                                    <Link href={`/profil/${user.id}`} className="relative shrink-0 size-12 rounded-2xl overflow-hidden bg-bg-dark border border-border flex items-center justify-center">
                                        {user.avatar ? (
                                            <Image src={user.avatar} alt={user.name} width={48} height={48} className="size-full object-cover" />
                                        ) : (
                                            <span className="text-sm font-black text-primary">{(user.name || "?").substring(0, 2).toUpperCase()}</span>
                                        )}
                                        {onlineMap[user.id] && <div className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 border-2 border-surface" />}
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                        <Link href={`/profil/${user.id}`} className="text-sm font-black text-text-main hover:text-primary transition-colors truncate block">{user.name}</Link>
                                        <p className="text-[10px] text-text-muted font-bold truncate">{user.bio || `Level ${user.level} • ${user.followers} followers`}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button onClick={() => openChat(user.id)} className="size-9 rounded-xl bg-bg-dark border border-border flex items-center justify-center text-text-muted hover:text-primary transition-colors cursor-pointer" title="Chat">
                                            <span className="material-symbols-outlined text-[18px]">chat</span>
                                        </button>
                                        <button
                                            onClick={() => handleFollow(user.id, user.isFollowed)}
                                            disabled={followLoading === user.id}
                                            className={`size-9 rounded-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer ${user.isFollowed ? "bg-bg-dark border border-border text-text-muted hover:text-primary" : "bg-primary text-white shadow-sm shadow-primary/20"}`}
                                            title={user.isFollowed ? "Unfollow" : "Follow"}
                                        >
                                            {followLoading === user.id
                                                ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                                                : <span className="material-symbols-outlined text-[18px]">{user.isFollowed ? "person_remove" : "person_add"}</span>
                                            }
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Messages */}
                <div className="lg:col-span-2 flex flex-col rounded-[28px] bg-surface border border-border overflow-hidden min-h-[400px] lg:min-h-0 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-200px)]">
                    {/* Messages Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <h2 className="text-sm font-black text-text-main uppercase tracking-widest">{t("social_messages")}</h2>
                        {activeConvoId && (
                            <button onClick={() => setActiveConvoId(null)} className="text-text-muted hover:text-primary transition-colors cursor-pointer">
                                <span className="material-symbols-outlined text-lg">arrow_back</span>
                            </button>
                        )}
                    </div>

                    {activeConvoId && activeConvo ? (
                        /* Active Chat View */
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Chat header */}
                            <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-bg-dark/30">
                                <div className="relative size-8 rounded-xl overflow-hidden bg-bg-dark border border-border shrink-0">
                                    {activeConvo.friend?.avatar ? (
                                        <Image src={activeConvo.friend.avatar} alt="" width={32} height={32} className="size-full object-cover" />
                                    ) : (
                                        <div className="size-full flex items-center justify-center text-primary font-black text-[10px]">{(activeConvo.friend?.name || "?").substring(0, 2).toUpperCase()}</div>
                                    )}
                                    {activeConvo.friend && onlineMap[activeConvo.friend.id] && <div className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 border-2 border-surface" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-xs font-black text-text-main truncate block">{activeConvo.friend?.name}</span>
                                    {activeConvo.friend && onlineMap[activeConvo.friend.id] && <span className="text-[9px] text-emerald-500 font-bold">Online</span>}
                                </div>
                                <button onClick={() => { setChatSearchOpen(!chatSearchOpen); if (chatSearchOpen) setChatSearch(""); }} className="size-7 rounded-lg bg-bg-dark/50 flex items-center justify-center text-text-muted hover:text-primary transition-colors cursor-pointer" title="Search messages">
                                    <span className="material-symbols-outlined text-[14px]">{chatSearchOpen ? "close" : "search"}</span>
                                </button>
                            </div>

                            {/* Search bar */}
                            {chatSearchOpen && (
                                <div className="px-4 py-2 border-b border-border bg-bg-dark/20">
                                    <input
                                        type="text" value={chatSearch} onChange={e => setChatSearch(e.target.value)}
                                        placeholder="Search in conversation..."
                                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs font-medium text-text-main placeholder:text-text-muted/40 outline-none focus:border-primary/40 transition-all"
                                        autoFocus
                                    />
                                </div>
                            )}

                            {/* Messages */}
                            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                                {filteredMessages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <span className="material-symbols-outlined text-3xl text-text-muted/20 mb-2">{chatSearch ? "search_off" : "waving_hand"}</span>
                                        <p className="text-xs text-text-muted font-medium">{chatSearch ? t("social_no_results") : t("social_say_hi")}</p>
                                    </div>
                                )}
                                {filteredMessages.map((msg, idx) => {
                                    const isMe = msg.senderId === currentUserId;
                                    // Date separator
                                    const showDate = idx === 0 || dateSeparator(filteredMessages[idx - 1].createdAt) !== dateSeparator(msg.createdAt);
                                    const groupedReactions = (msg.reactions || []).reduce<Record<string, { count: number; myReaction: boolean }>>((acc, r) => {
                                        if (!acc[r.emoji]) acc[r.emoji] = { count: 0, myReaction: false };
                                        acc[r.emoji].count++;
                                        if (r.userId === currentUserId) acc[r.emoji].myReaction = true;
                                        return acc;
                                    }, {});
                                    // Highlight search match
                                    const highlightContent = (text: string) => {
                                        if (!chatSearch.trim()) return text;
                                        const regex = new RegExp(`(${chatSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                                        const parts = text.split(regex);
                                        return parts.map((part, i) =>
                                            regex.test(part) ? <mark key={i} className="bg-yellow-300/60 rounded px-0.5">{part}</mark> : part
                                        );
                                    };
                                    return (
                                        <div key={msg.id}>
                                            {showDate && (
                                                <div className="flex items-center gap-3 my-4">
                                                    <div className="flex-1 h-px bg-border" />
                                                    <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">{dateSeparator(msg.createdAt)}</span>
                                                    <div className="flex-1 h-px bg-border" />
                                                </div>
                                            )}
                                            <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                                <div className="max-w-[80%]">
                                                    <div
                                                        onContextMenu={e => handleContextMenu(e, msg)}
                                                        className={`px-3.5 py-2.5 rounded-2xl text-xs font-medium leading-relaxed break-words cursor-default select-text
                                                            ${isMe ? "bg-primary text-white rounded-br-md" : "bg-bg-dark text-text-main border border-border rounded-bl-md"}`}
                                                    >
                                                        {/* Reply reference */}
                                                        {msg.replyTo && (
                                                            <div className={`flex items-start gap-2 mb-2 pb-2 border-b ${isMe ? "border-white/20" : "border-border"}`}>
                                                                <div className={`w-0.5 rounded-full self-stretch shrink-0 ${isMe ? "bg-white/40" : "bg-primary/60"}`} />
                                                                <div className="min-w-0">
                                                                    <span className={`text-[9px] font-black block ${isMe ? "text-white/70" : "text-primary"}`}>{msg.replyTo.sender.name}</span>
                                                                    <span className={`text-[10px] truncate block ${isMe ? "text-white/50" : "text-text-muted"}`}>{msg.replyTo.content.length > 60 ? msg.replyTo.content.substring(0, 60) + "…" : msg.replyTo.content}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {highlightContent(msg.content)}
                                                        <div className={`text-[8px] mt-1 font-bold uppercase tracking-widest ${isMe ? "text-white/50" : "text-text-muted"}`}>{fmt(msg.createdAt)}</div>
                                                    </div>
                                                    {/* Emoji reactions */}
                                                    {Object.keys(groupedReactions).length > 0 && (
                                                        <div className={`flex gap-1 mt-1 flex-wrap ${isMe ? "justify-end" : "justify-start"}`}>
                                                            {Object.entries(groupedReactions).map(([emoji, data]) => (
                                                                <button
                                                                    key={emoji}
                                                                    onClick={() => toggleReaction(msg.id, emoji)}
                                                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] border transition-colors cursor-pointer
                                                                        ${data.myReaction ? "bg-primary/10 border-primary/30 text-primary" : "bg-bg-dark border-border text-text-muted hover:border-primary/20"}`}
                                                                >
                                                                    {emoji} <span className="font-bold">{data.count}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* Inline emoji picker */}
                                                    {emojiPicker === msg.id && (
                                                        <div className={`flex gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                                                            <div className="inline-flex gap-0.5 px-2 py-1 rounded-xl bg-surface border border-border shadow-lg">
                                                                {EMOJIS.map(e => (
                                                                    <button key={e} onClick={() => toggleReaction(msg.id, e)} className="size-7 rounded-lg hover:bg-bg-dark flex items-center justify-center text-sm transition-colors cursor-pointer">{e}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Typing indicator */}
                                {peerTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-bg-dark border border-border rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
                                            <span className="text-[10px] font-bold text-text-muted mr-1">{t("social_typing")}</span>
                                            <span className="size-1 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "0ms" }} />
                                            <span className="size-1 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "150ms" }} />
                                            <span className="size-1 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "300ms" }} />
                                        </div>
                                    </div>
                                )}

                                {/* Context Menu */}
                                {contextMenu && (
                                    <div
                                        className="fixed z-[999] min-w-[150px] py-1.5 bg-surface border border-border rounded-xl shadow-2xl"
                                        style={{
                                            left: Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 170 : contextMenu.x),
                                            top: Math.min(contextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 150 : contextMenu.y)
                                        }}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <button
                                            onMouseDown={e => { e.stopPropagation(); handleReply(contextMenu.msgId); }}
                                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-text-main hover:bg-bg-dark transition-colors cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-sm text-primary">reply</span>
                                            Reply
                                        </button>
                                        <button
                                            onMouseDown={e => { e.stopPropagation(); setEmojiPicker(emojiPicker === contextMenu.msgId ? null : contextMenu.msgId); setContextMenu(null); }}
                                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-text-main hover:bg-bg-dark transition-colors cursor-pointer"
                                        >
                                            <span className="text-sm">😄</span>
                                            React
                                        </button>
                                        {contextMenu.isMe && (
                                            <button
                                                onMouseDown={e => { e.stopPropagation(); deleteMessage(contextMenu.msgId); }}
                                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                                            >
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Reply Preview */}
                            {replyTo && (
                                <div className="px-4 py-2 border-t border-border bg-bg-dark/30 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-xs text-primary">reply</span>
                                    <p className="text-[10px] text-text-muted font-medium flex-1 truncate">
                                        Replying to <span className="text-text-main font-bold">{replyTo.sender.name}</span>: {replyTo.content}
                                    </p>
                                    <button onClick={() => setReplyTo(null)} className="text-text-muted hover:text-text-main cursor-pointer">
                                        <span className="material-symbols-outlined text-xs">close</span>
                                    </button>
                                </div>
                            )}

                            {/* Input */}
                            <div className="px-4 py-3 border-t border-border flex items-center gap-2">
                                <input
                                    type="text" value={chatInput} onChange={e => { setChatInput(e.target.value); handleTyping(); }}
                                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                                    placeholder={replyTo ? `Replying to ${replyTo.sender.name}...` : `Reply to ${activeConvo.friend?.name}...`}
                                    className="flex-1 bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-xs font-medium text-text-main placeholder:text-text-muted/40 outline-none focus:border-primary/40 transition-all"
                                />
                                <button onClick={sendMessage} disabled={!chatInput.trim() || sending}
                                    className="size-9 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all cursor-pointer">
                                    <span className="material-symbols-outlined text-[16px] fill-icon">send</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Conversation List */
                        <div className="flex-1 overflow-y-auto">
                            {conversations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                                    <div className="size-16 rounded-[24px] bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center mb-4 shadow-sm">
                                        <span className="material-symbols-outlined text-3xl text-primary/40">forum</span>
                                    </div>
                                    <h3 className="text-sm font-black text-text-main mb-1">{t("social_no_convo")}</h3>
                                    <p className="text-xs text-text-muted font-medium">{t("social_start_convo")}</p>
                                </div>
                            ) : (
                                conversations.map(c => (
                                    <div key={c.id} className="relative group/convo">
                                        <button onClick={() => setActiveConvoId(c.id)}
                                            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-bg-dark/30 transition-all border-b border-border/50 cursor-pointer">
                                            <div className="relative shrink-0 size-10 rounded-2xl overflow-hidden bg-bg-dark border border-border">
                                                {c.friend?.avatar ? (
                                                    <Image src={c.friend.avatar} alt="" fill sizes="40px" className="object-cover" />
                                                ) : (
                                                    <div className="size-full flex items-center justify-center text-primary font-black text-[10px]">{(c.friend?.name || "?").substring(0, 2).toUpperCase()}</div>
                                                )}
                                                {c.unread > 0 && <div className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-primary border-2 border-surface" />}
                                                {c.friend && onlineMap[c.friend.id] && <div className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 border-2 border-surface" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className="text-xs font-black text-text-main truncate">{c.friend?.name || "Unknown"}</span>
                                                    {c.lastMessage && <span className="text-[9px] font-bold text-text-muted shrink-0 ml-2">{fmt(c.lastMessage.createdAt)}</span>}
                                                </div>
                                                <p className="text-[10px] text-text-muted truncate font-medium">
                                                    {c.lastMessage ? (c.lastMessage.senderId === currentUserId ? "You: " : "") + c.lastMessage.content : "No messages"}
                                                </p>
                                            </div>
                                            {c.unread > 0 && (
                                                <span className="shrink-0 size-5 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">{c.unread > 9 ? "9+" : c.unread}</span>
                                            )}
                                        </button>
                                        {/* Delete conversation — hover to show */}
                                        <button
                                            onClick={(e) => removeConversation(c.id, e)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 size-7 rounded-lg bg-surface border border-border flex items-center justify-center text-text-muted hover:text-red-500 hover:border-red-200 opacity-0 group-hover/convo:opacity-100 transition-all cursor-pointer shadow-sm"
                                            title="Remove conversation"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
