"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Notification {
    id: string;
    type: string;
    message: string;
    link?: string;
    read: boolean;
    createdAt: string;
}

export function useNotifications(
    userId: string | undefined,
    onNewNotification?: (message: string) => void
) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const prevUnreadCountRef = useRef(0);

    const fetchNotifs = useCallback(async () => {
        try {
            const res = await fetch("/api/notifications");
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);

                if (data.unreadCount > prevUnreadCountRef.current && prevUnreadCountRef.current > 0) {
                    const latest = data.notifications[0];
                    if (latest && onNewNotification) {
                        const newCount = data.unreadCount - prevUnreadCountRef.current;
                        onNewNotification(latest.message || `You have ${newCount} new notification(s)`);
                    }
                }
                prevUnreadCountRef.current = data.unreadCount || 0;
                setUnreadCount(data.unreadCount || 0);
            }
        } catch { /* ignore */ }
    }, [onNewNotification]);

    const markAllRead = useCallback(async () => {
        try {
            await fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (!userId) return;
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 30000);
        return () => clearInterval(interval);
    }, [userId, fetchNotifs]);

    return { notifications, unreadCount, markAllRead };
}

export function useChatUnread(userId: string | undefined) {
    const [chatUnread, setChatUnread] = useState(0);

    useEffect(() => {
        if (!userId) return;
        const fetchChatUnread = async () => {
            try {
                const res = await fetch("/api/chat/unread");
                if (res.ok) {
                    const d = await res.json();
                    setChatUnread(d.unread || 0);
                }
            } catch { }
        };
        fetchChatUnread();
        const interval = setInterval(fetchChatUnread, 30000);
        return () => clearInterval(interval);
    }, [userId]);

    return chatUnread;
}

export function useOnlineHeartbeat(userId: string | undefined) {
    useEffect(() => {
        if (!userId) return;
        const heartbeat = () => fetch("/api/users/online", { method: "POST" }).catch(() => { });
        heartbeat();
        const interval = setInterval(heartbeat, 120000);
        return () => clearInterval(interval);
    }, [userId]);
}
