"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface Notification {
    id: string;
    type: string;
    message: string;
    link?: string;
    read: boolean;
    createdAt: string;
}

interface NavNotificationsProps {
    notifications: Notification[];
    unreadCount: number;
    onMarkAllRead: () => void;
}

export default function NavNotifications({ notifications, unreadCount, onMarkAllRead }: NavNotificationsProps) {
    const [notifOpen, setNotifOpen] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={notifRef} className="relative">
            <button
                onClick={() => setNotifOpen(prev => !prev)}
                className="relative size-10 md:size-12 flex items-center justify-center rounded-full bg-surface border border-border hover:bg-surface-hover transition-all shadow-sm"
                aria-label="Toggle notifications"
            >
                <span className="material-symbols-outlined text-[20px] md:text-2xl text-text-muted">notifications</span>
                {unreadCount > 0 && (
                    <span className="absolute top-0 -right-1 size-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center border-2 border-surface">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {notifOpen && (
                <div className="fixed right-4 top-[72px] md:top-[calc(100%+8px)] md:absolute md:right-0 w-[calc(100vw-32px)] max-w-[320px] md:w-80 bg-surface backdrop-blur-2xl border border-border rounded-2xl shadow-2xl z-[200] overflow-hidden animate-fade-up">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                        <h3 className="text-sm font-bold text-text-main">Notifications</h3>
                        {unreadCount > 0 && (
                            <button onClick={onMarkAllRead} className="text-[11px] font-medium text-primary hover:underline">
                                Mark all read
                            </button>
                        )}
                    </div>
                    <div className="max-h-72 overflow-y-auto w-full">
                        {notifications.length === 0 ? (
                            <div className="p-8 flex flex-col items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-3xl text-text-muted/50">notifications_off</span>
                                <p className="text-sm text-text-muted font-medium text-center">No new notifications</p>
                            </div>
                        ) : (
                            notifications.slice(0, 20).map((n) => (
                                <Link
                                    key={n.id}
                                    href={n.link || "#"}
                                    onClick={() => setNotifOpen(false)}
                                    className={`flex items-start gap-4 p-4 hover:bg-surface-hover transition-all border-b border-border group ${!n.read ? "bg-primary/5" : ""}`}
                                >
                                    <div className="shrink-0 mt-1 relative">
                                        <span className={`material-symbols-outlined text-[22px] transition-all ${!n.read ? "text-primary fill-icon" : "text-text-muted"}`}>
                                            {n.type === "reply" ? "forum" : n.type === "like" ? "favorite" : n.type === "review" ? "reviews" : "info"}
                                        </span>
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <p className={`text-[13px] leading-relaxed ${!n.read ? "font-bold text-text-main" : "font-medium text-text-muted"} transition-colors`}>{n.message}</p>
                                        <span className="text-[10px] font-medium text-text-muted mt-1.5">
                                            {new Date(n.createdAt).toLocaleDateString("en-US", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
