import React from "react";

export function Skeleton({ className }: { className?: string }) {
    return (
        <div className={`animate-pulse bg-black/5 dark:bg-white/5 rounded-md ${className}`} />
    );
}

export function BookCardSkeleton() {
    return (
        <div className="flex flex-col gap-3">
            <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
        </div>
    );
}

export function ActivityItemSkeleton() {
    return (
        <div className="flex items-center gap-4 py-3 border-b border-black/5 dark:border-white/5">
            <Skeleton className="size-10 rounded-full shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-2 w-1/4" />
            </div>
        </div>
    );
}

export function LeaderboardRowSkeleton() {
    return (
        <div className="flex items-center gap-4 py-2">
            <Skeleton className="size-8 rounded-full shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-2 w-1/5" />
            </div>
            <Skeleton className="h-4 w-12 rounded-full" />
        </div>
    );
}

export function ChatBubbleSkeleton({ isMe = false }: { isMe?: boolean }) {
    return (
        <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-4`}>
            <div className={`flex gap-3 max-w-[70%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                <Skeleton className="size-8 rounded-full shrink-0 self-end" />
                <div className="flex flex-col gap-1">
                    <Skeleton className={`h-12 w-48 rounded-2xl ${isMe ? "rounded-br-none" : "rounded-bl-none"}`} />
                    <Skeleton className="h-2 w-12 self-end opacity-50" />
                </div>
            </div>
        </div>
    );
}

export function UserCardSkeleton() {
    return (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface border border-border">
            <Skeleton className="size-12 rounded-2xl shrink-0" />
            <div className="flex flex-col gap-2 flex-1 min-w-0">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="flex gap-2">
                <Skeleton className="size-9 rounded-xl" />
                <Skeleton className="size-9 rounded-xl" />
            </div>
        </div>
    );
}
